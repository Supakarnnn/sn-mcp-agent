import os
from fastmcp import FastMCP
from dotenv import load_dotenv
import logging
import json
from mysql.connector import connect, Error
from decimal import Decimal
from langchain_openai import ChatOpenAI
from prompt.p import VIS_REPORT
from datetime import datetime

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
    
llm = ChatOpenAI(
    base_url=os.environ.get("BASE_URL"),
    model='gpt-4o-mini',
    api_key=os.environ["OPENAI_API_KEY"],
    temperature=0,
    top_p=0
)

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
    
@mcp.tool("today_date")
async def today_date():
    """
    เครื่องมือนี้จะช่วยดูเวลา ณ ปัจจุบัน
    """
    now = datetime.now()
    logger.info(f"LLM is trying to use today_date")
    return {
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "datetime": now.isoformat()
    }

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

@mcp.tool("get_visualization_object")
async def get_visualization_object(m: str):
    """
    เครื่องมือช่วยทำ Graph, Chart จาก markdown เป็น object
    """
    logger.info(f"LLM is trying to use get_visualization_object by this message: {m}")
    messages = [
        ("system", VIS_REPORT),
        ("human", m),
    ]

    res = await llm.ainvoke(messages)
    results = res.content
    return json.dumps(results,ensure_ascii=False, cls=DecimalEncoder)
    
