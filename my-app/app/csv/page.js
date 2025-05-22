"use client";
import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

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

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>📥 Import CSV to Database</h1>

        <Link href="/chat">
          <button>back</button>
        </Link>

        <input type="file" accept=".csv" onChange={handleFileChange} className={styles.fileInput} />

        <div className={styles.buttonGroup}>
          <button
            onClick={handlePreview}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Preview
          </button>

          {isImporting ? (
            <div className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              กำลังนำข้อมูลเข้าสู่ ฐานข้อมูล...
            </div>
          ) : (
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Import
            </button>
          )}
        </div>

        {imported && (
          <div className={styles.successMessage}>
            ✅ Import completed successfully!
          </div>
        )}

        {previewData.length > 0 && (
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
        )}
      </div>
    </main>
  );
}
