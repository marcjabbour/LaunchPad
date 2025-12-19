"""WebSocket handlers for real-time communication with frontend."""

import json
import logging
from typing import Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

from core.session_manager import SessionManager

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_manager = SessionManager()

    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept and store a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected")

    def disconnect(self, client_id: str):
        """Remove a WebSocket connection."""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected")

    async def send_message(self, client_id: str, message: Dict[str, Any]):
        """Send a message to a specific client."""
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast a message to all connected clients."""
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to {client_id}: {e}")


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint handler."""
    client_id = None

    try:
        # Wait for initial connection message with client ID
        initial_data = await websocket.receive_json()
        client_id = initial_data.get("client_id", "unknown")

        await manager.connect(websocket, client_id)

        # Send connection confirmation
        await manager.send_message(client_id, {
            "type": "connection",
            "status": "connected",
            "client_id": client_id
        })

        # Main message loop
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            logger.debug(f"Received message from {client_id}: {message_type}")

            # Handle different message types
            if message_type == "session.start":
                await handle_session_start(client_id, data)

            elif message_type == "session.audio":
                await handle_audio_stream(client_id, data)

            elif message_type == "session.end":
                await handle_session_end(client_id, data)

            elif message_type == "agent.add":
                await handle_agent_add(client_id, data)

            elif message_type == "agent.remove":
                await handle_agent_remove(client_id, data)

            elif message_type == "ping":
                await manager.send_message(client_id, {"type": "pong"})

            else:
                logger.warning(f"Unknown message type: {message_type}")
                await manager.send_message(client_id, {
                    "type": "error",
                    "error": f"Unknown message type: {message_type}"
                })

    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
    finally:
        if client_id:
            # Clean up session if exists
            await manager.session_manager.end_session(client_id)
            manager.disconnect(client_id)


async def handle_session_start(client_id: str, data: Dict[str, Any]):
    """Handle session start request."""
    try:
        agents = data.get("agents", [])
        config = data.get("config", {})

        # Create a new session
        session = await manager.session_manager.create_session(
            client_id=client_id,
            agents=agents,
            config=config
        )

        # Set up callbacks for session events
        session.on_transcript_update = lambda transcript: asyncio.create_task(
            manager.send_message(client_id, {
                "type": "transcript.update",
                "transcript": transcript
            })
        )

        session.on_agent_speaking = lambda agent_id: asyncio.create_task(
            manager.send_message(client_id, {
                "type": "agent.speaking",
                "agent_id": agent_id
            })
        )

        # Start the session
        await session.start()

        await manager.send_message(client_id, {
            "type": "session.started",
            "session_id": session.id
        })

    except Exception as e:
        logger.error(f"Error starting session: {e}")
        await manager.send_message(client_id, {
            "type": "error",
            "error": str(e)
        })


async def handle_audio_stream(client_id: str, data: Dict[str, Any]):
    """Handle incoming audio stream data."""
    try:
        audio_data = data.get("audio")
        if not audio_data:
            return

        session = manager.session_manager.get_session(client_id)
        if session:
            # Process audio through the session
            await session.process_audio(audio_data)
        else:
            logger.warning(f"No active session for client {client_id}")

    except Exception as e:
        logger.error(f"Error processing audio: {e}")


async def handle_session_end(client_id: str, data: Dict[str, Any]):
    """Handle session end request."""
    try:
        summary = await manager.session_manager.end_session(client_id)

        await manager.send_message(client_id, {
            "type": "session.ended",
            "summary": summary
        })

    except Exception as e:
        logger.error(f"Error ending session: {e}")
        await manager.send_message(client_id, {
            "type": "error",
            "error": str(e)
        })


async def handle_agent_add(client_id: str, data: Dict[str, Any]):
    """Handle adding an agent to the current session."""
    try:
        agent = data.get("agent")
        session = manager.session_manager.get_session(client_id)

        if session:
            await session.add_agent(agent)
            await manager.send_message(client_id, {
                "type": "agent.added",
                "agent_id": agent.get("id")
            })
        else:
            raise ValueError("No active session")

    except Exception as e:
        logger.error(f"Error adding agent: {e}")
        await manager.send_message(client_id, {
            "type": "error",
            "error": str(e)
        })


async def handle_agent_remove(client_id: str, data: Dict[str, Any]):
    """Handle removing an agent from the current session."""
    try:
        agent_id = data.get("agent_id")
        session = manager.session_manager.get_session(client_id)

        if session:
            await session.remove_agent(agent_id)
            await manager.send_message(client_id, {
                "type": "agent.removed",
                "agent_id": agent_id
            })
        else:
            raise ValueError("No active session")

    except Exception as e:
        logger.error(f"Error removing agent: {e}")
        await manager.send_message(client_id, {
            "type": "error",
            "error": str(e)
        })