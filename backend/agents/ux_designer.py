"""UX Designer specialist agent."""

from typing import Optional, List
from agents.base_agent import SpecialistAgent, AgentConfig


def create_design_mockup(description: str) -> dict:
    """Tool for creating design mockups."""
    return {
        "type": "mockup",
        "description": description,
        "format": "wireframe"
    }


def suggest_color_palette(context: str) -> dict:
    """Tool for suggesting color palettes."""
    return {
        "type": "color_palette",
        "context": context,
        "suggestions": ["primary", "secondary", "accent", "neutral"]
    }


def accessibility_check(design: str) -> dict:
    """Tool for checking accessibility."""
    return {
        "type": "accessibility",
        "design": design,
        "wcag_level": "AA"
    }


class UXDesignerAgent(SpecialistAgent):
    """UX Designer specialist agent."""

    def __init__(self, config: AgentConfig):
        # Add UX-specific tools
        ux_tools = [
            create_design_mockup,
            suggest_color_palette,
            accessibility_check
        ]

        super().__init__(config, custom_tools=ux_tools)

    async def design_review(self, feature: str) -> str:
        """Review a feature from UX perspective."""
        prompt = f"""
As a UX Designer, review this feature: {feature}

Consider:
1. User experience and flow
2. Visual hierarchy and layout
3. Accessibility requirements
4. Mobile responsiveness
5. Design system consistency

Share your thoughts conversationally as if in a design review meeting.
"""
        return await self.process_message(prompt)

    async def suggest_improvements(self, current_design: str) -> str:
        """Suggest UX improvements for a design."""
        prompt = f"""
Review this current design and suggest improvements: {current_design}

Focus on:
- User journey optimization
- Reducing cognitive load
- Improving accessibility
- Visual consistency
- Interaction patterns
"""
        return await self.process_message(prompt)