// LiveSessionModal component

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Agent, AgentFile, TranscriptTurn } from '../../../types';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, calculateVolumeLevel, base64ToUint8Array } from '../../../utils';
import { getAgentMemory, saveSessionTranscript } from '../../../services/storage/memoryStorage';
import { createNewFile, getAgentFiles } from '../../../services/storage/fileStorage';
import { getGenAIClient } from '../../../services/genai/client';
import { generateImage } from '../../../services/genai/imageGeneration';
import { SESSION_TOOLS } from '../../../config/tools';
import { APP_CONFIG } from '../../../config/constants';
import { safeBtoa } from '../../../utils/base64';
import { X, Mic, MicOff, FileText, Image as ImageIcon, Monitor, Code, Users, Plus } from 'lucide-react';

interface LiveSessionModalProps {
    activeAgents: Agent[];
    allAgents: Agent[];
    onClose: () => void;
    onAddAgent: (agentId: string) => void;
}

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({ activeAgents, allAgents, onClose, onAddAgent }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [showInvitePanel, setShowInvitePanel] = useState(false);

    // File System State
    const [files, setFiles] = useState<AgentFile[]>([]);
    const [presentedFile, setPresentedFile] = useState<AgentFile | null>(null);

    // Transcript State (for Memory)
    const transcriptRef = useRef<TranscriptTurn[]>([]);
    const currentInputTransRef = useRef('');
    const currentOutputTransRef = useRef('');

    // Refs for audio/session
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sessionRef = useRef<any>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const isMountedRef = useRef(true);
    const hasStartedRef = useRef(false); // Guard against double-start in StrictMode

    // Track the previous length of active agents to detect new additions
    const prevAgentsLengthRef = useRef(activeAgents.length);

    // Load initial files (all agents involved)
    useEffect(() => {
        let allFiles: AgentFile[] = [];
        activeAgents.forEach(a => {
            allFiles = [...allFiles, ...getAgentFiles(a.id)];
        });
        setFiles(allFiles.sort((a, b) => b.updatedAt - a.updatedAt));
    }, [activeAgents]);

    const startSession = useCallback(async () => {
        // Prevent double-start from React StrictMode
        if (hasStartedRef.current) {
            console.log('Session already started, skipping duplicate initialization');
            return;
        }
        hasStartedRef.current = true;

        try {
            const ai = getGenAIClient();
            if (!ai) throw new Error("API Key is missing.");
            if (activeAgents.length === 0) throw new Error("No agents selected.");

            // Audio Setup
            inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: APP_CONFIG.AUDIO_SAMPLE_RATE_INPUT });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: APP_CONFIG.AUDIO_SAMPLE_RATE_OUTPUT });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Construct System Instruction (Multi-Agent Logic)
            const initialActive = activeAgents;

            const systemContext = `
          You are facilitating a team meeting. There are ${initialActive.length} participants (AI agents) and one user.
          You must roleplay ALL of the AI agents.
          
          PARTICIPANTS:
          ${initialActive.map(a => `
            - Name: ${a.name}
            - Role: ${a.role}
            - Personality: ${JSON.stringify(a.personality)}
            - Speech Speed: ${a.speechSpeed} (Adjust your speaking pace accordingly)
            - Description: ${a.description}
            - Knowledge Base: ${a.knowledgeBase || 'None'}
          `).join('\n')}

          RULES:
          1. When an agent speaks, start the sentence with "Name: ". Example: "Alex: I think we should..."
          2. Agents can talk to the user AND to each other. Encourage collaboration.
          3. Adjust your speaking speed and energy based on the current speaker's "Speech Speed" setting.
          4. IMPORTANT: When calling 'createFile' or 'generateImage', you MUST pass the correct 'agentId' for that agent.
          5. If a system message announces a new agent joining, incorporate them into the conversation immediately.
        `;

            // Inject Memories
            let memoryContext = "";
            initialActive.forEach(a => {
                if (a.memory.enabled) {
                    memoryContext += `\nMemory for ${a.name}:\n${getAgentMemory(a.id, a.memory.historyLimit)}\n`;
                }
            });

            const fullInstruction = `
        ${systemContext}
        
        Context:
        You are in a live Google Meet call.
        Access to shared file system enabled.
        Tools: 'createFile' (for text docs), 'generateImage' (for visuals/diagrams), 'presentFile'.
        
        ${memoryContext}
      `;

            // --- Determine Speech Config ---
            const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
            let voiceName = initialActive[0]?.voice || 'Puck';
            if (!validVoices.includes(voiceName)) voiceName = 'Puck';

            const speechConfig = {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: voiceName
                    }
                },
            };

            // --- Connect ---
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: fullInstruction,
                    speechConfig: speechConfig,
                    tools: [{ functionDeclarations: SESSION_TOOLS }],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        if (isMountedRef.current) {
                            setStatus('connected');
                            setupAudioInput(stream, sessionPromise);
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (!isMountedRef.current) return;
                        await handleServerMessage(message, sessionPromise, ai);
                    },
                    onclose: () => {
                        if (isMountedRef.current) setStatus('disconnected');
                    },
                    onerror: (e: any) => {
                        console.error('Session Error:', e);
                        if (isMountedRef.current) {
                            setStatus('error');
                            setErrorMsg(e.message || 'Connection failed.');
                        }
                    },
                },
            });

        } catch (err: any) {
            console.error('Init Error:', err);
            setStatus('error');
            setErrorMsg(err.message);
        }
    }, []);

    // Watch for new agents added to the prop
    useEffect(() => {
        if (activeAgents.length > prevAgentsLengthRef.current && sessionRef.current) {
            const newAgent = activeAgents[activeAgents.length - 1];

            const notification = `
         SYSTEM UPDATE: A new participant has joined the call.
         Name: ${newAgent.name}
         Role: ${newAgent.role}
         Description: ${newAgent.description}
         Voice: ${newAgent.voice}
         Personality: ${JSON.stringify(newAgent.personality)}
         
         Please welcome them and include them in the conversation.
       `;

            sessionRef.current.sendRealtimeInput({
                media: {
                    mimeType: "text/plain",
                    data: safeBtoa(notification)
                }
            });
        }
        prevAgentsLengthRef.current = activeAgents.length;
    }, [activeAgents]);

    const setupAudioInput = (stream: MediaStream, sessionPromise: Promise<any>) => {
        if (!inputContextRef.current) return;
        const source = inputContextRef.current.createMediaStreamSource(stream);
        const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            if (isMicMuted) return;
            const inputData = e.inputBuffer.getChannelData(0);

            setVolumeLevel(calculateVolumeLevel(inputData));

            const pcmBlob = createPcmBlob(inputData);
            sessionPromise.then((session) => {
                sessionRef.current = session;
                session.sendRealtimeInput({ media: pcmBlob });
            });
        };
        source.connect(processor);
        processor.connect(inputContextRef.current.destination);
    };

    const handleServerMessage = async (message: LiveServerMessage, sessionPromise: Promise<any>, ai: GoogleGenAI) => {

        // --- 1. Handle Tool Calls ---
        if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
                let result = {};

                try {
                    if (fc.name === 'createFile') {
                        const { fileName, content, fileType, agentId } = fc.args as any;
                        const creatorId = agentId || activeAgents[0].id;
                        const agentName = activeAgents.find(a => a.id === creatorId)?.name || 'AI Agent';
                        const newFile = createNewFile(creatorId, fileName, fileType, content, agentName);
                        setFiles(prev => [newFile, ...prev]);
                        result = { result: `File '${fileName}' created successfully.` };
                    }
                    else if (fc.name === 'generateImage') {
                        const { prompt, fileName, agentId } = fc.args as any;
                        const creatorId = agentId || activeAgents[0].id;
                        const agentName = activeAgents.find(a => a.id === creatorId)?.name || 'AI Agent';

                        const base64Image = await generateImage(prompt);

                        if (base64Image) {
                            const newFile = createNewFile(creatorId, fileName, 'image', base64Image, agentName);
                            setFiles(prev => [newFile, ...prev]);
                            setPresentedFile(newFile);
                            result = { result: `Image '${fileName}' generated and displayed.` };
                        } else {
                            result = { error: "Failed to generate image." };
                        }
                    }
                    else if (fc.name === 'presentFile') {
                        const { fileName } = fc.args as any;
                        const file = files.find(f => f.name === fileName);
                        if (file) {
                            setPresentedFile(file);
                            result = { result: `Presenting file '${fileName}' on screen.` };
                        } else {
                            result = { error: `File '${fileName}' not found.` };
                        }
                    }
                } catch (e: any) {
                    console.error("Tool Execution Error", e);
                    result = { error: e.message };
                }

                sessionPromise.then(session => {
                    session.sendToolResponse({
                        functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: result
                        }
                    });
                });
            }
        }

        // --- 2. Handle Transcription ---
        if (message.serverContent?.inputTranscription) {
            currentInputTransRef.current += message.serverContent.inputTranscription.text;
        }
        if (message.serverContent?.outputTranscription) {
            currentOutputTransRef.current += message.serverContent.outputTranscription.text;
        }

        if (message.serverContent?.turnComplete) {
            const userText = currentInputTransRef.current.trim();
            const modelText = currentOutputTransRef.current.trim();

            if (userText) {
                transcriptRef.current.push({ role: 'user', text: userText, timestamp: Date.now() });
            }
            if (modelText) {
                transcriptRef.current.push({ role: 'model', text: modelText, timestamp: Date.now() });
            }

            currentInputTransRef.current = '';
            currentOutputTransRef.current = '';
        }

        // --- 3. Handle Audio ---
        if (!audioContextRef.current) return;
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

        if (base64Audio) {
            const ctx = audioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio), ctx, APP_CONFIG.AUDIO_SAMPLE_RATE_OUTPUT, 1
            );
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
        }

        // --- 4. Interruption ---
        if (message.serverContent?.interrupted) {
            audioSourcesRef.current.forEach(src => src.stop());
            audioSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            currentOutputTransRef.current = '';
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        startSession();

        return () => {
            isMountedRef.current = false;
            hasStartedRef.current = false; // Allow restart after cleanup

            // Save transcript to ALL agents involved
            if (transcriptRef.current.length > 0) {
                activeAgents.forEach(a => {
                    if (a.memory.enabled) saveSessionTranscript(a.id, transcriptRef.current);
                });
            }

            if (sessionRef.current && typeof sessionRef.current.close === 'function') {
                sessionRef.current.close();
            }
            sessionRef.current = null; // Clear the session ref
            streamRef.current?.getTracks().forEach(track => track.stop());
            inputContextRef.current?.close();
            audioContextRef.current?.close();
            audioSourcesRef.current.forEach(src => { try { src.stop(); } catch (e) { } });
        };
    }, []);

    const renderFileIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon size={24} className="text-purple-400" />;
            case 'code': return <Code size={24} className="text-blue-400" />;
            default: return <FileText size={24} className="text-slate-400" />;
        }
    };

    const activeAgentIds = new Set(activeAgents.map(a => a.id));
    const availableToInvite = allAgents.filter(a => !activeAgentIds.has(a.id));

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl h-[85vh] bg-dark rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col relative">

                {/* Header */}
                <div className="h-16 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-600/10 text-red-500 rounded-full text-xs font-bold uppercase tracking-wider border border-red-600/20">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            Live Meet
                        </div>
                        <span className="text-slate-400">|</span>
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            {activeAgents.length > 1 ? (
                                <>
                                    <Users size={20} />
                                    Team Session ({activeAgents.length})
                                </>
                            ) : (
                                activeAgents[0]?.name || 'Connecting...'
                            )}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Main Stage */}
                <div className="flex-1 flex overflow-hidden relative">

                    {/* Left: Avatar Grid */}
                    <div className={`${presentedFile ? 'w-1/3' : 'w-full'} transition-all duration-500 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 relative border-r border-slate-800`}>

                        {/* Connection Status */}
                        {status !== 'connected' && (
                            <div className="absolute inset-0 z-20 bg-black/50 flex items-center justify-center">
                                <div className="text-white font-medium">{status === 'connecting' ? 'Connecting...' : errorMsg}</div>
                            </div>
                        )}

                        <div className="flex flex-wrap justify-center items-center gap-8 p-8 w-full">
                            {activeAgents.map((agent) => (
                                <div key={agent.id} className="relative flex flex-col items-center group animate-in zoom-in duration-300">
                                    <div
                                        className="absolute inset-0 rounded-full bg-primary/20 blur-xl transition-all duration-75"
                                        style={{ transform: `scale(${1 + volumeLevel * 0.5})`, opacity: volumeLevel }}
                                    ></div>

                                    <img
                                        src={`https://picsum.photos/id/${agent.avatarId}/300/300`}
                                        alt={agent.name}
                                        className="w-24 h-24 lg:w-32 lg:h-32 rounded-full border-4 border-slate-800 shadow-2xl relative z-10 object-cover"
                                    />
                                    <div className="mt-2 bg-slate-800/80 px-3 py-1 rounded-full text-sm font-medium text-white backdrop-blur-sm border border-slate-700">
                                        {agent.name}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="mt-auto mb-8 flex gap-4">
                            <button
                                onClick={() => setIsMicMuted(!isMicMuted)}
                                className={`p-4 rounded-full transition-all ${isMicMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                            >
                                {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setShowInvitePanel(!showInvitePanel)}
                                    className={`px-6 py-3 rounded-full transition-all text-white hover:bg-slate-700 flex items-center gap-2 font-bold shadow-lg ${showInvitePanel ? 'bg-primary' : 'bg-slate-800'}`}
                                >
                                    <Plus size={20} />
                                    Invite Agent
                                </button>

                                {/* Invite Popover */}
                                {showInvitePanel && (
                                    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-30">
                                        <div className="px-4 py-3 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/50">Available to Join</div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {availableToInvite.length === 0 ? (
                                                <div className="p-6 text-sm text-slate-500 text-center italic">All agents are already in the call.</div>
                                            ) : (
                                                availableToInvite.map(agent => (
                                                    <button
                                                        key={agent.id}
                                                        onClick={() => { onAddAgent(agent.id); setShowInvitePanel(false); }}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center gap-3 transition-colors border-b border-slate-700/50 last:border-0"
                                                    >
                                                        <div className="relative">
                                                            <img src={`https://picsum.photos/id/${agent.avatarId}/50`} className="w-8 h-8 rounded-full border border-slate-600" />
                                                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-slate-800"></div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-200">{agent.name}</div>
                                                            <div className="text-xs text-slate-400">{agent.role}</div>
                                                        </div>
                                                        <Plus size={16} className="ml-auto text-slate-500" />
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={onClose} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium shadow-lg shadow-red-900/20">
                                End Meeting
                            </button>
                        </div>
                    </div>

                    {/* Right: Screen Share / Files */}
                    {presentedFile && (
                        <div className="flex-1 bg-slate-100 flex flex-col animate-in slide-in-from-right duration-500">
                            <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
                                <div className="flex items-center gap-2">
                                    <Monitor size={16} className="text-blue-600" />
                                    <span className="font-semibold text-slate-700 text-sm">Screen Sharing: {presentedFile.name}</span>
                                </div>
                                <button onClick={() => setPresentedFile(null)} className="text-slate-400 hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 p-8 overflow-auto flex items-center justify-center bg-slate-50">
                                {presentedFile.type === 'image' ? (
                                    <div className="flex flex-col items-center">
                                        <img
                                            src={`data:image/png;base64,${presentedFile.content}`}
                                            alt="Generated"
                                            className="max-w-full max-h-[60vh] rounded-lg shadow-lg border border-slate-200"
                                        />
                                        <p className="mt-4 text-slate-500 text-sm italic">Generated by {activeAgents.find(a => a.id === presentedFile.agentId)?.name || 'AI'}</p>
                                    </div>
                                ) : (
                                    <pre className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-slate-800 font-mono text-sm w-full h-full overflow-auto whitespace-pre-wrap">
                                        {presentedFile.content}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Bottom Bar: Shared Files */}
                <div className="h-48 bg-slate-900 border-t border-slate-800 flex flex-col shrink-0">
                    <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shared Drive</span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-xs">{files.length} files</span>
                    </div>
                    <div className="flex-1 p-4 overflow-x-auto flex gap-4">
                        {files.length === 0 ? (
                            <div className="w-full flex items-center justify-center text-slate-600 text-sm italic">
                                No files generated in this session yet. Ask the team to create one.
                            </div>
                        ) : (
                            files.map(file => (
                                <div
                                    key={file.id}
                                    onClick={() => setPresentedFile(file)}
                                    className="min-w-[160px] w-[160px] bg-card hover:bg-slate-800 border border-slate-700 hover:border-primary/50 rounded-xl p-4 cursor-pointer transition-all group flex flex-col"
                                >
                                    <div className="flex-1 flex items-center justify-center mb-3">
                                        {renderFileIcon(file.type)}
                                    </div>
                                    <div className="text-sm font-medium text-slate-200 truncate">{file.name}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex justify-between">
                                        <span>{file.type.toUpperCase()}</span>
                                        <span className="group-hover:text-primary transition-colors">Open</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
