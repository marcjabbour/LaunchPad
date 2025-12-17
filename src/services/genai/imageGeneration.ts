// Image generation service

import { getGenAIClient } from './client';

/**
 * Generate an image from a prompt
 * Returns base64 encoded image data or null on failure
 */
export async function generateImage(prompt: string): Promise<string | null> {
    const client = getGenAIClient();
    if (!client) return null;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: prompt
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data || null;
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Image generation error:', error);
        return null;
    }
}
