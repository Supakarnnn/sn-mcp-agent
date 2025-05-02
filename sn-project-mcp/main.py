from fastmcp import FastMCP
import asyncio 
import mysql.connector
from mysql.connector import Error
import re
import json

mcp = FastMCP(name="My First MCP Server")
print("FastMCP server object created.")

@mcp.tool(
    name="product_sales_tool",
    description="ดึงข้อมูลยอดขายสินค้า เปรียบเทียบกับสินค้าคงคลัง และเปอร์เซ็นต์การขายตามช่วงเวลา"
)
def product_sales_tool(start_date: str, end_date: str) -> str:
    """
    ดึงข้อมูลยอดขายสินค้า รวมถึงสินค้าคงคลังและเปอร์เซ็นต์ที่ขายออกไปในช่วงเวลาที่กำหนด

    Args:
        start_date (str): วันที่เริ่มต้นในรูปแบบ YYYY-MM-DD
        end_date (str): วันที่สิ้นสุดในรูปแบบ YYYY-MM-DD

    Returns:
        str: JSON string ที่ประกอบด้วยชื่อสินค้า, จำนวนที่ขาย, คงเหลือ, ที่สั่งซื้ออยู่ และเปอร์เซ็นต์ที่ขายออกไป
    """
    conn = mysql.connector.connect(
        host="192.168.10.94",
        user="root",
        password="password",
        database="Northwind",
        port=6033
    )
    cursor = conn.cursor(dictionary=True)

    query = f"""
        SELECT 
            p.ProductName,
            SUM(o.Quantity) AS TotalSold,
            p.UnitsInStock,
            p.UnitsOnOrder,
            ROUND((SUM(o.Quantity) / (SUM(o.Quantity) + p.UnitsInStock)) * 100, 2) AS PercentSold
        FROM 
            orders o
        JOIN 
            Products p ON o.ProductID = p.ProductID
        WHERE 
            o.OrderDate BETWEEN %s AND %s
        GROUP BY 
            p.ProductName, p.UnitsInStock, p.UnitsOnOrder
        ORDER BY 
            PercentSold DESC;
    """

    cursor.execute(query, (start_date, end_date))
    rows = cursor.fetchall()
    conn.close()

    return json.dumps({
        "status": "สำเร็จ",
        "period": {"start": start_date, "end": end_date},
        "products": rows,
        "message": "ไม่พบข้อมูลยอดขายในช่วงเวลาดังกล่าว" if not rows else None
    }, ensure_ascii=False)

@mcp.tool(
    name="top_sales_employees",
    description="แสดงรายชื่อ 10 อันดับพนักงานที่มียอดขายรวมสูงสุดในช่วงเวลาที่กำหนด"
)
def top_sales_employees(start_date: str, end_date: str) -> str:
    """
    คำนวณยอดขายรวมของแต่ละพนักงาน และคืนค่า 10 อันดับแรกที่มียอดขายมากที่สุด
    
    Args:
        start_date (str): วันที่เริ่มต้น (รูปแบบ YYYY-MM-DD)
        end_date (str): วันที่สิ้นสุด (รูปแบบ YYYY-MM-DD)
    
    Returns:
        str: JSON string ประกอบด้วยชื่อพนักงานและยอดขายรวม
    """
    import mysql.connector
    import json

    conn = mysql.connector.connect(
        host="192.168.10.94",
        user="root",
        password="password",
        database="Northwind",
        port=6033
    )
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            p.ProductName,
            c.CategoryName AS Category,
            s.SupplierName AS Supplier,
            MAX(o.UnitPrice) AS UnitPrice,
            SUM(o.Quantity) AS Quantity,
            SUM(o.UnitPrice * o.Quantity) AS TotalPrice
        FROM orders o
        JOIN Products p ON o.ProductID = p.ProductID
        JOIN Categories c ON p.CategoryID = c.CategoryID
        JOIN Suppliers s ON p.SupplierID = s.SupplierID
        WHERE o.OrderDate BETWEEN %s AND %s
        GROUP BY o.ProductID, p.ProductName, c.CategoryName, s.SupplierName
        ORDER BY TotalPrice DESC
        LIMIT %s;

    """

    cursor.execute(query, (start_date, end_date))
    rows = cursor.fetchall()
    conn.close()

    return json.dumps({
        "status": "สำเร็จ",
        "period": {"start": start_date, "end": end_date},
        "top_employees": rows,
        "message": "ไม่พบข้อมูลยอดขายในช่วงเวลาดังกล่าว" if not rows else None
    }, ensure_ascii=False)

@mcp.tool(
    name="product_sales_summary",
    description="ดึงข้อมูลจำนวนขายและรายได้รวมของสินค้าทั้งหมดในช่วงเวลาที่กำหนด"
)
def product_sales_summary(start_date: str, end_date: str) -> str:
    """
    แสดงจำนวนสินค้าที่ขาย และรายได้รวมของสินค้าทั้งหมดในช่วงเวลาที่กำหนด

    Args:
        start_date (str): วันที่เริ่มต้น (YYYY-MM-DD)
        end_date (str): วันที่สิ้นสุด (YYYY-MM-DD)

    Returns:
        str: JSON string รายงานยอดขายและรายได้
    """

    conn = mysql.connector.connect(
        host="192.168.10.94",
        user="root",
        password="password",
        database="Northwind",
        port=6033
    )
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            p.ProductName,
            SUM(o.Quantity) AS TotalQuantitySold,
            ROUND(SUM(o.UnitPrice * o.Quantity * (1 - o.Discount)), 2) AS TotalRevenue
        FROM 
            orders o
        JOIN 
            Products p ON o.ProductID = p.ProductID
        WHERE 
            o.OrderDate BETWEEN %s AND %s
        GROUP BY 
            p.ProductName
        ORDER BY 
            TotalRevenue DESC;
    """

    cursor.execute(query, (start_date, end_date))
    rows = cursor.fetchall()
    conn.close()

    return json.dumps({
        "status": "สำเร็จ",
        "period": {"start": start_date, "end": end_date},
        "products": rows,
        "message": "ไม่พบข้อมูลยอดขายในช่วงเวลาดังกล่าว" if not rows else None
    }, ensure_ascii=False)


