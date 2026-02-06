const { generateBookingInvoicePDF } = require('./pdfkitGenerator.js');

// Backward compatibility export
const generateBookingInvoice = async (bookingDetails) => {
  return await generateBookingInvoicePDF(bookingDetails);
};

module.exports = { generateBookingInvoice };
