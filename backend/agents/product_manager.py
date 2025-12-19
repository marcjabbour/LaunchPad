"""Product Manager specialist agent."""

from typing import Optional, List, Any
from agents.base_agent import SpecialistAgent, AgentConfig


def create_requirement_doc(title: str, content: str) -> dict:
    """Tool for creating requirement documents."""
    return {
        "type": "document",
        "title": title,
        "content": content,
        "format": "requirements"
    }


def prioritize_features(features: List[str]) -> dict:
    """Tool for prioritizing features."""
    return {
        "type": "prioritization",
        "features": features,
        "method": "RICE"  # Reach, Impact, Confidence, Effort
    }


class ProductManagerAgent(SpecialistAgent):
    """Product Manager specialist agent."""

    def __init__(self, config: AgentConfig):
        # Add PM-specific tools
        pm_tools = [
            create_requirement_doc,
            prioritize_features
        ]

        super().__init__(config, custom_tools=pm_tools)

    async def analyze_feature_request(self, feature: str) -> str:
        """Analyze a feature request from product perspective."""
        prompt = f"""
As a Product Manager, analyze this feature request: {feature}

Consider:
1. User value and business impact
2. Technical feasibility
3. Priority relative to roadmap
4. Required resources and timeline
5. Success metrics

Provide your analysis in a conversational tone as if discussing with the team.
"""
        return await self.process_message(prompt)

    async def create_user_story(self, requirement: str) -> str:
        """Create a user story from a requirement."""
        prompt = f"""
Convert this requirement into a user story: {requirement}

Format: As a [user type], I want [goal] so that [benefit]

Also include acceptance criteria.
"""
        return await self.process_message(prompt)