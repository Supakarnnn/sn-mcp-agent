import mysql.connector
import json
import asyncio
from fastmcp import FastMCP
from mcp import tool

mcp = FastMCP(name="My MCP Server")
print("FastMCP server object created.")

@mcp tool(
    name="employee_attendance_summary",
    description="รายละเอียด (จำนวนวันทำงาน, จำนวนครั้งที่ลา, จำนวนวันลา, จำนวนครั้งที่มาสาย, จำนวนวันมาสาย) ของพนักงานแต่ละคน แต่ละกลุ่ม"
)
def employee_attendance_summary(group: str, year: str) -> str:
    """
    ดึงข้อมูล (จำนวนวันทำงาน, จำนวนครั้งที่ลา, จำนวนวันลา, จำนวนครั้งที่มาสาย, จำนวนวันมาสาย) ของพนักงานแต่ละคน แต่ละกลุ่ม

    พารามิเตอร์:
        group (str): ชื่อกลุ่มพนักงาน เช่น "R&D"
        year (str): ปีที่ต้องการทราบ เช่น "2023"

    คืนค่า:
        str: สตริงในรูปแบบ JSON ซึ่งประกอบด้วย:
            - สถานะของการดึงข้อมูล (เช่น "สำเร็จ" หรือ "ล้มเหลว")
            - รายละเอียดของพนักงานแต่ละคน:
                - employee_id: รหัสพนักงาน
                - employee_name: ชื่อพนักงาน
                - employee_group: กลุ่ม
                - employee_team: ทีม
                - total_work_days: จำนวนวันทำงาน
                - total_leave_count: จำนวนครั้งที่ลา
                - total_leave_days: จำนวนวันลา
                - total_late_count: จำนวนครั้งที่มาสาย
                - total_late_days: จำนวนวันมาสาย
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
                employee_id,
                employee_name,
                employee_group,
                employee_team,
                ROUND(SUM(work_hours) / 8, 2) AS total_work_days,
                ROUND(SUM(leave_hours) / 8, 2) AS total_leave_days,
                SUM(CASE WHEN leave_hours > 0.0 THEN 1 ELSE 0 END) AS total_leave_count,
                SUM(CASE WHEN late_count = 1 THEN 1 ELSE 0 END) AS total_late_count,
                ROUND(SUM(late_hours) / 8, 2) AS total_late_days
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
                total_late_count DESC;
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



# test
@mcp tool(
    name="employee_late_summary",
    description="สรุปจำนวนครั้งที่มาสาย และจำนวนวันมาสายของพนักงานรายบุคคลในกลุ่มที่ระบุ สำหรับปีที่กำหนด"
)
def employee_late_summary(name: str, group: str, year: str) -> str:
    """
    ดึงข้อมูลสรุปจำนวนครั้งที่มาสาย และจำนวนวันมาสายของพนักงานรายบุคคลในกลุ่มที่ระบุ สำหรับปีที่กำหนด

    พารามิเตอร์:
        name (str): ชื่อพนักงาน เช่น "นาย สมชาย"
        group (str): ชื่อกลุ่มพนักงาน เช่น "R&D"
        year (str): ปีที่ต้องการดูข้อมูล เช่น "2023"

    คืนค่า:
        str: ข้อมูลในรูปแบบ JSON ประกอบด้วย:
            - สถานะของการดึงข้อมูล (เช่น "สำเร็จ" หรือ "ล้มเหลว")
            - รายละเอียดของพนักงาน:
                - employee_id: รหัสพนักงาน
                - employee_name: ชื่อพนักงาน
                - employee_group: กลุ่ม
                - employee_team: ทีม
                - total_late_days: จำนวนวันมาสาย
                - total_late_count: จำนวนครั้งที่มาสาย
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
                employee_id,
                employee_name,
                employee_group,
                employee_team,
                ROUND(SUM(late_hours) / 8.0, 2) AS total_late_days,
                SUM(late_count) AS total_late_count
            FROM 
                {year}
            WHERE 
                late_hours > 0
                AND employee_group = %s
            GROUP BY 
                employee_id,
                employee_name,
                employee_group,
                employee_team
            ORDER BY 
                employee_team, 
                employee_group, 
                employee_name;
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

@mcp.tool(
    name="employee_leave_summary",
    description="สรุปจำนวนครั้งที่ลา และจำนวนวันลาของพนักงานรายบุคคลในกลุ่มที่ระบุ สำหรับปีที่กำหนด"
)
def employee_leave_summary(name: str, group: str, year: str) -> str:
    """
    ดึงข้อมูลสรุปจำนวนครั้งที่ลา และจำนวนวันลาของพนักงานรายบุคคลในกลุ่มที่ระบุ สำหรับปีที่กำหนด

    พารามิเตอร์:
        name (str): ชื่อพนักงาน เช่น "นาย สมชาย"
        group (str): ชื่อกลุ่มพนักงาน เช่น "R&D"
        year (str): ปีที่ต้องการดูข้อมูล เช่น "2023"

    คืนค่า:
        str: ข้อมูลในรูปแบบ JSON ประกอบด้วย:
            - สถานะของการดึงข้อมูล (เช่น "สำเร็จ" หรือ "ล้มเหลว")
            - รายละเอียดของพนักงาน:
                - employee_id: รหัสพนักงาน
                - employee_name: ชื่อพนักงาน
                - employee_group: กลุ่ม
                - employee_team: ทีม
                - total_leave_days: จำนวนวันลา
                - total_leave_count: จำนวนครั้งที่ลา
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
                employee_id,
                employee_name,
                employee_group,
                employee_team,
                ROUND(SUM(leave_hours) / 8.0, 2) AS total_leave_days,
                SUM(CASE WHEN leave_hours > 0.0 THEN 1 ELSE 0 END) AS total_leave_count
            FROM 
                {year}
            WHERE 
                late_hours > 0
                AND employee_group = %s
            GROUP BY 
                employee_id,
                employee_name,
                employee_group,
                employee_team
            ORDER BY 
                employee_team, 
                employee_group, 
                employee_name;
        """

        cursor.execute(query, (group, name))
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
