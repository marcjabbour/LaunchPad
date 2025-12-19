// src/services/agent-runtime/agents/AgentManagerService.ts

import { router } from '../router/A2ARouter';
import { AgentCard } from '../router/types';

const BACKEND_URL = 'http://localhost:8000';

/**
 * Service for managing the lifecycle of agents via the Python Backend.
 */
export class AgentManagerService {

    /**
     * Fetches the list of available agents from the backend and registers them with the router.
     */
    static async listAgents(): Promise<AgentCard[]> {
        console.log('[AgentManagerService] Fetching agents from backend...');
        try {
            const response = await fetch(`${BACKEND_URL}/a2a/agents`);
            if (!response.ok) {
                throw new Error(`Failed to fetch agents: ${response.statusText}`);
            }

            const agents: AgentCard[] = await response.json();

            // Sync with Router
            agents.forEach(card => {
                router.register(card);
            });

            return agents;

        } catch (error) {
            console.error('[AgentManagerService] List failed:', error);
            return [];
        }
    }

    /**
     * Creates a new agent in the backend.
     */
    static async createAgent(card: AgentCard): Promise<AgentCard> {
        console.log(`[AgentManagerService] Creating agent: ${card.name}`);
        try {
            const response = await fetch(`${BACKEND_URL}/a2a/agents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create agent');
            }

            const createdAgent: AgentCard = await response.json();

            // Register locally immediately
            router.register(createdAgent);

            return createdAgent;

        } catch (error) {
            console.error('[AgentManagerService] Create failed:', error);
            throw error;
        }
    }
}
