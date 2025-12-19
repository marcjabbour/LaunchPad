// src/services/agent-runtime/router/types.ts

/**
 * Represents the capability of an agent.
 * This aligns with the A2A protocol's concept of capabilities.
 */
export interface AgentCapability {
    name: string;
    description: string;
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
}

/**
 * Represents an Agent Card, used for discovery and registration.
 * Based on the A2A specification for advertising agent metadata.
 */
export interface AgentCard {
    id: string;
    name: string;
    description: string;
    version: string;
    capabilities: AgentCapability[];
    // Metadata for the backend execution environment
    runtimeConfig?: {
        type: 'adk' | 'langgraph' | 'mock';
        endpoint?: string; // URL for the actual agent service
        config?: Record<string, any>;
    };
}

/**
 * Standard message format for A2A communication.
 */
export interface A2AMessage {
    id: string;
    source: string;
    target: string;
    type: 'command' | 'response' | 'event';
    payload: any;
    timestamp: number;
}

/**
 * Interface for the Agent Registry.
 */
export interface AgentRegistry {
    register(agent: AgentCard): void;
    unregister(agentId: string): void;
    get(agentId: string): AgentCard | undefined;
    list(): AgentCard[];
    findCapableAgents(capabilityName: string): AgentCard[];
}


