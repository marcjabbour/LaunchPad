import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import A2A SDK (assuming standard import structure based on package name)
# Note: Since we can't verify the exact import paths of a2a-sdk without installing,
# we will use a wrapper approach that aligns with the protocol concepts.
# In a real scenario, we would do: from a2a import Agent, Message, etc.

load_dotenv(dotenv_path="../.env.local")

app = FastAPI(title="LaunchPad A2A Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Types (Aligned with A2A Protocol) ---

class AgentCapability(BaseModel):
    name: str
    description: str
    inputSchema: Optional[Dict[str, Any]] = None
    outputSchema: Optional[Dict[str, Any]] = None

class AgentCard(BaseModel):
    id: str
    name: str
    description: str
    version: str
    capabilities: List[AgentCapability]
    runtimeConfig: Optional[Dict[str, Any]] = None

class DispatchRequest(BaseModel):
    targetAgentId: str
    task: str
    input: Any

class DispatchResponse(BaseModel):
    status: str
    result: Any
    error: Optional[str] = None

# --- Registry ---

agents_registry: Dict[str, AgentCard] = {}

def register_agent(card: AgentCard):
    agents_registry[card.id] = card
    print(f"[Backend] Registered agent: {card.name} ({card.id})")

# --- Endpoints ---

@app.get("/")
async def root():
    return {"status": "online", "service": "LaunchPad A2A Backend"}

@app.get("/a2a/agents", response_model=List[AgentCard])
async def list_agents():
    """Returns the list of available agents."""
    return list(agents_registry.values())

@app.post("/a2a/agents", response_model=AgentCard)
async def create_agent(card: AgentCard):
    """Creates a new agent dynamically."""
    if card.id in agents_registry:
        raise HTTPException(status_code=400, detail=f"Agent {card.id} already exists")
    
    print(f"[Backend] Creating new agent: {card.name} ({card.id})")
    
    # Instantiate the agent based on runtime config
    # In a real app, we would persist this configuration to a database
    
    try:
        agent_type = card.runtimeConfig.get("type", "adk") if card.runtimeConfig else "adk"
        
        if agent_type == "adk":
            from backend.agents.adk_agent import ADKAgent
            # We could pass config here like model name, tools, etc.
            # For now, we just instantiate the class
            agent_instance = ADKAgent() 
            # Store instance? For now we just register the card and instantiate on dispatch
            # Optimization: Store instance in a separate registry if stateful
            
        elif agent_type == "langgraph":
            from backend.agents.langgraph_agent import LangGraphAgent
            agent_instance = LangGraphAgent()
            
        register_agent(card)
        return card
        
    except Exception as e:
        print(f"[Backend] Failed to create agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/a2a/dispatch", response_model=DispatchResponse)
async def dispatch_task(request: DispatchRequest):
    """Executes a task on a specific agent."""
    agent_id = request.targetAgentId
    
    if agent_id not in agents_registry:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    card = agents_registry[agent_id]
    print(f"[Backend] Dispatching task '{request.task}' to {agent_id}")
    
    try:
        agent_type = card.runtimeConfig.get("type", "adk") if card.runtimeConfig else "adk"
        
        if agent_type == "adk":
            from backend.agents.adk_agent import ADKAgent
            agent = ADKAgent()
            result = await agent.execute(request.task, request.input)
            return DispatchResponse(status="success", result=result)
            
        elif agent_type == "langgraph":
            from backend.agents.langgraph_agent import LangGraphAgent
            agent = LangGraphAgent()
            result = await agent.execute(request.task, request.input)
            return DispatchResponse(status="success", result=result)
            
    except Exception as e:
        print(f"[Backend] Error executing task: {e}")
        return DispatchResponse(status="error", result={}, error=str(e))
        
    return DispatchResponse(status="error", result={}, error="Unknown agent type")

# --- Startup ---

@app.on_event("startup")
async def startup_event():
    print("[Backend] Starting up...")
    
    # Register ADK Agent Card
    register_agent(AgentCard(
        id="python-adk-coder",
        name="Python ADK Coder",
        description="Real Python-based ADK agent.",
        version="0.1.0",
        capabilities=[
            AgentCapability(name="code_gen", description="Generates code")
        ],
        runtimeConfig={"type": "adk", "endpoint": "local"}
    ))

    # Register LangGraph Agent Card
    register_agent(AgentCard(
        id="python-langgraph-researcher",
        name="Python Researcher",
        description="Real Python-based LangGraph agent.",
        version="0.1.0",
        capabilities=[
            AgentCapability(name="research", description="Conducts research")
        ],
        runtimeConfig={"type": "langgraph", "endpoint": "local"}
    ))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
