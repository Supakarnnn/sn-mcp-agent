import os
import io
import json
import pandas as pd
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi import UploadFile, File
from mysql.connector import connect, Error
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage,AIMessage
from langchain_openai import ChatOpenAI
from model.module import RequestMessage, AgentResponse
from prompt.p import DATA_ADMIN
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from agent.graph import react_agent,react_sick_agent
from agent.react import p_react_agent

app = FastAPI(title="AI Assistant")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
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
        raise Exception(f"{str(e)}")


llm = ChatOpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
    base_url=os.environ.get("BASE_URL"),
    model='gpt-4.1-mini',
    streaming=True,
    temperature=0,
    top_p=0
)

@app.post("/preview-csv")
async def preview_csv(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    df = df.drop([
        'กะทำงาน / ช่วงวันที่\nเข้างาน วันที่',
        'กะทำงาน / ช่วงวันที่\nเข้างาน เวลา ',
        'กะทำงาน / ช่วงวันที่\nออกงาน วันที่',
        'กะทำงาน / ช่วงวันที่\nออกงาน เวลา ',
        'เข้างานด้วยสถานที่',
        'ออกงานด้วยสถานที่',
        'Onsite',
        'ปรับเวลา',
        'ไม่เข้า-ออกงาน',
        'อีเมล',
    ], axis=1)

    df = df.rename(columns={
        'รหัสพนักงาน': 'employee_id',
        'ชื่อพนักงาน': 'employee_name',
        'ตำแหน่ง': 'employee_position',
        'กลุ่มผู้ใช้งาน': 'employee_group',
        'ทีม': 'employee_team',
        'เข้างาน\nวันที่': 'checkin_date',
        'เข้างาน\nเวลา ': 'checkin_time',
        'ออกงาน\nวันที่': 'checkout_date',
        'ออกงาน\nเวลา ': 'checkout_time',
        'กะทำงาน / ช่วงวันที่': 'work_range_date',
        'ชั่วโมงการทำงาน\n(HH.MM)': 'work_hours',
        'สาย\n(HH.MM)': 'late_hours',
        'ล่วงเวลา\n(HH.MM)': 'overtime_hours',
        'ลางาน\n(HH.MM)': 'leave_hours',
        'บันทึกการทำงาน': 'work_record',
        'สาย/ครั้ง': 'late_count'
    })
    date_cols = ['checkin_date', 'checkout_date']
    for col in date_cols:
        df[col] = pd.to_datetime(df[col], format='%d/%m/%Y', errors='coerce')
        df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) else '')

    def convert_end_time(value):
        try:
            start, end = value.split(" - ")
            hour_map = {
                "05:00 PM": "17:00 PM",
                "05:30 PM": "17:30 PM",
                "06:00 PM": "18:00 PM",
                "06:00 PM": "18:00 PM",
            }
            end_converted = hour_map.get(end.strip(), end)
            return f"{start.strip()} - {end_converted}"
        except:
            return value
        
    df['work_range_date'] = df['work_range_date'].apply(convert_end_time)

    df = df.fillna('0')
    preview = df.head(50).to_dict(orient="records")
    return {"headers": df.columns.tolist(), "rows": preview}

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    df = df.drop([
        'กะทำงาน / ช่วงวันที่\nเข้างาน วันที่',
        'กะทำงาน / ช่วงวันที่\nเข้างาน เวลา ',
        'กะทำงาน / ช่วงวันที่\nออกงาน วันที่',
        'กะทำงาน / ช่วงวันที่\nออกงาน เวลา ',
        'เข้างานด้วยสถานที่',
        'ออกงานด้วยสถานที่',
        'Onsite',
        'ปรับเวลา',
        'ไม่เข้า-ออกงาน',
        'อีเมล',
    ], axis=1)

    df = df.rename(columns={
        'รหัสพนักงาน': 'employee_id',
        'ชื่อพนักงาน': 'employee_name',
        'ตำแหน่ง': 'employee_position',
        'กลุ่มผู้ใช้งาน': 'employee_group',
        'ทีม': 'employee_team',
        'เข้างาน\nวันที่': 'checkin_date',
        'เข้างาน\nเวลา ': 'checkin_time',
        'ออกงาน\nวันที่': 'checkout_date',
        'ออกงาน\nเวลา ': 'checkout_time',
        'กะทำงาน / ช่วงวันที่': 'work_range_date',
        'ชั่วโมงการทำงาน\n(HH.MM)': 'work_hours',
        'สาย\n(HH.MM)': 'late_hours',
        'ล่วงเวลา\n(HH.MM)': 'overtime_hours',
        'ลางาน\n(HH.MM)': 'leave_hours',
        'บันทึกการทำงาน': 'work_record',
        'สาย/ครั้ง': 'late_count'
    })
    date_cols = ['checkin_date', 'checkout_date']
    for col in date_cols:
        df[col] = pd.to_datetime(df[col], format='%d/%m/%Y', errors='coerce')
        df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) else '')

    def convert_end_time(value):
        try:
            start, end = value.split(" - ")
            hour_map = {
                "05:00 PM": "17:00 PM",
                "05:30 PM": "17:30 PM",
                "06:00 PM": "18:00 PM",
                "06:00 PM": "18:00 PM",
            }
            end_converted = hour_map.get(end.strip(), end)
            return f"{start.strip()} - {end_converted}"
        except:
            return value
        
    df['work_range_date'] = df['work_range_date'].apply(convert_end_time)

    df = df.fillna('0')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        for _, row in df.iterrows():
            sql = """INSERT INTO employee_2025 (
                employee_id, employee_name, employee_position,
                employee_group, employee_team,
                checkin_date, checkin_time, checkout_date, checkout_time,
                work_range_date, work_hours, late_hours, overtime_hours,
                leave_hours, work_record, late_count
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""

            values = (
                int(row['employee_id']),
                row['employee_name'],
                row['employee_position'],
                row['employee_group'],
                row['employee_team'],
                row['checkin_date'],
                row['checkin_time'],
                row['checkout_date'],
                row['checkout_time'],
                row['work_range_date'],
                float(row['work_hours']),
                float(row['late_hours']),
                float(row['overtime_hours']),
                float(row['leave_hours']),
                row['work_record'],
                int(row['late_count']),
            )
            cursor.execute(sql, values)

        conn.commit()
        return {"message": "✅ CSV data imported successfully."}

    except Exception as e:
        return {"error": str(e)}
    
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.post("/chat")
async def chat(chatmessage: RequestMessage):
    messages = []
    
    for chat in chatmessage.messages:
        if chat.role == 'ai':
            messages.append(AIMessage(content=chat.content))
        elif chat.role == 'human':
            messages.append(HumanMessage(content=chat.content))
        elif chat.role == 'system':
            messages.append({"role": "system", "content": chat.content})

    client = MultiServerMCPClient(
        {
            "db": {
                "url": "http://mcp:8080/mcp",
                "transport": "streamable_http",
            }
        }
    )

    async with client.session("db") as session:
        tools = await load_mcp_tools(session)
        
        agent = p_react_agent(llm, tools, DATA_ADMIN)
        result = await agent.ainvoke({"messages": messages})   
        final_result = result["messages"][-1].content

        return {
            "response": final_result,
            "full_messages": result["messages"]
        }
        
@app.post("/create-check-in-report", response_model=AgentResponse)
async def create_report(request: RequestMessage):
    messages = []

    for msg in request.messages:
        if msg.role == 'human':
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == 'ai':
            messages.append(AIMessage(content=msg.content))
        
    client = MultiServerMCPClient(
        {
            "db": {
                "url": "http://mcp:8080/mcp",
                "transport": "streamable_http",
            }
        }
    )

    async with client.session("db") as session:
        tools = await load_mcp_tools(session)
        agent = react_agent(llm, tools, "async")
        result = await agent.ainvoke({"messages": messages, "recursion_limit": 15})
        
        plann = result.get("report_plan","Noting was generated.")
        queryy = result.get("report_query","Noting was generated.")
        reportt = result.get("report_final","Noting was generated.")
        graphh = result.get("report_graph","Noting was generated.")      

        return AgentResponse(
            response=reportt + graphh,
            plan=plann,
            query=queryy,
            report=reportt,
            graph=graphh
        )
    
@app.post("/create-take-leave-report", response_model=AgentResponse)
async def create_sick_report(request: RequestMessage):
    messages = []

    for msg in request.messages:
        if msg.role == 'human':
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == 'ai':
            messages.append(AIMessage(content=msg.content))


    client = MultiServerMCPClient(
        {
            "db": {
                "url": "http://mcp:8080/mcp",
                "transport": "streamable_http",
            }
        }
    )
    async with client.session("db") as session:
        tools = await load_mcp_tools(session)
        agent = react_sick_agent(llm, tools, "async")
        result = await agent.ainvoke({"messages": messages, "recursion_limit": 15})
        
        plann = result.get("report_plan","Noting was generated.")
        queryy = result.get("report_query","Noting was generated.")
        reportt = result.get("report_final","Noting was generated.")
        graphh = result.get("report_graph","Noting was generated.")      

        return AgentResponse(
            response=reportt + graphh,
            plan=plann,
            query=queryy,
            report=reportt,
            graph=graphh
        )

@app.get("/")
async def health_check():

    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app,host='0.0.0.0',port=8001)

    # http://localhost:8080/mcp
    #http://mcp:8080/mcp

    