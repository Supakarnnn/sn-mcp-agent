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
        
        return json.dumps({"columns": columns,"rows": results},ensure_ascii=False)
    
    except Error as e:
        logger.error(f"Error executing query: {e}")
        return {"result": json.dumps({"error": str(e)}), "status": "error"}


#YEAR
####################################################################################################################################
@mcp.tool("late_summary_by_group_year")
async def late_summary_by_group_year(group: str, year: str): 
    """
    เครื่องมือนี้เกี่ยวกับข้อมูลการเช็คอินหรือการเข้างานของทั้งปี
    """

    try:
        logger.info(f"LLM is trying to use late_summary_by_group_year and choose group: {group} and year: {year}")

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
    


@mcp.tool("sick_count_year")
async def sick_count_year(group: str, year: str):
    """
    เครื่องมือนี้เกี่ยวข้องกับการลาป่วย,ลากิจ,ลาประจำปี ของทั้งปี    
    """

    try:
        logger.info(f"LLM is trying to use sick_count_year and choose group: {group} and year: {year}")

        if year not in ["employee_2023", "employee_2024"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024'.")

        query = f"""
            SELECT 
                employee_name,
                employee_group,
                SUM(CASE WHEN work_record LIKE '%Annual Leave%' THEN 1 ELSE 0 END) AS จำนวนวันที่ลาพักผ่อน,
                SUM(CASE WHEN work_record LIKE '%Sick Leave%' THEN 1 ELSE 0 END) AS จำนวนวันที่ลาป่วย,
                SUM(CASE WHEN work_record LIKE '%Errand Leave%' THEN 1 ELSE 0 END) AS จำนวนวันที่ลากิจ,
                SUM(
                    CASE WHEN work_record LIKE '%Annual Leave%' THEN 1 ELSE 0 END +
                    CASE WHEN work_record LIKE '%Sick Leave%' THEN 1 ELSE 0 END +
                    CASE WHEN work_record LIKE '%Errand Leave%' THEN 1 ELSE 0 END
                ) AS จำนวนวันที่ลาทั้งหมด
            FROM 
                {year}
            WHERE 
                leave_hours > 0
                AND employee_group = %s
            GROUP BY 
                employee_name,
                employee_group
            ORDER BY 
                employee_group;
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

#Date
#############################################################################################################
@mcp.tool("late_summary_by_date")
async def late_summary_by_date(group: str, year: str,start_date: str,end_date: str): 
    """
    เครื่องมือนี้เกี่ยวข้องกับการลาป่วย,ลากิจ,ลาประจำปี ตามช่วงเวลาที่กำหนด

    args:
        group (str): Name of group such as "Back Office"
        year (str): Must be "employee_2023" or "employee_2024"
        start_date (str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
        end_date(str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
    """

    try:
        logger.info(f"LLM is trying to use late_summary_by_date and choose group: {group} and year: {year} and date: {start_date} to {end_date}")

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
                AND (
                checkin_date BETWEEN '{start_date}' AND '{end_date}'
                OR leave_hours > 0
            )
            GROUP BY 
                employee_group,
                employee_name
            ORDER BY 
                employee_group,
                ชั่วโมงรวมที่มาสาย DESC;
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
    

@mcp.tool("sick_summary_by_date")
async def sick_summary_by_date(group: str, year: str,start_date: str,end_date: str): 
    """
    เครื่องมือนี้เกี่ยวข้องกับการลาป่วย,ลากิจ,ลาประจำปี ตามช่วงเวลาที่กำหนด

    args:
        group (str): Name of group such as "Back Office"
        year (str): Must be "employee_2023" or "employee_2024"
        start_date (str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
        end_date(str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
    """

    try:
        logger.info(f"LLM is trying to use sick_summary_by_date and choose group: {group} and year: {year} and date: {start_date} to {end_date}")

        if year not in ["employee_2023", "employee_2024"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024'.")

        query = f"""
           SELECT 
                employee_name,
                employee_group,
                SUM(CASE WHEN work_record LIKE '%Annual Leave%' THEN 1 ELSE 0 END) AS จำนวนวันที่ลาพักผ่อน,
                SUM(CASE WHEN work_record LIKE '%Sick Leave%' THEN 1 ELSE 0 END) AS จำนวนวันที่ลาป่วย,
                SUM(CASE WHEN work_record LIKE '%Errand Leave%' THEN 1 ELSE 0 END) AS จำนวนวันที่ลากิจ,
                SUM(
                    CASE WHEN work_record LIKE '%Annual Leave%' THEN 1 ELSE 0 END +
                    CASE WHEN work_record LIKE '%Sick Leave%' THEN 1 ELSE 0 END +
                    CASE WHEN work_record LIKE '%Errand Leave%' THEN 1 ELSE 0 END
                ) AS จำนวนวันที่ลาทั้งหมด
            FROM 
                {year}
            WHERE 
                employee_group = %s
                AND (
                checkin_date BETWEEN '{start_date}' AND '{end_date}'
                OR leave_hours > 0
            )
            GROUP BY 
                employee_group,
                employee_name
            ORDER BY 
                employee_group,
                จำนวนวันที่ลาทั้งหมด
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

if __name__ == "__main__":
    mcp.run()

    #fastmcp run mcp_server.py:mcp --transport sse --port 8080 --host 0.0.0.0