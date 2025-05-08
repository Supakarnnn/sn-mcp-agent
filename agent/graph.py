import os
import json
from langgraph.graph import StateGraph, END, START
from typing import TypedDict, Annotated, List, Literal, Optional
from langchain_core.messages import AnyMessage, SystemMessage, HumanMessage, AIMessage, ChatMessage, ToolMessage
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from .state import AgentState
from prompt.p import PLAN_REPORT,QUERY_REPORT,REPORT_MAKER_REPORT
from dotenv import load_dotenv
from IPython.display import Image, display
from langchain_core.runnables.graph import CurveStyle, MermaidDrawMethod, NodeStyles

load_dotenv()


def react_agent(llm: ChatOpenAI,tools: List,event: str):
    
    llm = ChatOpenAI(
        base_url=os.environ["BASE_URL"],
        model='gpt-4o-mini',
        api_key=os.environ["OPENAI_API_KEY"]
    )

    model_with_tool = llm.bind_tools(tools)

    def call_model(state: AgentState):
        message = state['messages']
        model_message = [SystemMessage(content=PLAN_REPORT),*message]
        plan_model = llm.invoke(model_message)
        print(plan_model.content)
        return{
            "messages": message + [plan_model],
            "report_plan" : plan_model.content
        }
    
    def call_query(state: AgentState):
        messages = state['messages']
        plan_mes= state['report_plan']
        query_messages = [SystemMessage(content=QUERY_REPORT),HumanMessage(content=plan_mes)]
        query_model = model_with_tool.invoke(query_messages)

        print(query_model)

        return{
            "messages": query_model ,
            # "report_query": query_model,
            "revision_number": state.get("revision_number", 1) + 1
        }
    
    # def call_report(state: AgentState):
    #     messages = state['messages']
    #     query_mes = state['report_query']
    #     report_messages = [SystemMessage(content=REPORT_MAKER_REPORT),HumanMessage(content=query_mes)]
    #     report_model = llm.invoke(report_messages)

    #     return{
    #         "messages": messages + [report_messages],
    #         "report_final": report_model.content
    #     }
    
    async def call_tool(state: AgentState):
        print("Tool is calling!!")
        tools_by_name = {tool.name: tool for tool in tools}
        messages = []
        for tool_call in state["messages"][-1].tool_calls:
            tool = tools_by_name[tool_call["name"]]
            result = await tool.ainvoke(tool_call["args"])
            # print(result)
            messages.append(ToolMessage(
                content=json.dumps(result,ensure_ascii=False),
                tool_call_id=tool_call["id"],
                tools_by_name=tool_call["name"]
            ))
        return {
            "messages": state["messages"] + messages,
            "temp": []
        }
    
    def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
        messages = state["messages"]
        last_message = messages[-1]
        if state["revision_number"] < 5:
            if last_message.tool_calls:
                return "tools"
            return "__end__"
        return "__end__"
    
    builder = StateGraph(AgentState)
    builder.add_node("plan",call_model)
    builder.add_node("tools",call_tool)
    builder.add_node("query",call_query)

    builder.add_edge("__start__","plan")
    builder.add_edge("plan","query")
    builder.add_conditional_edges(
        "query",
        should_continue
    )
    builder.add_edge("tools","query")
    # builder.add_edge("query","")

    app = builder.compile()
    print(app.get_graph().draw_mermaid())
    return builder.compile()