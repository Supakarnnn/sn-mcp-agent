"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./page.module.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
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
  const [hasSelectedMode, setHasSelectedMode] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [typingText, setTypingText] = useState("");
  const typingMessage = "AI is thinking...";

  const markdownRef = useRef(null);
  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const toolsButtonRef = useRef(null);
  const toolsMenuRef = useRef(null);

  const modeDisplayNames = {
    chat: "Chat",
    report: "Create Report",
    sickReport: "Create Sick Report"
  };

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const checkIfAtBottom = useCallback(() => {
    if (!messagesRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsAtBottom(distanceFromBottom <= 50);
  }, []);

  const debouncedCheckIfAtBottom = useCallback(debounce(checkIfAtBottom, 100), [checkIfAtBottom]);

  const scrollToBottom = useCallback(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: "smooth"
      });
      setIsAtBottom(true);
    }
  }, []);

  useEffect(() => {
    const preventScroll = (e) => {
      e.preventDefault();
    };

    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.margin = "";
      document.body.style.padding = "";
    };
  }, []);

  useEffect(() => {
    const messagesDiv = messagesRef.current;
    if (!messagesDiv) return;

    const handleScroll = () => {
      debouncedCheckIfAtBottom();
    };

    messagesDiv.addEventListener("scroll", handleScroll);
    return () => messagesDiv.removeEventListener("scroll", handleScroll);
  }, [debouncedCheckIfAtBottom]);

  useEffect(() => {
    if ((isAtBottom || messages[messages.length - 1]?.role === "human") && messagesRef.current) {
      scrollToBottom();
    }
    if (messages.length > 0) {
      setHasNewMessage(true);
      const timer = setTimeout(() => setHasNewMessage(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [messages, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (loading && isAtBottom && messagesRef.current) {
      scrollToBottom();
    }
  }, [loading, isAtBottom, scrollToBottom]);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.addEventListener("focus", () => {
        window.scrollTo(0, 0);
      });
    }
    return () => {
      if (input) {
        input.removeEventListener("focus", () => {});
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        toolsButtonRef.current &&
        toolsMenuRef.current &&
        !toolsButtonRef.current.contains(event.target) &&
        !toolsMenuRef.current.contains(event.target)
      ) {
        setIsToolsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsToolsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (loading) {
      setTypingText("");
      let index = 0;
      const interval = setInterval(() => {
        if (index < typingMessage.length) {
          setTypingText((prev) => prev + typingMessage[index]);
          index++;
        } else {
          setTypingText("");
          index = 0;
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleUploadCsv = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith(".csv")) {
      alert("Please upload a valid CSV file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8001/upload-csv", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error("Upload failed.");
      }

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
        throw new Error("No message in response.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload CSV. Please try again.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, []);

  const resetCsv = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8001/reset-csv", { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Reset failed.");
      }
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
      console.error("Reset error:", err);
      alert("Failed to reset CSV. Please try again.");
    }
  }, []);

  const resetAll = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8001/reset-csv", { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Reset failed.");
      }
      setMessages([{ role: "human", content: "🗑️ Chat and CSV have been reset." }]);
      setCsvUploaded(false);
      setCsvFileName("");
      setHasSelectedMode(false);
    } catch (err) {
      console.error("Reset error:", err);
      alert("Failed to reset chat and CSV. Please try again.");
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage = { role: "human", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsAtBottom(true);

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
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      if (!response.ok) {
        throw new Error("API request failed.");
      }

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

      if (apiMode === "report" || apiMode === "sickReport") {
        console.log("Switching back to chat mode after report");
        setApiMode("chat");
        setHasSelectedMode(false);
      }
    } catch (error) {
      console.error("API Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "⚠️ Error: Could not connect to the server. Please try again." }
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, apiMode, messages]);

  const getSelectedMarkdownContent = useCallback(() => {
    const aiMessages = messages.filter(msg => msg.role === "ai");
    if (aiMessages.length === 0) return null;
    if (selectedMessageIndex !== null && selectedMessageIndex >= 0 && selectedMessageIndex < aiMessages.length) {
      return aiMessages[selectedMessageIndex].content;
    }
    return aiMessages[aiMessages.length - 1].content;
  }, [messages, selectedMessageIndex]);

  const getSelectedMessageSource = useCallback(() => {
    const aiMessages = messages.filter(msg => msg.role === "ai");
    if (aiMessages.length === 0) return "AI";
    if (selectedMessageIndex !== null && selectedMessageIndex >= 0 && selectedMessageIndex < aiMessages.length) {
      return aiMessages[selectedMessageIndex].source || "AI";
    }
    return aiMessages[aiMessages.length - 1].source || "AI";
  }, [messages, selectedMessageIndex]);

  const renderMarkdownPreview = useCallback(() => {
    const markdownContent = getSelectedMarkdownContent();
    if (!markdownContent) return null;

    const messageSource = getSelectedMessageSource();
    const title = messageSource === "Tool - Report" ? "Check-In Report" :
                  messageSource === "Tool - Sick Report" ? "Sick Leave Report" : "Chat Response";

    return (
      <div
        ref={markdownRef}
        className={styles.markdownPdfPreview}
        style={{
          padding: '20px',
          backgroundColor: '#fefefe',
          color: '#111827',
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1.7',
          fontSize: '12pt',
          maxWidth: '800px',
          margin: '0 auto',
          visibility: 'hidden',
          position: 'absolute',
          zIndex: -1000
        }}
      >
        <h1 style={{ fontSize: '24pt', marginBottom: '10px' }}>{title}</h1>
        <p style={{ fontSize: '9pt', color: '#666', marginBottom: '20px' }}>
          Generated: {new Date().toLocaleString()}
        </p>
        <div className={styles.markdownContent}>
          <style jsx>{`
            .markdown-table table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 20px;
            }
            .markdown-table th {
              background-color: #059669;
              color: white;
              padding: 10px;
              text-align: left;
              border: 1px solid #374151;
              font-weight: 600;
            }
            .markdown-table td {
              padding: 10px;
              border: 1px solid #374151;
              vertical-align: top;
            }
            .markdown-table tr:nth-child(even) {
              background-color: #f2f2f2;
            }
          `}</style>
          <div className="markdown-table">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdownContent.replace(/\{[\s\S]*\}/, "").trim()}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }, [getSelectedMarkdownContent, getSelectedMessageSource]);

  const handleMarkdownToPDF = useCallback(async () => {
    const markdownContent = getSelectedMarkdownContent();
    if (!markdownContent) {
      alert("No AI response to convert to PDF!");
      return;
    }

    setLoading(true);
    try {
      const element = markdownRef.current;
      if (!element) {
        throw new Error("Markdown preview element not found");
      }

      element.style.visibility = 'visible';
      element.style.position = 'fixed';
      element.style.top = '0';
      element.style.left = '0';
      element.style.zIndex = '-1000';

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#fefefe'
      });

      element.style.visibility = 'hidden';
      element.style.position = 'absolute';

      const messageSource = getSelectedMessageSource();
      const title = messageSource === "Tool - Report" ? "Check-In Report" :
                    messageSource === "Tool - Sick Report" ? "Sick Leave Report" : "Chat Response";

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      doc.setProperties({
        title: title,
        subject: "Generated from Markdown",
        author: "AI Assistant",
        creator: "Markdown to PDF Converter"
      });

      let heightLeft = imgHeight;
      let position = 0;

      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save(`${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
      setSelectedMessageIndex(null);
    }
  }, [getSelectedMarkdownContent, getSelectedMessageSource]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !loading && input.trim()) {
      handleSend();
    }
  }, [handleSend, loading, input]);

  const handleModeChange = useCallback((mode) => {
    console.log("Changing apiMode to:", mode);
    setApiMode(mode);
    setHasSelectedMode(true);
    setIsToolsOpen(false);
  }, []);

  const toggleToolsMenu = useCallback(() => {
    setIsToolsOpen((prev) => !prev);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.chatbox}>
        <div className={`${styles.messages} ${hasNewMessage ? styles.newMessage : ''}`} ref={messagesRef} aria-live="polite">
          {messages.map((msg, idx) => {
            const aiMessages = messages.filter(m => m.role === "ai");
            const aiIndex = msg.role === "ai" ? aiMessages.indexOf(msg) : -1;
            let chartObjects = [];

            if (msg.role === "ai") {
              try {
                const jsonMatch = msg.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.labels && parsed.datasets) {
                    chartObjects.push({ key: `Chart-${idx}`, chart: parsed });
                  } else {
                    for (const [key, chart] of Object.entries(parsed)) {
                      if (chart.labels && chart.datasets) {
                        chartObjects.push({ key: `${key}-${idx}`, chart });
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
                className={`${styles.messageRow} ${msg.role === "human" ? styles.userRow : styles.aiRow}`}
                style={{ "--message-index": idx }}
              >
                <div className={`${styles.avatar} ${msg.role === "ai" ? styles.ai : ""}`}>
                  {msg.role === "human" ? "U" : "AI"}
                </div>
                <div
                  className={`${styles.message} ${msg.role === "human" ? styles.user : styles.ai} ${msg.role === "ai" ? styles.selectable : ""}`}
                  onClick={() => msg.role === "ai" && setSelectedMessageIndex(aiIndex)}
                >
                  <div>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {chartObjects.length > 0 ? msg.content.replace(/\{[\s\S]*\}/, "").trim() : msg.content}
                    </ReactMarkdown>
                    {chartObjects.map(({ key, chart }) => (
                      <div key={key} style={{ marginTop: "1rem", maxWidth: "100%", overflowX: "auto" }}>
                        <Bar
                          data={chart}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: "top",
                                labels: {
                                  color: "#f3f4f6",
                                  font: { size: 14 }
                                },
                              },
                              title: {
                                display: true,
                                text: `Chart: ${key.split('-')[0]}`,
                                color: "#f3f4f6",
                                font: { size: 16 },
                                padding: { top: 10, bottom: 10 }
                              },
                            },
                            scales: {
                              x: {
                                ticks: { color: "#f3f4f6", font: { size: 12 } },
                                grid: { display: false }
                              },
                              y: {
                                ticks: { color: "#f3f4f6", font: { size: 12 } },
                                grid: { color: "#374151" }
                              },
                            },
                          }}
                          height={200}
                        />
                      </div>
                    ))}
                  </div>
                  {msg.role === "ai" && msg.source && (
                    <span className={styles.sourceTag}>{msg.source}</span>
                  )}
                  {msg.role === "ai" && (
                    <button
                      className={styles.messagePdfButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMessageIndex(aiIndex);
                        handleMarkdownToPDF();
                      }}
                      title="Convert this message to PDF"
                      aria-label="Convert message to PDF"
                    >
                      📄 PDF
                    </button>
                  )}
                  {msg.role === "ai" && selectedMessageIndex === aiIndex && (
                    <span className={styles.messageSelector}>Selected</span>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className={`${styles.messageRow} ${styles.aiRow}`}>
              <div className={`${styles.avatar} ${styles.ai}`}>AI</div>
              <div className={styles.typing}>
                <span className={styles.typingText}>{typingText}</span>
                <span className={styles.cursor}>|</span>
              </div>
            </div>
          )}
          <button
            className={`${styles.scrollToBottomButton} ${!isAtBottom ? styles.visible : ''}`}
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
          >
            <span className={styles.icon}>⬇</span>
          </button>
        </div>

        <div className={styles.toolBar}>
          <label className={`${styles.pillButton} ${csvUploaded ? styles.activePill : ""}`}>
            <span className={styles.icon}>📤</span> {csvUploaded ? csvFileName : "Upload CSV"}
            <input
              type="file"
              accept=".csv"
              onChange={handleUploadCsv}
              className={styles.uploadHiddenInput}
              ref={fileInputRef}
              aria-label="Upload CSV file"
            />
          </label>
          <div className={styles.toolsContainer}>
            <button
              className={`${styles.pillButton} ${isToolsOpen || hasSelectedMode ? styles.activePill : ""}`}
              onClick={toggleToolsMenu}
              ref={toolsButtonRef}
              aria-expanded={isToolsOpen}
              aria-controls="tools-menu"
              aria-label={`Toggle tools menu, current mode: ${hasSelectedMode ? modeDisplayNames[apiMode] : "Tools"}`}
            >
              <span className={styles.icon}>🛠️</span> {hasSelectedMode ? modeDisplayNames[apiMode] : "Tools"}
            </button>
            {isToolsOpen && (
              <div
                className={styles.toolsMenu}
                ref={toolsMenuRef}
                id="tools-menu"
                role="menu"
              >
                <button
                  className={`${styles.menuItem} ${apiMode === "report" ? styles.activeMenuItem : ""}`}
                  onClick={() => handleModeChange("report")}
                  role="menuitem"
                  aria-label="Switch to Report mode"
                >
                  <span className={styles.icon}>📊</span> Create Report
                </button>
                <button
                  className={`${styles.menuItem} ${apiMode === "sickReport" ? styles.activeMenuItem : ""}`}
                  onClick={() => handleModeChange("sickReport")}
                  role="menuitem"
                  aria-label="Switch to Sick Report mode"
                >
                  <span className={styles.icon}>🏥</span> Create Sick Report
                </button>
              </div>
            )}
          </div>
          <div className={styles.resetButtonGroup}>
            <button
              className={styles.resetCsvButton}
              onClick={resetCsv}
              disabled={!csvUploaded}
              aria-label="Clear uploaded CSV"
            >
              <span className={styles.icon}>🧹</span> Clear CSV
            </button>
            <button
              className={styles.resetButton}
              onClick={resetAll}
              aria-label="Clear chat and CSV"
            >
              <span className={styles.icon}>🗑️</span> Clear Chat
            </button>
          </div>
        </div>

        <div className={styles.inputContainer}>
          <input
            type="text"
            className={styles.inputField}
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            aria-label="Message input"
            ref={inputRef}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <span className={styles.icon}>🚀</span> Send
          </button>
        </div>
      </div>
      {renderMarkdownPreview()}
    </div>
  );
}