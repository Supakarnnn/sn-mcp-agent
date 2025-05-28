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
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const markdownRef = useRef(null);

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
            : "AI Assistance",
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
            color: isForPdf ? "#333" : "#000000",
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
          color: isForPdf ? "#2c3e50" : "#000000",
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
            color: isForPdf ? "#2c3e50" : "#000000",
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
            color: isForPdf ? "#2c3e50" : "#000000",
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
            color: isForPdf ? "#2c3e50" : "#000000",
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
            color: isForPdf ? "#2c3e50" : "#000000",
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

// ฟังก์ชันสำหรับแสดง Markdown preview
const renderMarkdownPreview = useCallback(() => {
  const markdownContent = getSelectedMarkdownContent();
  if (!markdownContent) return null;

  const messageSource = getSelectedMessageSource();
  const title =
    messageSource === "Tool - Report"
      ? "Check-In Report"
      : messageSource === "Tool - Sick Report"
      ? "Sick Leave Report"
      : "Chat Response";

  return (
    <div
      ref={markdownRef}
      className={styles.markdownPdfPreview}
      style={{
        padding: "30px",
        backgroundColor: "#ffffff",
        color: "#1f2937",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        lineHeight: "1.8",
        fontSize: "11pt",
        maxWidth: "210mm", // A4 width
        margin: "0 auto",
        // แก้ไขส่วนนี้เพื่อป้องกันการเลื่อน
        visibility: "hidden",
        position: "fixed", // เปลี่ยนจาก absolute เป็น fixed
        top: "-100vh", // ย้ายออกจากหน้าจอ
        left: "-100vw", // ย้ายออกจากหน้าจอ
        zIndex: -1000,
        minHeight: "297mm", // A4 height
        boxSizing: "border-box",
        // เพิ่มเพื่อป้องกันการส่งผลต่อ layout
        width: "210mm",
        overflow: "hidden",
        pointerEvents: "none", // ป้องกันการคลิก
      }}
    >
      {/* Header Section */}
      <div style={{ 
        borderBottom: "3px solid #3b82f6", 
        paddingBottom: "20px", 
        marginBottom: "30px",
        textAlign: "center" 
      }}>
        <h1 style={{ 
          fontSize: "26pt", 
          marginBottom: "5px",
          color: "#1e40af",
          fontWeight: "700",
          letterSpacing: "-0.5px"
        }}>
          {title}
        </h1>
        <div style={{
          fontSize: "10pt",
          color: "#6b7280",
          fontStyle: "italic",
          marginTop: "10px"
        }}>
          <div>Generated on: {new Date().toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</div>
          <div>Time: {new Date().toLocaleTimeString('th-TH')}</div>
        </div>
      </div>

      {/* Content Section */}
      <div className={styles.markdownContent}>
        <style jsx>{`
          /* Global styling for better PDF appearance */
          .markdown-content {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          
          /* Headings */
          .markdown-content h1 {
            color: #1e40af;
            font-size: 20pt;
            font-weight: 700;
            margin: 25px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .markdown-content h2 {
            color: #3730a3;
            font-size: 16pt;
            font-weight: 600;
            margin: 20px 0 12px 0;
            padding-left: 10px;
            border-left: 4px solid #3b82f6;
          }
          
          .markdown-content h3 {
            color: #4338ca;
            font-size: 14pt;
            font-weight: 600;
            margin: 18px 0 10px 0;
          }
          
          /* Paragraphs */
          .markdown-content p {
            margin: 12px 0;
            text-align: justify;
            line-height: 1.8;
          }
          
          /* Lists */
          .markdown-content ul, .markdown-content ol {
            margin: 15px 0;
            padding-left: 25px;
          }
          
          .markdown-content li {
            margin: 8px 0;
            line-height: 1.7;
          }
          
          /* Tables */
          .markdown-table table {
            border-collapse: collapse;
            width: 100%;
            margin: 25px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .markdown-table thead {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          }
          
          .markdown-table th {
            background: transparent;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 11pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .markdown-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            font-size: 10pt;
          }
          
          .markdown-table tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          .markdown-table tbody tr:hover {
            background-color: #f1f5f9;
          }
          
          /* Code blocks */
          .markdown-content pre {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 9pt;
          }
          
          .markdown-content code {
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 9pt;
            color: #dc2626;
          }
          
          /* Blockquotes */
          .markdown-content blockquote {
            border-left: 4px solid #3b82f6;
            background-color: #f8fafc;
            margin: 20px 0;
            padding: 15px 20px;
            font-style: italic;
            color: #4b5563;
            border-radius: 0 6px 6px 0;
          }
          
          /* Strong and emphasis */
          .markdown-content strong {
            color: #1f2937;
            font-weight: 700;
          }
          
          .markdown-content em {
            color: #374151;
            font-style: italic;
          }
          
          /* Links */
          .markdown-content a {
            color: #2563eb;
            text-decoration: none;
            border-bottom: 1px dotted #2563eb;
          }
          
          .markdown-content a:hover {
            color: #1d4ed8;
            border-bottom: 1px solid #1d4ed8;
          }
          
          /* HR */
          .markdown-content hr {
            border: none;
            height: 2px;
            background: linear-gradient(to right, #e5e7eb, #9ca3af, #e5e7eb);
            margin: 30px 0;
            border-radius: 1px;
          }
          
          /* Images */
          .markdown-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            margin: 15px 0;
          }
        `}</style>
        
        <div className="markdown-content markdown-table">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom components for better styling
              table: ({children}) => (
                <table style={{borderCollapse: 'collapse', width: '100%'}}>
                  {children}
                </table>
              ),
              thead: ({children}) => (
                <thead style={{background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'}}>
                  {children}
                </thead>
              ),
              th: ({children}) => (
                <th style={{
                  color: 'white',
                  padding: '15px 12px',
                  textAlign: 'left',
                  fontWeight: '600',
                  fontSize: '11pt',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {children}
                </th>
              ),
              td: ({children}) => (
                <td style={{
                  padding: '12px',
                  borderBottom: '1px solid #e5e7eb',
                  verticalAlign: 'top',
                  fontSize: '10pt'
                }}>
                  {children}
                </td>
              )
            }}
          >
            {markdownContent.replace(/\{[\s\S]*\}/, "").trim()}
          </ReactMarkdown>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{
        marginTop: "40px",
        paddingTop: "20px",
        borderTop: "1px solid #e5e7eb",
        textAlign: "center",
        fontSize: "9pt",
        color: "#9ca3af"
      }}>
        <div>Page 1 of 1</div>
        <div style={{marginTop: "5px"}}>
          Generated by AI Assistant • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}, [getSelectedMarkdownContent, getSelectedMessageSource]);

// ฟังก์ชันสำหรับ export เป็น PDF


  // ฟังก์ชันสำหรับแปลง Markdown เป็น PDF
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

      element.style.visibility = "visible";
      element.style.position = "fixed";
      element.style.top = "0";
      element.style.left = "0";
      element.style.zIndex = "-1000";

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: "#fefefe",
      });

      element.style.visibility = "hidden";
      element.style.position = "absolute";

      const messageSource = getSelectedMessageSource();
      const title =
        messageSource === "Tool - Report"
          ? "Check-In Report"
          : messageSource === "Tool - Sick Report"
          ? "Sick Leave Report"
          : "Chat Response";

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      doc.setProperties({
        title: title,
        subject: "Generated from Markdown",
        author: "AI Assistant",
        creator: "Markdown to PDF Converter",
      });

      let heightLeft = imgHeight;
      let position = 0;

      doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
      setSelectedMessageIndex(null);
    }
  }, [getSelectedMarkdownContent, getSelectedMessageSource]);

  const exportSpecificMessageToPDF = async (messageIndex) => {
    await handleChartToPDF(messageIndex);
  };

  const handleChartToPDF = async (messageIndex = null) => {
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
          {renderMarkdownPreview()}
          <div className={styles.messages}>
              {messages.map((msg, idx) => {
                let chartObjects = [];
                const aiMessages = messages.filter(m => m.role === "ai");
                const aiIndex = msg.role === "ai" ? aiMessages.indexOf(msg) : -1;
                console.log("asssssssssssssssssssssss",msg.content.replace(/\n*```json[\s\S]```*/g, ""))
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
                        // ซ่อนเฉพาะ JSON block ด้านล่างสุด (graphh)
                        msg.role === "ai"
                          ? msg.content.replace(/\n*```json[\s\S]*```/g, "") // ตัด JSON block
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
                    
                    {/* ปุ่มสำหรับแปลงกราฟเป็น PDF */}
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
                        📊 {loading ? 'กำลังสร้าง...' : 'ส่งออกกราฟ PDF'}
                      </button>
                    )}

                    {/* ปุ่มสำหรับแปลง Report เป็น PDF */}
                    {msg.role === "ai" && msg.content && msg.content.trim().length > 0 && (
                      <button
                        className={styles.messagePdfButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          // ตั้งค่า selectedMessageIndex ให้เป็น index ของข้อความนี้ใน AI messages
                          setSelectedMessageIndex(aiIndex);
                          // เรียกฟังก์ชันแปลง Markdown เป็น PDF
                          handleMarkdownToPDF();
                        }}
                        title="แปลง Report เป็น PDF"
                        disabled={loading}
                        style={{ marginLeft: '8px' }}
                      >
                        📄 {loading ? 'กำลังสร้าง...' : 'ส่งออก Report PDF'}
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