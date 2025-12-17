// useAgents hook - Agent state management

import { useState, useEffect, useCallback } from 'react';
import { Agent } from '../types';
import { getAgents, saveAgents } from '../services/storage/agentStorage';

interface UseAgentsReturn {
    agents: Agent[];
    addAgent: (agent: Agent) => void;
    updateAgent: (agent: Agent) => void;
    deleteAgent: (id: string) => void;
    getAgentById: (id: string) => Agent | undefined;
}

/**
 * Hook for managing agents state with localStorage persistence
 */
export function useAgents(): UseAgentsReturn {
    const [agents, setAgents] = useState<Agent[]>(() => getAgents());

    // Persist to localStorage whenever agents change
    useEffect(() => {
        saveAgents(agents);
    }, [agents]);

    const addAgent = useCallback((agent: Agent) => {
        setAgents(prev => [...prev, agent]);
    }, []);

    const updateAgent = useCallback((agent: Agent) => {
        setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    }, []);

    const deleteAgent = useCallback((id: string) => {
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
