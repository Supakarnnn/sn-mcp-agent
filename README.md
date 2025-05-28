# Project

## Knowledge

- 🛠️ MCP tools into [LangChain tools](https://python.langchain.com/docs/concepts/tools/) that can be used with [LangGraph](https://github.com/langchain-ai/langgraph) agents
- 🛠️ MCP server starting with [langchain-mcp-adapters](https://github.com/langchain-ai/langchain-mcp-adapters) and start server with [fastmcp](https://github.com/jlowin/fastmcp)
- 🚀 [FastApi](https://fastapi.tiangolo.com/) to conversation with Ai
## Install python package dependencies

Install uv (recommend):

```bash
https://github.com/astral-sh/uv
```

or

```bash
Use your python package dependencies
```

## Installation (UV):

step 1:
```bash
uv add requirements.txt
```
step 2 (optional):
```bash
uv add pip install requirements.txt
```
step 3:
```bash
pip install requirements.txt
```

## Before start server

create file name .env
```bash
OPENAI_API_KEY=<your_api_key>

MYSQL_HOST_NW=<your_DATABASE_HOST>
MYSQL_PORT_NW=<your_DATABASE_PORT>
MYSQL_USER_NW=<your_DATABASE_USERNAME>
MYSQL_PASSWORD_NW=<your_DATABASE_PASSWORD>
MYSQL_DATABASE_NW=<your_DATABASE_NAME>
```

## Start Server

FastAPI server
```bash
uv run client.py
```

MCP server
```bash
fastmcp run mcp_server.py:mcp --transport streamable-http --port 8080 --host 0.0.0.0
```

## Explain Tool in MCP server
This simple tool is to let LLM execute SQL function in server (only select or show)
```python
@mcp.tool("execute_select_or_show")
async def execute_select_or_show(query: str):
    """
    This is basic tool to Execute only SELECT or SHOW queries.
    If user want basic information try this basic tool first.

    args:
        Execute only SELECT or SHOW queries
    
    """
    try:
        logger.info(f"LLM is trying to execute: {query}")

        cleaned_query = query.strip().lower()
        # cleaned_query = query
        if not (cleaned_query.startswith("select") or cleaned_query.startswith("show")):
            return {"result": json.dumps({"error": "Only SELECT or SHOW queries are allowed."}), "status": "error"}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query)
        results = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        conn.close()
        
        return json.dumps({"columns": columns,"rows": results},ensure_ascii=False, cls=DecimalEncoder)
    
    except Error as e:
        logger.error(f"Error executing query: {e}")
        return {"result": json.dumps({"error": str(e)}), "status": "error"}
```

Next, This is a example custom tool to let LLM get specific data from database
```python
@mcp.tool("check_in_data_year")
async def check_in_data_year(group: str, year: str): 
    """
    เครื่องมือนี้เกี่ยวกับข้อมูลการเช็คอินหรือการเข้างานของทั้งปี
    args:
        year (str): Must be "employee_2023" or "employee_2024" 
    """

    try:
        logger.info(f"LLM is trying to use check_in_data_year and choose group: {group} and year: {year}")

        if year not in ["employee_2023", "employee_2024"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024'.")

        query = f"""
            SELECT 
                employee_group,
                employee_name,
                SUM(work_hours) AS ชั่วโมงการทำงาน,
                SUM(late_hours) AS ชั่วโมงรวมที่มาสาย,
                SUM(CASE WHEN late_count = 1 THEN 1 ELSE 0 END) AS จำนวนครั้งที่มาสาย,
                SUM(leave_hours) AS ชั่วโมงที่ลางาน
            FROM 
                {year}
            WHERE 
                employee_group = %s
            GROUP BY 
                employee_group,
                employee_name
            ORDER BY 
                employee_group,
                ชั่วโมงรวมที่มาสาย DESC
        """

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (group,))
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        return json.dumps(results, ensure_ascii=False, cls=DecimalEncoder)

    except Exception as e:
        logger.error(f"Error executing query: {e}")
        return {"result": json.dumps({"error": str(e)}), "status": "error"}
```

To customizing your tools to fit your database use this tool format
```python
@mcp.tool(" TOOL_NAME ")
async def TOOL_NAME(example: str):
    """
    Tool description
    """
    try:
        query = f""" Your sql function """

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (group,))
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        return json.dumps(results, ensure_ascii=False, cls=DecimalEncoder)

    except Exception as e:
        logger.error(f"Error executing query: {e}")
        return {"result": json.dumps({"error": str(e)}), "status": "error"}
```
## Explain Langgrpah

This is basic agent to gennerate report
```python
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

        graph_messages = [SystemMessage(content=VIS_REPORT)] + messages
        graph_model = llm.invoke(graph_messages)
        print("finish")
        return{
            "messages": [report_messages] + [graph_messages],
            "report_final" : report_model.content,
            "report_graph" : graph_model.content
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
```
Graph work flow
```bash
START -> Plan gennerate -> Data query agent -> Tool calling -> Report Gennerate -> END 
```

Your can change report format to relevant with your data
```python
# In p.py (prompt)

PLAN_REPORT = """ As an expert Report planner, Your task is to gennerate and draft "xxxx" report in Thai language for the next agent.

Your report should include the following sections, with headings translated into Thai:

1. x
2. x
3. x

Sample Table:
| name | name | name | name   | name | name |
|------|------|------|--------|------|------|
| x    | x    | x    | x      | x    | x    |
| x    | x    | x    | x      | x    | x    |
| x    | x    | x    | x      | x    | x    |
| x    | x    | x    | x      | x    | x    |

Ensure that the report is well-organized and uses the precise translations provided for each section and heading.
"""
```
