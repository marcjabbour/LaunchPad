# LaunchPad Backend Service

A Python backend service for multi-agent orchestration using Google's ADK (Agent Development Kit) and A2A (Agent-to-Agent) protocol.

## Architecture Overview

This backend service provides:
- **Multi-Agent Orchestration**: True multi-agent system with a dispatcher that routes requests to specialized agents
- **Google ADK Integration**: Each agent is built using Google's ADK for sophisticated AI capabilities
- **A2A Protocol**: Agent-to-agent communication using Google's A2A framework
- **WebSocket Support**: Real-time communication with the frontend for audio streaming and live updates
- **RESTful API**: CRUD operations for agent and session management

## Key Components

### 1. Dispatcher Agent (`core/dispatcher.py`)
- Main coordinator that listens to user input
- Routes requests to appropriate specialist agents
- Manages conversation flow and turn-taking

### 2. Specialist Agents (`agents/`)
- `ProductManagerAgent`: Handles product-related discussions
- `UXDesignerAgent`: Focuses on design and user experience
- Custom agents can be easily added

### 3. A2A Router (`core/router.py`)
- Manages agent-to-agent communication
- Handles message routing between dispatcher and specialists
- Supports broadcast messages and coordination

### 4. Session Manager (`core/session_manager.py`)
- Manages multiple concurrent sessions
- Handles session lifecycle (start, add/remove agents, end)
- Maintains conversation transcripts

## Installation

1. Create a Python virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your Google API key
```

## Running the Service

Start the backend server:
```bash
python main.py
```

The server will start on `http://localhost:8000`

## API Endpoints

### WebSocket
- `/ws` - Main WebSocket endpoint for real-time communication

### REST API
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create a new agent
- `GET /api/agents/{id}` - Get specific agent
- `PUT /api/agents/{id}` - Update agent
- `DELETE /api/agents/{id}` - Delete agent

- `GET /api/sessions` - List active sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/{id}` - Get session details
- `DELETE /api/sessions/{id}` - End session

## WebSocket Protocol

### Starting a Session
```json
{
  "type": "session.start",
  "agents": [
    {
      "id": "pm_001",
      "name": "Alex",
      "role": "Product Manager",
      "description": "..."
    }
  ]
}
```

### Sending Audio
```json
{
  "type": "session.audio",
  "audio": "<base64_encoded_audio>"
}
```

### Receiving Updates
```json
{
  "type": "transcript.update",
  "transcript": [...]
}
```

## Frontend Integration

The backend is designed to work seamlessly with your React frontend:

1. **Agent Management**: Frontend defines agents, backend creates ADK instances
2. **Session Control**: Frontend initiates sessions, backend orchestrates
3. **Real-time Communication**: WebSocket for audio and transcript streaming
4. **Clean Separation**: Frontend handles UI, backend handles all AI logic

## Adding Custom Agents

1. Create a new agent class in `agents/`:
```python
from agents.base_agent import SpecialistAgent

class MyCustomAgent(SpecialistAgent):
    def __init__(self, config):
        custom_tools = [...]  # Add specific tools
        super().__init__(config, custom_tools)
```

2. Register in the factory (`agents/factory.py`):
```python
ROLE_CLASS_MAP = {
    "My Custom Role": MyCustomAgent,
    ...
}
```

## Development

### Testing
```bash
pytest tests/
```

### Code Formatting
```bash
black .
```

## Deployment Considerations

1. **Database**: Replace in-memory stores with persistent database
2. **Authentication**: Add JWT or session-based auth
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Monitoring**: Add logging and monitoring (e.g., OpenTelemetry)
5. **Scaling**: Use Redis for session management across instances

## Next Steps

1. Implement actual audio processing with Gemini Live
2. Add more specialized agents
3. Enhance A2A routing logic
4. Implement persistent storage
5. Add authentication and authorization