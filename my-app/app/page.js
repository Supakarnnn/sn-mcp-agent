"use client";
import React, { useState, useRef } from "react";
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
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");

  const fileInputRef = useRef(null);

  const handleUploadCsv = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith(".csv")) {
      alert("Please upload a valid CSV file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8001/upload-chat-csv", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.message) {
        setCsvUploaded(true);
        setCsvFileName(file.name);

        const uploadMessage = {
          role: "human",
          content: `📄 Uploaded CSV file: **${file.name}**`
        };

        setMessages((prev) => [...prev, uploadMessage]);
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Upload error.");
    } finally {
      // รีเซ็ต input เพื่อให้สามารถอัปโหลดไฟล์เดิมได้
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const resetCsv = async () => {
    try {
      await fetch("http://localhost:8001/reset-csv", { method: "DELETE" });
      setCsvUploaded(false);
      setCsvFileName("");

      setMessages((prev) => [
        ...prev,
        {
          role: "human",
          content: "❌ CSV has been reset."
        }
      ]);
    } catch (err) {
      console.error(err);
      alert("Failed to reset CSV.");
    }
  };

  const resetAll = async () => {
    setMessages([]);
    try {
      await fetch("http://localhost:8001/reset-csv", { method: "DELETE" });
      setCsvUploaded(false);
      setCsvFileName("");

      setMessages((prev) => [
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      alert("Failed to reset CSV.");
    }
  };

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
                      chartObjects.push({ key: "Chart", chart: parsed });
                    } else {
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
                  className={`${styles.message} ${msg.role === "human" ? styles.user : styles.ai}`}
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
            {/* Upload CSV */}
            <label className={styles.pillButton}>
              📤 Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleUploadCsv}
                className={styles.uploadHiddenInput}
                ref={fileInputRef}
              />
            </label>

            {/* API Mode */}
            <button
              className={`${styles.pillButton} ${apiMode === "chat" ? styles.activePill : ""}`}
              onClick={() => setApiMode("chat")}
            >
              CHAT
            </button>
            <button
              className={`${styles.pillButton} ${apiMode === "report" ? styles.activePill : ""}`}
              onClick={() => setApiMode("report")}
            >
              CREATE REPORT
            </button>
            <button
              className={`${styles.pillButton} ${apiMode === "sickReport" ? styles.activePill : ""}`}
              onClick={() => setApiMode("sickReport")}
            >
              CREATE SICK REPORT
            </button>

            {/* Reset CSV */}
            <button
              className={styles.resetCsvButton}
              onClick={resetCsv}
              disabled={!csvUploaded}
            >
              🧹 Reset CSV
            </button>

            {/* Reset Chat */}
            <button className={styles.resetButton} onClick={resetAll}>
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
            <button className={styles.sendButton} onClick={handleSend} disabled={loading}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
