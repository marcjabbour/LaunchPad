"""Agent factory for creating agents dynamically based on configuration."""

import logging
from typing import Dict, Any, Optional, Type
from enum import Enum

from agents.base_agent import BaseAgent, SpecialistAgent, AgentConfig
from agents.product_manager import ProductManagerAgent
from agents.ux_designer import UXDesignerAgent

logger = logging.getLogger(__name__)


class AgentRole(Enum):
    """Predefined agent roles."""
    PRODUCT_MANAGER = "Product Manager"
    UX_DESIGNER = "UX Designer"
    SOFTWARE_ENGINEER = "Software Engineer"
    DATA_SCIENTIST = "Data Scientist"
    QA_ENGINEER = "QA Engineer"
    DEVOPS_ENGINEER = "DevOps Engineer"
    BUSINESS_ANALYST = "Business Analyst"
    CUSTOM = "Custom"


class AgentFactory:
    """Factory for creating agents based on configuration."""

    # Map roles to specific agent classes
    ROLE_CLASS_MAP: Dict[str, Type[BaseAgent]] = {
        AgentRole.PRODUCT_MANAGER.value: ProductManagerAgent,
        AgentRole.UX_DESIGNER.value: UXDesignerAgent,
        # Add more as we create specialized agents
    }

    @classmethod
    def create_agent(cls, config_dict: Dict[str, Any]) -> BaseAgent:
        """
        Create an agent from a configuration dictionary.

        Args:
            config_dict: Dictionary containing agent configuration from frontend

        Returns:
            BaseAgent instance
        """
        try:
            # Convert dict to AgentConfig
            agent_config = cls._parse_config(config_dict)

            # Determine agent class based on role
            agent_class = cls._get_agent_class(agent_config.role)

            # Create and return agent instance
            agent = agent_class(agent_config)
            logger.info(f"Created {agent_config.role} agent: {agent_config.name}")

            return agent

        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            raise ValueError(f"Failed to create agent: {e}")

    @classmethod
    def _parse_config(cls, config_dict: Dict[str, Any]) -> AgentConfig:
        """Parse configuration dictionary into AgentConfig."""
        return AgentConfig(
            id=config_dict.get("id"),
            name=config_dict.get("name"),
            role=config_dict.get("role"),
            description=config_dict.get("description"),
            voice=config_dict.get("voice", "Puck"),
            speech_speed=config_dict.get("speechSpeed", "Normal"),
            personality=config_dict.get("personality", {
                "tone": "Professional",
                "verbosity": "Concise",
                "style": "Direct"
            }),
            memory=config_dict.get("memory", {
                "enabled": True,
                "historyLimit": 10
            }),
            knowledge_base=config_dict.get("knowledgeBase"),
            tools=config_dict.get("tools", [])
        )

    @classmethod
    def _get_agent_class(cls, role: str) -> Type[BaseAgent]:
        """Get the appropriate agent class for a role."""
        # Check if we have a specialized class for this role
        if role in cls.ROLE_CLASS_MAP:
            return cls.ROLE_CLASS_MAP[role]

        # Default to SpecialistAgent for custom roles
        return SpecialistAgent

    @classmethod
    def create_default_agents(cls) -> Dict[str, BaseAgent]:
        """Create a set of default agents for testing."""
        default_configs = [
            {
                "id": "pm_001",
                "name": "Alex",
                "role": "Product Manager",
                "description": "Experienced Product Manager focused on user needs and business value",
                "voice": "Fenrir",
                "speechSpeed": "Normal",
                "personality": {
                    "tone": "Professional",
                    "verbosity": "Concise",
                    "style": "Analytical"
                }
            },
            {
                "id": "ux_001",
                "name": "Sarah",
                "role": "UX Designer",
                "description": "Creative UX Designer passionate about user experience and accessibility",
                "voice": "Zephyr",
                "speechSpeed": "Fast",
                "personality": {
                    "tone": "Friendly",
                    "verbosity": "Conversational",
                    "style": "Creative"
                }
            }
        ]

        agents = {}
        for config in default_configs:
            agent = cls.create_agent(config)
            agents[config["id"]] = agent

        return agents


class AgentRegistry:
    """Registry for managing active agents."""

    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {}
        self.factory = AgentFactory()

    def register_agent(self, agent: BaseAgent) -> str:
        """Register an agent in the registry."""
        agent_id = agent.config.id
        self.agents[agent_id] = agent
        logger.info(f"Registered agent: {agent.config.name} (ID: {agent_id})")
        return agent_id

    def unregister_agent(self, agent_id: str) -> bool:
        """Unregister an agent from the registry."""
        if agent_id in self.agents:
            agent_name = self.agents[agent_id].config.name
            del self.agents[agent_id]
            logger.info(f"Unregistered agent: {agent_name} (ID: {agent_id})")
            return True
        return False

    def get_agent(self, agent_id: str) -> Optional[BaseAgent]:
        """Get an agent by ID."""
        return self.agents.get(agent_id)

    def get_all_agents(self) -> Dict[str, BaseAgent]:
        """Get all registered agents."""
        return self.agents.copy()

    def create_and_register_agent(self, config_dict: Dict[str, Any]) -> str:
        """Create an agent from config and register it."""
        agent = self.factory.create_agent(config_dict)
        return self.register_agent(agent)

    def clear_all(self):
        """Clear all registered agents."""
        self.agents.clear()
        logger.info("Cleared all agents from registry")

    def get_agents_by_role(self, role: str) -> Dict[str, BaseAgent]:
        """Get all agents with a specific role."""
        return {
            agent_id: agent
            for agent_id, agent in self.agents.items()
            if agent.config.role == role
        }

    def get_active_agents(self) -> Dict[str, BaseAgent]:
        """Get all currently active agents."""
        return {
            agent_id: agent
            for agent_id, agent in self.agents.items()
            if agent.is_active
        }