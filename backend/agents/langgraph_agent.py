# backend/agents/langgraph_agent.py

import asyncio
from typing import Any, Dict, TypedDict, Annotated, List
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
import operator

# Define the state of our graph
class AgentState(TypedDict):
    input: str
    messages: Annotated[List[BaseMessage], operator.add]
    final_result: str

class LangGraphAgent:
    def __init__(self):
        self.workflow = self._build_graph()
        self.app = self.workflow.compile()
        print("[LangGraphAgent] Graph compiled.")

    def _build_graph(self):
        # 1. Define Nodes
        async def research_node(state: AgentState):
            print("  [Node] Researching...")
            # In a real app, this would call a search tool
            return {"messages": [AIMessage(content=f"Researched: {state['input']}")]}

        async def analyze_node(state: AgentState):
            print("  [Node] Analyzing...")
            # Analyze the last message
            last_msg = state["messages"][-1].content
            return {"messages": [AIMessage(content=f"Analyzed: {last_msg}")]}

        async def summarize_node(state: AgentState):
            print("  [Node] Summarizing...")
            # Summarize everything
            summary = "\n".join([m.content for m in state["messages"]])
            return {"final_result": f"Summary:\n{summary}"}

        # 2. Build Graph
        workflow = StateGraph(AgentState)
        workflow.add_node("research", research_node)
        workflow.add_node("analyze", analyze_node)
        workflow.add_node("summarize", summarize_node)

        # 3. Define Edges
        workflow.set_entry_point("research")
        workflow.add_edge("research", "analyze")
        workflow.add_edge("analyze", "summarize")
        workflow.add_edge("summarize", END)

        return workflow

    async def execute(self, task: str, input_data: Any) -> Dict[str, Any]:
        """
        Runs the LangGraph state machine.
        """
        print(f"[LangGraphAgent] Running graph for task: {task}")
        
        # Initialize state
        initial_state = {
            "input": str(input_data), 
            "messages": [HumanMessage(content=str(input_data))],
            "final_result": ""
        }
        
        # Run the graph
        # invoke is sync, ainvoke is async
        result = await self.app.ainvoke(initial_state)
        
        return {
            "final_result": result.get("final_result", "No result"),
            "history": [m.content for m in result.get("messages", [])]
        }
