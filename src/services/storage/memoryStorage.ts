// Memory storage service

import { SessionTranscript, TranscriptTurn } from '../../types';
import { STORAGE_KEYS } from '../../config/constants';

/**
 * Get agent memory context as a formatted string
 */
export function getAgentMemory(agentId: string, limit: number): string {
    if (limit === 0) return '';

    const raw = localStorage.getItem(STORAGE_KEYS.MEMORY);
    if (!raw) return '';

    const allSessions: SessionTranscript[] = JSON.parse(raw);
    const agentSessions = allSessions
        .filter(s => s.agentId === agentId)
        .sort((a, b) => b.timestamp - a.timestamp) // Newest first
        .slice(0, limit)
        .reverse(); // Oldest to newest for context

    if (agentSessions.length === 0) return '';

    let contextString = "\n\n--- PREVIOUS CONVERSATION MEMORY ---\n";
    agentSessions.forEach((session, index) => {
        contextString += `\n[Session ${index + 1} - ${new Date(session.timestamp).toLocaleDateString()}]\n`;
        session.turns.forEach(turn => {
            contextString += `${turn.role === 'user' ? 'User' : 'Agent'}: ${turn.text}\n`;
        });
    });
    contextString += "\n--- END MEMORY ---\nUse this context to recall past details, but do not repeat it verbatim.\n";

    return contextString;
}

/**
 * Save a session transcript to memory
 */
export function saveSessionTranscript(agentId: string, turns: TranscriptTurn[]): void {
    if (turns.length === 0) return;

    const raw = localStorage.getItem(STORAGE_KEYS.MEMORY);
    const allSessions: SessionTranscript[] = raw ? JSON.parse(raw) : [];

    const newSession: SessionTranscript = {
        id: crypto.randomUUID(),
        agentId,
        timestamp: Date.now(),
        turns
    };

    allSessions.push(newSession);
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(allSessions));
}

/**
 * Clear all memory for a specific agent
 */
export function clearAgentMemory(agentId: string): void {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMORY);
    if (!raw) return;

    const allSessions: SessionTranscript[] = JSON.parse(raw);
    const filtered = allSessions.filter(s => s.agentId !== agentId);
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(filtered));
}
