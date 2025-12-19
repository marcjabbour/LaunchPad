"""Audio processing utilities for handling audio streams."""

import base64
import logging
import numpy as np
from typing import Optional, Tuple, Any
import asyncio
import json

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Processes audio data between frontend and backend."""

    def __init__(
        self,
        input_sample_rate: int = 16000,
        output_sample_rate: int = 24000
    ):
        self.input_sample_rate = input_sample_rate
        self.output_sample_rate = output_sample_rate
        self.audio_buffer = bytearray()

    def base64_to_pcm(self, base64_audio: str) -> bytes:
        """Convert base64 encoded audio to PCM bytes."""
        try:
            return base64.b64decode(base64_audio)
        except Exception as e:
            logger.error(f"Error decoding base64 audio: {e}")
            raise

    def pcm_to_base64(self, pcm_data: bytes) -> str:
        """Convert PCM bytes to base64 encoded string."""
        try:
            return base64.b64encode(pcm_data).decode('utf-8')
        except Exception as e:
            logger.error(f"Error encoding PCM to base64: {e}")
            raise

    def resample_audio(
        self,
        audio_data: bytes,
        from_rate: int,
        to_rate: int
    ) -> bytes:
        """Resample audio from one sample rate to another."""
        try:
            # Convert bytes to numpy array
            audio_array = np.frombuffer(audio_data, dtype=np.int16)

            # Simple resampling (for production, use scipy.signal.resample)
            if from_rate == to_rate:
                return audio_data

            # Calculate resampling ratio
            ratio = to_rate / from_rate
            new_length = int(len(audio_array) * ratio)

            # Linear interpolation for resampling
            old_indices = np.arange(len(audio_array))
            new_indices = np.linspace(0, len(audio_array) - 1, new_length)
            resampled = np.interp(new_indices, old_indices, audio_array)

            return resampled.astype(np.int16).tobytes()

        except Exception as e:
            logger.error(f"Error resampling audio: {e}")
            raise

    def chunk_audio(self, audio_data: bytes, chunk_size: int = 4096) -> list:
        """Split audio data into chunks."""
        chunks = []
        for i in range(0, len(audio_data), chunk_size):
            chunks.append(audio_data[i:i + chunk_size])
        return chunks

    async def process_incoming_audio(self, audio_data: str) -> bytes:
        """Process incoming audio from frontend."""
        try:
            # Decode base64
            pcm_data = self.base64_to_pcm(audio_data)

            # Resample if needed (frontend usually sends 16kHz, Gemini expects 16kHz)
            processed = self.resample_audio(
                pcm_data,
                self.input_sample_rate,
                16000  # Gemini Live expects 16kHz
            )

            return processed

        except Exception as e:
            logger.error(f"Error processing incoming audio: {e}")
            raise

    async def process_outgoing_audio(self, audio_data: bytes) -> str:
        """Process outgoing audio to frontend."""
        try:
            # Resample from Gemini's output rate to frontend's expected rate
            resampled = self.resample_audio(
                audio_data,
                24000,  # Gemini Live outputs 24kHz
                self.output_sample_rate
            )

            # Convert to base64
            return self.pcm_to_base64(resampled)

        except Exception as e:
            logger.error(f"Error processing outgoing audio: {e}")
            raise


class AudioStreamManager:
    """Manages bidirectional audio streaming."""

    def __init__(self, processor: AudioProcessor):
        self.processor = processor
        self.input_queue = asyncio.Queue()
        self.output_queue = asyncio.Queue()
        self.is_streaming = False

    async def start_streaming(self):
        """Start the audio streaming process."""
        self.is_streaming = True
        logger.info("Audio streaming started")

    async def stop_streaming(self):
        """Stop the audio streaming process."""
        self.is_streaming = False
        logger.info("Audio streaming stopped")

    async def queue_input_audio(self, audio_data: str):
        """Queue incoming audio for processing."""
        if self.is_streaming:
            await self.input_queue.put(audio_data)

    async def get_input_audio(self) -> Optional[bytes]:
        """Get processed input audio from queue."""
        if not self.input_queue.empty():
            audio_data = await self.input_queue.get()
            return await self.processor.process_incoming_audio(audio_data)
        return None

    async def queue_output_audio(self, audio_data: bytes):
        """Queue outgoing audio for delivery."""
        if self.is_streaming:
            processed = await self.processor.process_outgoing_audio(audio_data)
            await self.output_queue.put(processed)

    async def get_output_audio(self) -> Optional[str]:
        """Get processed output audio from queue."""
        if not self.output_queue.empty():
            return await self.output_queue.get()
        return None


class VolumeAnalyzer:
    """Analyzes audio volume levels."""

    @staticmethod
    def calculate_volume(audio_data: bytes) -> float:
        """Calculate RMS volume level from PCM audio data."""
        try:
            # Convert to numpy array
            audio_array = np.frombuffer(audio_data, dtype=np.int16)

            # Calculate RMS (Root Mean Square)
            rms = np.sqrt(np.mean(audio_array.astype(np.float32) ** 2))

            # Normalize to 0-1 range
            max_value = 32768.0  # Max value for 16-bit audio
            normalized = rms / max_value

            return min(1.0, normalized)

        except Exception as e:
            logger.error(f"Error calculating volume: {e}")
            return 0.0

    @staticmethod
    def detect_silence(audio_data: bytes, threshold: float = 0.01) -> bool:
        """Detect if audio is silence based on volume threshold."""
        volume = VolumeAnalyzer.calculate_volume(audio_data)
        return volume < threshold