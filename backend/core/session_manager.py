"""Session manager for handling multi-agent sessions."""

import asyncio
import logging
import uuid
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime

from core.dispatcher import DispatcherAgent
from core.router import A2ARouter, AgentMessage, MessageType
from agents.factory import AgentRegistry, AgentFactory

logger = logging.getLogger(__name__)


@dataclass
class Session:
    """Represents an active multi-agent session."""
    id: str
    client_id: str
    agents: List[Dict[str, Any]]
    dispatcher: DispatcherAgent
    router: A2ARouter
    registry: AgentRegistry
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True
    transcript: List[Dict[str, Any]] = field(default_factory=list)

    # Callbacks for events
    on_transcript_update: Optional[Callable] = None
    on_agent_speaking: Optional[Callable] = None
    on_session_end: Optional[Callable] = None

    async def start(self):
        """Start the session."""
        try:
            # Initialize router
            await self.router.initialize()

            # Create and register agents
            for agent_config in self.agents:
                agent_id = self.registry.create_and_register_agent(agent_config)
                agent = self.registry.get_agent(agent_id)
                if agent:
                    self.router.register_agent(agent)

            logger.info(f"Session {self.id} started with {len(self.agents)} agents")
            self.is_active = True

        except Exception as e:
            logger.error(f"Failed to start session {self.id}: {e}")
            raise

    async def process_audio(self, audio_data: str):
        """Process incoming audio data."""
        # For now, we'll process as text (audio transcription would happen here)
        await self.process_text(audio_data)

    async def process_text(self, text: str):
        """Process text input through the dispatcher."""
        try:
            # Add to transcript
            self.transcript.append({
                "role": "user",
                "content": text,
                "timestamp": datetime.now().isoformat()
            })

            # Process through dispatcher
            result = await self.dispatcher.process_input(text)

            # Add response to transcript
            self.transcript.append({
                "role": "assistant",
                "content": result.get("text"),
                "agent": result.get("speaking_agent"),
                "timestamp": datetime.now().isoformat()
            })

            # Trigger callbacks
            if self.on_transcript_update:
                await self.on_transcript_update(self.transcript)

            if self.on_agent_speaking and result.get("agent_id"):
                await self.on_agent_speaking(result.get("agent_id"))

            return result

        except Exception as e:
            logger.error(f"Error processing text in session {self.id}: {e}")
            raise

    async def add_agent(self, agent_config: Dict[str, Any]):
        """Add a new agent to the session."""
        try:
            agent_id = self.registry.create_and_register_agent(agent_config)
            agent = self.registry.get_agent(agent_id)

            if agent:
                self.router.register_agent(agent)
                self.agents.append(agent_config)
                logger.info(f"Added agent {agent.config.name} to session {self.id}")

                # Notify other agents
                await self.router.broadcast_system_message(
                    f"{agent.config.name} has joined the conversation."
                )

        except Exception as e:
            logger.error(f"Failed to add agent to session {self.id}: {e}")
            raise

    async def remove_agent(self, agent_id: str):
        """Remove an agent from the session."""
        try:
            agent = self.registry.get_agent(agent_id)
            if agent:
                agent_name = agent.config.name
                self.router.unregister_agent(agent_id)
                self.registry.unregister_agent(agent_id)

                # Remove from agents list
                self.agents = [a for a in self.agents if a.get("id") != agent_id]

                logger.info(f"Removed agent {agent_name} from session {self.id}")

                # Notify other agents
                await self.router.broadcast_system_message(
                    f"{agent_name} has left the conversation."
                )

        except Exception as e:
            logger.error(f"Failed to remove agent from session {self.id}: {e}")
            raise

    async def end(self) -> Dict[str, Any]:
        """End the session and return summary."""
        try:
            # Generate session summary
            summary = await self.dispatcher.end_session()
            summary.update({
                "session_id": self.id,
                "duration": (datetime.now() - self.created_at).total_seconds(),
                "transcript": self.transcript,
                "agents_involved": [a.get("name") for a in self.agents]
            })

            # Shutdown router
            await self.router.shutdown()

            # Clear registry
            self.registry.clear_all()

            self.is_active = False

            # Trigger callback
            if self.on_session_end:
                await self.on_session_end(summary)

            logger.info(f"Session {self.id} ended")
            return summary

        except Exception as e:
            logger.error(f"Error ending session {self.id}: {e}")
            raise


class SessionManager:
    """Manages multiple concurrent sessions."""

    def __init__(self):
        self.sessions: Dict[str, Session] = {}

    async def create_session(
        self,
        client_id: str,
        agents: List[Dict[str, Any]],
        config: Optional[Dict[str, Any]] = None
    ) -> Session:
        """Create a new session."""
        session_id = str(uuid.uuid4())

        # Create components for the session
        dispatcher = DispatcherAgent()
        router = A2ARouter(dispatcher)
        registry = AgentRegistry()

        # Create session
        session = Session(
            id=session_id,
            client_id=client_id,
            agents=agents,
            dispatcher=dispatcher,
            router=router,
            registry=registry
        )

        self.sessions[client_id] = session
        logger.info(f"Created session {session_id} for client {client_id}")

        return session

    def get_session(self, client_id: str) -> Optional[Session]:
        """Get session by client ID."""
        return self.sessions.get(client_id)

    async def end_session(self, client_id: str) -> Dict[str, Any]:
        """End a session and return summary."""
        session = self.sessions.get(client_id)

        if session:
            summary = await session.end()
            del self.sessions[client_id]
            return summary

        return {"error": "Session not found"}

    def get_active_sessions(self) -> List[str]:
        """Get list of active session IDs."""
        return [
            session.id for session in self.sessions.values()
            if session.is_active
        ]

    async def cleanup_inactive_sessions(self, max_age_seconds: int = 3600):
        """Clean up inactive or old sessions."""
        current_time = datetime.now()
        sessions_to_remove = []

        for client_id, session in self.sessions.items():
            age = (current_time - session.created_at).total_seconds()
            if not session.is_active or age > max_age_seconds:
                sessions_to_remove.append(client_id)

        for client_id in sessions_to_remove:
            await self.end_session(client_id)
            logger.info(f"Cleaned up session for client {client_id}")