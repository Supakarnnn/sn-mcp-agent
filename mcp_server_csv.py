import os
import pandas as pd
from dotenv import load_dotenv
from fastmcp import FastMCP
import logging
import json

load_dotenv()

mcp = FastMCP(name="MCP Server CSV")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("MCP Server")

CSV_FILE_PATH = "csv_file\employee_c.csv"

@mcp.tool("read_csv")
async def read_csv(query: str = None):
    """Read Empolyee data from a CSV file."""
    try:
        logger.info(f"Reading CSV file: {CSV_FILE_PATH}")
        df = pd.read_csv(CSV_FILE_PATH)

        logger.info(f"LLM is trying to execute: {query}")

        if query:
            df = df.query(query)

        return df.to_json(orient="records", force_ascii=False)
    
    except Exception as e:
        logger.error(f"CSV error: {e}")
        return {"result": json.dumps({"error": str(e)}), "status": "error"}
    

if __name__ == "__main__":
    print("\n--- Starting FastMCP Server via __main__ ---")
    mcp.run()

    # fastmcp run mcp_server_csv.py:mcp --transport sse --port 8080 --host 0.0.0.0