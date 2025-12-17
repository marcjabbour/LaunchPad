// Application constants

// Storage keys for localStorage
export const STORAGE_KEYS = {
    AGENTS: 'team-ai-agents',
    FILES: 'team_ai_files',
    MEMORY: 'team_ai_memory',
} as const;

// App configuration
export const APP_CONFIG = {
    AUDIO_SAMPLE_RATE_INPUT: 16000,
    AUDIO_SAMPLE_RATE_OUTPUT: 24000,
    DEFAULT_SERVER_PORT: 3000,
} as const;
