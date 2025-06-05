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
}) => {
    const handleMarkdownToPDF = useCallback(async () => {
        console.log('markdownRef.current:', markdownRef.current);

        const markdownContent = getSelectedMarkdownContent();
        if (!markdownContent) {
            alert("No AI response to convert to PDF!");
            return;
        }

        setLoading(true);
        const originalScrollPosition = messagesContainerRef.current?.scrollTop;

        try {
            const element = markdownRef.current;
            if (!element) {
                throw new Error("Markdown preview element not found");
            }

            // Save original styles
            const originalStyles = {
                visibility: element.style.visibility,
                position: element.style.position,
                top: element.style.top,
                left: element.style.left,
                zIndex: element.style.zIndex,
                width: element.style.width,
                height: element.style.height,
                overflow: element.style.overflow,
                backgroundColor: element.style.backgroundColor,
                fontFamily: element.style.fontFamily,
                fontSize: element.style.fontSize,
                lineHeight: element.style.lineHeight,
                padding: element.style.padding,
                margin: element.style.margin
            };

            // Prepare element for capture - make it visible but off-screen
            element.style.visibility = "visible"; // เปลี่ยนจาก hidden เป็น visible
            element.style.position = "absolute";
            element.style.top = "-9999px";
            element.style.left = "0";
            element.style.zIndex = "1000"; // เปลี่ยนเป็นค่าบวก
            element.style.width = "1200px"; // ใช้ pixel แทน mm
            element.style.minWidth = "1200px";
            element.style.maxWidth = "none";
            element.style.height = "auto";
            element.style.minHeight = "auto";
            element.style.overflow = "visible"; // เปลี่ยนเป็น visible
            element.style.backgroundColor = "#ffffff";
            element.style.fontFamily = "Arial, sans-serif";
            element.style.fontSize = "14px";
            element.style.lineHeight = "1.5";
            element.style.padding = "20px";
            element.style.margin = "0";
            element.style.color = "#333333";

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

            const hiddenElements = [];
            unwantedSelectors.forEach(selector => {
                try {
                    const elements = element.querySelectorAll(selector);
                    elements.forEach(el => {
                        hiddenElements.push({
                            element: el,
                            originalDisplay: el.style.display
                        });
                        el.style.display = 'none';
                    });
                } catch (e) {
                    console.warn('Selector error:', selector, e);
                }
            });

            // Style tables for better PDF rendering
            const tables = element.querySelectorAll('table');
            const originalTableStyles = [];
            tables.forEach((table, index) => {
                // Save original styles
                originalTableStyles[index] = {
                    width: table.style.width,
                    tableLayout: table.style.tableLayout,
                    borderCollapse: table.style.borderCollapse,
                    fontSize: table.style.fontSize,
                    margin: table.style.margin
                };

                // Apply PDF-friendly styles
                table.style.width = "100%";
                table.style.tableLayout = "auto";
                table.style.borderCollapse = "collapse";
                table.style.fontSize = "12px";
                table.style.margin = "10px 0";

                // Style cells
                const cells = table.querySelectorAll('td, th');
                cells.forEach(cell => {
                    cell.style.padding = "8px";
                    cell.style.border = "1px solid #ddd";
                    cell.style.fontSize = "12px";
                    cell.style.lineHeight = "1.3";
                });

                // Style headers
                const headers = table.querySelectorAll('th');
                headers.forEach(header => {
                    header.style.backgroundColor = "#4F90F7";
                    header.style.color = "white";
                    header.style.fontWeight = "bold";
                });
            });

            // Wait for styles to apply
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capture with html2canvas
            const canvas = await html2canvas(element, {
                scale: 2.5, // เพิ่ม scale สำหรับความคมชัด
                logging: false,
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                width: 1200, // ใช้ค่าที่ตั้งไว้
                height: element.scrollHeight,
                windowWidth: 1200,
                windowHeight: element.scrollHeight,
                scrollX: 0,
                scrollY: 0,
                ignoreElements: (element) => {
                    // Skip unwanted elements during capture
                    const tagName = element.tagName?.toLowerCase();
                    const className = element.className?.toString() || '';
                    const text = element.textContent || '';

                    return (
                        tagName === 'button' ||
                        className.includes('btn') ||
                        className.includes('export') ||
                        text.includes('Export') ||
                        text.includes('Download')
                    );
                },
                onclone: (clonedDoc) => {
                    // Additional cleanup in cloned document
                    const clonedElement = clonedDoc.body;
                    if (clonedElement) {
                        clonedElement.style.fontFamily = "Arial, sans-serif";
                        clonedElement.style.fontSize = "14px";
                        clonedElement.style.backgroundColor = "#ffffff";
                        clonedElement.style.color = "#333333";

                        // Remove unwanted elements from clone
                        const unwantedInClone = clonedElement.querySelectorAll(
                            'button, [type="button"], .btn, .export-btn'
                        );
                        unwantedInClone.forEach(el => el.remove());
                    }
                }
            });

            // Restore original styles
            Object.assign(element.style, originalStyles);

            // Restore hidden elements
            hiddenElements.forEach(({ element, originalDisplay }) => {
                element.style.display = originalDisplay || '';
            });

            // Restore table styles
            tables.forEach((table, index) => {
                if (originalTableStyles[index]) {
                    Object.assign(table.style, originalTableStyles[index]);
                }
            });

            // Create PDF
            const messageSource = getSelectedMessageSource();
            const title = messageSource === "Tool - Report"
                ? "Check-In Report"
                : messageSource === "Tool - Sick Report"
                    ? "Sick Leave Report"
                    : "Chat Response";

            if (canvas.width === 0 || canvas.height === 0) {
                throw new Error("Canvas is empty - no content captured");
            }

            const imgData = canvas.toDataURL("image/png", 0.95);
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Add header
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(34, 139, 34);
            doc.text(title, pageWidth / 2, 20, { align: 'center' });

            // Add date
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const currentDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            doc.text(`Generated: ${currentDate}`, pageWidth / 2, 28, { align: 'center' });

            // Add separator line
            doc.setDrawColor(34, 139, 34);
            doc.setLineWidth(0.5);
            doc.line(20, 32, pageWidth - 20, 32);

            // Calculate image dimensions
            const margin = 20;
            const availableWidth = pageWidth - (2 * margin);
            const availableHeight = pageHeight - 50; // เหลือพื้นที่สำหรับ header
            const imgAspectRatio = canvas.width / canvas.height;

            let imgWidth = availableWidth;
            let imgHeight = imgWidth / imgAspectRatio;

            // If image is too tall, adjust dimensions
            if (imgHeight > availableHeight) {
                imgHeight = availableHeight;
                imgWidth = imgHeight * imgAspectRatio;
            }

            let yPosition = 40;

            // Handle multi-page content
            if (imgHeight > availableHeight) {
                // Split image across multiple pages
                const maxHeightPerPage = availableHeight;
                let remainingHeight = imgHeight;
                let sourceY = 0;
                let currentPage = 1;

                while (remainingHeight > 0) {
                    const heightForThisPage = Math.min(remainingHeight, maxHeightPerPage);
                    const sourceHeightForThisPage = (heightForThisPage / imgHeight) * canvas.height;

                    // Create temporary canvas for this page portion
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = sourceHeightForThisPage;
                    const tempCtx = tempCanvas.getContext('2d');

                    tempCtx.drawImage(
                        canvas,
                        0, sourceY, canvas.width, sourceHeightForThisPage,
                        0, 0, canvas.width, sourceHeightForThisPage
                    );

                    const partialImgData = tempCanvas.toDataURL("image/png", 0.95);

                    if (currentPage > 1) {
                        doc.addPage();
                        yPosition = 20;
                    }

                    doc.addImage(partialImgData, "PNG", margin, yPosition, imgWidth, heightForThisPage);

                    sourceY += sourceHeightForThisPage;
                    remainingHeight -= heightForThisPage;
                    currentPage++;
                }
            } else {
                // Single page
                doc.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
            }

            // Add page numbers
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
            }

            // Set PDF properties
            doc.setProperties({
                title: title,
                subject: "Generated from Markdown",
                author: "AI Assistant",
                creator: "Markdown to PDF Converter",
            });

            // Save PDF
            const fileName = `${title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`;
            doc.save(fileName);

            console.log("PDF generated successfully");

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert(`Failed to generate PDF: ${error.message}`);
        } finally {
            setLoading(false);
            setSelectedMessageIndex(null);
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = originalScrollPosition;
            }
        }
    }, [getSelectedMarkdownContent, getSelectedMessageSource]);
    return handleMarkdownToPDF;
};