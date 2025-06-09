import React, { forwardRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "../page.module.css";

const RenderMarkdownPreview = forwardRef(({ markdownContent, messageSource }, ref) => {
  if (!markdownContent) return null;

  return (
    <div
      ref={ref}
      className={styles.markdownPdfPreview}
      style={{
        padding: "30px",
        backgroundColor: "#ffffff",
        color: "#1f2937",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        lineHeight: "1.8",
        fontSize: "11pt",
        maxWidth: "210mm",
        margin: "0 auto",
        visibility: "hidden",
        position: "fixed",
        top: "-100vh",
        left: "-100vw",
        zIndex: -1000,
        minHeight: "297mm",
        boxSizing: "border-box",
        width: "210mm",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Content */}
      <div className={styles.markdownContent}>
        <div className="markdown-content markdown-table">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 style={{ fontSize: '42px', color: '#1e40af', fontWeight: '700', margin: '30px 0 20px 0', paddingBottom: '12px', borderBottom: '2px solid #e5e7eb' }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ fontSize: '36px', color: '#3730a3', fontWeight: '600', margin: '25px 0 15px 0', paddingLeft: '12px', borderLeft: '4px solid #3b82f6' }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: '32px', color: '#4338ca', fontWeight: '600', margin: '20px 0 12px 0' }}>{children}</h3>,
              table: ({ children }) => <table>{children}</table>,
              thead: ({ children }) => <thead>{children}</thead>,
              th: ({ children }) => <th>{children}</th>,
              td: ({ children }) => <td>{children}</td>,
            }}
          >
            {markdownContent.replace(/\{[\s\S]*\}/, "").trim()}
          </ReactMarkdown>
        </div>
        <style jsx>{`
          .markdown-content {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .markdown-content h1 {
            color: #1e40af;
            font-size: 42px;
            font-weight: 700;
            margin: 30px 0 20px 0;
            padding-bottom: 12px;
            border-bottom: 2px solid #e5e7eb;
          }
          .markdown-content h2 {
            color: #3730a3;
            font-size: 36px;
            font-weight: 600;
            margin: 25px 0 15px 0;
            padding-left: 12px;
            border-left: 4px solid #3b82f6;
          }
          .markdown-content h3 {
            color: #4338ca;
            font-size: 32px;
            font-weight: 600;
            margin: 20px 0 12px 0;
          }
          .markdown-content p {
            margin: 12px 0;
            text-align: justify;
            line-height: 1.8;
            font-size: 24px;
          }
          .markdown-content ul,
          .markdown-content ol {
            margin: 15px 0;
            padding-left: 25px;
            font-size: 24px;
          }
          .markdown-content li {
            margin: 8px 0;
            line-height: 1.7;
            font-size: 24px;
          }
          .markdown-table table {
            border-collapse: collapse;
            width: 100%;
            margin: 25px 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
            font-size: 24px;
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
            font-size: 26px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .markdown-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            font-size: 24px;
          }
          .markdown-table tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .markdown-table tbody tr:hover {
            background-color: #f1f5f9;
          }
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
          .markdown-content blockquote {
            border-left: 4px solid #3b82f6;
            background-color: #f8fafc;
            margin: 20px 0;
            padding: 15px 20px;
            font-style: italic;
            color: #4b5563;
            border-radius: 0 6px 6px 0;
          }
          .markdown-content strong {
            color: #1f2937;
            font-weight: 700;
          }
          .markdown-content em {
            color: #374151;
            font-style: italic;
          }
          .markdown-content a {
            color: #2563eb;
            text-decoration: none;
            border-bottom: 1px dotted #2563eb;
          }
          .markdown-content a:hover {
            color: #1d4ed8;
            border-bottom: 1px solid #1d4ed8;
          }
          .markdown-content hr {
            border: none;
            height: 2px;
            background: linear-gradient(to right, #e5e7eb, #9ca3af, #e5e7eb);
            margin: 30px 0;
            border-radius: 1px;
          }
          .markdown-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            margin: 15px 0;
          }
        `}</style>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
          fontSize: "9pt",
          color: "#9ca3af",
        }}
      >
        <div>Page 1 of 1</div>
        <div style={{ marginTop: "5px" }}>
          Generated by AI Assistant • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
});

export default RenderMarkdownPreview;
