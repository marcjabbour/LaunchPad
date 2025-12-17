// Text-to-speech service

import { Modality } from '@google/genai';
import { getGenAIClient } from './client';
import { base64ToUint8Array, decodeAudioData } from '../../utils';
import { APP_CONFIG } from '../../config/constants';

/**
 * Generate a TTS preview for a given voice
 * Returns an AudioBuffer for playback, or null on failure
 */
export async function generateVoicePreview(
    voiceName: string,
    agentName: string = 'your agent'
): Promise<AudioBuffer | null> {
    const client = getGenAIClient();
    if (!client) return null;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `Hello! I am ${agentName}. This is my voice.` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) return null;

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: APP_CONFIG.AUDIO_SAMPLE_RATE_OUTPUT
        });

        const audioBuffer = await decodeAudioData(
            base64ToUint8Array(base64Audio),
            ctx,
            APP_CONFIG.AUDIO_SAMPLE_RATE_OUTPUT,
            1
        );

        return audioBuffer;
    } catch (error) {
        console.error('TTS Error:', error);
        return null;
    }
}

/**
 * Play an AudioBuffer and return a cleanup function
 */
export function playAudioBuffer(
    audioBuffer: AudioBuffer,
    onEnded?: () => void
): { stop: () => void; context: AudioContext } {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: APP_CONFIG.AUDIO_SAMPLE_RATE_OUTPUT
    });

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    if (onEnded) {
        source.onended = onEnded;
    }

    source.start();

    return {
        stop: () => {
            try {
                source.stop();
                ctx.close();
            } catch (e) {
                // Ignore errors during cleanup
            }
        },
        context: ctx
    };
}
