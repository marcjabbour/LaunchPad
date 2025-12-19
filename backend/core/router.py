"""A2A Router for agent-to-agent communication."""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum

# A2A SDK will be integrated later
# from a2a import Server, Client

from agents.base_agent import BaseAgent
from core.dispatcher import DispatcherAgent

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """Types of messages in the A2A protocol."""
    REQUEST = "request"
    RESPONSE = "response"
    BROADCAST = "broadcast"
    COORDINATION = "coordination"
    AUDIO = "audio"
    TRANSCRIPT = "transcript"


@dataclass
class AgentMessage:
    """Message structure for agent communication."""
    type: MessageType
    sender_id: str
    recipient_id: Optional[str]  # None for broadcast
    content: Any
    metadata: Optional[Dict[str, Any]] = None


class A2ARouter:
    """Routes messages between agents using A2A protocol."""

    def __init__(self, dispatcher: DispatcherAgent):
        self.dispatcher = dispatcher
        self.server: Optional[Server] = None
        self.agents: Dict[str, BaseAgent] = {}
        self.message_handlers: Dict[MessageType, Callable] = {}
        self._setup_handlers()

    def _setup_handlers(self):
        """Set up message type handlers."""
        self.message_handlers = {
            MessageType.REQUEST: self._handle_request,
            MessageType.RESPONSE: self._handle_response,
            MessageType.BROADCAST: self._handle_broadcast,
            MessageType.COORDINATION: self._handle_coordination,
            MessageType.AUDIO: self._handle_audio,
            MessageType.TRANSCRIPT: self._handle_transcript,
        }

    async def initialize(self):
        """Initialize the A2A server."""
        try:
            # A2A server will be initialized here once SDK is configured
            # For now, just log initialization
            logger.info("A2A Router initialized (pending A2A SDK configuration)")

        except Exception as e:
            logger.error(f"Failed to initialize A2A Router: {e}")
            raise

    async def shutdown(self):
        """Shutdown the A2A router."""
        # Will shut down A2A server once configured
        logger.info("A2A Router shutdown")

    def register_agent(self, agent: BaseAgent):
        """Register an agent with the router."""
        agent_id = agent.config.id
        self.agents[agent_id] = agent

        # Also register with dispatcher
        self.dispatcher.register_agent(agent)

        logger.info(f"Registered agent {agent.config.name} with A2A Router")

    def unregister_agent(self, agent_id: str):
        """Unregister an agent from the router."""
        if agent_id in self.agents:
            agent_name = self.agents[agent_id].config.name
            del self.agents[agent_id]

            # Also unregister from dispatcher
            self.dispatcher.unregister_agent(agent_id)

            logger.info(f"Unregistered agent {agent_name} from A2A Router")

    async def route_message(self, message: AgentMessage) -> Optional[Any]:
        """Route a message to appropriate handler."""
        handler = self.message_handlers.get(message.type)
        if handler:
            return await handler(message)
        else:
            logger.warning(f"No handler for message type: {message.type}")
            return None

    async def _handle_request(self, message: AgentMessage) -> Any:
        """Handle request messages between agents."""
        recipient_id = message.recipient_id

        if recipient_id and recipient_id in self.agents:
            # Direct message to specific agent
            agent = self.agents[recipient_id]
            response = await agent.process_message(
                message.content,
                context=message.metadata
            )

            # Create response message
            response_msg = AgentMessage(
                type=MessageType.RESPONSE,
                sender_id=recipient_id,
                recipient_id=message.sender_id,
                content=response
            )

            return response_msg

        else:
            # Route through dispatcher for decision
            result = await self.dispatcher.process_input(message.content)
            return result

    async def _handle_response(self, message: AgentMessage) -> None:
        """Handle response messages."""
        logger.debug(f"Response from {message.sender_id}: {message.content[:100]}...")

    async def _handle_broadcast(self, message: AgentMessage) -> List[Any]:
        """Handle broadcast messages to all agents."""
        responses = []

        for agent_id, agent in self.agents.items():
            if agent_id != message.sender_id:  # Don't send back to sender
                try:
                    response = await agent.process_message(
                        message.content,
                        context={"broadcast": True, "sender": message.sender_id}
                    )
                    responses.append({
                        "agent_id": agent_id,
                        "response": response
                    })
                except Exception as e:
                    logger.error(f"Error broadcasting to {agent_id}: {e}")

        return responses

    async def _handle_coordination(self, message: AgentMessage) -> Any:
        """Handle coordination messages from dispatcher."""
        # These are internal coordination messages
        action = message.metadata.get("action")

        if action == "activate_agent":
            agent_id = message.metadata.get("agent_id")
            if agent_id in self.agents:
                self.agents[agent_id].activate()

        elif action == "deactivate_agent":
            agent_id = message.metadata.get("agent_id")
            if agent_id in self.agents:
                self.agents[agent_id].deactivate()

        elif action == "get_status":
            return {
                "active_agents": [
                    agent_id for agent_id, agent in self.agents.items()
                    if agent.is_active
                ]
            }

        return {"status": "coordination_handled"}

    async def _handle_audio(self, message: AgentMessage) -> None:
        """Handle audio messages for real-time communication."""
        # Audio routing logic for voice conversations
        audio_data = message.content
        recipient_id = message.recipient_id

        if recipient_id == "dispatcher":
            # Process through dispatcher for routing decision
            await self.dispatcher.process_input(audio_data)
        else:
            # Direct audio to specific agent if specified
            pass  # Implement audio processing

    async def _handle_transcript(self, message: AgentMessage) -> None:
        """Handle transcript updates."""
        transcript = message.content
        logger.debug(f"Transcript update from {message.sender_id}")

    async def facilitate_collaboration(self, topic: str, agent_ids: List[str]) -> Dict[str, Any]:
        """Facilitate collaboration between specific agents on a topic."""
        responses = {}

        for agent_id in agent_ids:
            if agent_id in self.agents:
                agent = self.agents[agent_id]
                other_agents = [
                    self.agents[other_id]
                    for other_id in agent_ids
                    if other_id != agent_id and other_id in self.agents
                ]

                response = await agent.collaborate(other_agents, topic)
                responses[agent_id] = response

        return responses

    def get_active_agents(self) -> List[str]:
        """Get list of currently active agents."""
        return [
            agent_id for agent_id, agent in self.agents.items()
            if agent.is_active
        ]

    def get_agent_summary(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get summary for a specific agent."""
        if agent_id in self.agents:
            return self.agents[agent_id].get_summary()
        return None

    async def broadcast_system_message(self, message: str):
        """Broadcast a system message to all agents."""
        broadcast_msg = AgentMessage(
            type=MessageType.BROADCAST,
            sender_id="system",
            recipient_id=None,
            content=message,
            metadata={"system": True}
        )

        await self.route_message(broadcast_msg)