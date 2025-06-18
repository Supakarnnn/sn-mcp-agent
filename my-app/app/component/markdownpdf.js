import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useCallback } from "react";

export const useMarkdownToPDF = ({
    markdownRef,
    messagesContainerRef,
    setLoading,
    setSelectedMessageIndex,
    getSelectedMarkdownContent,
    getSelectedMessageSource,
    messages = []
}) => {
    return useCallback(async (messageIndex = null) => {
        try {
            setLoading(true);

            const aiMessages = Array.isArray(messages) ? messages.filter(msg => msg.role === "ai") : [];
            const targetIndex = messageIndex !== null ? messageIndex : aiMessages.length - 1;
            const selectedMessage = aiMessages[targetIndex];
            const markdownContent = selectedMessage ? selectedMessage.content : getSelectedMarkdownContent();

            if (!markdownContent && aiMessages.length === 0) {
                alert("ไม่พบข้อมูลสำหรับส่งออก");
                return;
            }

            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const usablePageHeight = pageHeight - 40;
            let yPosition = 30;
            let hasContentOnFirstPage = false;

            // ========== PDF Header ==========
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
            yPosition += 8; // ลดจาก 15 เป็น 8 เพื่อให้เนื้อหาเขยิบขึ้น

            // ========== Markdown Content ==========
            if (markdownContent) {
                const element = markdownRef.current;
                if (element) {
                    // อัปเดตเนื้อหาใน markdownRef เพื่อให้ตรงกับ selectedMessage
                    if (selectedMessage) {
                        element.innerHTML = markdownContent; // อัปเดตเนื้อหาใน DOM
                    }

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
                    element.style.padding = "10px 40px"; // ลด padding ด้านบนจาก 40px เป็น 10px
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
                        h1.style.margin = "20px 0 15px 0"; // ลด margin ด้านบนจาก 30px เป็น 20px
                        h1.style.paddingBottom = "12px";
                        h1.style.borderBottom = "2px solid #e5e7eb";
                    });

                    const h2Elements = element.querySelectorAll('h2');
                    h2Elements.forEach(h2 => {
                        h2.style.color = "#3730a3";
                        h2.style.fontSize = "36px";
                        h2.style.fontWeight = "600";
                        h2.style.margin = "15px 0 10px 0"; // ลด margin ด้านบนจาก 25px เป็น 15px
                        h2.style.paddingLeft = "12px";
                        h2.style.borderLeft = "4px solid #3b82f6";
                    });

                    const h3Elements = element.querySelectorAll('h3');
                    h3Elements.forEach(h3 => {
                        h3.style.color = "#4338ca";
                        h3.style.fontSize = "32px";
                        h3.style.fontWeight = "600";
                        h3.style.margin = "10px 0 8px 0"; // ลด margin ด้านบนจาก 20px เป็น 10px
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
                        table.style.fontSize = "28px";
                        table.style.margin = "10px 0";
                        table.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
                        table.style.borderRadius = "8px";
                        table.style.overflow = "hidden";
                        table.style.pageBreakInside = "avoid";
                        table.style.breakInside = "avoid";

                        const headers = table.querySelectorAll('th');
                        headers.forEach(header => {
                            header.style.background = "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
                            header.style.color = "white";
                            header.style.padding = "14px 15px";
                            header.style.textAlign = "left";
                            header.style.fontSize = "30px";
                            header.style.fontWeight = "bold";
                            header.style.textTransform = "uppercase";
                            header.style.letterSpacing = "0.5px";
                        });

                        const rows = table.querySelectorAll('tr');
                        rows.forEach((row, index) => {
                            row.style.pageBreakInside = "avoid";
                            row.style.breakInside = "avoid";
                            
                            if (index % 2 === 1) {
                                row.style.backgroundColor = "#f8fafc";
                            }
                            
                            const cells = row.querySelectorAll('td');
                            cells.forEach(cell => {
                                cell.style.padding = "14px 15px";
                                cell.style.borderBottom = "1px solid #e5e7eb";
                                cell.style.fontSize = "28px";
                            });
                        });
                    });

                    await new Promise(resolve => setTimeout(resolve, 200));

                    const canvas = await html2canvas(element, {
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
                                clonedElement.style.fontSize = "24px";
                                clonedElement.style.color = "#333333";
                                clonedElement.style.backgroundColor = "#ffffff";
                                clonedElement.style.width = "1200px";
                                clonedElement.style.overflow = "visible";
                                clonedElement.style.padding = "10px 40px"; // สอดคล้องกับ element

                                // Style tables in cloned document
                                const clonedTables = clonedElement.querySelectorAll('table');
                                clonedTables.forEach(table => {
                                    table.style.width = "100%";
                                    table.style.tableLayout = "auto";
                                    table.style.borderCollapse = "collapse";
                                    table.style.fontSize = "24px";
                                    table.style.margin = "10px 0";
                                    table.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
                                    table.style.borderRadius = "8px";
                                    table.style.overflow = "hidden";

                                    const clonedHeaders = table.querySelectorAll('th');
                                    clonedHeaders.forEach(header => {
                                        header.style.background = "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
                                        header.style.color = "white";
                                        header.style.padding = "14px 15px";
                                        header.style.textAlign = "left";
                                        header.style.fontSize = "26px";
                                        header.style.fontWeight = "bold";
                                        header.style.textTransform = "uppercase";
                                        header.style.letterSpacing = "0.5px";
                                    });

                                    const clonedRows = table.querySelectorAll('tr');
                                    clonedRows.forEach((row, index) => {
                                        if (index % 2 === 1) {
                                            row.style.backgroundColor = "#f8fafc";
                                        }

                                        const clonedCells = row.querySelectorAll('td');
                                        clonedCells.forEach(cell => {
                                            cell.style.padding = "12px 15px";
                                            cell.style.border = "1px solid #ddd";
                                            cell.style.fontSize = "24px";
                                            cell.style.lineHeight = "1.5";
                                            cell.style.verticalAlign = "top";
                                        });
                                    });
                                });

                                // Style headings in cloned document
                                const clonedH1 = clonedElement.querySelectorAll('h1');
                                clonedH1.forEach(h1 => {
                                    h1.style.color = "#1e40af";
                                    h1.style.fontSize = "42px";
                                    h1.style.fontWeight = "700";
                                    h1.style.margin = "20px 0 15px 0";
                                    h1.style.paddingBottom = "12px";
                                    h1.style.borderBottom = "2px solid #e5e7eb";
                                });

                                const clonedH2 = clonedElement.querySelectorAll('h2');
                                clonedH2.forEach(h2 => {
                                    h2.style.color = "#3730a3";
                                    h2.style.fontSize = "36px";
                                    h2.style.fontWeight = "600";
                                    h2.style.margin = "15px 0 10px 0";
                                    h2.style.paddingLeft = "12px";
                                    h2.style.borderLeft = "4px solid #3b82f6";
                                });

                                const clonedH3 = clonedElement.querySelectorAll('h3');
                                clonedH3.forEach(h3 => {
                                    h3.style.color = "#4338ca";
                                    h3.style.fontSize = "32px";
                                    h3.style.fontWeight = "600";
                                    h3.style.margin = "10px 0 8px 0";
                                });

                                const clonedUnwanted = clonedElement.querySelectorAll(
                                    'button, [type="button"], .btn, .export-btn, .download-btn, [style*="border-color: rgb(59, 130, 246)"], [style*="background-color: rgb(59, 130, 246)"]'
                                );
                                clonedUnwanted.forEach(el => {
                                    el.style.display = 'none';
                                    el.style.visibility = 'hidden';
                                });
                            }
                        }
                    });

                    Object.keys(originalStyles).forEach(key => {
                        element.style[key] = originalStyles[key] || '';
                    });

                    const imgData = canvas.toDataURL("image/png", 0.95);
                    const imgWidth = pageWidth - 40;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    const remainingSpaceInPage = pageHeight - yPosition - 20;

                    if (imgHeight > remainingSpaceInPage) {
                        if (imgHeight <= usablePageHeight && remainingSpaceInPage < usablePageHeight * 0.4) {
                            doc.addPage();
                            yPosition = 30;
                            doc.addImage(imgData, "PNG", 20, yPosition, imgWidth, imgHeight);
                            yPosition += imgHeight + 20;
                            hasContentOnFirstPage = true;
                        } else if (imgHeight > usablePageHeight) {
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
                                hasContentOnFirstPage = true;

                                if (sourceY < sourceHeight) {
                                    doc.addPage();
                                    currentY = 30;
                                    isFirstPart = false;
                                }
                            }

                            yPosition = currentY + 20;
                        } else {
                            doc.addImage(imgData, "PNG", 20, yPosition, imgWidth, Math.min(imgHeight, remainingSpaceInPage - 10));
                            hasContentOnFirstPage = true;

                            if (imgHeight > remainingSpaceInPage - 10) {
                                doc.addPage();
                                yPosition = 30;
                            } else {
                                yPosition += imgHeight + 20;
                            }
                        }
                    } else {
                        doc.addImage(imgData, "PNG", 20, yPosition, imgWidth, imgHeight);
                        yPosition += imgHeight + 20;
                        hasContentOnFirstPage = true;
                    }

                    if (yPosition > pageHeight - 40) {
                        doc.addPage();
                        yPosition = 30;
                    }
                }
            }

            // ========== Check for Empty First Page ==========
            if (!hasContentOnFirstPage) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);
                doc.setTextColor(100, 100, 100);
                doc.text("No content available for this report.", pageWidth / 2, yPosition + 20, { align: 'center' });
            }

            // ========== Footer with Page Numbers ==========
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
            }

            // ========== Save PDF ==========
            const messageNumber = (messageIndex !== null ? messageIndex : Math.max(0, aiMessages.length - 1)) + 1;
            const fileName = `Report-Message-${messageNumber}-${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(fileName);

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    }, [messages, markdownRef, getSelectedMarkdownContent, setLoading]);
};