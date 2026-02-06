const PDFDocument = require('pdfkit');

/**
 * Generate booking invoice PDF using PDFKit
 * Simple, reliable, works on Netlify
 */
const generateBookingInvoicePDF = async (bookingDetails) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const pickupDate = new Date(bookingDetails.pickupDate);
      const dropOffDate = new Date(bookingDetails.returnDate || bookingDetails.dropOffDate);
      const bookingDate = new Date(bookingDetails.createdAt);
      
      const isPerkm = bookingDetails.pricingType === 'per_km';
      const formatCurrency = (amount) => `Rs.${(amount || 0).toLocaleString('en-IN')}`;
      
      const diffTime = Math.abs(dropOffDate - pickupDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      
      // Header
      doc.fontSize(24).fillColor('#059669').text('RentX', { align: 'center' });
      doc.fontSize(16).fillColor('#6b7280').text('Booking Receipt', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).fillColor('#000').text(`Generated: ${bookingDate.toLocaleDateString('en-IN')} ${bookingDate.toLocaleTimeString('en-IN')}`, { align: 'center' });
      doc.moveDown(2);
      
      // Booking Information
      doc.fontSize(14).fillColor('#059669').text('Booking Information');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');
      doc.text(`Booking ID: ${bookingDetails.bookingId || bookingDetails._id}`);
      if (bookingDetails.invoiceNumber) {
        doc.text(`Invoice Number: ${bookingDetails.invoiceNumber}`);
      }
      doc.text(`Travel Type: ${isPerkm ? 'INTERSTATE' : 'DAILY'}`);
      doc.text(`Status: ${(bookingDetails.status || 'booked').toUpperCase()}`);
      doc.moveDown();
      
      // Customer Details
      doc.fontSize(14).fillColor('#059669').text('Customer Details');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');
      doc.text(`Name: ${bookingDetails.userName || 'N/A'}`);
      doc.text(`Email: ${bookingDetails.userEmail || 'N/A'}`);
      doc.text(`Phone: ${bookingDetails.userPhone || 'N/A'}`);
      doc.moveDown();
      
      // Vehicle Details
      doc.fontSize(14).fillColor('#059669').text('Vehicle Details');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');
      doc.text(`Vehicle: ${bookingDetails.carBrand || ''} ${bookingDetails.carModel || bookingDetails.carName || 'N/A'}`);
      doc.text(`Registration: ${bookingDetails.carRegistration || 'N/A'}`);
      doc.text(`Type: ${bookingDetails.carType || 'N/A'}`);
      doc.moveDown();
      
      // Trip Details
      doc.fontSize(14).fillColor('#059669').text('Trip Details');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');
      doc.text(`Pickup: ${bookingDetails.pickupLocation || 'N/A'}, ${bookingDetails.pickupCity || 'N/A'}`);
      doc.text(`Pickup Date: ${pickupDate.toLocaleDateString('en-IN')} ${pickupDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
      doc.text(`Drop-off: ${bookingDetails.dropLocation || 'N/A'}, ${bookingDetails.dropCity || 'N/A'}`);
      doc.text(`Drop-off Date: ${dropOffDate.toLocaleDateString('en-IN')} ${dropOffDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
      doc.text(`Duration: ${diffDays} day(s)`);
      if (bookingDetails.distance) {
        doc.text(`Distance: ${bookingDetails.distance} km`);
      }
      doc.moveDown();
      
      // Payment Details
      doc.fontSize(14).fillColor('#059669').text('Payment Details');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');
      if (isPerkm) {
        doc.text(`Base Price: ${formatCurrency(bookingDetails.basePrice || (bookingDetails.totalAmount - (bookingDetails.interstateAllowance || 0)))}`);
        doc.text(`Interstate Allowance: ${formatCurrency(bookingDetails.interstateAllowance || 400)}`);
      } else {
        doc.text(`Base Price: ${formatCurrency(bookingDetails.pricePerDay)}`);
      }
      doc.text(`Payment Method: Online Payment`);
      const paymentStatus = bookingDetails.paymentStatus === 'paid' || bookingDetails.paymentStatus === 'completed' ? 'Paid' : 'Pay at Drop-Off';
      doc.text(`Payment Status: ${paymentStatus}`);
      doc.moveDown();
      
      // Total Amount
      doc.fontSize(18).fillColor('#059669').text(`Total Amount: ${formatCurrency(bookingDetails.totalAmount || bookingDetails.totalPrice || bookingDetails.price)}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).fillColor('#6b7280').text('Payment completed', { align: 'center' });
      doc.moveDown(2);
      
      // Footer
      doc.fontSize(10).fillColor('#000').text('Important: Please carry valid driving license and government ID proof at pickup.', { align: 'center' });
      doc.fontSize(9).fillColor('#9ca3af').text('For support: rentxcars.spprt@gmail.com | Thank you for choosing RentX!', { align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateBookingInvoicePDF };
