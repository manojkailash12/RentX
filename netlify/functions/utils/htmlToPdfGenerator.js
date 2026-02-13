const PDFDocument = require('pdfkit');

/**
 * Simple HTML to PDF converter using PDFKit
 * Works on both local and Netlify environments
 * Fixed to avoid font file loading issues
 */
const generatePdfFromHtml = async (htmlContent) => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF without specifying fonts to avoid file system issues
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 40,
        autoFirstPage: true
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
        .replace(/🚗/g, '')
        .replace(/\n\s*\n\s*\n/g, '\n\n');
      
      const lines = textContent.split('\n');
      
      // Don't call font() method to avoid font file loading
      lines.forEach((line, index) => {
        line = line.trim();
        if (!line) return;
        
        try {
          if (line.length < 50 && (index === 0 || lines[index-1].trim() === '')) {
            doc.fontSize(14).fillColor('#f97316').text(line, { continued: false });
            doc.moveDown(0.5);
          } else if (line.includes('|')) {
            doc.fontSize(9).fillColor('#000').text(line, { continued: false });
          } else {
            doc.fontSize(10).fillColor('#000').text(line, { continued: false });
          }
        } catch (err) {
          // Skip lines that cause errors
          console.warn('Skipping line due to error:', err.message);
        }
      });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePdfFromHtml };
