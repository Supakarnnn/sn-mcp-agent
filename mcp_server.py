import os
from fastmcp import FastMCP
from dotenv import load_dotenv
import logging
import asyncio
import json
from mcp.types import Resource, Tool, TextContent
from mysql.connector import connect, Error
from decimal import Decimal

load_dotenv()

mcp = FastMCP(name="MCP Server")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("MCP Server")

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

# DB_CONFIG = {
#     "host": os.environ.get("MYSQL_HOST"),
#     "user": os.environ.get("MYSQL_USER"),
#     "password": os.environ.get("MYSQL_PASSWORD"),
#     "database": os.environ.get("MYSQL_DATABASE"),
#     "port": 3306
# }

DB_CONFIG = {
    "host": os.environ.get("MYSQL_HOST_NW"),
    "user": os.environ.get("MYSQL_USER_NW"),
    "password": os.environ.get("MYSQL_PASSWORD_NW"),
    "database": os.environ.get("MYSQL_DATABASE_NW"),
    "port": 6033
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
        logger.info(f"LLM is trying to execute: {query}")

        cleaned_query = query.strip().lower()
        # cleaned_query = query
        if not (cleaned_query.startswith("select") or cleaned_query.startswith("show")):
            return {"result": json.dumps({"error": "Only SELECT or SHOW queries are allowed."}), "status": "error"}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query)
        results = cursor.fetchall()
        print(results)
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        conn.close()
        
        return json.dumps({"columns": columns,"rows": results},ensure_ascii=False)
    
    except Error as e:
        logger.error(f"Error executing query: {e}")
        return {"result": json.dumps({"error": str(e)}), "status": "error"}
    

@mcp.tool("employee_late_summary_by_group")
async def employee_late_summary_by_group(group: str, year: str): 
    """
    Query employee summary data from database(MySQL) by filtering by employee group.
    If user requires 2023, insert year = "employee_2023"
    If user requires 2024, insert year = "employee_2024"

    args:
        group (str): Name of group such as "Back Office"
        year (str): Must be "employee_2023" or "employee_2024"

    result:
        str: JSON string including:
            - employee_group, employee_name, total_work_hours, total_leave_hours, total_late_count, total_late_hours
    """

    try:
        logger.info(f"LLM is trying to choose group: {group} and year: {year}")

        if year not in ["employee_2023", "employee_2024"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024'.")

        query = f"""
            SELECT 
                employee_group,
                employee_name,
                SUM(work_hours) AS total_work_hours,
                SUM(leave_hours) AS total_leave_hours,
                SUM(CASE WHEN late_count = 1 THEN 1 ELSE 0 END) AS total_late_count,
                SUM(late_hours) AS total_late_hours
            FROM 
                {year}
            WHERE 
                employee_group = %s
            GROUP BY 
                employee_team,
                employee_group,
                employee_id,
                employee_name
            ORDER BY 
                employee_team,
                employee_group,
                total_late_count DESC
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

    

# @mcp.tool("Sales_Target_Success")
# async def sales_target(year: str, month: str=None):
#     """ 
#     Employee Sales Report
#     - If both year and month are entered => Sales report for that month only
#     - If only year is entered => Sales report for the whole year

#     Args:
#     year (str): Year (4 digits) e.g. "2024"
#     month (str, optional): Month (2 digits) e.g. "04" If not entered, the whole year

#     Returns:
#     list[dict] | dict: Sales data or error message
# """
#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()

#         if month:
#             period = f"{year}-{month}-01"
#             query = f"""
#                 SELECT 
#                     ns.personid,
#                     ne.fullname,
#                     ns.price,
#                     ns.planned_value,
#                     (ns.price - ns.planned_value) AS over_target
#                 FROM 
#                     nation_saleperformance AS ns
#                 JOIN 
#                     nation_employee AS ne
#                 ON 
#                     ns.personid = ne.id
#                 WHERE 
#                     ns.period = '{period}'
#                 AND ns.price >= ns.planned_value;
#             """
#         else:  
#             query = f"""
#                 SELECT 
#                     ne.id AS personid,
#                     ne.fullname,
#                     COALESCE(SUM(ns.price), 0) AS total_price,
#                     COALESCE(SUM(ns.planned_value), 0) AS total_planned_value,
#                     (COALESCE(SUM(ns.price), 0) - COALESCE(SUM(ns.planned_value), 0)) AS over_target
#                 FROM 
#                     nation_employee AS ne
#                 LEFT JOIN 
#                     nation_saleperformance AS ns
#                 ON 
#                     ns.personid = ne.id
#                 AND YEAR(ns.period) = '{year}'
#                 GROUP BY 
#                     ne.id, ne.fullname
#                 HAVING 
#                     total_price > 0
#                 ORDER BY 
#                     over_target DESC;
#             """
#         cursor.execute(query)
#         results = cursor.fetchall()
#         cursor.close()
#         conn.close()
        
#         output = []
#         for row in results:
#             if month:
#                 output.append({
#                     "personid": row[0],
#                     "fullname": row[1],
#                     "price": int(row[2]),
#                     "planned_value": int(row[3]),
#                     "over_target": int(row[4])
#                 })
#             else:
#                 output.append({
#                     "personid": row[0],
#                     "fullname": row[1],
#                     "total_price": int(row[2]),
#                     "total_planned_value": int(row[3]),
#                     "over_target": int(row[4])
#                 })

#         return json.dumps(output,ensure_ascii=False)
        
#     except Error as e:
#         logger.error(f"Error executing query: {e}")
#         return {"result": json.dumps({"error": str(e)}), "status": "error"}



#########################################################################
@mcp.tool("list_available_tools")
async def list_available_tools():
    """List all tools available in this MCP server."""
    tools = [
        {
            "name": "execute_select_or_show",
            "description": "Execute only SELECT or SHOW queries."
        },
    ]
    
    return {"result": json.dumps({"tools": tools})}
#########################################################################


if __name__ == "__main__":
    print("\n--- Starting FastMCP Server via __main__ ---")
    mcp.run()

    #fastmcp run mcp_server.py:mcp --transport sse --port 8080 --host 0.0.0.0