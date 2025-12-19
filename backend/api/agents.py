"""REST API endpoints for agent management."""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class AgentPersonality(BaseModel):
    """Agent personality configuration."""
    tone: str = Field(default="Professional")
    verbosity: str = Field(default="Concise")
    style: str = Field(default="Direct")


class AgentMemory(BaseModel):
    """Agent memory configuration."""
    enabled: bool = Field(default=True)
    historyLimit: int = Field(default=10)


class AgentCreate(BaseModel):
    """Request model for creating an agent."""
    name: str
    role: str
    description: str
    voice: str = Field(default="Puck")
    speechSpeed: str = Field(default="Normal")
    personality: AgentPersonality = Field(default_factory=AgentPersonality)
    memory: AgentMemory = Field(default_factory=AgentMemory)
    knowledgeBase: str = Field(default=None)


class AgentResponse(BaseModel):
    """Response model for agent data."""
    id: str
    name: str
    role: str
    description: str
    voice: str
    speechSpeed: str
    personality: Dict[str, str]
    memory: Dict[str, Any]
    knowledgeBase: str = None


# In-memory storage for demo (replace with database in production)
agents_store: Dict[str, AgentResponse] = {}


@router.get("/", response_model=List[AgentResponse])
async def list_agents():
    """List all available agents."""
    return list(agents_store.values())


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    """Get a specific agent by ID."""
    agent = agents_store.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("/", response_model=AgentResponse)
async def create_agent(agent: AgentCreate):
    """Create a new agent."""
    import uuid

    agent_id = str(uuid.uuid4())
    agent_data = AgentResponse(
        id=agent_id,
        name=agent.name,
        role=agent.role,
        description=agent.description,
        voice=agent.voice,
        speechSpeed=agent.speechSpeed,
        personality=agent.personality.dict(),
        memory=agent.memory.dict(),
        knowledgeBase=agent.knowledgeBase
    )

    agents_store[agent_id] = agent_data
    return agent_data


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, agent: AgentCreate):
    """Update an existing agent."""
    if agent_id not in agents_store:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent_data = AgentResponse(
        id=agent_id,
        name=agent.name,
        role=agent.role,
        description=agent.description,
        voice=agent.voice,
        speechSpeed=agent.speechSpeed,
        personality=agent.personality.dict(),
        memory=agent.memory.dict(),
        knowledgeBase=agent.knowledgeBase
    )

    agents_store[agent_id] = agent_data
    return agent_data


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent."""
    if agent_id not in agents_store:
        raise HTTPException(status_code=404, detail="Agent not found")

    del agents_store[agent_id]
    return {"message": "Agent deleted successfully"}


@router.get("/roles/available")
async def get_available_roles():
    """Get list of available agent roles."""
    return [
        "Product Manager",
        "UX Designer",
        "Software Engineer",
        "Data Scientist",
        "QA Engineer",
        "DevOps Engineer",
        "Business Analyst",
        "Custom"
    ]


@router.get("/voices/available")
async def get_available_voices():
    """Get list of available voice options."""
    return [
        {"name": "Puck", "description": "Playful and energetic"},
        {"name": "Charon", "description": "Deep and authoritative"},
        {"name": "Kore", "description": "Balanced and calm"},
        {"name": "Fenrir", "description": "Strong and intense"},
        {"name": "Zephyr", "description": "Soft and gentle"}
    ]