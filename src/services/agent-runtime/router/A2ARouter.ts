// src/services/agent-runtime/router/A2ARouter.ts

import { AgentCard, AgentRegistry } from './types';

/**
 * The A2A Router acts as the central switchboard for the agent system.
 * It manages the registry of available agents and routes messages to them.
 */
export class A2ARouter implements AgentRegistry {
    private agents: Map<string, AgentCard> = new Map();

    constructor() {
        console.log('[A2ARouter] Initialized');
    }

    /**
     * Registers an agent definition (Card) with the router.
     */
    register(agent: AgentCard): void {
        this.agents.set(agent.id, agent);
        console.log(`[A2ARouter] Registered agent: ${agent.name} (${agent.id})`);
    }

    unregister(agentId: string): void {
        this.agents.delete(agentId);
        console.log(`[A2ARouter] Unregistered agent: ${agentId}`);
    }

    get(agentId: string): AgentCard | undefined {
        return this.agents.get(agentId);
    }

    list(): AgentCard[] {
        return Array.from(this.agents.values());
    }

    findCapableAgents(capabilityName: string): AgentCard[] {
        return this.list().filter(agent =>
            agent.capabilities.some(cap => cap.name === capabilityName)
        );
    }

    /**
     * Routes a task to a specific agent.
     * @param targetId The ID of the agent to route to
     * @param task The task/capability name
     * @param payload The input data
     */
    async route(targetId: string, task: string, payload?: any): Promise<any> {
        const card = this.agents.get(targetId);

        if (!card) {
            throw new Error(`Agent ${targetId} not found.`);
        }

        // Remote Execution (Python Backend)
        console.log(`[A2ARouter] Routing task '${task}' to REMOTE backend agent ${card.name}`);

        try {
            const response = await fetch('http://localhost:8000/a2a/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetAgentId: targetId,
                    task: task,
                    input: payload?.message || payload // Handle different payload shapes
                })
            });

            if (!response.ok) {
                throw new Error(`Backend dispatch failed: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.status === 'error') {
                throw new Error(data.error || 'Unknown backend error');
            }

            return data.result;

        } catch (error) {
            console.error('[A2ARouter] Remote routing failed:', error);
            throw error;
        }
    }
}

// Singleton instance
export const router = new A2ARouter();
