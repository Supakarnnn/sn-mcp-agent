from langgraph.graph import StateGraph  
from langchain_core.messages import  SystemMessage, ToolMessage , AnyMessage, HumanMessage
from typing import Literal
from langchain_openai import ChatOpenAI
from typing import TypedDict

class ReactState(TypedDict):
    messages: list[AnyMessage]
    
def p_react_agent(llm : ChatOpenAI , tools : list, system_prompt : str | None = None):
    model_with_tools = llm.bind_tools(tools)

    async def call_tools(state: ReactState):
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
                    
        print("---------------------------------------------------------------------------")
        print(HumaHuman)
        print("---------------------------------------------------------------------------")
        return {"messages": state["messages"]+ messages + [HumaHuman]}

    def should_continue(state: ReactState) -> Literal["tools", "__end__"]:
        messages = state["messages"]
        last_message = messages[-1]
        if last_message.tool_calls:
            return "tools"
        return "__end__"

    async def call_model(state: ReactState):
        messages = state["messages"]
        print(messages)
        if system_prompt: 
            message = await model_with_tools.ainvoke([SystemMessage(content=system_prompt) , *messages]) 
        else:
            message = await model_with_tools.ainvoke(messages) 
        return {
        "messages": messages + [message]}

    builder = StateGraph(ReactState)
    builder.add_node("call_model", call_model)
    builder.add_node("tools", call_tools)
    builder.add_edge("__start__", "call_model")
    builder.add_conditional_edges(
        "call_model",
        should_continue
    )
    builder.add_edge("tools", "call_model") 
    graph = builder.compile()
    return graph
