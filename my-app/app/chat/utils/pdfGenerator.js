import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async (markdownRef, title) => {
  const element = markdownRef.current;
  if (!element) {
    throw new Error('Markdown preview element not found');
  }

  element.style.visibility = 'visible';
  element.style.position = 'fixed';
  element.style.top = '0';
  element.style.left = '0';
  element.style.zIndex = '-1000';

  const canvas = await html2canvas(element, {
    scale: 3,
    logging: false,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  element.style.visibility = 'hidden';
  element.style.position = 'absolute';

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setProperties({
    title,
    subject: 'Generated from Markdown',
    author: 'AI Assistant',
    creator: 'Markdown to PDF Converter',
  });

  let heightLeft = imgHeight;
  let position = 0;

  doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    doc.addPage();
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  doc.save(`${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`);
};