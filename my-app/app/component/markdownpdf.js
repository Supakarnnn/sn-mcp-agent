import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useCallback } from "react";

export const useMarkdownToPDF = ({
    markdownRef,
    messagesContainerRef,
    setLoading,
    setSelectedMessageIndex,
    getSelectedMarkdownContent,
    getSelectedMessageSource
}) => {
    return async () => {
        try {
            setLoading(true);
            const element = markdownRef.current;
            if (!element) return;

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

            // ตั้งค่าสำหรับ capture
            element.style.visibility = "visible";
            element.style.position = "absolute";
            element.style.top = "-9999px";
            element.style.left = "0";
            element.style.zIndex = "1000";
            element.style.width = "1200px";
            element.style.minWidth = "1200px";
            element.style.maxWidth = "none";
            element.style.height = "auto";
            element.style.minHeight = "auto";
            element.style.overflow = "visible";
            element.style.backgroundColor = "#ffffff";
            element.style.fontFamily = "Arial, sans-serif";
            element.style.fontSize = "24px";
            element.style.lineHeight = "1.5";
            element.style.padding = "40px";
            element.style.margin = "0";
            element.style.color = "#333333";
            element.style.boxSizing = "border-box";

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

            unwantedSelectors.forEach(selector => {
                try {
                    const elements = element.querySelectorAll(selector);
                    elements.forEach(el => {
                        el.style.display = 'none';
                    });
                } catch (e) {
                    console.warn('Selector error:', selector, e);
                }
            });

            // Style text content
            const paragraphs = element.querySelectorAll('p');
            paragraphs.forEach(p => {
                p.style.fontSize = "24px";
                p.style.lineHeight = "1.6";
                p.style.margin = "12px 0";
                p.style.textAlign = "justify";
            });

            // Style numbers
            const numbers = element.querySelectorAll('.number, .count, td:nth-child(2)');
            numbers.forEach(num => {
                num.style.fontSize = "24px";
                num.style.fontWeight = "500";
            });

            // Style headings
            const h1Elements = element.querySelectorAll('h1');
            h1Elements.forEach(h1 => {
                h1.style.color = "#1e40af";
                h1.style.fontSize = "42px";
                h1.style.fontWeight = "700";
                h1.style.margin = "30px 0 20px 0";
                h1.style.paddingBottom = "12px";
                h1.style.borderBottom = "2px solid #e5e7eb";
            });

            const h2Elements = element.querySelectorAll('h2');
            h2Elements.forEach(h2 => {
                h2.style.color = "#3730a3";
                h2.style.fontSize = "36px";
                h2.style.fontWeight = "600";
                h2.style.margin = "25px 0 15px 0";
                h2.style.paddingLeft = "12px";
                h2.style.borderLeft = "4px solid #3b82f6";
            });

            const h3Elements = element.querySelectorAll('h3');
            h3Elements.forEach(h3 => {
                h3.style.color = "#4338ca";
                h3.style.fontSize = "32px";
                h3.style.fontWeight = "600";
                h3.style.margin = "20px 0 12px 0";
            });

            // Style lists
            const listItems = element.querySelectorAll('li');
            listItems.forEach(item => {
                item.style.fontSize = "24px";
                item.style.lineHeight = "1.7";
                item.style.margin = "8px 0";
            });

            // Style blockquotes
            const blockquotes = element.querySelectorAll('blockquote');
            blockquotes.forEach(quote => {
                quote.style.borderLeft = "4px solid #3b82f6";
                quote.style.backgroundColor = "#f8fafc";
                quote.style.margin = "20px 0";
                quote.style.padding = "15px 20px";
                quote.style.fontStyle = "italic";
                quote.style.color = "#4b5563";
                quote.style.borderRadius = "0 6px 6px 0";
            });

            // Style code blocks
            const codeBlocks = element.querySelectorAll('pre');
            codeBlocks.forEach(block => {
                block.style.backgroundColor = "#f8fafc";
                block.style.border = "1px solid #e2e8f0";
                block.style.borderRadius = "6px";
                block.style.padding = "15px";
                block.style.margin = "15px 0";
                block.style.overflowX = "auto";
                block.style.fontFamily = "'Courier New', monospace";
                block.style.fontSize = "20px";
            });

            // Style inline code
            const inlineCodes = element.querySelectorAll('code');
            inlineCodes.forEach(code => {
                code.style.backgroundColor = "#f1f5f9";
                code.style.padding = "2px 6px";
                code.style.borderRadius = "4px";
                code.style.fontFamily = "'Courier New', monospace";
                code.style.fontSize = "20px";
                code.style.color = "#dc2626";
            });

            // Style tables
            const tables = element.querySelectorAll('table');
            tables.forEach(table => {
                table.style.width = "100%";
                table.style.tableLayout = "auto";
                table.style.borderCollapse = "collapse";
                table.style.fontSize = "24px";
                table.style.margin = "15px 0";
                table.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
                table.style.borderRadius = "8px";
                table.style.overflow = "hidden";
                table.style.pageBreakInside = "avoid";
                table.style.breakInside = "avoid";

                // Style headers
                const headers = table.querySelectorAll('th');
                headers.forEach(header => {
                    header.style.background = "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
                    header.style.color = "white";
                    header.style.padding = "14px 15px";
                    header.style.textAlign = "left";
                    header.style.fontSize = "26px";
                    header.style.fontWeight = "bold";
                    header.style.textTransform = "uppercase";
                    header.style.letterSpacing = "0.5px";
                });

                // Style cells and rows
                const rows = table.querySelectorAll('tr');
                rows.forEach((row, index) => {
                    row.style.pageBreakInside = "avoid";
                    row.style.breakInside = "avoid";
                    
                    if (index % 2 === 1) {
                        row.style.backgroundColor = "#f8fafc";
                    }
                    
                    const cells = row.querySelectorAll('td');
                    cells.forEach(cell => {
                        cell.style.padding = "12px 15px";
                        cell.style.border = "1px solid #ddd";
                        cell.style.fontSize = "24px";
                        cell.style.lineHeight = "1.5";
                        cell.style.verticalAlign = "top";
                    });
                });
            });

            // Capture markdown content
            const markdownCanvas = await html2canvas(element, {
                scale: 2.5,
                logging: false,
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                width: 1200,
                height: element.scrollHeight,
                windowWidth: 1200,
                windowHeight: element.scrollHeight,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.querySelector('[data-element-id]') ||
                        clonedDoc.body.firstChild;
                    if (clonedElement) {
                        clonedElement.style.fontFamily = "Arial, sans-serif";
                        clonedElement.style.fontSize = "24px";
                        clonedElement.style.backgroundColor = "#ffffff";
                        clonedElement.style.color = "#333333";
                    }
                }
            });

            // Create PDF
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const usablePageHeight = pageHeight - 40;
            let yPosition = 15;

            // Add header
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(18);
            pdf.setTextColor(34, 139, 34);
            pdf.text("On Report", pageWidth / 2, yPosition, { align: 'center' });

            yPosition += 7;
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(15);
            pdf.setTextColor(100, 100, 100);

            const currentDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            pdf.text(`Generated: ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });

            yPosition += 4;
            pdf.setDrawColor(34, 139, 34);
            pdf.setLineWidth(0.5);
            pdf.line(40, yPosition, pageWidth - 40, yPosition);
            yPosition += 5;

            // Add content
            const imgData = markdownCanvas.toDataURL('image/png', 0.95);
            const imgWidth = pageWidth - 40;
            const imgHeight = (markdownCanvas.height * imgWidth) / markdownCanvas.width;
            const remainingSpaceInPage = pageHeight - yPosition - 20;

            // จัดการการแบ่งหน้าสำหรับรูปภาพ
            if (imgHeight > remainingSpaceInPage) {
                // ถ้ารูปภาพใหญ่มากจนต้องแบ่งหน้า แต่ยังพอใส่ในหน้าเดียวได้
                if (imgHeight <= usablePageHeight && remainingSpaceInPage < usablePageHeight * 0.4) {
                    // เพิ่มหน้าใหม่และใส่รูปภาพในหน้าใหม่
                    pdf.addPage();
                    yPosition = 30;
                    pdf.addImage(imgData, "PNG", 20, yPosition, imgWidth, imgHeight);
                    yPosition += imgHeight + 20;
                }
                // ถ้ารูปภาพใหญ่มากจนต้องแบ่งเป็นหลายหน้า
                else if (imgHeight > usablePageHeight) {
                    const maxHeightPerPage = usablePageHeight;
                    let currentY = yPosition;
                    let sourceY = 0;
                    const sourceHeight = markdownCanvas.height;
                    const sourceWidth = markdownCanvas.width;
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
                            markdownCanvas,
                            0, sourceY, sourceWidth, sourceHeightForThisPage,
                            0, 0, sourceWidth, sourceHeightForThisPage
                        );

                        const partialImgData = tempCanvas.toDataURL("image/png", 0.95);
                        pdf.addImage(partialImgData, "PNG", 20, currentY, imgWidth, heightForThisPage);

                        sourceY += sourceHeightForThisPage;
                        currentY += heightForThisPage;

                        if (sourceY < sourceHeight) {
                            pdf.addPage();
                            currentY = 30;
                            isFirstPart = false;
                        }
                    }

                    yPosition = currentY + 20;
                }
                // กรณีอื่นๆ ให้ใส่รูปในหน้าแรกโดยตรง
                else {
                    pdf.addImage(imgData, "PNG", 20, yPosition, imgWidth, Math.min(imgHeight, remainingSpaceInPage - 10));

                    if (imgHeight > remainingSpaceInPage - 10) {
                        pdf.addPage();
                        yPosition = 30;
                    } else {
                        yPosition += imgHeight + 20;
                    }
                }
            }
            // ถ้ารูปภาพพอใส่ในหน้าแรกได้
            else {
                pdf.addImage(imgData, "PNG", 20, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 20;
            }

            // Add page numbers
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
            }

            // Save PDF
            const source = getSelectedMessageSource();
            const currentDateForFile = new Date().toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            pdf.save(`${source}_${currentDateForFile}.pdf`);

            // คืนค่า style เดิม
            Object.assign(element.style, originalStyles);

        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setLoading(false);
        }
    };
};