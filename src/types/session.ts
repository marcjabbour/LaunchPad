// Session-related types

export interface TranscriptTurn {
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface SessionTranscript {
    id: string;
    agentId: string;
    timestamp: number;
    turns: TranscriptTurn[];
}

export type ViewState = 'dashboard' | 'edit' | 'create' | 'live-session' | 'documents' | 'integrations';
