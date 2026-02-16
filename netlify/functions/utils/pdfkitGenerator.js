const PDFDocument = require('pdfkit');

/**
 * Generate booking invoice PDF using PDFKit
 * Reliable fallback that works on both local and Netlify
 */
const generateBookingInvoicePDFKit = async (bookingDetails) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔄 Creating PDF with PDFKit...');
      
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        bufferPages: true
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log('✅ PDF created with PDFKit, size:', buffer.length, 'bytes');
        resolve(buffer);
      });
      doc.on('error', reject);
      
      // Parse dates
      const pickupDate = new Date(bookingDetails.pickupDate);
      const dropOffDate = new Date(bookingDetails.returnDate || bookingDetails.dropOffDate);
      const bookingDate = new Date(bookingDetails.createdAt);
      
      const isPerkm = bookingDetails.pricingType === 'per_km';
      const currencyLocale = 'en-IN'; // Centralized locale configuration
      const formatCurrency = (amount) => `Rs.${(amount || 0).toLocaleString(currencyLocale)}`;
      
      // Calculate duration
      const diffTime = Math.abs(dropOffDate - pickupDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      
      // Header
      doc.fontSize(28).fillColor('#059669').text('RentX', { align: 'left' });
      doc.fontSize(14).fillColor('#6b7280').text('Booking Receipt', { align: 'left' });
      doc.moveUp(2);
      doc.fontSize(10).fillColor('#000').text(bookingDate.toLocaleDateString(currencyLocale), { align: 'right' });
      doc.fontSize(9).fillColor('#6b7280').text(bookingDate.toLocaleTimeString(currencyLocale, { hour: '2-digit', minute: '2-digit' }), { align: 'right' });
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
      doc.moveDown(1);
      
      // Customer Details
      doc.fontSize(14).fillColor('#059669').text('Customer Details');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');
      doc.text(`Name: ${bookingDetails.userName || 'N/A'}`);
      doc.text(`Email: ${bookingDetails.userEmail || 'N/A'}`);
      doc.text(`Phone: ${bookingDetails.userPhone || 'N/A'}`);
      doc.moveDown(1);
      
      // Vehicle Details
      doc.fontSize(14).fillColor('#059669').text('Vehicle Details');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');
      doc.text(`Vehicle: ${bookingDetails.carBrand || ''} ${bookingDetails.carModel || bookingDetails.carName || 'N/A'}`);
      doc.text(`Registration: ${bookingDetails.carRegistration || 'N/A'}`);
      doc.text(`Type: ${bookingDetails.carType || 'N/A'}`);
      doc.moveDown(1);
      
      // Trip Details
      doc.fontSize(14).fillColor('#059669').text('Trip Details');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');
      doc.text(`Pickup Location: ${bookingDetails.pickupLocation || 'N/A'}`);
      doc.text(`Pickup City: ${bookingDetails.pickupCity || 'N/A'}`);
      doc.text(`Pickup Date: ${pickupDate.toLocaleDateString(currencyLocale)} ${pickupDate.toLocaleTimeString(currencyLocale, { hour: '2-digit', minute: '2-digit' })}`);
      doc.text(`Drop-off Location: ${bookingDetails.dropLocation || 'N/A'}`);
      doc.text(`Drop-off City: ${bookingDetails.dropCity || 'N/A'}`);
      doc.text(`Drop-off Date: ${dropOffDate.toLocaleDateString(currencyLocale)} ${dropOffDate.toLocaleTimeString(currencyLocale, { hour: '2-digit', minute: '2-digit' })}`);
      doc.text(`Duration: ${diffDays} day(s)`);
      if (bookingDetails.distance) {
        doc.text(`Distance: ${bookingDetails.distance} km`);
      }
      doc.moveDown(1);
      
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
      doc.moveDown(1);
      
      // Total Amount (highlighted)
      doc.rect(50, doc.y, 495, 40).fillAndStroke('#f0fdf4', '#059669');
      doc.fontSize(16).fillColor('#059669').text('Total Amount:', 60, doc.y + 10);
      doc.fontSize(18).fillColor('#059669').text(formatCurrency(bookingDetails.totalAmount || bookingDetails.totalPrice || bookingDetails.price), { align: 'right' });
      doc.moveDown(3);
      
      // Payment completed note
      doc.fontSize(10).fillColor('#6b7280').text('Payment completed', { align: 'center', italics: true });
      doc.moveDown(2);
      
      // Footer
      doc.fontSize(10).fillColor('#374151').text('Important: Please carry valid driving license and government ID proof at pickup.', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#9ca3af').text('For support: rentxcars.spprt@gmail.com | Thank you for choosing RentX!', { align: 'center' });
      
      doc.end();
      
    } catch (error) {
      console.error('❌ PDFKit generation error:', error);
      reject(error);
    }
  });
};

module.exports = { generateBookingInvoicePDFKit };
