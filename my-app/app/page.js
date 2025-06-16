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
import Toolbar from "./component/toolbar.js";
import { getChartOptions } from './component/chartOptions.js';
import RenderMarkdownPreview from "./component/rendermarkdown.js";
import { useMarkdownToPDF } from "./component/markdownpdf.js";
import { handleChartToPDF } from "./component/charttopdf.js";
import { useHandleExportAll } from "./component/exportall.js";
import { useExcelExport } from './component/excelexport.js';


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getColorByDatasetLabel = (label) => {
  const colorMap = {
    'จำนวนชั่วโมงมาสาย': { bg: 'rgba(46, 204, 113, 0.8)', border: 'rgba(46, 204, 113, 1)' }, // เขียว
    'ชั่วโมงมาสาย': { bg: 'rgba(46, 204, 113, 0.8)', border: 'rgba(46, 204, 113, 1)' },
    'จำนวนชั่วโมง': { bg: 'rgba(46, 204, 113, 0.8)', border: 'rgba(46, 204, 113, 1)' },

    'จำนวนครั้งที่มาสาย': { bg: 'rgba(241, 196, 15, 0.8)', border: 'rgba(241, 196, 15, 1)' }, // เหลือง
    'ครั้งที่มาสาย': { bg: 'rgba(241, 196, 15, 0.8)', border: 'rgba(241, 196, 15, 1)' },
    'จำนวนครั้ง': { bg: 'rgba(241, 196, 15, 0.8)', border: 'rgba(241, 196, 15, 1)' },

    'จำนวนวันลา': { bg: 'rgba(52, 152, 219, 0.8)', border: 'rgba(52, 152, 219, 1)' }, // น้ำเงิน
    'วันลา': { bg: 'rgba(52, 152, 219, 0.8)', border: 'rgba(52, 152, 219, 1)' },
    'จำนวนวัน': { bg: 'rgba(52, 152, 219, 0.8)', border: 'rgba(52, 152, 219, 1)' },

    'จำนวนครั้งลาป่วย': { bg: 'rgba(231, 76, 60, 0.8)', border: 'rgba(231, 76, 60, 1)' }, // แดง
    'ครั้งลาป่วย': { bg: 'rgba(231, 76, 60, 0.8)', border: 'rgba(231, 76, 60, 1)' },
    'ลาป่วย': { bg: 'rgba(231, 76, 60, 0.8)', border: 'rgba(231, 76, 60, 1)' },
  };

  for (const [key, colors] of Object.entries(colorMap)) {
    if (label && label.includes(key)) {
      return colors;
    }
  }

  return {
    bg: 'rgba(155, 89, 182, 0.8)',
    border: 'rgba(155, 89, 182, 1)'
  };
};

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState("chat");
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [showQuestionOptions, setShowQuestionOptions] = useState(false);
  const [datasetVisibility, setDatasetVisibility] = useState({});

  const messagesEndRef = useRef(null);
  const markdownRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const { exportToExcel } = useExcelExport();

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

    // const apiURL =
    //   apiMode === "report"
    //     ? "http://localhost:8001/create-check-in-report"
    //     : apiMode === "sickReport"
    //       ? "http://localhost:8001/create-take-leave-report"
    //       : "http://localhost:8001/chat";

    const apiURL =
      apiMode === "report"
        ? "http://localhost/api/create-check-in-report"
        : apiMode === "sickReport"
          ? "http://localhost/api/create-take-leave-report"
          : "http://localhost/api/chat";

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
              : "AI Assistance",
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสำหรับดึงเนื้อหา Markdown ที่เลือก
  const getSelectedMarkdownContent = useCallback(() => {
    const aiMessages = messages.filter((msg) => msg.role === "ai");
    if (aiMessages.length === 0) return null;
    if (
      selectedMessageIndex !== null &&
      selectedMessageIndex >= 0 &&
      selectedMessageIndex < aiMessages.length
    ) {
      return aiMessages[selectedMessageIndex].content;
    }
    return aiMessages[aiMessages.length - 1].content;
  }, [messages, selectedMessageIndex]);

  // ฟังก์ชันสำหรับดึง source ของข้อความที่เลือก
  const getSelectedMessageSource = useCallback(() => {
    const aiMessages = messages.filter((msg) => msg.role === "ai");
    if (aiMessages.length === 0) return "AI";
    if (
      selectedMessageIndex !== null &&
      selectedMessageIndex >= 0 &&
      selectedMessageIndex < aiMessages.length
    ) {
      return aiMessages[selectedMessageIndex].source || "AI";
    }
    return aiMessages[aiMessages.length - 1].source || "AI";
  }, [messages, selectedMessageIndex]);

  // ฟังก์ชันสำหรับแปลง Markdown เป็น PDF
  const handleMarkdownToPDF = useMarkdownToPDF({
    markdownRef,
    messagesContainerRef,
    setLoading,
    setSelectedMessageIndex,
    getSelectedMarkdownContent,
    getSelectedMessageSource,
  });

  const handleDatasetVisibilityChange = (chartKey, datasetIndex, isVisible) => {
    setDatasetVisibility(prev => ({
      ...prev,
      [chartKey]: {
        ...(prev[chartKey] || {}),
        [datasetIndex]: isVisible
      }
    }));
  };

  const exportSpecificMessageToPDF = async (messageIndex) => {
    await handleChartToPDF(messageIndex, messages, setLoading, datasetVisibility);
  };

  const handleExportAll = useHandleExportAll({
    messages,
    markdownRef,
    getSelectedMarkdownContent,
    setLoading,
    datasetVisibility
  });
  return (
    <div>
      <div className={styles.container}>
        <div className={styles.chatbox}>
          {/* {renderMarkdownPreview()} */}
          <RenderMarkdownPreview
            markdownContent={getSelectedMarkdownContent()}
            messageSource={getSelectedMessageSource()}
            ref={markdownRef}
          />
          <div className={styles.messages} ref={messagesContainerRef}>
            {messages.map((msg, idx) => {
              let chartObjects = [];
              const aiMessages = messages.filter(m => m.role === "ai");
              const aiIndex = msg.role === "ai" ? aiMessages.indexOf(msg) : -1;
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{
                      msg.role === "ai"
                        ? msg.content.replace(/\{[\s\S]*\}$/, "").trim()
                        : msg.content
                    }</ReactMarkdown>
                    {chartObjects.map(({ key, chart }) => (
                      <div key={key} style={{
                        marginTop: "1rem",
                        height: "400px",
                        backgroundColor: "white",
                        borderRadius: "8px",
                        padding: "15px",
                        border: "1px solid rgba(255,255,255,0.1)"
                      }}>
                        <Bar
                          data={{
                            ...chart,
                            datasets: chart.datasets.map((dataset, index) => {
                              const colors = getColorByDatasetLabel(dataset.label);
                              const isVisible = datasetVisibility[key]?.[index] !== false;
                              return {
                                ...dataset,
                                backgroundColor: dataset.backgroundColor || colors.bg,
                                borderColor: dataset.borderColor || colors.border,
                                borderWidth: 2,
                                borderRadius: 4,
                                borderSkipped: false,
                                hidden: !isVisible
                              };
                            })
                          }}
                          options={{
                            ...getChartOptions(key, false, chart),
                            plugins: {
                              ...getChartOptions(key, false, chart).plugins,
                              legend: {
                                ...getChartOptions(key, false, chart).plugins.legend,
                                onClick: (e, legendItem, legend) => {
                                  const index = legendItem.datasetIndex;
                                  const currentVisibility = datasetVisibility[key]?.[index] !== false;
                                  handleDatasetVisibilityChange(key, index, !currentVisibility);
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {msg.role === "ai" && (chartObjects.length > 0 || (msg.content && msg.content.trim().length > 0)) && (
                    <div className={styles.exportActions}>
                      {/* ปุ่มสำหรับ Export ทั้งหมด - จะแสดงเมื่อมีทั้งกราฟและ content */}
                      {chartObjects.length > 0 && msg.content && msg.content.trim().length > 0 && (
                        <button
                          className={`${styles.exportBtn} ${styles.exportBtnAll}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMessageIndex(aiIndex);
                            handleExportAll(aiIndex);
                          }}
                          title="ส่งออกทั้งกราฟและรายงานเป็น PDF"
                          disabled={loading}
                        >
                          📋 {loading ? 'กำลังสร้าง...' : 'ส่งออกทั้งหมด'}
                        </button>
                      )}

                      {/* ปุ่มสำหรับ Export เฉพาะ Report - จะแสดงเมื่อมี content แต่ไม่มีกราฟ หรือมีทั้งคู่ */}
                      {msg.content && msg.content.trim().length > 0 && (
                        <>
                          <button
                            className={`${styles.exportBtn} ${styles.exportBtnReport}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMessageIndex(aiIndex);
                              handleMarkdownToPDF();
                            }}
                            title="ส่งออกเฉพาะรายงานเป็น PDF"
                            disabled={loading}
                          >
                            📄 {loading ? 'กำลังสร้าง...' : 'ส่งออกรายงาน'}
                          </button>
                          <button
                            className={`${styles.exportBtn} ${styles.exportBtnReport}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                exportToExcel(msg.content, 'report.xlsx');
                              } catch (error) {
                                console.error('Failed to export Excel:', error);
                              }
                            }}
                            title="ส่งออกรายงานเป็น Excel"
                            disabled={loading}
                          >
                            📊 {loading ? 'กำลังสร้าง...' : 'ส่งออก Excel'}
                          </button>
                        </>
                      )}

                      {/* ปุ่มสำหรับ Export เฉพาะกราฟ - จะแสดงเมื่อมีกราฟ */}
                      {chartObjects.length > 0 && (
                        <button
                          className={`${styles.exportBtn} ${styles.exportBtnChart}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            exportSpecificMessageToPDF(aiIndex);
                          }}
                          title="ส่งออกเฉพาะกราฟเป็น PDF"
                          disabled={loading}
                        >
                          📊 {loading ? 'กำลังสร้าง...' : 'ส่งออกกราฟ'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className={styles.typing}>
                <div className={styles.loadingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <Toolbar
            showQuestionOptions={showQuestionOptions}
            setShowQuestionOptions={setShowQuestionOptions}
            setInput={setInput}
            apiMode={apiMode}
            setApiMode={setApiMode}
            setMessages={setMessages}
          />

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