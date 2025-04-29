import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage,AIMessage,SystemMessage
from langchain_openai import ChatOpenAI
from model.module import RequestMessage, AgentResponse
from prompt.p import DATA_ANALYZE
from langchain_mcp_adapters.client import MultiServerMCPClient
from typing import Dict, Any
from langgraph.prebuilt import create_react_agent
import asyncio

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Assistant")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = ChatOpenAI(
    base_url=os.environ.get("BASE_URL"),
    model='gpt-4o-mini',
    api_key=os.environ["OPENAI_API_KEY"],
    temperature=0
)


@app.post("/chat")
async def chat(chatmessage: RequestMessage):
    try:
        messages = []
        
        for chat in chatmessage.messages:
            if chat.role == 'ai':
                messages.append({"role": "assistant", "content": chat.content})
            elif chat.role == 'human':
                messages.append({"role": "user", "content": chat.content})
            elif chat.role == 'system':
                messages.append({"role": "system", "content": chat.content})
        
        try:
            async with MultiServerMCPClient(
                {
                    "db": {
                        "url": "http://localhost:8080/sse",
                        "transport": "sse",
                    }
                }
            ) as client:    
                agent = create_react_agent(llm, client.get_tools(),prompt=DATA_ANALYZE)
                result = await agent.ainvoke({"messages": messages})   
                print(result)     
                final_result = result["messages"][-1].content
                
                return{
                    "response": final_result
                }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error connecting to MCP server: {str(e)}")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@app.get("/")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app,host='0.0.0.0',port=8001)