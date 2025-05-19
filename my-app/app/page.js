"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState("chat");

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "human", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const apiURL =
      apiMode === "report"
        ? "http://localhost:8001/create-check-in-report"
        : apiMode === "sickReport"
          ? "http://localhost:8001/create-take-leave-report"
          : "http://localhost:8001/chat";

    try {
      const response = await fetch(apiURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages })
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
              : "AI Assistance"
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
            {messages.map((msg, idx) => {
              let chartObjects = [];

              if (msg.role === "ai") {
                try {
                  const jsonMatch = msg.content.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);

                    if (parsed.labels && parsed.datasets) {
                      // แบบไม่มีชื่อ (ใช้ default key)
                      chartObjects.push({ key: "Chart", chart: parsed });
                    } else {
                      // แบบมีหลาย chart ระบุชื่อไว้
                      for (const [key, chart] of Object.entries(parsed)) {
                        if (chart.labels && chart.datasets) {
                          chartObjects.push({ key, chart });
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.warn("Cannot parse chart JSON:", e);
                }
              }

              return (
                <div
                  key={idx}
                  className={`${styles.message} ${msg.role === "human" ? styles.user : styles.ai
                    }`}
                >
                  <div>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>

                    {chartObjects.map(({ key, chart }) => (
                      <div key={key} style={{ marginTop: "1rem" }}>
                        <Bar
                          data={chart}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: { position: "top" },
                              title: {
                                display: true,
                                text: `กราฟ: ${key}`
                              }
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {msg.role === "ai" && msg.source && (
                    <span className={styles.sourceTag}>{msg.source}</span>
                  )}
                </div>
              );
            })}
            {loading && <div className={styles.typing}>AI is thinking...</div>}
          </div>

          <div className={styles.toolBar}>
            <button
              className={`${styles.pillButton} ${apiMode === "chat" ? styles.activePill : ""
                }`}
              onClick={() => setApiMode("chat")}
            >
              CHAT
            </button>
            <button
              className={`${styles.pillButton} ${apiMode === "report" ? styles.activePill : ""
                }`}
              onClick={() => setApiMode("report")}
            >
              CREATE REPORT
            </button>
            <button
              className={`${styles.pillButton} ${apiMode === "sickReport" ? styles.activePill : ""
                }`}
              onClick={() => setApiMode("sickReport")}
            >
              CREATE SICK REPORT
            </button>
            <button
              className={styles.resetButton}
              onClick={() => setMessages([])}
            >
              🗑️ Reset Chat
            </button>
          </div>

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