#YEAR
####################################################################################################################################
@mcp.tool("check_in_data_year")
async def check_in_data_year(group: str, year: str): 
    """
    เครื่องมือนี้เกี่ยวกับข้อมูลการเช็คอินหรือการเข้างานของทั้งปี
    args:
        year (str): Must be "employee_2023" or "employee_2024" or "employee_2025"
    """

    try:
        logger.info(f"LLM is trying to use check_in_data_year and choose group: {group} and year: {year}")

        if year not in ["employee_2023", "employee_2024","employee_2025"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024' or 'employee_2025'.")

        query = f"""
            SELECT 
                employee_group,
                employee_name,
                ROUND(SUM(work_hours)/9, 2) AS จำนวนวันรวมการทำงาน,
                ROUND(SUM(late_hours)/9, 2) AS จำนวนวันรวมที่มาสาย,
                SUM(CASE WHEN late_count = 1 THEN 1 ELSE 0 END) AS จำนวนครั้งที่มาสาย,
                ROUND(SUM(leave_hours)/9, 2) AS จำนวนวันที่ลางาน
            FROM 
                {year}
            WHERE 
                employee_group = %s
            GROUP BY 
                employee_group,
                employee_name
            ORDER BY 
                employee_group,
                จำนวนวันรวมที่มาสาย DESC
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
    args:
        year (str): Must be "employee_2023" or "employee_2024" or "employee_2025"    
    """

    try:
        logger.info(f"LLM is trying to use sick_count_year and choose group: {group} and year: {year}")

        if year not in ["employee_2023", "employee_2024","employee_2025"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024' or 'employee_2025'.")

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
    

@mcp.tool("check_in_RD_year")
async def check_in_RD_year(group: str, team:str ,year: str): 
    """
    เครื่องมือนี้คือเครื่องมือเฉพาะเกี่ยวกับแผนก R&D โดยมีการแยกทีม เกี่ยวกับข้อมูลการเช็คอินหรือการเข้างานของทั้งปี
    args:
        team (str): Must be "Data" or "Dev."
        year (str): Must be "employee_2023" or "employee_2024" or "employee_2025"
    """

    try:
        logger.info(f"LLM is trying to use check_in_RD_year and choose group: {group} ,team: {team} and year: {year}")

        if year not in ["employee_2023", "employee_2024","employee_2025"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024' or 'employee_2025'.")

        query = f"""
            SELECT 
                employee_group,
                employee_name,
                employee_team,
                ROUND(SUM(work_hours)/9, 2) AS จำนวนวันรวมการทำงาน,
                ROUND(SUM(late_hours)/9, 2) AS จำนวนวันรวมที่มาสาย,
                SUM(CASE WHEN late_count = 1 THEN 1 ELSE 0 END) AS จำนวนครั้งที่มาสาย,
                ROUND(SUM(leave_hours)/9, 2) AS จำนวนวันที่ลางาน
            FROM 
                {year}
            WHERE 
                employee_group = %s
                AND employee_team  = '{team}'
            GROUP BY 
                employee_group,
                employee_name
            ORDER BY 
                employee_group,
                จำนวนวันรวมที่มาสาย DESC
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
   

@mcp.tool("sick_RD_year")
async def sick_RD_year(group: str, team:str ,year: str):
    """
    เครื่องมือนี้คือเครื่องมือเฉพาะเกี่ยวกับแผนก R&D โดยมีการแยกทีม เกี่ยวข้องกับการลาป่วย,ลากิจ,ลาประจำปี ของทั้งปี
    args:
        team (str): Must be "Data" or "Dev."
        year (str): Must be "employee_2023" or "employee_2024" or "employee_2025"
    """

    try:
        logger.info(f"LLM is trying to use sick_RD_year and choose group: {group} ,team: {team} and year: {year}")

        if year not in ["employee_2023", "employee_2024","employee_2025"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024' or 'employee_2025'.")

        query = f"""
            SELECT 
                employee_name,
                employee_group,
                employee_team,
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
                AND employee_team = "{team}"
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
@mcp.tool("check_in_data_date")
async def check_in_data_date(group: str, year: str,start_date: str,end_date: str): 
    """
    เครื่องมือนี้เกี่ยวกับข้อมูลการเช็คอินหรือการเข้างาน ตามช่วงเวลาที่กำหนด

    args:
        group (str): Name of group such as "Back Office"
        year (str): Must be "employee_2023" or "employee_2024" or "employee_2025"
        start_date (str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
        end_date(str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
    """

    try:
        logger.info(f"LLM is trying to use check_in_data_date and choose group: {group} and year: {year} and date: {start_date} to {end_date}")

        if year not in ["employee_2023", "employee_2024","employee_2025"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024' or 'employee_2025'.")

        query = f"""
            SELECT 
                employee_group,
                employee_name,
                ROUND(SUM(work_hours)/9, 2) AS จำนวนวันรวมการทำงาน,
                ROUND(SUM(late_hours)/9, 2) AS จำนวนวันรวมที่มาสาย,
                SUM(CASE WHEN late_count = 1 THEN 1 ELSE 0 END) AS จำนวนครั้งที่มาสาย,
                ROUND(SUM(leave_hours)/9, 2) AS จำนวนวันที่ลางาน
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
                จำนวนวันรวมที่มาสาย DESC;
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
    

@mcp.tool("sick_count_by_date")
async def sick_count_by_date(group: str, year: str,start_date: str,end_date: str): 
    """
    เครื่องมือนี้เกี่ยวข้องกับการลาป่วย,ลากิจ,ลาประจำปี ตามช่วงเวลาที่กำหนด

    args:
        group (str): Name of group such as "Back Office"
        year (str): Must be "employee_2023" or "employee_2024" or "employee_2025"
        start_date (str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
        end_date(str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
    """

    try:
        logger.info(f"LLM is trying to use sick_count_by_date and choose group: {group} and year: {year} and date: {start_date} to {end_date}")

        if year not in ["employee_2023", "employee_2024","employee_2025"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024' or 'employee_2025'.")

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


@mcp.tool("check_in_RD_date")
async def check_in_RD_date(group: str,team: str, year: str,start_date: str,end_date: str): 
    """
    เครื่องมือนี้คือเครื่องมือเฉพาะเกี่ยวกับแผนก R&D โดยมีการแยกทีม เกี่ยวกับข้อมูลการเช็คอินหรือการเข้างาน ตามช่วงเวลาที่กำหนด

    args:
        group (str): Name of group such as "Back Office"
        team (str): Must be "Data" or "Dev."
        year (str): Must be "employee_2023" or "employee_2024" or "employee_2025"
        start_date (str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
        end_date(str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
    """

    try:
        logger.info(f"LLM is trying to use check_in_RD_date and choose group: {group} team: {team} and year: {year} and date: {start_date} to {end_date}")

        if year not in ["employee_2023", "employee_2024","employee_2025"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024' or 'employee_2025'.")

        query = f"""
            SELECT 
                employee_group,
                employee_name,
                employee_team,
                ROUND(SUM(work_hours)/9, 2) AS จำนวนวันรวมการทำงาน,
                ROUND(SUM(late_hours)/9, 2) AS จำนวนวันรวมที่มาสาย,
                SUM(CASE WHEN late_count = 1 THEN 1 ELSE 0 END) AS จำนวนครั้งที่มาสาย,
                ROUND(SUM(leave_hours)/9, 2) AS จำนวนวันที่ลางาน
            FROM 
                {year}
            WHERE 
                employee_group = %s
                AND employee_team = '{team}'
                AND (
                checkin_date BETWEEN '{start_date}' AND '{end_date}'
                OR leave_hours > 0
            )
            GROUP BY 
                employee_group,
                employee_name
            ORDER BY 
                employee_group,
                จำนวนวันรวมที่มาสาย DESC;
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
    

@mcp.tool("sick_RD_date")
async def sick_RD_date(group: str,team: str, year: str,start_date: str,end_date: str): 
    """
    เครื่องมือนี้คือเครื่องมือเฉพาะเกี่ยวกับแผนก R&D โดยมีการแยกทีม เกี่ยวข้องกับการลาป่วย,ลากิจ,ลาประจำปี ตามช่วงเวลาที่กำหนด

    args:
        group (str): Name of group such as "Back Office"
        team (str): Must be "Data" or "Dev."
        year (str): Must be "employee_2023" or "employee_2024" or "employee_2025"
        start_date (str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
        end_date(str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
    """

    try:
        logger.info(f"LLM is trying to use sick_RD_date and choose group: {group} team: {team} and year: {year} and date: {start_date} to {end_date}")

        if year not in ["employee_2023", "employee_2024","employee_2025"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024' or 'employee_2025'.")

        query = f"""
           SELECT 
                employee_name,
                employee_group,
                employee_team,
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
                AND employee_team = {team}
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

@mcp.tool("get_overtime")
async def get_overtime(name: str, year: str,start_date: str,end_date: str): 
    """
    เครื่องมือนี้จะแสดง กะเวลาทำงาน, การเช็คอิน, การเช็คเอาท์ เพื่อวิเคราะห์ว่าทำงานล่วงเวลากี่ชั่วโมง/นาที

    args:
        name(str) : Must be "%name%"
        year (str): Must be "employee_2023" or "employee_2024" or "employee_2025"
        start_date (str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
        end_date(str): Must be YEAR-MOUNTH-DAY such as "2023-01-01"
    """

    try:
        logger.info(f"LLM is trying to use get_overtime: year: {year} start: {start_date} END: {end_date} and Name: {name}")

        if year not in ["employee_2023", "employee_2024","employee_2025"]:
            raise ValueError("Invalid year parameter. Must be 'employee_2023' or 'employee_2024' or 'employee_2025'.")

        query = f"""
        SELECT 
            employee_name,
            work_range_date,
            checkin_date,
            checkout_date,
            checkin_time,
            checkout_time 
        FROM 
            {year}
        WHERE 
            employee_name LIKE '{name}'
            AND checkin_date BETWEEN '{start_date}' AND '{end_date}'
        """

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        return json.dumps(results, ensure_ascii=False, cls=DecimalEncoder)

    except Exception as e:
        logger.error(f"Error executing query: {e}")
        return {"result": json.dumps({"error": str(e)}), "status": "error"}

if __name__ == "__main__":
    mcp.run()

    #fastmcp run mcp_server.py:mcp --transport streamable-http --port 8080 --host 0.0.0.0