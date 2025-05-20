import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../page.module.css';

const MarkdownPreview = ({ markdownRef, getSelectedMarkdownContent, getSelectedMessageSource }) => {
  const markdownContent = getSelectedMarkdownContent();
  if (!markdownContent) return null;

  const messageSource = getSelectedMessageSource();
  const title = messageSource === 'Tool - Report'
    ? 'Check-In Report'
    : messageSource === 'Tool - Sick Report'
    ? 'Sick Leave Report'
    : 'Chat Response';

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
        zIndex: -1000,
      }}
    >
      <h1 style={{ fontSize: '24pt', marginBottom: '10px' }}>{title}</h1>
      <p style={{ fontSize: '9pt', color: '#666', marginBottom: '20px' }}>
        Generated: {new Date().toLocaleString()}
      </p>
      <div className={styles.markdownContent}>
        <style>{`
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
        `}</style>
        <div className="markdown-table">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default MarkdownPreview;