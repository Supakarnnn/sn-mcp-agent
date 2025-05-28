"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
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
import Link from 'next/link';

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

  const messagesEndRef = useRef(null);

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
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getChartOptions = (key, isForPdf = false, chartData = null) => {
    const hasMultipleDatasets = chartData && chartData.datasets && chartData.datasets.length > 1;

    const baseOptions = {
      responsive: !isForPdf,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: hasMultipleDatasets,
          position: 'top',
          align: 'center',
          labels: {
            usePointStyle: true,
            pointStyle: 'rect',
            padding: 15,
            color: isForPdf ? "#333" : "#fff",
            font: {
              size: isForPdf ? 14 : 12,
              family: 'Arial, sans-serif',
              weight: 'bold'
            }
          }
        },
        title: {
          display: true,
          text: key === 'Late Attendance' ? 'รายงานการมาสาย' :
            key === 'Services Late Arrivals' ? 'รายงานการมาสาย' :
              key === 'Sick Leave' ? 'รายงานการลางาน' :
                key === 'Take Leave' ? 'รายงานการลางาน' :
                  key === 'Chart' ? 'On report' :
                    `รายงาน: ${key}`,
          color: isForPdf ? "#2c3e50" : "#fff",
          font: {
            size: isForPdf ? 20 : 16,
            weight: 'bold',
            family: 'Arial, sans-serif'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          enabled: !isForPdf,
          backgroundColor: 'rgba(44, 62, 80, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#3498db',
          borderWidth: 2,
          cornerRadius: 8,
          displayColors: true,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: function (context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (label.includes('ครั้ง') || label.includes('จำนวน')) {
                return `${label}: ${value} ครั้ง`;
              } else if (label.includes('ชั่วโมง') || label.includes('เวลา')) {
                return `${label}: ${value} ชั่วโมง`;
              }
              return `${label}: ${value}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: isForPdf ? "#2c3e50" : "#fff",
            font: {
              size: isForPdf ? 12 : 11,
              family: 'Arial, sans-serif'
            },
            maxRotation: 45,
            minRotation: 0,
            padding: 8
          },
          grid: {
            color: isForPdf ? "rgba(44, 62, 80, 0.2)" : "rgba(255,255,255,0.1)",
            lineWidth: 1
          },
          title: {
            display: true,
            text: 'ชื่อพนักงาน',
            color: isForPdf ? "#2c3e50" : "#fff",
            font: {
              size: isForPdf ? 14 : 12,
              family: 'Arial, sans-serif',
              weight: 'bold'
            }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: isForPdf ? "#2c3e50" : "#fff",
            font: {
              size: isForPdf ? 12 : 11,
              family: 'Arial, sans-serif'
            },
            padding: 8
          },
          grid: {
            color: isForPdf ? "rgba(44, 62, 80, 0.2)" : "rgba(255,255,255,0.1)",
            lineWidth: 1
          },
          title: {
            display: true,
            text: 'จำนวน (ครั้ง/ชั่วโมง)',
            color: isForPdf ? "#2c3e50" : "#fff",
            font: {
              size: isForPdf ? 14 : 12,
              family: 'Arial, sans-serif',
              weight: 'bold'
            }
          }
        },
      },
      layout: {
        padding: {
          top: isForPdf ? 30 : 20,
          bottom: isForPdf ? 30 : 20,
          left: isForPdf ? 20 : 10,
          right: isForPdf ? 20 : 10
        }
      }
    };

    return baseOptions;
  };

  const exportSpecificMessageToPDF = async (messageIndex) => {
    await handleMarkdownToPDF(messageIndex);
  };

  const handleMarkdownToPDF = async (messageIndex = null) => {
    const aiMessages = messages.filter(msg => msg.role === "ai");
    if (aiMessages.length === 0) {
      alert("ไม่พบข้อมูลกราฟสำหรับส่งออก");
      return;
    }

    let chartObjects = [];

    const targetIndex = messageIndex !== null ? messageIndex : aiMessages.length - 1;
    const selectedMessage = aiMessages[targetIndex];

    try {
      const jsonMatch = selectedMessage.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.labels && parsed.datasets) {
          chartObjects.push({ key: "รายงานข้อมูล", chart: parsed });
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
      alert("ไม่สามารถแปลงข้อมูลกราฟได้ กรุณาตรวจสอบว่าข้อความที่เลือกมีข้อมูลกราฟ");
      return;
    }

    if (chartObjects.length === 0) {
      alert("ไม่พบข้อมูลกราฟสำหรับส่งออก");
      return;
    }

    setLoading(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(44, 62, 80);
      doc.text("On report", pageWidth / 2, 30, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generated: ${currentDate}`, pageWidth / 2, 40, { align: 'center' });
      doc.setDrawColor(44, 62, 80);
      doc.setLineWidth(0.5);
      doc.line(20, 45, pageWidth - 20, 45);

      let yPosition = 60;

      for (let i = 0; i < chartObjects.length; i++) {
        const { key, chart } = chartObjects[i];

        if (yPosition > pageHeight - 120) {
          doc.addPage();
          yPosition = 30;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        const cleanedChart = {
          labels: chart.labels,
          datasets: chart.datasets.map((dataset) => {
            const colors = getColorByDatasetLabel(dataset.label);

            return {
              ...dataset,
              label: dataset.label,
              backgroundColor: dataset.backgroundColor || colors.bg,
              borderColor: dataset.borderColor || colors.border,
              borderWidth: 1
            };
          })
        };

        const hasMultipleDatasets = cleanedChart.datasets && cleanedChart.datasets.length > 1;
        const pdfChartOptions = {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: hasMultipleDatasets,
              position: 'top',
              align: 'center',
              labels: {
                usePointStyle: true,
                pointStyle: 'rect',
                padding: 15,
                color: "#333",
                font: {
                  size: 12,
                  family: 'Arial, sans-serif',
                  weight: 'bold'
                }
              }
            },
            title: {
              display: false,
            },
            tooltip: {
              enabled: false,
            }
          },
          scales: {
            x: {
              ticks: {
                display: true,
                color: "#333",
                font: {
                  size: 10,
                  family: 'Arial, sans-serif'
                },
                maxRotation: 45,
                minRotation: 0
              },
              grid: {
                color: "rgba(0,0,0,0.1)",
                lineWidth: 1
              },
              title: {
                display: true,
                text: 'ชื่อพนักงาน',
                color: "#333",
                font: {
                  size: 12,
                  family: 'Arial, sans-serif',
                  weight: 'bold'
                }
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: "#333",
                font: {
                  size: 10,
                  family: 'Arial, sans-serif'
                }
              },
              grid: {
                color: "rgba(0,0,0,0.1)",
                lineWidth: 1
              },
              title: {
                display: true,
                text: 'จำนวน (ครั้ง/ชั่วโมง)',
                color: "#333",
                font: {
                  size: 12,
                  family: 'Arial, sans-serif',
                  weight: 'bold'
                }
              }
            },
          },
          layout: {
            padding: {
              top: hasMultipleDatasets ? 30 : 15,
              bottom: 30,
              left: 20,
              right: 20
            }
          },
          animation: false
        };

        const chartInstance = new ChartJS(ctx, {
          type: 'bar',
          data: cleanedChart,
          options: pdfChartOptions
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        const chartImage = canvas.toDataURL('image/png', 1.0);
        const chartWidth = pageWidth - 40;
        const chartHeight = (chartWidth * 400) / 800;

        doc.addImage(chartImage, 'PNG', 20, yPosition, chartWidth, chartHeight, undefined, 'FAST');
        yPosition += chartHeight + 15;

        if (!hasMultipleDatasets && cleanedChart.datasets.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(`ข้อมูล: ${cleanedChart.datasets[0].label}`, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;
        }

        yPosition += 10;

        chartInstance.destroy();
      }
      const messageNumber = targetIndex + 1;
      const fileName = `On-report-Message-${messageNumber}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("เกิดข้อผิดพลาดในการสร้าง PDF");
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {
                        // ซ่อนเฉพาะ JSON block ด้านล่างสุด (graphh)
                        msg.role === "ai"
                          ? msg.content.replace(/\n*```json[\s\S]*```/g, "") // ตัด JSON block
                          : msg.content
                      }
                    </ReactMarkdown>
                    {chartObjects.map(({ key, chart }) => (
                      <div key={key} style={{
                        marginTop: "1rem",
                        height: "400px",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        padding: "15px",
                        border: "1px solid rgba(255,255,255,0.1)"
                      }}>
                        <Bar
                          data={{
                            ...chart,
                            datasets: chart.datasets.map((dataset) => {
                              const colors = getColorByDatasetLabel(dataset.label);
                              return {
                                ...dataset,
                                backgroundColor: dataset.backgroundColor || colors.bg,
                                borderColor: dataset.borderColor || colors.border,
                                borderWidth: 2,
                                borderRadius: 4,
                                borderSkipped: false
                              };
                            })
                          }}
                          options={getChartOptions(key, false, chart)}
                        />
                      </div>
                    ))}
                  </div>
                  {msg.role === "ai" && chartObjects.length > 0 && (
                    <button
                      className={styles.messagePdfButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSpecificMessageToPDF(aiIndex);
                      }}
                      title="แปลงกราฟเป็น PDF"
                      disabled={loading}
                    >
                      📄 {loading ? 'กำลังสร้าง...' : 'ส่งออก PDF'}
                    </button>
                  )}
                </div>
              );
            })}
            {loading && <div className={styles.typing}>AI กำลังคิด...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.toolBar}>
            <Link href="/csv">
              <button
                className={styles.pillButton}
                aria-label="Update database"
              >
                <span className={styles.icon}>📤</span> อัพเดทฐานข้อมูล
              </button>
            </Link>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={apiMode === "report"}
                onChange={() => setApiMode(apiMode === "report" ? "" : "report")}
              />
              สร้างรายงานการเข้างาน
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={apiMode === "sickReport"}
                onChange={() => setApiMode(apiMode === "sickReport" ? "" : "sickReport")}
              />
              สร้างรายงานการลางาน
            </label>
            <button
              className={styles.resetButton}
              onClick={() => setMessages([])}
            >
              🗑️ ลบข้อความทั้งหมด
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