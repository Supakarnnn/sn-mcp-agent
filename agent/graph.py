import os
import json
from langgraph.graph import StateGraph, END, START
from typing import TypedDict, Annotated, List, Literal, Optional
from langchain_core.messages import AnyMessage, SystemMessage, HumanMessage, AIMessage, ChatMessage, ToolMessage
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from .state import AgentState
from prompt.p import PLAN_REPORT,QUERY_REPORT,REPORT_MAKER_REPORT
from dotenv import load_dotenv

load_dotenv()

def react_agent(llm: ChatOpenAI,tools: List,event: str):
    
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
        print(plan_model.content)
        return{
            "messages": message + [plan_model],
            "report_plan" : plan_model.content
        }
    
    def call_query(state: AgentState):
        messages = state['messages']
        plan_mes = state['report_plan']
        query_messages = [SystemMessage(content=QUERY_REPORT), HumanMessage(content=plan_mes)]
        query_model = model_with_tool.invoke(query_messages)

        print("##########################################################")
        print(query_model)
        print("##########################################################")

        tool_results = []
        for msg in messages:
            if hasattr(msg, "name") and hasattr(msg, "content") and msg.name:
                try:
                    tool_results.append({
                        "tool_name": msg.name,
                        "result": json.loads(msg.content) if msg.content else None
                    })
                except:
                    tool_results.append({
                        "tool_name": msg.name,
                        "result": msg.content
                    })

        organized_data = None
        if tool_results:
            organize_messages = [
                SystemMessage(content="You are a data organizer. Organize the following tool results according to the report plan."),
                HumanMessage(content=f"Report Plan: {plan_mes}\n\nTool Results: {json.dumps(tool_results, indent=2,ensure_ascii=False)}")
            ]
            organize_response = llm.invoke(organize_messages)
            organized_data = organize_response.content

        updated_messages = messages + [query_model]
        if organized_data:
            updated_messages.append(AIMessage(content=organized_data))

        return{
            "messages": updated_messages,
            "report_query": organized_data,
            "revision_number": state.get("revision_number", 1) + 1
        }
    
    def call_report(state: AgentState):
        messages = state['messages']
        query_mes = state['report_query']
        report_messages = [SystemMessage(content=REPORT_MAKER_REPORT),HumanMessage(content=query_mes)]
        report_model = llm.invoke(report_messages)

        return{
            "messages": messages + [report_messages],
            "report_final": report_model.content
        }
    
    async def call_tool(state: AgentState):
        print("Tool is calling!!")
        tools_by_name = {tool.name: tool for tool in tools}
        messages = []
        for tool_call in state["messages"][-1].tool_calls:
            try:
                tool = tools_by_name[tool_call["name"]]
                result = await tool.ainvoke(tool_call["args"])
                messages.append(ToolMessage(
                    content=json.dumps(result, ensure_ascii=False),
                    tool_call_id=tool_call["id"],
                    name=tool_call["name"]
                ))
            except Exception as e:
                print(f"Error calling tool {tool_call['name']}: {str(e)}")
                messages.append(ToolMessage(
                    content=json.dumps({"error": str(e)}, ensure_ascii=False),
                    tool_call_id=tool_call["id"],
                    name=tool_call["name"]
                ))

        return {
            "messages": state["messages"] + messages,
        }
    
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
    builder.add_edge("tools","query")

    builder.add_conditional_edges("query",should_continue)

    builder.add_edge("gen_report",END)

    app = builder.compile()
    print(app.get_graph().draw_mermaid())

    return builder.compile()