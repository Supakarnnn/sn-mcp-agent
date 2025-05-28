"use client";
import { useState } from 'react';
import Link from 'next/link';
import styles from './csv.module.css';

export default function ImportPage() {
  const [csvFile, setCsvFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [imported, setImported] = useState(false);
  const [isImporting, setIsImporting] = useState(false); // NEW: loading state

  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
    setImported(false);
    setPreviewData([]);
    setHeaders([]);
  };

  const handlePreview = async () => {
    if (!csvFile) return;
    const formData = new FormData();
    formData.append('file', csvFile);

    const res = await fetch('http://localhost:8001/preview-csv', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setHeaders(data.headers);
    setPreviewData(data.rows);
  };

  const handleImport = async () => {
    if (!csvFile) return;
    setIsImporting(true); // NEW: set loading state
    const formData = new FormData();
    formData.append('file', csvFile);

    const res = await fetch('http://localhost:8001/upload-csv', {
      method: 'POST',
      body: formData,
    });

    setIsImporting(false); // NEW: unset loading state

    if (res.ok) setImported(true);
  };

  const handleClearFile = () => {
    setCsvFile(null);
    setPreviewData([]);
    setHeaders([]);
    setImported(false);
    // Reset the file input value
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <Link href="/chat">
          <button className={styles.backButton} aria-label="Go back">
            <svg
              className={styles.backButtonIcon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </Link>

        <h1 className={styles.title}>📥 Import CSV to Database</h1>

        <div className={styles.fileInputContainer}>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange} 
            className={`${styles.fileInput} ${csvFile ? styles.hasFile : ''}`}
            data-file-name={csvFile ? csvFile.name : ''}
          />
          <svg
            className={styles.fileIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </div>

        <div className={styles.buttonGroup}>
          <button
            onClick={handlePreview}
            className={`${styles.button} ${styles.previewButton}`}
            disabled={!csvFile}
          >
            Preview
          </button>

          {isImporting ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              กำลังนำข้อมูลเข้าสู่ ฐานข้อมูล...
            </div>
          ) : (
            <button
              onClick={handleImport}
              className={`${styles.button} ${styles.importButton}`}
              disabled={!csvFile}
            >
              Import
            </button>
          )}

          <button
            onClick={handleClearFile}
            className={`${styles.button} ${styles.clearButton}`}
            disabled={!csvFile}
          >
            Clear
          </button>
        </div>

        {imported && (
          <div className={styles.successMessage}>
            ✅ Import completed successfully!
          </div>
        )}
      </div>

      {previewData.length > 0 && (
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <div className={styles.previewTitle}>
              <svg 
                width="30" 
                height="30" 
                viewBox="0 0 24 24" 
                fill="none" 
               stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
              CSV Preview
            </div>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className={styles.th}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex} className={styles.tr}>
                    {headers.map((header, colIndex) => (
                      <td key={colIndex} className={styles.td}>
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
