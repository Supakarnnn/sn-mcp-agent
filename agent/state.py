from typing import TypedDict, List, Optional,Annotated
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages
import operator

class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    report_plan: Optional[str]
    report_query: Optional[str]
    report_final: Optional[str]
    revision_number: int