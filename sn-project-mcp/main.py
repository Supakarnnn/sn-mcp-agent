from fastmcp import FastMCP
import asyncio
import mysql.connector
from mysql.connector import Error

mcp = FastMCP(name="My First MCP Server")
print("1")

print("FastMCP server object created.")

@mcp.tool(
    name="Sales_Target_Success",
    description=(
        "รายงานยอดขายของพนักงาน โดยระบุ ปี และเดือน ที่ต้องการ"
    )
)
def Sales_Target_Success(year: str, month: str):
    """
    รายงานยอดขายของพนักงาน

    ทำการดึงข้อมูลยอดขายของพนักงาน จากฐานข้อมูล intern
    โดยสิ่งที่ต้องระบุคือ ปี และเดือน ที่ต้องการ

    Args:
        year (str): ปี (4 หลัก) เช่น "2001" 
        month (str): เดือน (2 หลัก) เช่น "04" สำหรับเมษายน

    Returns:
        list[dict] | dict: ยอดขายของพนักงาน หรือ error message ถ้าเกิดข้อผิดพลาด
    """
    try:
        conn = mysql.connector.connect(
            host="192.168.10.22",
            port=3306,
            user="root",
            password="P@ssw0rd",
            database="intern"
        )

        cursor = conn.cursor()

        period = f"{year}-{month}-01"  

        query = f"""
            SELECT 
                ns.personid,
                ne.fullname,
                ns.price,
                ns.planned_value,
                (ns.price - ns.planned_value) AS over_target
            FROM 
                nation_saleperformance AS ns
            JOIN 
                nation_employee AS ne
            ON 
                ns.personid = ne.id
            WHERE 
                ns.period = '{period}'
                AND ns.price >= ns.planned_value;
        """

        cursor.execute(query)
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        output = []
        for row in results:
            output.append({
                "personid": row[0],
                "fullname": row[1],
                "price": float(row[2]),
                "planned_value": float(row[3]),
                "over_target": float(row[4])
            })

        return output
    
    except mysql.connector.Error as e:
        return {"error": f"เกิดข้อผิดพลาดในการเชื่อมต่อ MySQL: {e}"}