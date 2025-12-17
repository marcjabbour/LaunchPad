// Text generation service

import { getGenAIClient } from './client';
import { PersonalityConfig } from '../../types';

/**
 * Enhance an agent's system instruction using AI
 */
export async function enhanceAgentDescription(
    currentDescription: string,
    personality: PersonalityConfig
): Promise<string | null> {
    const client = getGenAIClient();
    if (!client || !currentDescription) return null;

    try {
        const prompt = `
      Rewrite the following AI agent system instruction to be more effective, role-specific, and aligned with these personality traits:
      Tone: ${personality.tone}, Style: ${personality.style}.
      
      Current Instruction: "${currentDescription}"
      
      Keep it under 150 words. Output ONLY the rewritten instruction.
    `;

        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        return response.text?.trim() || null;
    } catch (error) {
        console.error('Failed to enhance description:', error);
        return null;
    }
}
