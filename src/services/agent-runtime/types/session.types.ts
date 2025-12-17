// Agent Runtime types and interfaces

import { Agent, AgentFile, TranscriptTurn } from '../../../types';

// ============================================================================
// Session Types
// ============================================================================

export type SessionState = 'connecting' | 'connected' | 'error' | 'disconnected';

export interface SessionConfig {
    agents: Agent[];
    onFileCreated?: (file: AgentFile) => void;
    onTranscriptUpdate?: (transcript: TranscriptTurn[]) => void;
    onSessionEnd?: () => void;
}

// ============================================================================
// Event Types
// ============================================================================

export interface SessionEvents {
    stateChange: (state: SessionState, error?: string) => void;
    audioOutput: (audioData: ArrayBuffer) => void;
    volumeLevel: (level: number) => void;
    transcription: (transcript: TranscriptTurn[]) => void;
    fileCreated: (file: AgentFile) => void;
    filePresented: (file: AgentFile | null) => void;
    error: (error: Error) => void;
}

// ============================================================================
// Tool Types
// ============================================================================

export interface ToolContext {
    agents: Agent[];
    files: AgentFile[];
    getAgentName: (agentId: string) => string;
}

export interface ToolResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

export interface ToolHandler {
    name: string;
    declaration: object; // FunctionDeclaration from @google/genai
    execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

// ============================================================================
// AI Provider Types (for future provider switching)
// ============================================================================

export interface AIProviderConfig {
    model: string;
    systemInstruction: string;
    tools: object[];
    voiceName?: string;
}

export interface AIProviderCallbacks {
    onOpen: () => void;
    onMessage: (message: unknown) => void;
    onClose: () => void;
    onError: (error: Error) => void;
}

export interface AIProvider {
    connect(config: AIProviderConfig, callbacks: AIProviderCallbacks): Promise<AISession>;
}

export interface AISession {
    sendRealtimeInput(input: { media: { mimeType: string; data: string } }): void;
    sendToolResponse(response: { functionResponses: object }): void;
    close(): void;
}

// ============================================================================
// Audio Types
// ============================================================================

export interface AudioEngineConfig {
    inputSampleRate: number;
    outputSampleRate: number;
    onVolumeLevel: (level: number) => void;
    onAudioChunk: (pcmBlob: object) => void;
}
