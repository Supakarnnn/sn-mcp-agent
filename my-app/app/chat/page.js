"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { renderToString } from 'react-dom/server';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Home() {
  // State management
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState("chat"); // chat | report | sickReport
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);

  // Refs
  const markdownRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

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
      console.log("Calling API:", apiURL);
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

  // Get markdown content from the selected AI response
  const getSelectedMarkdownContent = () => {
    // Filter for AI messages only
    const aiMessages = messages.filter(msg => msg.role === "ai");

    if (aiMessages.length === 0) return null;

    // If a message is selected, use it; otherwise, use the last message
    if (selectedMessageIndex !== null && selectedMessageIndex >= 0 && selectedMessageIndex < aiMessages.length) {
      return aiMessages[selectedMessageIndex].content;
    }

    // Default to the last message if nothing is selected
    return aiMessages[aiMessages.length - 1].content;
  };

  // Get source info from the selected AI response
  const getSelectedMessageSource = () => {
    const aiMessages = messages.filter(msg => msg.role === "ai");

    if (aiMessages.length === 0) return "AI";

    if (selectedMessageIndex !== null && selectedMessageIndex >= 0 && selectedMessageIndex < aiMessages.length) {
      return aiMessages[selectedMessageIndex].source || "AI";
    }

    return aiMessages[aiMessages.length - 1].source || "AI";
  };

  // Function to render markdown preview for PDF conversion
  const renderMarkdownPreview = () => {
    const markdownContent = getSelectedMarkdownContent();

    if (!markdownContent) return null;

    // Check if the content has tables and needs special formatting
    const hasTable = markdownContent.includes('|') && markdownContent.includes('---');

    // Get title based on selected message source
    const messageSource = getSelectedMessageSource();
    let title;

    if (messageSource === "Tool - Report") {
      title = "Check-In Report";
    } else if (messageSource === "Tool - Sick Report") {
      title = "Sick Leave Report";
    } else {
      title = "Chat Response";
    }

    return (
      <div
        ref={markdownRef}
        className={styles.markdownPdfPreview}
        style={{
          padding: '20px',
          backgroundColor: 'white',
          color: 'black',
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1.6',
          fontSize: '12pt',
          maxWidth: '800px',
          margin: '0 auto',
          visibility: 'hidden',
          position: 'absolute',
          zIndex: -1000
        }}
      >
        <h1 style={{ fontSize: '24pt', marginBottom: '10px' }}>
          {title}
        </h1>
        <p style={{ fontSize: '9pt', color: '#666', marginBottom: '20px' }}>
          Generated: {new Date().toLocaleString()}
        </p>
        <div className={styles.markdownContent}>
          <style dangerouslySetInnerHTML={{
            __html: `
            .markdown-table table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 20px;
            }
            .markdown-table th {
              background-color: #6200ee;
              color: white;
              padding: 8px;
              text-align: left;
              border: 1px solid #ddd;
              font-weight: bold;
            }
            .markdown-table td {
              padding: 8px;
              border: 1px solid #ddd;
              vertical-align: top;
            }
            .markdown-table tr:nth-child(even) {
              background-color: #f2f2f2;
            }
          `}} />
          <div className="markdown-table">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownContent}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced function to convert HTML to PDF
  const handleMarkdownToPDF = async () => {
    const markdownContent = getSelectedMarkdownContent();

    if (!markdownContent) {
      alert("No AI response to convert to PDF!");
      return;
    }

    // Indicate PDF generation is starting
    setLoading(true);

    try {
      // Get the container element with the rendered markdown
      const element = markdownRef.current;
      if (!element) {
        throw new Error("Markdown preview element not found");
      }

      // Make the element visible temporarily for capturing
      element.style.visibility = 'visible';
      element.style.position = 'fixed';
      element.style.top = '0';
      element.style.left = '0';
      element.style.zIndex = '-1000';

      // Get title based on mode and selected message source
      const messageSource = getSelectedMessageSource();
      let title;

      if (messageSource === "Tool - Report") {
        title = "Check-In Report";
      } else if (messageSource === "Tool - Sick Report") {
        title = "Sick Leave Report";
      } else {
        title = "Chat Response";
      }

      // Use html2canvas to capture the rendered markdown with higher quality
      const canvas = await html2canvas(element, {
        scale: 3, // Higher scale for better quality
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Hide the element again
      element.style.visibility = 'hidden';
      element.style.position = 'absolute';

      // Initialize PDF with proper dimensions
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set PDF document properties
      doc.setProperties({
        title: title,
        subject: "Generated from Markdown",
        author: "AI Assistant",
        creator: "Markdown to PDF Converter"
      });

      // Add image to PDF, potentially across multiple pages if needed
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      doc.save(`${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
      // Reset selected message after conversion
      setSelectedMessageIndex(null);
    }
  };

  return (
    <div>
      <div className={styles.container}>
        <div className={styles.chatbox}>
          <div className={styles.messages}>
            {messages.map((msg, idx) => {
              // Find the AI message index for proper selection
              let chartObjects = [];
              const aiMessages = messages.filter(m => m.role === "ai");
              const aiIndex = msg.role === "ai" ? aiMessages.indexOf(msg) : -1;

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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    {chartObjects.map(({ key, chart }) => (
                      <div key={key} style={{ marginTop: "1rem" }}>
                        <Bar
                          data={chart}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: {
                                position: "top",
                                labels: {
                                  color: "#fff",
                                },
                              },
                              title: {
                                display: true,
                                text: `กราฟ: ${key}`,
                                color: "#fff",
                                font: {
                                  size: 18,
                                },
                              },
                            },
                            scales: {
                              x: {
                                ticks: {
                                  color: "#fff",
                                },
                              },
                              y: {
                                ticks: {
                                  color: "#fff",
                                },
                              },
                            },
                          }}
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
                        setTimeout(() => handleMarkdownToPDF(), 0);
                      }}
                      title="Convert this message to PDF"
                    >
                      📄 PDF
                    </button>
                  )}
                </div>
              );
            })}
            {loading && <div className={styles.typing}>AI is thinking...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Pill-style toggle buttons */}
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

      {/* Hidden markdown preview for PDF conversion */}
      {renderMarkdownPreview()}
    </div>
  );
}