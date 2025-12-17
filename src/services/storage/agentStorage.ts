// Agent storage service

import { Agent } from '../../types';
import { STORAGE_KEYS } from '../../config/constants';
import { INITIAL_AGENTS } from '../../config/agents';

/**
 * Get all agents from localStorage
 * Returns initial agents if no saved data exists
 */
export function getAgents(): Agent[] {
    const saved = localStorage.getItem(STORAGE_KEYS.AGENTS);
    return saved ? JSON.parse(saved) : INITIAL_AGENTS;
}

/**
 * Save all agents to localStorage
 */
export function saveAgents(agents: Agent[]): void {
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
}

/**
 * Get a single agent by ID
 */
export function getAgentById(id: string): Agent | undefined {
    const agents = getAgents();
    return agents.find(a => a.id === id);
}

/**
 * Add a new agent
 */
export function addAgent(agent: Agent): Agent[] {
    const agents = getAgents();
    const updated = [...agents, agent];
    saveAgents(updated);
    return updated;
}

/**
 * Update an existing agent
 */
export function updateAgent(agent: Agent): Agent[] {
    const agents = getAgents();
    const updated = agents.map(a => a.id === agent.id ? agent : a);
    saveAgents(updated);
    return updated;
}

/**
 * Delete an agent by ID
 */
export function deleteAgent(id: string): Agent[] {
    const agents = getAgents();
    const updated = agents.filter(a => a.id !== id);
    saveAgents(updated);
    return updated;
}
