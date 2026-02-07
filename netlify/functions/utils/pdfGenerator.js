const { generateBookingInvoicePDF } = require('./pdfmakePdfGenerator.js');

// Use pdfmake with direct PDFKit document access (most reliable)
const generateBookingInvoice = async (bookingDetails) => {
  try {
    console.log('📄 Generating invoice with pdfmake...');
    return await generateBookingInvoicePDF(bookingDetails);
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    throw new Error('PDF generation failed: ' + error.message);
  }
};

module.exports = { generateBookingInvoice };
