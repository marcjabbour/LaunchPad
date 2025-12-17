// GenAI client singleton

import { GoogleGenAI } from '@google/genai';

let clientInstance: GoogleGenAI | null = null;

/**
 * Get or create the GenAI client singleton
 * Returns null if no API key is configured
 */
export function getGenAIClient(): GoogleGenAI | null {
    if (!process.env.API_KEY) {
        console.warn('API_KEY not configured');
        return null;
    }

    if (!clientInstance) {
        clientInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    return clientInstance;
}

/**
 * Check if the API is configured
 */
export function isApiConfigured(): boolean {
    return !!process.env.API_KEY;
}
