"""Dispatcher agent for routing requests to specialist agents."""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from enum import Enum

from google import adk
from google.adk import Agent
import google.genai as genai

from config.settings import settings
from agents.base_agent import BaseAgent, AgentConfig

logger = logging.getLogger(__name__)

# Configure Google AI
client = genai.Client(api_key=settings.google_api_key)


class RoutingDecision(Enum):
    """Types of routing decisions."""
    SINGLE_AGENT = "single"
    MULTIPLE_AGENTS = "multiple"
    CLARIFICATION = "clarification"
    GENERAL = "general"


class DispatcherAgent:
    """Main dispatcher agent that routes requests to specialist agents."""

    def __init__(self):
        self.agent = self._create_dispatcher_agent()
        self.specialist_agents: Dict[str, BaseAgent] = {}
        self.current_speaker: Optional[str] = None
        self.conversation_context: List[Dict[str, str]] = []

    def _create_dispatcher_agent(self) -> Agent:
        """Create the dispatcher ADK agent."""
        instruction = """
You are the Session Coordinator, responsible for managing multi-agent conversations.

YOUR ROLE:
1. Listen to user input and determine which specialist agent(s) should respond
2. Route questions to the most appropriate agent based on their expertise
3. Facilitate natural conversation flow between agents
4. Ensure smooth turn-taking and prevent agents from talking over each other
5. Synthesize responses when multiple agents need to contribute

AVAILABLE AGENTS will be provided in the context. Each has specific expertise.

ROUTING GUIDELINES:
- For technical questions → route to relevant technical specialist
- For design questions → route to UX Designer
- For product/business questions → route to Product Manager
- For general discussion → facilitate group conversation
- When unclear → ask for clarification

CONVERSATION FLOW:
- Announce who will be speaking next (e.g., "Let me have Sarah from UX address this...")
- Allow agents to build on each other's points
- Encourage collaboration between agents
- Keep the conversation natural and flowing

IMPORTANT:
- You are NOT answering questions directly
- You are facilitating and routing to the right experts
- Maintain conversation continuity and context
- Be brief in your coordination - don't over-explain
"""

        agent = Agent(
            name="Session_Coordinator",
            model=settings.dispatcher_model,
            instructions=instruction,
            tools=[self._route_to_agent, self._get_agent_status],
        )

        logger.info("Created Dispatcher agent")
        return agent

    def _route_to_agent(self, agent_name: str, message: str) -> str:
        """Tool for routing messages to specific agents."""
        # This will be called by the dispatcher to route messages
        return f"Routing to {agent_name}: {message}"

    def _get_agent_status(self) -> Dict[str, Any]:
        """Tool for getting current agent status."""
        return {
            agent_id: agent.get_summary()
            for agent_id, agent in self.specialist_agents.items()
        }

    def register_agent(self, agent: BaseAgent):
        """Register a specialist agent with the dispatcher."""
        agent_id = agent.config.id
        self.specialist_agents[agent_id] = agent
        logger.info(f"Registered agent: {agent.config.name} (ID: {agent_id})")

    def unregister_agent(self, agent_id: str):
        """Unregister a specialist agent."""
        if agent_id in self.specialist_agents:
            agent_name = self.specialist_agents[agent_id].config.name
            del self.specialist_agents[agent_id]
            logger.info(f"Unregistered agent: {agent_name} (ID: {agent_id})")

    async def process_input(self, user_input: str) -> Dict[str, Any]:
        """Process user input and route to appropriate agent(s)."""
        try:
            # Add to conversation context
            self.conversation_context.append({"role": "user", "content": user_input})

            # Get routing decision from dispatcher
            routing_decision = await self._get_routing_decision(user_input)

            # Execute routing decision
            response = await self._execute_routing(routing_decision, user_input)

            # Add response to conversation context
            self.conversation_context.append({"role": "assistant", "content": response["text"]})

            return response

        except Exception as e:
            logger.error(f"Error processing input: {e}")
            return {
                "error": str(e),
                "text": "I'm having trouble processing that request.",
                "speaking_agent": None
            }

    async def _get_routing_decision(self, user_input: str) -> Dict[str, Any]:
        """Get routing decision from dispatcher agent."""
        # Build context with available agents
        agents_context = {
            "available_agents": [
                {
                    "id": agent.config.id,
                    "name": agent.config.name,
                    "role": agent.config.role,
                    "description": agent.config.description
                }
                for agent in self.specialist_agents.values()
            ],
            "current_speaker": self.current_speaker,
            "conversation_history": self.conversation_context[-10:]  # Last 10 turns
        }

        prompt = f"""
User said: "{user_input}"

Available agents:
{self._format_agents_list(agents_context['available_agents'])}

Determine which agent(s) should respond to this input.
If multiple agents should collaborate, list them in order of who should speak.
Respond with your routing decision and brief coordination message.
"""

        response = await self.agent.run_async(prompt)

        # Parse the response to extract routing decision
        return self._parse_routing_decision(response.text)

    def _format_agents_list(self, agents: List[Dict[str, str]]) -> str:
        """Format agents list for the prompt."""
        return "\n".join([
            f"- {agent['name']} ({agent['role']}): {agent['description']}"
            for agent in agents
        ])

    def _parse_routing_decision(self, response: str) -> Dict[str, Any]:
        """Parse the dispatcher's response to extract routing decision."""
        # This is a simplified parser - in production, use structured output
        response_lower = response.lower()

        # Extract agent names mentioned
        selected_agents = []
        for agent in self.specialist_agents.values():
            if agent.config.name.lower() in response_lower:
                selected_agents.append(agent.config.id)

        # Determine routing type
        if not selected_agents:
            routing_type = RoutingDecision.GENERAL
        elif len(selected_agents) == 1:
            routing_type = RoutingDecision.SINGLE_AGENT
        else:
            routing_type = RoutingDecision.MULTIPLE_AGENTS

        return {
            "type": routing_type,
            "agents": selected_agents,
            "coordination_message": response
        }

    async def _execute_routing(self, routing_decision: Dict[str, Any], user_input: str) -> Dict[str, Any]:
        """Execute the routing decision."""
        routing_type = routing_decision["type"]
        selected_agents = routing_decision["agents"]
        coordination_msg = routing_decision["coordination_message"]

        if routing_type == RoutingDecision.GENERAL:
            # Dispatcher handles general conversation
            return {
                "text": coordination_msg,
                "speaking_agent": "Session_Coordinator",
                "agent_id": None
            }

        elif routing_type == RoutingDecision.SINGLE_AGENT:
            # Route to single agent
            agent_id = selected_agents[0]
            agent = self.specialist_agents[agent_id]

            # Get agent's response
            agent_response = await agent.process_message(user_input)

            # Update current speaker
            self.current_speaker = agent_id

            return {
                "text": agent_response,
                "speaking_agent": agent.config.name,
                "agent_id": agent_id,
                "coordination": coordination_msg
            }

        elif routing_type == RoutingDecision.MULTIPLE_AGENTS:
            # Multiple agents need to respond
            responses = []

            for agent_id in selected_agents:
                agent = self.specialist_agents[agent_id]
                agent_response = await agent.process_message(user_input)
                responses.append({
                    "agent": agent.config.name,
                    "response": agent_response
                })

            # Combine responses
            combined_response = self._combine_responses(responses)

            return {
                "text": combined_response,
                "speaking_agents": [r["agent"] for r in responses],
                "coordination": coordination_msg
            }

        else:
            return {
                "text": "I need more information to route your request properly.",
                "speaking_agent": "Session_Coordinator",
                "agent_id": None
            }

    def _combine_responses(self, responses: List[Dict[str, str]]) -> str:
        """Combine responses from multiple agents."""
        combined = []
        for resp in responses:
            combined.append(f"[{resp['agent']}]: {resp['response']}")
        return "\n\n".join(combined)

    async def end_session(self) -> Dict[str, Any]:
        """End the current session and generate summary."""
        summary = {
            "total_turns": len(self.conversation_context),
            "agents_involved": list(self.specialist_agents.keys()),
            "conversation_summary": "Session ended"  # Could use AI to generate actual summary
        }

        # Reset conversation context
        self.conversation_context = []
        self.current_speaker = None

        # Reset all agents
        for agent in self.specialist_agents.values():
            await agent.reset()

        return summary