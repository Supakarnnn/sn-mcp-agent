from pydantic import BaseModel
from typing import List, Literal, Optional, Dict, Any, Union

class Message(BaseModel):
    role: Literal["ai", "human", "system"]
    content: str

class RequestMessage(BaseModel):
    messages: List[Message]

class AgentResponse(BaseModel):
    response: str
    plan: Optional[str] = None
    poster: Optional[str] = None
    report: Optional[str] = None