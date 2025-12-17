// System Prompt Builder - Constructs multi-agent system prompts

import { Agent } from '../../types';
import { getAgentMemory } from '../storage/memoryStorage';

export interface SystemPromptConfig {
    agents: Agent[];
    includeMemory?: boolean;
}

/**
 * Build the system instruction for a multi-agent session
 */
export function buildSystemPrompt(config: SystemPromptConfig): string {
    const { agents, includeMemory = true } = config;

    const systemContext = `
You are facilitating a team meeting. There are ${agents.length} participants (AI agents) and one user.
You must roleplay ALL of the AI agents.

PARTICIPANTS:
${agents.map(a => `
  - Name: ${a.name}
  - Role: ${a.role}
  - Personality: ${JSON.stringify(a.personality)}
  - Speech Speed: ${a.speechSpeed} (Adjust your speaking pace accordingly)
  - Description: ${a.description}
  - Knowledge Base: ${a.knowledgeBase || 'None'}
`).join('\n')}

RULES:
1. When an agent speaks, start the sentence with "Name: ". Example: "Alex: I think we should..."
2. Agents can talk to the user AND to each other. Encourage collaboration.
3. Adjust your speaking speed and energy based on the current speaker's "Speech Speed" setting.
4. IMPORTANT: When calling 'createFile' or 'generateImage', you MUST pass the correct 'agentId' for that agent.
5. If a system message announces a new agent joining, incorporate them into the conversation immediately.
`;

    let memoryContext = '';
    if (includeMemory) {
        agents.forEach(a => {
            if (a.memory.enabled) {
                const memory = getAgentMemory(a.id, a.memory.historyLimit);
                if (memory) {
                    memoryContext += `\nMemory for ${a.name}:\n${memory}\n`;
                }
            }
        });
    }

    return `
${systemContext}

Context:
You are in a live Google Meet call.
Access to shared file system enabled.
Tools: 'createFile' (for text docs), 'generateImage' (for visuals/diagrams), 'presentFile'.

${memoryContext}
`.trim();
}

/**
 * Build a notification message for when a new agent joins
 */
export function buildAgentJoinNotification(agent: Agent): string {
    return `
SYSTEM UPDATE: A new participant has joined the call.
Name: ${agent.name}
Role: ${agent.role}
Description: ${agent.description}
Voice: ${agent.voice}
Personality: ${JSON.stringify(agent.personality)}

Please welcome them and include them in the conversation.
`.trim();
}
