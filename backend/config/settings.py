"""Configuration settings for the backend service."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

    # API Keys
    google_api_key: str = Field(..., description="Google API key for Gemini")

    # Server Configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    cors_origins: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        description="Allowed CORS origins"
    )

    # Audio Configuration
    audio_sample_rate_input: int = Field(
        default=16000,
        description="Input audio sample rate"
    )
    audio_sample_rate_output: int = Field(
        default=24000,
        description="Output audio sample rate"
    )

    # Session Configuration
    max_session_duration: int = Field(
        default=3600,
        description="Maximum session duration in seconds"
    )
    max_agents_per_session: int = Field(
        default=10,
        description="Maximum number of agents per session"
    )

    # Model Configuration
    dispatcher_model: str = Field(
        default="gemini-2.0-flash-exp",
        description="Model for the dispatcher agent"
    )
    specialist_model: str = Field(
        default="gemini-2.0-flash-exp",
        description="Default model for specialist agents"
    )

    # Logging
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )


settings = Settings()