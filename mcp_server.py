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
    """
    This is basic tool to Execute only SELECT or SHOW queries.
    If user want basic information try this basic tool

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
        
        return json.dumps({"columns": columns,"rows": results},ensure_ascii=False)
    
    except Error as e:
        logger.error(f"Error executing query: {e}")
        return {"result": json.dumps({"error": str(e)}), "status": "error"}


#YEAR
####################################################################################################################################
@mcp.tool("employee_late_summary_by_group_year")
async def employee_late_summary_by_group_year(group: str, year: str): 
    """
    Tool that Query employee summary data from database(MySQL) by filtering by employee group.
    If user requires 2023, insert year = "employee_2023"
    If user requires 2024, insert year = "employee_2024"

    args:
        group (str): Name of group such as "Back Office"
        year (str): Must be "employee_2023" or "employee_2024"

    result:
        str: JSON string including:
            - employee_group, 
            employee_name, 
            total_work_hours (ชั่วโมงการทำงาน), 
            total_leave_hours (ชั่วโมงที่ลางาน), 
            total_late_count (จำนวนครั้งที่มาสาย), 
            total_late_hours (ชั่วโมงที่มาสาย)
    """

    try:
        logger.info(f"LLM is trying to use employee_late_summary_by_group and choose group: {group} and year: {year}")

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
    


@mcp.tool("employee_sick_count_year")
async def employee_sick_count_year(group: str, year: str):
    """
    Tool that Query count Take leave for group of employee from database(MySQL) by filtering by employee group.
    If user requires 2023, insert year = "employee_2023"
    If user requires 2024, insert year = "employee_2024"

    args:
        group (str): Name of group such as "Back Office"
        year (str): Must be "employee_2023" or "employee_2024"

    result:
        str: JSON string including:
            - employee_group, employee_name, Annual_Day, Sick_Day, Errand_Day, total_take_leave_day
    
    """

    try:
        logger.info(f"LLM is trying to use employee_sick_count_year and choose group: {group} and year: {year}")

        if year not in ["employee_2023", "employee_2024"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024'.")

        query = f"""
            SELECT 
                employee_name,
                employee_group,
                SUM(CASE WHEN work_record LIKE '%Annual Leave%' THEN 1 ELSE 0 END) AS Annual_Day,
                SUM(CASE WHEN work_record LIKE '%Sick Leave%' THEN 1 ELSE 0 END) AS Sick_Day,
                SUM(CASE WHEN work_record LIKE '%Errand Leave%' THEN 1 ELSE 0 END) AS Errand_Day,
                SUM(
                    CASE WHEN work_record LIKE '%Annual Leave%' THEN 1 ELSE 0 END +
                    CASE WHEN work_record LIKE '%Sick Leave%' THEN 1 ELSE 0 END +
                    CASE WHEN work_record LIKE '%Errand Leave%' THEN 1 ELSE 0 END
                ) AS total_take_leave_day
            FROM 
                {year}
            WHERE 
                leave_hours > 0
                AND employee_group = %s
            GROUP BY 
                employee_name,
                employee_group
            ORDER BY 
                employee_name;

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
   
    
#############################################################################################################

#########################################################################
@mcp.tool("list_available_tools")
async def list_available_tools():
    """List all tools available in this MCP server."""
    tools = [
        {
            "name": "execute_select_or_show",
            "description": "Execute only SELECT or SHOW queries."
        },
        {
            "name": "employee_late_summary_by_group_year",
            "description": "Employee check-in summary data"  
        },
        {
            "name": "employee_sick_count_year",
            "description": "Employee Take leave summary data"
        }
    ]
    
    return {"result": json.dumps({"tools": tools})}
#########################################################################


if __name__ == "__main__":
    print("\n--- Starting FastMCP Server via __main__ ---")
    mcp.run()

    #fastmcp run mcp_server.py:mcp --transport sse --port 8080 --host 0.0.0.0