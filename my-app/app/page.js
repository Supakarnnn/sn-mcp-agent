"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';

export default function Home() {
  // Use string-based apiMode for scalability
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState("chat"); // chat | report | sickReport

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "human", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // Decide API URL based on mode
    const apiURL =
      apiMode === "report"
        ? "http://localhost:8001/create-check-in-report"
        : apiMode === "sickReport"
        ? "http://localhost:8001/create-take-leave-report"
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
        source:
          apiMode === "report"
            ? "Tool - Report"
            : apiMode === "sickReport"
            ? "Tool - Sick Report"
            : "AI 1",
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
                <div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                {msg.role === "ai" && msg.source && (
                  <span className={styles.sourceTag}>{msg.source}</span>
                )}
              </div>
            ))}
            {loading && <div className={styles.typing}>AI is thinking...</div>}
          </div>

          {/* Pill-style toggle buttons */}
          <div className={styles.toolBar}>
            <button
              className={`${styles.pillButton} ${
                apiMode === "chat" ? styles.activePill : ""
              }`}
              onClick={() => setApiMode("chat")}
            >
              CHAT
            </button>
            <button
              className={`${styles.pillButton} ${
                apiMode === "report" ? styles.activePill : ""
              }`}
              onClick={() => setApiMode("report")}
            >
              CREATE REPORT
            </button>
            <button
              className={`${styles.pillButton} ${
                apiMode === "sickReport" ? styles.activePill : ""
              }`}
              onClick={() => setApiMode("sickReport")}
            >
              CREATE SICK REPORT
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
