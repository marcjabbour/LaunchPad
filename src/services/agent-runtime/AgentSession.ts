// Agent Session - Core session manager for the Agent Runtime

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Agent, AgentFile, TranscriptTurn } from '../../types';
import { APP_CONFIG } from '../../config/constants';
import { SESSION_TOOLS } from '../../config/tools';
import { getGenAIClient } from '../genai/client';
import { saveSessionTranscript } from '../storage/memoryStorage';
import { getAgentFiles } from '../storage/fileStorage';
import { safeBtoa } from '../../utils/base64';

import { EventEmitter } from './EventEmitter';
import { AudioEngine } from './AudioEngine';
import { ToolExecutor, createToolExecutor } from './ToolExecutor';
import { buildSystemPrompt, buildAgentJoinNotification } from './SystemPromptBuilder';
import { SessionState, SessionEvents, SessionConfig, AttachedDocument } from './types';

/**
 * AgentSession - The core orchestrator for AI agent sessions
 * 
 * Manages session lifecycle, audio I/O, tool execution, and transcription.
 * Emits events for UI to subscribe to, keeping the UI layer decoupled.
 */
export class AgentSession {
    private config: SessionConfig;
    private state: SessionState = 'disconnected';
    private session: any = null;
    private audioEngine: AudioEngine | null = null;
    private toolExecutor: ToolExecutor;
    private files: AgentFile[] = [];
    private transcript: TranscriptTurn[] = [];
    private currentInputTranscript: string = '';
    private currentOutputTranscript: string = '';
    private isConnecting: boolean = false;
    private attachedDocuments: AttachedDocument[] = [];

    // Event emitter for UI communication
    public readonly events = new EventEmitter<SessionEvents>();

    constructor(config: SessionConfig) {
        this.config = config;

        // Initialize tool executor with context
        this.toolExecutor = createToolExecutor({
            agents: config.agents,
            files: this.files,
            getAgentName: (agentId: string) => {
                return config.agents.find(a => a.id === agentId)?.name || 'AI Agent';
            }
        });

        // Load initial files for all agents
        this.loadFiles();
    }

    private loadFiles(): void {
        let allFiles: AgentFile[] = [];
        this.config.agents.forEach(a => {
            allFiles = [...allFiles, ...getAgentFiles(a.id)];
        });
        this.files = allFiles.sort((a, b) => b.updatedAt - a.updatedAt);
        this.toolExecutor.updateContext({ files: this.files });
    }

    // =========================================================================
    // Public API
    // =========================================================================

    get currentState(): SessionState {
        return this.state;
    }

    get currentFiles(): AgentFile[] {
        return this.files;
    }

