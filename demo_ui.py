import streamlit as st
import requests
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

# Define message structure that matches your API
@dataclass
class Message:
    role: str
    content: str

@dataclass
class RequestMessage:
    messages: List[Message]

# Set page config
st.set_page_config(
    page_title="HELLO",
    page_icon="💬",
    layout="wide"
)

# Initialize session state for chat history if it doesn't exist
if "messages" not in st.session_state:
    st.session_state.messages = []

# Add a system message if you want to set a specific behavior

def initialize_chat():
    if not st.session_state.messages:
        # Add system message first (hidden from UI)
        st.session_state.messages.append(Message(role="system", content=""))

# Header
st.title("HELLO")

# Initialize the chat
initialize_chat()

# Display chat messages from history
for message in st.session_state.messages:
    if message.role != "system":  # Don't display system messages
        with st.chat_message(message.role):
            st.markdown(message.content)

# Function to send message to API and get response
def send_message_to_api(messages: List[Message]) -> str:
    API_URL = "http://localhost:8001/chat"  # Update with your API URL
    
    # Prepare the payload
    payload = {"messages": [{"role": msg.role, "content": msg.content} for msg in messages]}
    
    try:
        response = requests.post(API_URL, json=payload)
        response.raise_for_status()
        return response.json()["response"]
    except requests.exceptions.RequestException as e:
        st.error(f"Error communicating with API: {str(e)}")
        return f"Sorry, I encountered an error: {str(e)}"

# Chat input and processing
if prompt := st.chat_input("Ask something..."):
    # Display user message
    with st.chat_message("human"):
        st.markdown(prompt)
    
    # Add user message to chat history
    st.session_state.messages.append(Message(role="human", content=prompt))
    
    # Show a spinner while waiting for the API response
    with st.spinner("Thinking..."):
        # Send all messages to API
        response = send_message_to_api(st.session_state.messages)
    
    # Display assistant response
    with st.chat_message("ai"):
        st.markdown(response)
    
    # Add assistant response to chat history
    st.session_state.messages.append(Message(role="ai", content=response))

# Sidebar with info
with st.sidebar:    
    # Add a reset button to clear chat history
    if st.button("Reset Chat"):
        st.session_state.messages = []
        initialize_chat()
        st.rerun()