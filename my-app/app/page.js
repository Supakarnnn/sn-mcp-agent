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
  const [showQuestionOptions, setShowQuestionOptions] = useState(false);

  const messagesEndRef = useRef(null);
  const markdownRef = useRef(null);
  const messagesContainerRef = useRef(null);

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
        ? "http://192.168.40.26:8001/create-check-in-report"
        : apiMode === "sickReport"
          ? "http://192.168.40.26:8001/create-take-leave-report"
          : "http://192.168.40.26:8001/chat";

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
                table: ({ children }) => (
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    {children}
                  </table>
                ),
                thead: ({ children }) => (
                  <thead style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
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
                td: ({ children }) => (
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
          <div style={{ marginTop: "5px" }}>
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
    const originalScrollPosition = messagesContainerRef.current?.scrollTop;

    try {
      const element = markdownRef.current;
      if (!element) {
        throw new Error("Markdown preview element not found");
      }

      // Save original styles
      const originalStyles = {
        visibility: element.style.visibility,
        position: element.style.position,
        top: element.style.top,
        left: element.style.left,
        zIndex: element.style.zIndex,
        width: element.style.width,
        height: element.style.height,
        overflow: element.style.overflow,
        backgroundColor: element.style.backgroundColor,
        fontFamily: element.style.fontFamily,
        fontSize: element.style.fontSize,
        lineHeight: element.style.lineHeight,
        padding: element.style.padding,
        margin: element.style.margin
      };

      // Prepare element for capture - make it visible but off-screen
      element.style.visibility = "visible"; // เปลี่ยนจาก hidden เป็น visible
      element.style.position = "absolute";
      element.style.top = "-9999px";
      element.style.left = "0";
      element.style.zIndex = "1000"; // เปลี่ยนเป็นค่าบวก
      element.style.width = "1200px"; // ใช้ pixel แทน mm
      element.style.minWidth = "1200px";
      element.style.maxWidth = "none";
      element.style.height = "auto";
      element.style.minHeight = "auto";
      element.style.overflow = "visible"; // เปลี่ยนเป็น visible
      element.style.backgroundColor = "#ffffff";
      element.style.fontFamily = "Arial, sans-serif";
      element.style.fontSize = "14px";
      element.style.lineHeight = "1.5";
      element.style.padding = "20px";
      element.style.margin = "0";
      element.style.color = "#333333";

      // Remove unwanted elements
      const unwantedSelectors = [
        'button',
        '[type="button"]',
        '.btn',
        '.export-btn',
        '.download-btn',
        '[style*="border-color: rgb(59, 130, 246)"]',
        '[style*="background-color: rgb(59, 130, 246)"]'
      ];

      const hiddenElements = [];
      unwantedSelectors.forEach(selector => {
        try {
          const elements = element.querySelectorAll(selector);
          elements.forEach(el => {
            hiddenElements.push({
              element: el,
              originalDisplay: el.style.display
            });
            el.style.display = 'none';
          });
        } catch (e) {
          console.warn('Selector error:', selector, e);
        }
      });

      // Style tables for better PDF rendering
      const tables = element.querySelectorAll('table');
      const originalTableStyles = [];
      tables.forEach((table, index) => {
        // Save original styles
        originalTableStyles[index] = {
          width: table.style.width,
          tableLayout: table.style.tableLayout,
          borderCollapse: table.style.borderCollapse,
          fontSize: table.style.fontSize,
          margin: table.style.margin
        };

        // Apply PDF-friendly styles
        table.style.width = "100%";
        table.style.tableLayout = "auto";
        table.style.borderCollapse = "collapse";
        table.style.fontSize = "12px";
        table.style.margin = "10px 0";

        // Style cells
        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
          cell.style.padding = "8px";
          cell.style.border = "1px solid #ddd";
          cell.style.fontSize = "12px";
          cell.style.lineHeight = "1.3";
        });

        // Style headers
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
          header.style.backgroundColor = "#4F90F7";
          header.style.color = "white";
          header.style.fontWeight = "bold";
        });
      });

      // Wait for styles to apply
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture with html2canvas
      const canvas = await html2canvas(element, {
        scale: 2.5, // เพิ่ม scale สำหรับความคมชัด
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 1200, // ใช้ค่าที่ตั้งไว้
        height: element.scrollHeight,
        windowWidth: 1200,
        windowHeight: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (element) => {
          // Skip unwanted elements during capture
          const tagName = element.tagName?.toLowerCase();
          const className = element.className?.toString() || '';
          const text = element.textContent || '';

          return (
            tagName === 'button' ||
            className.includes('btn') ||
            className.includes('export') ||
            text.includes('Export') ||
            text.includes('Download')
          );
        },
        onclone: (clonedDoc) => {
          // Additional cleanup in cloned document
          const clonedElement = clonedDoc.body;
          if (clonedElement) {
            clonedElement.style.fontFamily = "Arial, sans-serif";
            clonedElement.style.fontSize = "14px";
            clonedElement.style.backgroundColor = "#ffffff";
            clonedElement.style.color = "#333333";

            // Remove unwanted elements from clone
            const unwantedInClone = clonedElement.querySelectorAll(
              'button, [type="button"], .btn, .export-btn'
            );
            unwantedInClone.forEach(el => el.remove());
          }
        }
      });

      // Restore original styles
      Object.assign(element.style, originalStyles);

      // Restore hidden elements
      hiddenElements.forEach(({ element, originalDisplay }) => {
        element.style.display = originalDisplay || '';
      });

      // Restore table styles
      tables.forEach((table, index) => {
        if (originalTableStyles[index]) {
          Object.assign(table.style, originalTableStyles[index]);
        }
      });

      // Create PDF
      const messageSource = getSelectedMessageSource();
      const title = messageSource === "Tool - Report"
        ? "Check-In Report"
        : messageSource === "Tool - Sick Report"
          ? "Sick Leave Report"
          : "Chat Response";

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas is empty - no content captured");
      }

      const imgData = canvas.toDataURL("image/png", 0.95);
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Add header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(34, 139, 34);
      doc.text(title, pageWidth / 2, 20, { align: 'center' });

      // Add date
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generated: ${currentDate}`, pageWidth / 2, 28, { align: 'center' });

      // Add separator line
      doc.setDrawColor(34, 139, 34);
      doc.setLineWidth(0.5);
      doc.line(20, 32, pageWidth - 20, 32);

      // Calculate image dimensions
      const margin = 20;
      const availableWidth = pageWidth - (2 * margin);
      const availableHeight = pageHeight - 50; // เหลือพื้นที่สำหรับ header
      const imgAspectRatio = canvas.width / canvas.height;

      let imgWidth = availableWidth;
      let imgHeight = imgWidth / imgAspectRatio;

      // If image is too tall, adjust dimensions
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * imgAspectRatio;
      }

      let yPosition = 40;

      // Handle multi-page content
      if (imgHeight > availableHeight) {
        // Split image across multiple pages
        const maxHeightPerPage = availableHeight;
        let remainingHeight = imgHeight;
        let sourceY = 0;
        let currentPage = 1;

        while (remainingHeight > 0) {
          const heightForThisPage = Math.min(remainingHeight, maxHeightPerPage);
          const sourceHeightForThisPage = (heightForThisPage / imgHeight) * canvas.height;

          // Create temporary canvas for this page portion
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = sourceHeightForThisPage;
          const tempCtx = tempCanvas.getContext('2d');

          tempCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeightForThisPage,
            0, 0, canvas.width, sourceHeightForThisPage
          );

          const partialImgData = tempCanvas.toDataURL("image/png", 0.95);

          if (currentPage > 1) {
            doc.addPage();
            yPosition = 20;
          }

          doc.addImage(partialImgData, "PNG", margin, yPosition, imgWidth, heightForThisPage);

          sourceY += sourceHeightForThisPage;
          remainingHeight -= heightForThisPage;
          currentPage++;
        }
      } else {
        // Single page
        doc.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
      }

      // Add page numbers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      }

      // Set PDF properties
      doc.setProperties({
        title: title,
        subject: "Generated from Markdown",
        author: "AI Assistant",
        creator: "Markdown to PDF Converter",
      });

      // Save PDF
      const fileName = `${title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`;
      doc.save(fileName);

      console.log("PDF generated successfully");

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Failed to generate PDF: ${error.message}`);
    } finally {
      setLoading(false);
      setSelectedMessageIndex(null);
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = originalScrollPosition;
      }
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

  const handleExportAll = useCallback(async (messageIndex) => {
    const markdownContent = getSelectedMarkdownContent();
    const aiMessages = messages.filter(msg => msg.role === "ai");

    if (!markdownContent && aiMessages.length === 0) {
      alert("ไม่พบข้อมูลสำหรับส่งออก");
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
      const usablePageHeight = pageHeight - 40;
      let yPosition = 30;

      // ========== PDF Header - เฉพาะ "On Report" และวันที่ ==========
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(34, 139, 34);
      doc.text("On Report", pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 10;
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
      doc.text(`Generated: ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 5;
      doc.setDrawColor(34, 139, 34);
      doc.setLineWidth(0.5);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 15;

      // ========== Report Content ==========
      let hasContentOnFirstPage = false; // ตัวแปรเช็คว่ามีเนื้อหาในหน้าแรกหรือไม่

      if (markdownContent) {
        try {
          const element = markdownRef.current;
          if (element) {
            // บันทึก style เดิม
            const originalStyles = {
              visibility: element.style.visibility,
              position: element.style.position,
              top: element.style.top,
              left: element.style.left,
              zIndex: element.style.zIndex,
              width: element.style.width,
              backgroundColor: element.style.backgroundColor,
              fontFamily: element.style.fontFamily
            };

            // ตั้งค่าสำหรับ capture - เพิ่มความกว้างสำหรับตาราง
            element.style.visibility = "visible";
            element.style.position = "absolute";
            element.style.top = "-9999px";
            element.style.left = "0";
            element.style.zIndex = "1000";
            element.style.width = "1400px";
            element.style.minWidth = "1400px";
            element.style.maxWidth = "none";
            element.style.backgroundColor = "#ffffff";
            element.style.fontFamily = "Arial, sans-serif";
            element.style.fontSize = "13px";
            element.style.lineHeight = "1.4";
            element.style.padding = "10px";
            element.style.overflow = "visible";

            // ซ่อนทุก element ที่ไม่ต้องการ
            const unwantedSelectors = [
              '[style*="border"]',
              '[style*="background-color: rgb(59, 130, 246)"]',
              '[style*="background: rgb(59, 130, 246)"]',
              '[style*="border-color"]',
              '.report-header',
              '.check-in-header',
              '.header',
              '.nav',
              '.navigation',
              '.menu',
              '.sidebar',
              '.footer',
              '.pagination',
              '.breadcrumb',
              '.toolbar',
              '.action-bar',
              '.controls',
              '[class*="header"]',
              '[class*="nav"]',
              '[class*="menu"]',
              '[class*="toolbar"]',
              'button',
              '[type="button"]',
              '.btn',
              '[role="button"]'
            ];

            unwantedSelectors.forEach(selector => {
              try {
                const elements = element.querySelectorAll(selector);
                elements.forEach(el => {
                  el.style.display = 'none';
                  el.style.visibility = 'hidden';
                });
              } catch (e) {
                // ignore selector errors
              }
            });

            // ลบ elements ที่มี text บางคำที่ไม่ต้องการ
            const allElements = element.querySelectorAll('*');
            allElements.forEach(el => {
              const text = el.textContent || '';
              const unwantedTexts = [
                'Export',
                'Download',
                'Print',
                'Save',
                'Back',
                'Home',
                'Menu',
                'Navigation',
                'Page',
                'Previous',
                'Next',
                'ส่งออก',
                'ดาวน์โหลด',
                'พิมพ์'
              ];

              if (unwantedTexts.some(unwanted => text.toLowerCase().includes(unwanted.toLowerCase()))) {
                if ((el.tagName !== 'P' && el.tagName !== 'DIV' && el.tagName !== 'TD' && el.tagName !== 'TH') || text.length < 50) {
                  el.style.display = 'none';
                }
              }
            });

            // จัดการ table elements เพื่อให้แสดงเต็มขนาด
            const tables = element.querySelectorAll('table');
            tables.forEach(table => {
              table.style.width = "100%";
              table.style.minWidth = "1300px";
              table.style.maxWidth = "none";
              table.style.tableLayout = "auto";
              table.style.borderCollapse = "collapse";
              table.style.fontSize = "11px";
              table.style.margin = "5px 0 0 0";
              table.style.padding = "0";
              table.style.overflow = "visible";
              table.style.marginTop = "5px";

              // จัดการ cells
              const cells = table.querySelectorAll('td, th');
              cells.forEach(cell => {
                cell.style.padding = "6px 4px";
                cell.style.whiteSpace = "nowrap";
                cell.style.overflow = "visible";
                cell.style.textOverflow = "clip";
                cell.style.border = "1px solid #ddd";
                cell.style.fontSize = "11px";
                cell.style.lineHeight = "1.2";
                cell.style.minWidth = "auto";
                cell.style.maxWidth = "none";
              });

              // จัดการ headers
              const headers = table.querySelectorAll('th');
              headers.forEach(header => {
                header.style.backgroundColor = "#4F90F7";
                header.style.color = "white";
                header.style.fontWeight = "bold";
                header.style.textAlign = "center";
                header.style.fontSize = "11px";
                header.style.padding = "8px 4px";
              });

              // จัดการ rows
              const rows = table.querySelectorAll('tr');
              rows.forEach((row, index) => {
                if (index % 2 === 0) {
                  row.style.backgroundColor = "#f9f9f9";
                } else {
                  row.style.backgroundColor = "#ffffff";
                }
              });
            });

            await new Promise(resolve => setTimeout(resolve, 200));

            const canvas = await html2canvas(element, {
              scale: 2.5,
              logging: false,
              useCORS: true,
              allowTaint: true,
              backgroundColor: "#ffffff",
              width: 1400,
              height: element.scrollHeight,
              windowWidth: 1400,
              windowHeight: element.scrollHeight,
              scrollX: 0,
              scrollY: 0,
              ignoreElements: (element) => {
                const tagName = element.tagName?.toLowerCase();
                const className = element.className?.toString() || '';
                const text = element.textContent || '';

                return (
                  tagName === 'button' ||
                  className.includes('btn') ||
                  className.includes('header') ||
                  className.includes('nav') ||
                  text.includes('Export') ||
                  text.includes('Download') ||
                  text.includes('ส่งออก')
                );
              },
              onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.querySelector('[data-element-id]') ||
                  clonedDoc.body.firstChild;
                if (clonedElement) {
                  clonedElement.style.fontFamily = "Arial, sans-serif";
                  clonedElement.style.fontSize = "13px";
                  clonedElement.style.color = "#333333";
                  clonedElement.style.backgroundColor = "#ffffff";
                  clonedElement.style.width = "1400px";
                  clonedElement.style.overflow = "visible";

                  const clonedTables = clonedElement.querySelectorAll('table');
                  clonedTables.forEach(table => {
                    table.style.width = "100%";
                    table.style.minWidth = "1300px";
                    table.style.tableLayout = "auto";
                    table.style.fontSize = "11px";
                    table.style.borderCollapse = "collapse";

                    const clonedCells = table.querySelectorAll('td, th');
                    clonedCells.forEach(cell => {
                      cell.style.whiteSpace = "nowrap";
                      cell.style.fontSize = "11px";
                      cell.style.padding = "6px 4px";
                    });
                  });

                  const clonedUnwanted = clonedElement.querySelectorAll(
                    'button, [type="button"], .btn, [style*="border"], [style*="background-color: rgb(59, 130, 246)"], .report-header, .check-in-header, .header, .nav'
                  );
                  clonedUnwanted.forEach(el => {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                  });
                }
              }
            });

            // คืนค่า style เดิม
            Object.keys(originalStyles).forEach(key => {
              element.style[key] = originalStyles[key] || '';
            });

            const imgData = canvas.toDataURL("image/png", 0.95);
            const imgWidth = pageWidth - 40;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // ========== จัดการการแบ่งหน้าสำหรับรูปภาพ - แก้ไขเพื่อให้แสดงเนื้อหาในหน้าแรก ==========
            const remainingSpaceInPage = pageHeight - yPosition - 20;

            // ถ้ารูปภาพใหญ่เกินพื้นที่ที่เหลือในหน้าแรก
            if (imgHeight > remainingSpaceInPage) {
              // ถ้ารูปภาพใหญ่มากจนต้องแบ่งหน้า แต่ยังพอใส่ในหน้าเดียวได้
              if (imgHeight <= usablePageHeight && remainingSpaceInPage < usablePageHeight * 0.4) {
                // เพิ่มหน้าใหม่และใส่รูปภาพในหน้าใหม่
                doc.addPage();
                yPosition = 30;
                doc.addImage(imgData, "PNG", 20, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 20;
                hasContentOnFirstPage = true; // ยังคงมี header ในหน้าแรก
              }
              // ถ้ารูปภาพใหญ่มากจนต้องแบ่งเป็นหลายหน้า
              else if (imgHeight > usablePageHeight) {
                const maxHeightPerPage = usablePageHeight;
                let currentY = yPosition;
                let sourceY = 0;
                const sourceHeight = canvas.height;
                const sourceWidth = canvas.width;
                let isFirstPart = true;

                while (sourceY < sourceHeight) {
                  const availableSpace = isFirstPart ? (pageHeight - currentY - 20) : maxHeightPerPage;
                  const heightForThisPage = Math.min(
                    availableSpace,
                    ((sourceHeight - sourceY) * imgWidth) / sourceWidth
                  );

                  const sourceHeightForThisPage = (heightForThisPage * sourceWidth) / imgWidth;

                  const tempCanvas = document.createElement('canvas');
                  tempCanvas.width = sourceWidth;
                  tempCanvas.height = sourceHeightForThisPage;
                  const tempCtx = tempCanvas.getContext('2d');

                  tempCtx.drawImage(
                    canvas,
                    0, sourceY, sourceWidth, sourceHeightForThisPage,
                    0, 0, sourceWidth, sourceHeightForThisPage
                  );

                  const partialImgData = tempCanvas.toDataURL("image/png", 0.95);
                  doc.addImage(partialImgData, "PNG", 20, currentY, imgWidth, heightForThisPage);

                  sourceY += sourceHeightForThisPage;
                  currentY += heightForThisPage;
                  hasContentOnFirstPage = true; // มีเนื้อหาในหน้าแรก

                  if (sourceY < sourceHeight) {
                    doc.addPage();
                    currentY = 30;
                    isFirstPart = false;
                  }
                }

                yPosition = currentY + 20;
              }
              // กรณีอื่นๆ ให้ใส่รูปในหน้าแรกโดยตรง
              else {
                doc.addImage(imgData, "PNG", 20, yPosition, imgWidth, Math.min(imgHeight, remainingSpaceInPage - 10));
                hasContentOnFirstPage = true;

                if (imgHeight > remainingSpaceInPage - 10) {
                  doc.addPage();
                  yPosition = 30;
                } else {
                  yPosition += imgHeight + 20;
                }
              }
            }
            // ถ้ารูปภาพพอใส่ในหน้าแรกได้
            else {
              doc.addImage(imgData, "PNG", 20, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 20;
              hasContentOnFirstPage = true;
            }

            // ตรวจสอบว่าต้องเพิ่มหน้าใหม่หรือไม่
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = 30;
            }
          }
        } catch (error) {
          console.error("Error capturing markdown:", error);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.setTextColor(60, 60, 60);
          const textLines = doc.splitTextToSize("Report content could not be rendered. Please check the original message for details.", pageWidth - 40);
          doc.text(textLines, 20, yPosition);
          yPosition += (textLines.length * 6) + 20;
          hasContentOnFirstPage = true;
        }
      }

      // ========== Charts - เฉพาะกราฟ ไม่มี header ==========
      const targetIndex = messageIndex !== null ? messageIndex : aiMessages.length - 1;
      const selectedMessage = aiMessages[targetIndex];
      let chartObjects = [];

      if (selectedMessage) {
        try {
          const jsonMatch = selectedMessage.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.labels && parsed.datasets) {
              chartObjects.push({ key: "Data Report", chart: parsed });
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

      if (chartObjects.length > 0) {
        for (let i = 0; i < chartObjects.length; i++) {
          const { key, chart } = chartObjects[i];

          const chartHeight = 100;
          const chartWithMargin = chartHeight + 10;

          // ตรวจสอบว่าต้องเพิ่มหน้าใหม่หรือไม่
          if (yPosition + chartWithMargin > pageHeight - 20) {
            doc.addPage();
            yPosition = 30;
          }

          // สร้างกราฟแบบสะอาด - ไม่มี title หรือ header
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
                display: false
              },
              tooltip: {
                enabled: false
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
                  text: 'Employee Name',
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
                  text: 'Count (Times/Hours)',
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
                top: hasMultipleDatasets ? 20 : 10,
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

          const chartImage = canvas.toDataURL('image/png', 0.95);
          const chartWidth = pageWidth - 40;
          const actualChartHeight = (chartWidth * 400) / 800;

          doc.addImage(chartImage, 'PNG', 20, yPosition, chartWidth, actualChartHeight, undefined, 'FAST');
          yPosition += actualChartHeight + 15;
          hasContentOnFirstPage = true; // มี chart ในหน้าแรก

          chartInstance.destroy();
        }
      }

      // ========== ตรวจสอบว่ามีเนื้อหาในหน้าแรกหรือไม่ ==========
      if (!hasContentOnFirstPage) {
        // ถ้าไม่มีเนื้อหาในหน้าแรก ให้เพิ่มข้อความแจ้ง
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text("No content available for this report.", pageWidth / 2, yPosition + 20, { align: 'center' });
      }

      // ========== Footer เฉพาะเลขหน้า ==========
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      }

      // ========== บันทึกไฟล์ ==========
      const messageNumber = (messageIndex !== null ? messageIndex : aiMessages.length - 1) + 1;
      const fileName = `Complete-Report-Message-${messageNumber}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, [getSelectedMarkdownContent, messages, markdownRef, getColorByDatasetLabel]);


  return (
    <div>
      <div className={styles.container}>
        <div className={styles.chatbox}>
          {renderMarkdownPreview()}
          <div className={styles.messages} ref={messagesContainerRef}>
            {messages.map((msg, idx) => {
              let chartObjects = [];
              const aiMessages = messages.filter(m => m.role === "ai");
              const aiIndex = msg.role === "ai" ? aiMessages.indexOf(msg) : -1;
              console.log("asssssssssssssssssssssss", msg.content.replace(/\n*```json[\s\S]```*/g, ""))
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

                  {msg.role === "ai" && (chartObjects.length > 0 || (msg.content && msg.content.trim().length > 0)) && (
                    <div className={styles.exportActions}>
                      {/* ปุ่มสำหรับ Export ทั้งหมด - จะแสดงเมื่อมีทั้งกราฟและ content */}
                      {chartObjects.length > 0 && msg.content && msg.content.trim().length > 0 && (
                        <button
                          className={`${styles.exportBtn} ${styles.exportBtnAll}`}
                          onClick={(e) => {
                            e.stopPropagation();
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

          <div className={styles.toolBar}>
            <Link href="/csv">
              <button
                className={styles.pillButton}
                aria-label="Update database"
              >
                <span className={styles.icon}>📤</span> อัพเดทฐานข้อมูล
              </button>
            </Link>
            <button
              className={styles.pillButton}
              onClick={() => setShowQuestionOptions(!showQuestionOptions)}
            >
              คำถามตัวอย่าง
            </button>
            {showQuestionOptions && (

              <select
                className={styles.dropdown}
                onChange={(e) => {
                  setInput(e.target.value);
                  setShowQuestionOptions(false);
                }}


                defaultValue=""
              >
                <option value="" disabled>เลือกคำถาม</option>
                <option value="ใครมาสายสุดในวันนี้">
                  ใครมาสายสุดในวันนี้
                </option>
                <option value="ขอรายงาน การเข้างาน แผนก XXXX ปี XXXX">
                  ขอรายงาน การเข้างาน แผนก XXXX ปี XXXX
                </option>
                <option value="ขอรายงานการเข้างาน แผนก XXXX เดือน XXXX ปี XXXX">
                  ขอรายงานการเข้างาน แผนก XXXX เดือน XXXX ปี XXXX
                </option>
              </select>
            )}

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