    /**
     * Start the session
     */
    async connect(): Promise<void> {
        if (this.isConnecting || this.state === 'connected') {
            console.log('Session already started or connecting, skipping');
            return;
        }

        this.isConnecting = true;
        this.setState('connecting');

        try {
            const ai = getGenAIClient();
            if (!ai) throw new Error('API Key is missing.');
            if (this.config.agents.length === 0) throw new Error('No agents selected.');

            // Initialize audio engine
            this.audioEngine = new AudioEngine({
                inputSampleRate: APP_CONFIG.AUDIO_SAMPLE_RATE_INPUT,
                outputSampleRate: APP_CONFIG.AUDIO_SAMPLE_RATE_OUTPUT,
                onVolumeLevel: (level) => this.events.emit('volumeLevel', level),
                onAudioChunk: (pcmBlob) => {
                    if (this.session) {
                        this.session.sendRealtimeInput({ media: pcmBlob });
                    }
                }
            });

            await this.audioEngine.start();

            // Build system prompt
            const systemInstruction = buildSystemPrompt({
                agents: this.config.agents,
                includeMemory: true
            });

            // Determine voice config
            const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
            let voiceName = this.config.agents[0]?.voice || 'Puck';
            if (!validVoices.includes(voiceName)) voiceName = 'Puck';

            // Connect to AI
            this.session = await ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction,
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName }
                        }
                    },
                    tools: [{ functionDeclarations: SESSION_TOOLS }],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        this.setState('connected');
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        await this.handleServerMessage(message);
                    },
                    onclose: () => {
                        this.setState('disconnected');
                    },
                    onerror: (e: any) => {
                        console.error('Session Error:', e);
                        this.setState('error', e.message || 'Connection failed.');
                        this.events.emit('error', new Error(e.message || 'Connection failed.'));
                    },
                },
            });

        } catch (error) {
            console.error('Init Error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.setState('error', message);
            this.events.emit('error', error instanceof Error ? error : new Error(message));
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Disconnect and clean up
     */
    disconnect(): void {
        // Save transcript to all agents
        if (this.transcript.length > 0) {
            this.config.agents.forEach(a => {
                if (a.memory.enabled) {
                    saveSessionTranscript(a.id, this.transcript);
                }
            });
        }

        // Close session
        if (this.session && typeof this.session.close === 'function') {
            this.session.close();
        }
        this.session = null;

        // Stop audio
        this.audioEngine?.stop();
        this.audioEngine = null;

        // Notify config callback
        this.config.onSessionEnd?.();

        this.setState('disconnected');
    }

    /**
     * Send a system message (e.g., when a new agent joins)
     */
    sendSystemMessage(message: string): void {
        if (!this.session) return;

        this.session.sendRealtimeInput({
            media: {
                mimeType: 'text/plain',
                data: safeBtoa(message)
            }
        });
    }

    /**
     * Notify that a new agent has joined
     */
    notifyAgentJoined(agent: Agent): void {
        const notification = buildAgentJoinNotification(agent);
        this.sendSystemMessage(notification);
    }

    /**
     * Set microphone mute state
     */
    setMuted(muted: boolean): void {
        this.audioEngine?.setMuted(muted);
    }

    /**
     * Get mute state
     */
    /**
     * Get mute state
     */
    get isMuted(): boolean {
        return this.audioEngine?.isMuted ?? false;
    }

    /**
     * Attach a document to the session context
     */
    attachDocument(doc: AttachedDocument): void {
        this.attachedDocuments.push(doc);

        // Notify UI
        this.events.emit('documentAttached', doc);

        // Notify AI
        const systemMessage = `
SYSTEM UPDATE: User has attached a document.
Name: ${doc.name}
Type: ${doc.type}
Content:
${doc.content}
        `.trim();

        this.sendSystemMessage(systemMessage);
    }

    /**
     * Get currently attached documents
     */
    getAttachedDocuments(): AttachedDocument[] {
        return this.attachedDocuments;
    }

    // =========================================================================
    // Private Methods
    // =========================================================================

    private setState(state: SessionState, error?: string): void {
        this.state = state;
        this.events.emit('stateChange', state, error);
    }

    private async handleServerMessage(message: LiveServerMessage): Promise<void> {
        // Handle tool calls
        if (message.toolCall) {
            await this.handleToolCalls(message.toolCall.functionCalls);
        }

        // Handle transcription
        if (message.serverContent?.inputTranscription) {
            this.currentInputTranscript += message.serverContent.inputTranscription.text;
        }
        if (message.serverContent?.outputTranscription) {
            this.currentOutputTranscript += message.serverContent.outputTranscription.text;
        }

        // Handle turn complete
        if (message.serverContent?.turnComplete) {
            this.finalizeTurn();
        }

        // Handle audio output
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            await this.audioEngine?.playAudio(base64Audio);
        }

        // Handle interruption
        if (message.serverContent?.interrupted) {
            this.audioEngine?.handleInterruption();
            this.currentOutputTranscript = '';
        }
    }

    private async handleToolCalls(functionCalls: any[]): Promise<void> {
        for (const fc of functionCalls) {
            let result;

            // Intercept dispatchToAgent to use the Router
            if (fc.name === 'dispatchToAgent') {
                const { targetAgentId, task, input } = fc.args;
                try {
                    // Import router dynamically or use the global instance
                    const { router } = await import('./router/A2ARouter');

                    // Notify user (Ack)
                    this.sendSystemMessage(`[System] Handing off task '${task}' to agent...`);

                    const response = await router.route(targetAgentId, task, { message: input });
                    result = { success: true, data: { message: JSON.stringify(response) } };
                } catch (error: any) {
                    console.error('Dispatch Error:', error);
                    result = { success: false, error: error.message };
                }
            } else {
                // Standard tools
                result = await this.toolExecutor.execute(fc.name, fc.args);
            }

            // Handle file operations
            if (result.success && result.data) {
                const data = result.data as any;
                if (data.file) {
                    // Only add file to list if it's newly created (createFile or generateImage)
                    // presentFile returns an existing file, so we don't add it again
                    if (fc.name === 'createFile' || fc.name === 'generateImage') {
                        this.addFile(data.file);
                    }
                    if (data.present) {
                        this.events.emit('filePresented', data.file);
                    }
                }
            }

            // Send response back to AI
            this.session?.sendToolResponse({
                functionResponses: {
                    id: fc.id,
                    name: fc.name,
                    response: result.success
                        ? { result: (result.data as any)?.message || 'Success' }
                        : { error: result.error }
                }
            });
        }
    }

    private addFile(file: AgentFile): void {
        this.files = [file, ...this.files];
        this.toolExecutor.updateContext({ files: this.files });
        this.events.emit('fileCreated', file);
        this.config.onFileCreated?.(file);
    }

    private finalizeTurn(): void {
        const userText = this.currentInputTranscript.trim();
        const modelText = this.currentOutputTranscript.trim();

        if (userText) {
            this.transcript.push({ role: 'user', text: userText, timestamp: Date.now() });
        }
        if (modelText) {
            this.transcript.push({ role: 'model', text: modelText, timestamp: Date.now() });
        }

        this.currentInputTranscript = '';
        this.currentOutputTranscript = '';

        this.events.emit('transcription', [...this.transcript]);
        this.config.onTranscriptUpdate?.(this.transcript);
    }
}
