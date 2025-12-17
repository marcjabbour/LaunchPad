// File-related types

export interface FileVersion {
    content: string;
    timestamp: number;
    author: string;
}

export interface AgentFile {
    id: string;
    name: string;
    type: 'pdf' | 'doc' | 'image' | 'sheet' | 'code';
    content: string;
    createdAt: number;
    updatedAt: number;
    agentId: string;
    versions: FileVersion[];
}
