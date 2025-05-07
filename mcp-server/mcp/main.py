import mysql.connector
import json
import asyncio
from fastmcp import FastMCP

mcp = FastMCP(name="My First MCP Server")
print("FastMCP server object created.")

import mysql.connector
import json
from mcp import tool

@tool(
    name="employee_late_summary_by_group",
    description="สรุปจำนวนครั้งที่พนักงานมาสายและชั่วโมงการทำงาน แยกตามกลุ่มพนักงานจาก MySQL"
)
def employee_late_summary_by_group(group: str) -> str:
    """
    ดึงข้อมูลสรุปการทำงานของพนักงานจากฐานข้อมูล MySQL โดยกรองตามกลุ่มพนักงาน

    พารามิเตอร์:
        group (str): ชื่อกลุ่มพนักงาน เช่น "Back Office"

    คืนค่า:
        str: JSON string ที่ประกอบด้วย:
            - สถานะ (สำเร็จ/ล้มเหลว)
            - ข้อมูลพนักงานแต่ละคน เช่น ทีม กลุ่ม รหัส ชื่อ ชั่วโมงการทำงาน การลา การมาสาย
    """
    try:
        conn = mysql.connector.connect(
            host="192.168.10.94",
            port=6033,
            user="root",
            password="password",
            database="Northwind"
        )

        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT 
                employee_team,
                employee_group,
                employee_id,
                employee_name,
                SUM(work_hours) AS total_work_hours,
                SUM(leave_hours) AS total_leave_hours,
                SUM(CASE WHEN late_count = 1 THEN 1 ELSE 0 END) AS total_late_count,
                SUM(late_hours) AS total_late_hours
            FROM 
                employee_2023
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

        cursor.execute(query, (group,))
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        result = {
            "status": "สำเร็จ",
            "employees": results
        }

    except mysql.connector.Error as e:
        result = {
            "status": "ล้มเหลว",
            "message": str(e)
        }

    return json.dumps(result, ensure_ascii=False)


