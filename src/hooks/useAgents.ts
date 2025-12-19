// src/hooks/useAgents.ts

import { useState, useEffect, useCallback } from 'react';
import { Agent } from '../types';
import { AgentManagerService } from '../services/agent-runtime/agents/AgentManagerService';
import { AgentCard } from '../services/agent-runtime/router/types';

interface UseAgentsReturn {
    agents: Agent[];
    addAgent: (agent: Agent) => Promise<void>;
    updateAgent: (agent: Agent) => void;
    deleteAgent: (id: string) => void;
    getAgentById: (id: string) => Agent | undefined;
}

/**
 * Hook for managing agents state.
 * Now primarily syncs with the Backend via AgentManagerService.
 */
export function useAgents(): UseAgentsReturn {
    const [agents, setAgents] = useState<Agent[]>([]);

    const fetchAgents = useCallback(async () => {
        const cards = await AgentManagerService.listAgents();
        const mappedAgents: Agent[] = cards.map(card => ({
            id: card.id,
            name: card.name,
            role: 'Specialist',
            description: card.description,
            voice: 'Puck', // Default
            speechSpeed: 'Normal',
            personality: {
                tone: 'Professional',
                verbosity: 'Concise',
                style: 'Analytical'
            },
            memory: { enabled: false, historyLimit: 10 },
            avatarId: 1,
            capabilities: card.capabilities,
            runtimeConfig: card.runtimeConfig
        }));
        setAgents(mappedAgents);
    }, []);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const addAgent = useCallback(async (agent: Agent) => {
        // Create agent in backend
        const card: AgentCard = {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            version: '1.0.0',
            capabilities: agent.capabilities || [],
            runtimeConfig: agent.runtimeConfig || { type: 'adk' } // Default to ADK
        };

        try {
            await AgentManagerService.createAgent(card);
            // Refresh list
            await fetchAgents();
        } catch (error) {
            console.error("Failed to add agent:", error);
            // Optionally handle error state here
        }
    }, [fetchAgents]);

    const updateAgent = useCallback((agent: Agent) => {
        // For now, we don't support updating backend agents via this hook
        // But we can update the local state optimistically if needed
        setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    }, []);

    const deleteAgent = useCallback((id: string) => {
        // TODO: Implement delete in backend
        setAgents(prev => prev.filter(a => a.id !== id));
    }, []);

    const getAgentById = useCallback((id: string): Agent | undefined => {
        return agents.find(a => a.id === id);
    }, [agents]);

    return {
        agents,
        addAgent,
        updateAgent,
        deleteAgent,
        getAgentById,
    };
}
