const PDFDocument = require('pdfkit');

/**
 * Simple HTML to PDF converter using PDFKit
 * Works on both local and Netlify environments
 */
const generatePdfFromHtml = async (htmlContent) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 40
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Extract text content from HTML (basic parsing)
      let textContent = htmlContent
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n$1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n$1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n$1\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/td>/gi, ' | ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/₹/g, 'Rs.')
        .replace(/\n\s*\n\s*\n/g, '\n\n');
      
      const lines = textContent.split('\n');
      
      lines.forEach((line, index) => {
        line = line.trim();
        if (!line) return;
        
        if (line.length < 50 && (index === 0 || lines[index-1].trim() === '')) {
          doc.fontSize(14).fillColor('#059669').text(line, { continued: false });
          doc.moveDown(0.5);
        } else if (line.includes('|')) {
          doc.fontSize(9).fillColor('#000').text(line, { continued: false });
        } else {
          doc.fontSize(10).fillColor('#000').text(line, { continued: false });
        }
      });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePdfFromHtml };
