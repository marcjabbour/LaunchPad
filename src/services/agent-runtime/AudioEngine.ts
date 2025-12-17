// Audio Engine - Encapsulates all audio I/O handling

import { APP_CONFIG } from '../../config/constants';
import { createPcmBlob, decodeAudioData, calculateVolumeLevel, base64ToUint8Array } from '../../utils';
import { AudioEngineConfig } from './types';

export class AudioEngine {
    private inputContext: AudioContext | null = null;
    private outputContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private audioSources: Set<AudioBufferSourceNode> = new Set();
    private nextStartTime: number = 0;
    private _isMuted: boolean = false;
    private config: AudioEngineConfig;

    constructor(config: AudioEngineConfig) {
        this.config = config;
    }

    get isMuted(): boolean {
        return this._isMuted;
    }

    /**
     * Initialize audio contexts and start microphone capture
     */
    async start(): Promise<void> {
        // Create audio contexts
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.inputContext = new AudioContextClass({ sampleRate: this.config.inputSampleRate });
        this.outputContext = new AudioContextClass({ sampleRate: this.config.outputSampleRate });

        // Get microphone stream
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Set up audio processing
        const source = this.inputContext.createMediaStreamSource(this.stream);
        this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
            if (this._isMuted) return;

            const inputData = e.inputBuffer.getChannelData(0);
            this.config.onVolumeLevel(calculateVolumeLevel(inputData));

            const pcmBlob = createPcmBlob(inputData);
            this.config.onAudioChunk(pcmBlob);
        };

        source.connect(this.processor);
        this.processor.connect(this.inputContext.destination);
    }

    /**
     * Set mute state
     */
    setMuted(muted: boolean): void {
        this._isMuted = muted;
        if (muted) {
            this.config.onVolumeLevel(0);
        }
    }

    /**
     * Play audio data from the AI response
     */
    async playAudio(base64Audio: string): Promise<void> {
        if (!this.outputContext) return;

        this.nextStartTime = Math.max(this.nextStartTime, this.outputContext.currentTime);

        const audioBuffer = await decodeAudioData(
            base64ToUint8Array(base64Audio),
            this.outputContext,
            this.config.outputSampleRate,
            1
        );

        const source = this.outputContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputContext.destination);

        source.addEventListener('ended', () => {
            this.audioSources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.audioSources.add(source);
    }

    /**
     * Handle interruption - stop all playing audio
     */
    handleInterruption(): void {
        this.audioSources.forEach(src => {
            try {
                src.stop();
            } catch (e) {
                // Ignore errors from already stopped sources
            }
        });
        this.audioSources.clear();
        this.nextStartTime = 0;
    }

    /**
     * Clean up all audio resources
     */
    stop(): void {
        // Stop microphone
        this.stream?.getTracks().forEach(track => track.stop());

        // Disconnect processor
        this.processor?.disconnect();

        // Close contexts
        this.inputContext?.close();
        this.outputContext?.close();

        // Stop all playing audio
        this.handleInterruption();

        // Clear references
        this.stream = null;
        this.processor = null;
        this.inputContext = null;
        this.outputContext = null;
    }
}
