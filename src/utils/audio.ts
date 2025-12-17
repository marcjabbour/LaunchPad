// Audio processing utilities

import { Blob as GenAIBlob } from '@google/genai';
import { arrayBufferToBase64 } from './base64';
import { APP_CONFIG } from '../config/constants';

/**
 * Create a PCM blob suitable for sending to the GenAI API
 * Converts Float32 audio data to Int16 PCM format
 */
export function createPcmBlob(data: Float32Array): GenAIBlob {
    const len = data.length;
    const int16 = new Int16Array(len);
    for (let i = 0; i < len; i++) {
        // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
        int16[i] = data[i] * 32768;
    }
    return {
        data: arrayBufferToBase64(int16.buffer),
        mimeType: `audio/pcm;rate=${APP_CONFIG.AUDIO_SAMPLE_RATE_INPUT}`,
    };
}

/**
 * Decode raw PCM audio data into an AudioBuffer for playback
 */
export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

/**
 * Calculate the RMS volume level from audio data
 * Returns a value between 0 and 1
 */
export function calculateVolumeLevel(inputData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
    }
    return Math.min(Math.sqrt(sum / inputData.length) * 5, 1);
}
