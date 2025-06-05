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

export function useHandleExportAll({ messages, markdownRef, getSelectedMarkdownContent, setLoading }) {
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
    }, [messages, markdownRef, getSelectedMarkdownContent, setLoading]);
    return handleExportAll;
}