import os
import json
from langgraph.graph import StateGraph, END, START
from typing import TypedDict, Annotated, List, Literal, Optional
from langchain_core.messages import AnyMessage, SystemMessage, HumanMessage, AIMessage, ChatMessage, ToolMessage
from langchain_openai import ChatOpenAI
from .state import AgentState
from langchain.tools import StructuredTool
from prompt.p import PLAN_REPORT,QUERY_REPORT,REPORT_MAKER_REPORT,PLAN_SICK_REPORT
from dotenv import load_dotenv

load_dotenv()

def react_agent(llm: ChatOpenAI,tools: List[StructuredTool],event: str):
    
    llm = ChatOpenAI(
        base_url=os.environ["BASE_URL"],
        model='gpt-4o-mini',
        api_key=os.environ["OPENAI_API_KEY"],
    )

    model_with_tool = llm.bind_tools(tools)

    def call_model(state: AgentState):
        message = state['messages']
        model_message = [SystemMessage(content=PLAN_REPORT),*message]
        plan_model = llm.invoke(model_message)
    
        return{
            "messages": [plan_model],
            "report_plan" : plan_model.content
        }
    
    def call_query(state: AgentState):
        messages = state['messages']
        query_messages = [SystemMessage(content=QUERY_REPORT)] + messages
        query_model = model_with_tool.invoke(query_messages)

        return{
            "messages": [query_model],
        }
    
    def call_report(state: AgentState):
        print("drafing")
        messages = state['messages']
        report_messages = [SystemMessage(content=REPORT_MAKER_REPORT)] + messages
        report_model = llm.invoke(report_messages)
        print("finish")
        return{
            "messages": [report_messages],
            "report_final" : report_model.content
            }
    
    async def call_tool(state: AgentState):
        tools_by_name = {tool.name: tool for tool in tools}
        messages = []
        for tool_call in state["messages"][-1].tool_calls:
            tool = tools_by_name[tool_call["name"]]
            result = await tool.ainvoke(tool_call["args"]) 

            messages.append(ToolMessage(
                content=result,
                tool_call_id=tool_call["id"],
                name=tool_call["name"]
            ))

        content_from_Tool = ""
        for msg in messages:
            content_from_Tool+=msg.content + "\n\n"
        HumaHuman = HumanMessage(content=content_from_Tool)

        return {"messages": messages + [HumaHuman]}
    
    def should_continue(state: AgentState) -> Literal["tools", "gen_report"]:
        messages = state["messages"]
        last_message = messages[-1]
        if state.get("revision_number", 1) < 5:
            if hasattr(last_message, "tool_calls") and last_message.tool_calls:
                return "tools"
            return "gen_report"
        return "gen_report"
    
    builder = StateGraph(AgentState)
    builder.add_node("plan",call_model)
    builder.add_node("tools",call_tool)
    builder.add_node("query",call_query)
    builder.add_node("gen_report",call_report)

    builder.add_edge(START,"plan")

    builder.add_edge("plan","query")
    builder.add_conditional_edges("query",should_continue)
    builder.add_edge("tools","query")

    builder.add_edge("gen_report",END)

    app = builder.compile()
    print(app.get_graph().draw_mermaid())

    return builder.compile()


def react_sick_agent(llm: ChatOpenAI,tools: List[StructuredTool],event: str):
    
    llm = ChatOpenAI(
        base_url=os.environ["BASE_URL"],
        model='gpt-4o-mini',
        api_key=os.environ["OPENAI_API_KEY"],
    )

    model_with_tool = llm.bind_tools(tools)

    def call_model(state: AgentState):
        message = state['messages']
        model_message = [SystemMessage(content=PLAN_SICK_REPORT),*message]
        plan_model = llm.invoke(model_message)
        return{
            "messages": [plan_model],
            "report_plan" : plan_model.content
        }
    
    def call_query(state: AgentState):
        messages = state['messages']
        query_messages = [SystemMessage(content=QUERY_REPORT)] + messages
        query_model = model_with_tool.invoke(query_messages)

        return{
            "messages": [query_model],
        }
    
    def call_report(state: AgentState):
        print("drafing")
        messages = state['messages']
        report_messages = [SystemMessage(content=REPORT_MAKER_REPORT)] + messages
        report_model = llm.invoke(report_messages)
        print("finish")
        return{
            "messages": [report_messages],
            "report_final" : report_model.content
            }
    
    async def call_tool(state: AgentState):
        tools_by_name = {tool.name: tool for tool in tools}
        messages = []
        for tool_call in state["messages"][-1].tool_calls:
            tool = tools_by_name[tool_call["name"]]
            result = await tool.ainvoke(tool_call["args"]) 

            messages.append(ToolMessage(
                content=result,
                tool_call_id=tool_call["id"],
                name=tool_call["name"]
            ))

        content_from_Tool = ""
        for msg in messages:
            content_from_Tool+=msg.content + "\n\n"
        HumaHuman = HumanMessage(content=content_from_Tool)
        
        return {"messages": messages + [HumaHuman]}
    
    def should_continue(state: AgentState) -> Literal["tools", "gen_report"]:
        messages = state["messages"]
        last_message = messages[-1]
        if state.get("revision_number", 1) < 5:
            if hasattr(last_message, "tool_calls") and last_message.tool_calls:
                return "tools"
            return "gen_report"
        return "gen_report"
    
    builder = StateGraph(AgentState)
    builder.add_node("plan",call_model)
    builder.add_node("tools",call_tool)
    builder.add_node("query",call_query)
    builder.add_node("gen_report",call_report)

    builder.add_edge(START,"plan")

    builder.add_edge("plan","query")
    builder.add_conditional_edges("query",should_continue)
    builder.add_edge("tools","query")

    builder.add_edge("gen_report",END)

    app = builder.compile()
    print(app.get_graph().draw_mermaid())

    return builder.compile()