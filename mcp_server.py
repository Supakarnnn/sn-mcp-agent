import os
from fastmcp import FastMCP
from dotenv import load_dotenv
import logging
import asyncio
import json
from mcp.types import Resource, Tool, TextContent
from mysql.connector import connect, Error

load_dotenv()

mcp = FastMCP(name="MCP Server")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("MCP Server")

DB_CONFIG = {
    "host": os.environ.get("MYSQL_HOST"),
    "user": os.environ.get("MYSQL_USER"),
    "password": os.environ.get("MYSQL_PASSWORD"),
    "database": os.environ.get("MYSQL_DATABASE"),
    "port": 3306
}

def get_db_connection():
    try:
        return connect(**DB_CONFIG)
    except Error as e:
        logger.error(f"{e}")
        raise Exception(f"{str(e)}")


@mcp.tool("execute_select_or_show")
async def execute_select_or_show(query: str):
    """Execute only SELECT or SHOW queries."""
    try:
        # Validate the query
        logger.info(f"LLM is trying to execute: {query}")

        cleaned_query = query.strip().lower()
        if not (cleaned_query.startswith("select") or cleaned_query.startswith("show")):
            return {"result": json.dumps({"error": "Only SELECT or SHOW queries are allowed."}), "status": "error"}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query)
        results = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        conn.close()
        
        return {"result": json.dumps({"columns": columns, "rows": results})}
    
    except Error as e:
        logger.error(f"Error executing query: {e}")
        return {"result": json.dumps({"error": str(e)}), "status": "error"}
    


if __name__ == "__main__":
    print("\n--- Starting FastMCP Server via __main__ ---")
    mcp.run()

    #fastmcp run mcp_server.py:mcp --transport sse --port 8080 --host 0.0.0.0