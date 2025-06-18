import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import jsPDF from "jspdf";
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

export const handleChartToPDF = async (messageIndex = null, messages = [], setLoading, datasetVisibility = {}) => {
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
    alert("ไม่สามารถแปลงข้อมูลกราฟได้ กรุณาตรวจสอบว่าข้อความที่เลือกมีข้อมูลกราฟ");
    return;
  }

  if (chartObjects.length === 0) {
    alert("ไม่พบข้อมูลกราฟสำหรับส่งออก");
    return;
  }

  setLoading(true);

  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(34, 139, 34);
    doc.text("On Report", pageWidth / 2, 30, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(15);
    doc.setTextColor(100, 100, 100);

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generated: ${currentDate}`, pageWidth / 2, 40, { align: 'center' });

    doc.setDrawColor(34, 139, 34);
    doc.setLineWidth(1);
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

      // Filter out hidden datasets based on visibility state
      const visibleDatasets = chart.datasets.filter((dataset, index) => {
        return datasetVisibility[key]?.[index] !== false;
      });

      const cleanedChart = {
        labels: chart.labels,
        datasets: visibleDatasets.map((dataset) => {
          const colors = getColorByDatasetLabel(dataset.label);
          return {
            ...dataset,
            backgroundColor: dataset.backgroundColor || colors.bg,
            borderColor: dataset.borderColor || colors.border,
            borderWidth: 1
          };
        })
      };

      const hasMultipleDatasets = cleanedChart.datasets.length > 1;
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
              font: { size: 12, family: 'Arial, sans-serif', weight: 'bold' }
            }
          },
          title: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: {
            ticks: { display: true, color: "#333", font: { size: 10, family: 'Arial, sans-serif' }, maxRotation: 45 },
            grid: { color: "rgba(0,0,0,0.1)", lineWidth: 1 },
            title: {
              display: true, text: 'ชื่อพนักงาน', color: "#333",
              font: { size: 12, family: 'Arial, sans-serif', weight: 'bold' }
            }
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#333", font: { size: 10, family: 'Arial, sans-serif' } },
            grid: { color: "rgba(0,0,0,0.1)", lineWidth: 1 },
            title: {
              display: true, text: 'จำนวน (ครั้ง/ชั่วโมง)', color: "#333",
              font: { size: 12, family: 'Arial, sans-serif', weight: 'bold' }
            }
          }
        },
        layout: {
          padding: { top: hasMultipleDatasets ? 30 : 15, bottom: 30, left: 20, right: 20 }
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
    const fileName = `Chart-Message-${messageNumber}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

  } catch (err) {
    console.error("Failed to generate PDF:", err);
    alert("เกิดข้อผิดพลาดในการสร้าง PDF");
  } finally {
    setLoading(false);
  }
};