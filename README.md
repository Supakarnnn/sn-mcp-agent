# Project

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
