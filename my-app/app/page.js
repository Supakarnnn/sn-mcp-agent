"use client";
import React, { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useAltAPI, setUseAltAPI] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "human", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const apiURL = useAltAPI
      ? "http://localhost:8001/create-report"
      : "http://localhost:8001/chat";

    try {
      const response = await fetch(apiURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();
      const aiMessage = {
        role: "ai",
        content: data.response,
        source: useAltAPI ? "Tool" : "AI 1",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className={styles.container}>
        <div className={styles.chatbox}>
          <div className={styles.messages}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`${styles.message} ${
                  msg.role === "human" ? styles.user : styles.ai
                }`}
              >
                <div>{msg.content}</div>
                {msg.role === "ai" && msg.source && (
                  <span className={styles.sourceTag}>{msg.source}</span> //#########################
                )}
              </div>
            ))}
            {loading && <div className={styles.typing}>AI is thinking...</div>}
          </div>

          {/* Pill-style toggle buttons */}
          <div className={styles.toolBar}>
            <button
              className={`${styles.pillButton} ${
                !useAltAPI ? styles.activePill : ""
              }`}
              onClick={() => {
                setUseAltAPI(false);
                // console.log("1");
              }}
            >
              CHAT
            </button>
            <button
              className={`${styles.pillButton} ${
                useAltAPI ? styles.activePill : ""
              }`}
              onClick={() => {
                setUseAltAPI(true);
                // console.log("2");
              }}
            >
              CREATE REPORT
            </button>
            <button className={styles.resetButton} onClick={() => setMessages([])}>
              🗑️ Reset Chat
            </button>
          </div>

          {/* Input + send */}
          <div className={styles.inputContainer}>
            <input
              type="text"
              className={styles.inputField}
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              className={styles.sendButton}
              onClick={handleSend}
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}