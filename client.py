import os
import io
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi import UploadFile, File, APIRouter, Form
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage,AIMessage,SystemMessage
from langchain_openai import ChatOpenAI
from model.module import RequestMessage, AgentResponse
from prompt.p import DATABASE_ADMIN
from langchain_mcp_adapters.client import MultiServerMCPClient
from agent.graph import react_agent,react_sick_agent
from agent.react import p_react_agent

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Assistant")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = ChatOpenAI(
    base_url=os.environ.get("BASE_URL"),
    model='gpt-4o-mini',
    api_key=os.environ["OPENAI_API_KEY"],
    temperature=0,
    top_p=0
    # max_completion_tokens=4096
)

CSV_TEXT = None
@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    global CSV_TEXT

    if not file.filename.endswith(".csv"):
        return {"error": "Only CSV files are supported."}

    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    
    CSV_TEXT = df.to_csv(index=False)
    
    return {"message": "CSV uploaded and ready for chat."}

@app.delete("/reset-csv")
async def reset_csv():
    global CSV_TEXT
    CSV_TEXT = None
    return {"message": "CSV data has been reset."}

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
    
    async with MultiServerMCPClient(
        {
            "db": {
                "url": "http://localhost:8080/sse",
                "transport": "sse",
            }
        }
    ) as client:
        
        global CSV_TEXT
        if CSV_TEXT:
            messages.insert(0, HumanMessage(content=f"นี่คือข้อมูล CSV ที่อัปโหลด:\n\n{CSV_TEXT}"))

        agent = p_react_agent(llm, client.get_tools(),DATABASE_ADMIN)
        result = await agent.ainvoke({"messages": messages})   
        final_result = result["messages"][-1].content

        return{
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
        
    async with MultiServerMCPClient(
        {
            "db": {
                "url": "http://localhost:8080/sse",
                "transport": "sse",
            }
        }
    ) as client:
        # print("MCP SERVER IS CONNECTED")
        agent = react_agent(llm, client.get_tools(), "async")
        result = await agent.ainvoke({"messages": messages, "recursion_limit": 15})
        
        plann = result.get("report_plan","Noting was generated.")
        queryy = result.get("report_query","Noting was generated.")
        reportt = result.get("report_final","Noting was generated.")    

        print(reportt)
        return AgentResponse(
            response=reportt,
            plan=plann,
            query=queryy,
            report=reportt
        )
    
@app.post("/create-take-leave-report", response_model=AgentResponse)
async def create_sick_report(request: RequestMessage):
    try:
        messages = []
        for msg in request.messages:
            if msg.role == 'human':
                messages = msg.content
                break
        
        try:
            async with MultiServerMCPClient(
                {
                    "db": {
                        "url": "http://localhost:8080/sse",
                        "transport": "sse",
                    }
                }
            ) as client:
                # print("MCP SERVER IS CONNECTED")
                agent = react_sick_agent(llm, client.get_tools(), "async")
                result = await agent.ainvoke({"messages": [HumanMessage(content=messages)]},{"recursion_limit": 15})
                
                plann = result.get("report_plan","Noting was generated.")
                queryy = result.get("report_query","Noting was generated.")
                reportt = result.get("report_final","Noting was generated.")    

                return AgentResponse(
                    response=reportt,
                    plan=plann,
                    query=queryy,
                    report=reportt
                )
        except Exception as e:

            raise HTTPException(status_code=500, detail=f"Error connecting to MCP server: {str(e)}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating report: {str(e)}")

@app.get("/")
async def health_check():

    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app,host='0.0.0.0',port=8001)

    