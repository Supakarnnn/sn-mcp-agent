import asyncio
import os 
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

llm = ChatOpenAI(
        base_url=os.environ["BASE_URL"],
        model="gpt-4o-mini",
        api_key=os.environ["API_KEY"],
        temperature=0
    )

async def main():
    async with MultiServerMCPClient(
        {
            "db": {
                "url": "http://localhost:8000/sse",
                "transport": "sse",
            }
        }
    ) as client:
        agent = create_react_agent(llm, client.get_tools())
        math_response = await agent.ainvoke({"messages": "what's (3 + 5) x 12?"})
        print("Math response:", math_response)
        weather_response = await agent.ainvoke({"messages": "what is the weather in nyc?"})
        print("Weather response:", weather_response)

# Run the async function
if __name__ == "__main__":
    asyncio.run(main())
