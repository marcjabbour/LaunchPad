"""Base agent class using Google ADK."""

import logging
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass

from google import adk
from google.adk import Agent
import google.genai as genai

from config.settings import settings

logger = logging.getLogger(__name__)

# Configure Google AI
client = genai.Client(api_key=settings.google_api_key)


@dataclass
class AgentConfig:
    """Configuration for an agent."""
    id: str
    name: str
    role: str
    description: str
    voice: str
    speech_speed: str
    personality: Dict[str, str]
    memory: Dict[str, Any]
    knowledge_base: Optional[str] = None
    tools: Optional[List[Any]] = None


class BaseAgent:
    """Base class for all specialist agents using Google ADK."""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.agent = self._create_agent()
        self.conversation_history: List[Dict[str, str]] = []
        self.is_active = False

    def _create_agent(self) -> Agent:
        """Create the ADK agent with proper configuration."""
        instruction = self._build_instruction()

        agent = Agent(
            name=self.config.name,
            model=settings.specialist_model,
            instructions=instruction,
            tools=self.config.tools or [],
        )

        logger.info(f"Created agent: {self.config.name} ({self.config.role})")
        return agent

    def _build_instruction(self) -> str:
        """Build the system instruction for the agent."""
        personality = self.config.personality
        instruction = f"""
You are {self.config.name}, a {self.config.role}.

ROLE DESCRIPTION:
{self.config.description}

PERSONALITY:
- Tone: {personality.get('tone', 'Professional')}
- Verbosity: {personality.get('verbosity', 'Concise')}
- Style: {personality.get('style', 'Direct')}

COMMUNICATION STYLE:
- Speak naturally as if in a real conversation
- Use appropriate filler words and natural speech patterns
- Be conversational but stay in character
- Remember you are in a multi-agent discussion

IMPORTANT:
- Always respond as {self.config.name}
- Stay in character throughout the conversation
- Be collaborative with other agents in the discussion
- When you don't have expertise on a topic, defer to other agents
"""

        if self.config.knowledge_base:
            instruction += f"\n\nKNOWLEDGE BASE: You have access to {self.config.knowledge_base}"

        return instruction.strip()

    async def process_message(self, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Process a message and return the agent's response."""
        try:
            # Add message to conversation history
            self.conversation_history.append({"role": "user", "content": message})

            # Generate response using ADK agent
            response = await self.agent.run_async(message)

            # Add response to conversation history
            response_text = response if isinstance(response, str) else str(response)
            self.conversation_history.append({"role": "assistant", "content": response_text})

            # Trim conversation history if memory limit exceeded
            if self.config.memory.get("enabled") and self.config.memory.get("historyLimit"):
                limit = self.config.memory.get("historyLimit", 10) * 2  # user + assistant messages
                if len(self.conversation_history) > limit:
                    self.conversation_history = self.conversation_history[-limit:]

            return response_text

        except Exception as e:
            logger.error(f"Error processing message for {self.config.name}: {e}")
            raise

    async def reset(self):
        """Reset the agent's conversation history."""
        self.conversation_history = []
        logger.info(f"Reset conversation history for {self.config.name}")

    def activate(self):
        """Mark the agent as active in the conversation."""
        self.is_active = True

    def deactivate(self):
        """Mark the agent as inactive."""
        self.is_active = False

    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the agent's current state."""
        return {
            "id": self.config.id,
            "name": self.config.name,
            "role": self.config.role,
            "is_active": self.is_active,
            "conversation_turns": len(self.conversation_history) // 2,
            "voice": self.config.voice,
            "speech_speed": self.config.speech_speed
        }


class SpecialistAgent(BaseAgent):
    """Specialist agent with domain-specific capabilities."""

    def __init__(self, config: AgentConfig, custom_tools: Optional[List[Callable]] = None):
        # Add custom tools if provided
        if custom_tools:
            config.tools = (config.tools or []) + custom_tools
        super().__init__(config)

    async def collaborate(self, other_agents: List['SpecialistAgent'], topic: str) -> str:
        """Collaborate with other agents on a topic."""
        context = {
            "collaborators": [agent.config.name for agent in other_agents],
            "topic": topic
        }

        prompt = f"""
You are in a discussion with {', '.join(context['collaborators'])} about: {topic}

Provide your expert perspective as {self.config.role}.
If this is outside your expertise, acknowledge that and suggest which colleague might be better suited.
"""

        return await self.process_message(prompt, context)