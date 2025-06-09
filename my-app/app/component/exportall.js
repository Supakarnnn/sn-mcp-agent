import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";
import { useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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

export function useHandleExportAll({ messages, markdownRef, getSelectedMarkdownContent, setLoading, datasetVisibility = {} }) {
    const handleExportAll = useCallback(async (messageIndex = null) => {
        const aiMessages = messages.filter(msg => msg.role === "ai");
        if (aiMessages.length === 0) {
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
            const usablePageHeight = pageHeight - 40; // ลบระยะขอบบนและล่าง
            let yPosition = 30;
            let hasContentOnFirstPage = false;

            // ========== Header ==========
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(34, 139, 34);
            doc.text("On Report", pageWidth / 2, yPosition, { align: 'center' });

            yPosition += 10;
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
            doc.text(`Generated: ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });

            yPosition += 5;
            doc.setDrawColor(34, 139, 34);
            doc.setLineWidth(0.5);
            doc.line(40, yPosition, pageWidth - 40, yPosition);
            yPosition += 15;

            // ========== Content ==========
            const markdownContent = getSelectedMarkdownContent();
            if (markdownContent) {
                try {
                    const element = markdownRef.current;
                    if (!element) {
                        throw new Error("Markdown preview element not found");
                    }

                    element.style.visibility = 'visible';
                    element.style.position = 'fixed';
                    element.style.top = '0';
                    element.style.left = '0';
                    element.style.zIndex = '-1000';

                    const markdownCanvas = await html2canvas(element, {
                        scale: 2,
                        logging: false,
                        useCORS: true,
                        backgroundColor: '#fefefe'
                    });

                    element.style.visibility = 'hidden';
                    element.style.position = 'absolute';

                    const imgData = markdownCanvas.toDataURL('image/png');
                    const imgWidth = pageWidth - 40;
                    const imgHeight = markdownCanvas.height * imgWidth / markdownCanvas.width;

                    // ตรวจสอบว่าต้องแบ่งหน้าหรือไม่
                    if (imgHeight > usablePageHeight) {
                        let sourceY = 0;
                        const sourceHeight = markdownCanvas.height;
                        const sourceWidth = markdownCanvas.width;
                        let currentY = yPosition;
                        let isFirstPage = true;

                        while (sourceY < sourceHeight) {
                            // คำนวณพื้นที่ที่สามารถใช้ได้ในหน้าปัจจุบัน
                            const availableHeight = isFirstPage ? (pageHeight - currentY - 20) : usablePageHeight;
                            
                            // คำนวณความสูงที่จะแสดงในหน้านี้
                            const heightForThisPage = Math.min(
                                availableHeight,
                                ((sourceHeight - sourceY) * imgWidth) / sourceWidth
                            );

                            // คำนวณส่วนของรูปภาพต้นฉบับที่จะใช้
                            const sourceHeightForThisPage = (heightForThisPage * sourceWidth) / imgWidth;

                            // สร้าง canvas ชั่วคราวสำหรับส่วนนี้
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = sourceWidth;
                            tempCanvas.height = sourceHeightForThisPage;
                            const tempCtx = tempCanvas.getContext('2d');

                            // วาดส่วนของรูปภาพลงใน canvas ชั่วคราว
                            tempCtx.drawImage(
                                markdownCanvas,
                                0, sourceY, sourceWidth, sourceHeightForThisPage,
                                0, 0, sourceWidth, sourceHeightForThisPage
                            );

                            // เพิ่มส่วนของรูปภาพลงใน PDF
                            const partialImgData = tempCanvas.toDataURL('image/png', 1.0);
                            doc.addImage(partialImgData, 'PNG', 20, currentY, imgWidth, heightForThisPage);

                            sourceY += sourceHeightForThisPage;
                            hasContentOnFirstPage = true;

                            // ถ้ายังมีเนื้อหาที่ต้องแสดง ให้เพิ่มหน้าใหม่
                            if (sourceY < sourceHeight) {
                                doc.addPage();
                                currentY = 20; // เริ่มจากด้านบนของหน้าใหม่
                                isFirstPage = false;
                            }
                        }
                        yPosition = currentY + 20;
                    } else {
                        // กรณีเนื้อหาพอดีหนึ่งหน้า
                        doc.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
                        yPosition += imgHeight + 20;
                        hasContentOnFirstPage = true;
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

            // ========== Charts ==========
            const targetIndex = messageIndex !== null ? messageIndex : aiMessages.length - 1;
            const selectedMessage = aiMessages[targetIndex];
            let chartObjects = [];

            if (selectedMessage) {
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
                }
            }

            if (chartObjects.length > 0) {
                for (let i = 0; i < chartObjects.length; i++) {
                    const { key, chart } = chartObjects[i];

                    // ตรวจสอบว่าต้องเพิ่มหน้าใหม่หรือไม่
                    if (yPosition > pageHeight - 120) {
                        doc.addPage();
                        yPosition = 20;
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

                    // ตรวจสอบว่ากราฟจะพอดีกับหน้าหรือไม่
                    if (yPosition + actualChartHeight > pageHeight - 20) {
                        doc.addPage();
                        yPosition = 20;
                    }

                    doc.addImage(chartImage, 'PNG', 20, yPosition, chartWidth, actualChartHeight, undefined, 'FAST');
                    yPosition += actualChartHeight + 15;
                    hasContentOnFirstPage = true;

                    chartInstance.destroy();
                }
            }

            if (!hasContentOnFirstPage) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);
                doc.setTextColor(100, 100, 100);
                doc.text("No content available for this report.", pageWidth / 2, yPosition + 20, { align: 'center' });
            }

            // เพิ่มเลขหน้าในทุกหน้า
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
            }

            const messageNumber = (messageIndex !== null ? messageIndex : aiMessages.length - 1) + 1;
            const fileName = `Complete-Report-Message-${messageNumber}-${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(fileName);

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("เกิดข้อผิดพลาดในการสร้าง PDF");
        } finally {
            setLoading(false);
        }
    }, [messages, markdownRef, getSelectedMarkdownContent, setLoading, datasetVisibility]);

    return handleExportAll;
}