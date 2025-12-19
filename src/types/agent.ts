// Agent-related types

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface PersonalityConfig {
  tone: 'Professional' | 'Casual' | 'Friendly' | 'Strict';
  verbosity: 'Concise' | 'Detailed' | 'Conversational';
  style: 'Analytical' | 'Creative' | 'Supportive' | 'Direct';
}

export interface MemoryConfig {
  enabled: boolean;
  historyLimit: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  voice: VoiceName;
  speechSpeed: 'Slow' | 'Normal' | 'Fast' | 'Hyper';
  personality: PersonalityConfig;
  memory: MemoryConfig;
  avatarId: number;
  knowledgeBase?: string;
  // A2A / Backend Configuration
  capabilities?: { name: string; description: string }[];
  runtimeConfig?: {
    type: 'adk' | 'langgraph' | 'mock';
    endpoint?: string;
    config?: Record<string, any>;
  };
}
