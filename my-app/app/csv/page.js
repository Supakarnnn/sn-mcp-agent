"use client";
import { useState } from 'react';

export default function ImportPage() {
  const [csvFile, setCsvFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [imported, setImported] = useState(false);

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
    const formData = new FormData();
    formData.append('file', csvFile);

    const res = await fetch('http://localhost:8001/upload-csv', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) setImported(true);
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4">📥 Import CSV to Database</h1>

        <input type="file" accept=".csv" onChange={handleFileChange} className="mb-4" />

        <div className="space-x-2 mb-4">
          <button
            onClick={handlePreview}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Preview
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Import
          </button>
        </div>

        {imported && (
          <div className="text-green-700 font-semibold mb-4">✅ Import completed successfully!</div>
        )}

        {previewData.length > 0 && (
          <div className="overflow-auto">
            <table className="table-auto border-collapse w-full">
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className="border px-2 py-1 bg-gray-200 text-sm text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {headers.map((header, colIndex) => (
                      <td key={colIndex} className="border px-2 py-1 text-sm">
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
