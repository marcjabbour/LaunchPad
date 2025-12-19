"""REST API endpoints for session management."""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class SessionCreate(BaseModel):
    """Request model for creating a session."""
    agents: List[Dict[str, Any]]
    config: Optional[Dict[str, Any]] = Field(default=None)


class SessionResponse(BaseModel):
    """Response model for session data."""
    id: str
    status: str
    agents_count: int
    created_at: str


class SessionSummary(BaseModel):
    """Session summary response."""
    session_id: str
    duration: float
    transcript_length: int
    agents_involved: List[str]


# In-memory storage for demo (replace with database in production)
sessions_store: Dict[str, Any] = {}


@router.get("/", response_model=List[SessionResponse])
async def list_sessions():
    """List all active sessions."""
    return [
        SessionResponse(
            id=session_id,
            status="active" if session.get("is_active") else "ended",
            agents_count=len(session.get("agents", [])),
            created_at=session.get("created_at", "")
        )
        for session_id, session in sessions_store.items()
    ]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """Get a specific session by ID."""
    session = sessions_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(
        id=session_id,
        status="active" if session.get("is_active") else "ended",
        agents_count=len(session.get("agents", [])),
        created_at=session.get("created_at", "")
    )


@router.post("/", response_model=SessionResponse)
async def create_session(session: SessionCreate):
    """Create a new session (Note: WebSocket is preferred for real-time sessions)."""
    import uuid
    from datetime import datetime

    session_id = str(uuid.uuid4())
    session_data = {
        "id": session_id,
        "agents": session.agents,
        "config": session.config,
        "is_active": True,
        "created_at": datetime.now().isoformat(),
        "transcript": []
    }

    sessions_store[session_id] = session_data

    return SessionResponse(
        id=session_id,
        status="active",
        agents_count=len(session.agents),
        created_at=session_data["created_at"]
    )


@router.delete("/{session_id}")
async def end_session(session_id: str):
    """End a session."""
    session = sessions_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session["is_active"] = False

    return {
        "message": "Session ended successfully",
        "session_id": session_id
    }


@router.get("/{session_id}/transcript")
async def get_session_transcript(session_id: str):
    """Get the transcript for a session."""
    session = sessions_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "transcript": session.get("transcript", [])
    }


@router.get("/{session_id}/summary", response_model=SessionSummary)
async def get_session_summary(session_id: str):
    """Get a summary of the session."""
    session = sessions_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    from datetime import datetime
    created_at = datetime.fromisoformat(session.get("created_at", datetime.now().isoformat()))
    duration = (datetime.now() - created_at).total_seconds()

    return SessionSummary(
        session_id=session_id,
        duration=duration,
        transcript_length=len(session.get("transcript", [])),
        agents_involved=[agent.get("name", "") for agent in session.get("agents", [])]
    )