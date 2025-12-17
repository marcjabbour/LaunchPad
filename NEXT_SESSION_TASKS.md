# Next Session Tasks

## 1. Real Multi-Agent Architecture
**Goal:** Move from single-LLM roleplay simulation to distinct AI entities for each agent.
- **Current State:** `AgentSession` connects to one Gemini Live session and uses a system prompt to simulate multiple personas.
- **Required Changes:**
  - Instantiate separate `GoogleGenAI` connections (or distinct contexts) for each active agent.
  - Implement an orchestration layer to manage turn-taking and audio routing between multiple agent streams.
  - **Challenge:** Handling audio input/output for multiple simultaneous streams and preventing agents from talking over each other (or handling it naturally).

## 2. Fix Image Generation Bug
**Goal:** Investigate and resolve issues with the image generation tool.
- **Context:** User reported issues. Need to verify if this is related to:
  - Prompt handling?
  - Return format?
  - UI rendering of the generated image?
  - *Note: We recently fixed a duplicate file generation bug, check if this persists.*

## 3. Fix Voice Speed / Quality
**Goal:** Fix "Sarah" (and potentially others) speaking too slowly.
- **Current Implementation:** Voice settings are passed in `AgentSession.ts` via `speechConfig`.
- **Action Items:**
  - Check `voiceConfig` parameters in `AgentSession.ts`.
  - Investigate Gemini Live API options for `speakingRate` or similar prosody controls.
  - Verify if "Sarah" maps to a specific prebuilt voice (e.g., 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr') and if that specific voice has latency/speed issues.

## 4. Call Summary Feature
**Goal:** Generate a meeting summary after the session ends.
- **Implementation Plan:**
  - Use the `transcript` stored in `AgentSession`.
  - On `disconnect()`, trigger a new (non-live) LLM call to summarize the `transcript`.
  - Save the summary to a new `MeetingHistory` or `SessionLog` storage.
  - Display "Last Call Summary" in the dashboard.
