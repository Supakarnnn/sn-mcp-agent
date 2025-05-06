from typing import TypedDict, List, Optional
from langchain_core.messages import AnyMessage

class AgentState(TypedDict):
    messages: List[AnyMessage]
    report_plan: Optional[str]
    report_query: Optional[str]
    report_final: Optional[str]
    report_review: Optional[str]
    revision_number: int
    temp: Optional[str]