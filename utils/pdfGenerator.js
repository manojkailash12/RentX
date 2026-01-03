const pdf = require('html-pdf');
const nodemailer = require('nodemailer');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

// Suppress the deprecation warning by overriding util._extend if it exists
if (require('util')._extend) {
  require('util')._extend = Object.assign;
}

// Generate booking ID in BID001 format
const generateBookingId = (booking) => {
  // If booking already has a bookingId, return it
  if (booking.bookingId) return booking.bookingId;
  
  // For existing bookings without bookingId, generate one based on creation order
  // This is a fallback - new bookings should have bookingId set in the model
  return 'BID001'; // Default fallback
};

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Load logo as base64 (optional - fallback to text if not found)
let logoBase64 = '';
try {
  const logoPath = path.join(__dirname, '../assets/driveo-logo.png');
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = logoBuffer.toString('base64');
  }
} catch (error) {
  console.warn('Logo not found, using text only');
}

// Generate invoice HTML template matching the screenshot layout
const generateInvoiceHTML = (booking) => {
  const startDate = moment(booking.startDate).format('DD/MM/YYYY');
  const endDate = moment(booking.endDate).format('DD/MM/YYYY');
  const bookingDate = moment(booking.createdAt).format('DD/MM/YYYY HH:mm');
  const pickupDate = moment(booking.pickupDate || booking.startDate);
  const dropOffDate = moment(booking.dropOffDate || booking.endDate);
  
  // Determine travel type
  const isInterstate = booking.travelType === 'interstate' || booking.isInterstate;
  
  // Calculate distance
  const exactDistance = booking.estimatedDistance || booking.totalDistance || (isInterstate ? 450 : 120);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Booking Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 12px; 
          line-height: 1.4; 
          color: #333;
          padding: 20px;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .receipt-container {
          border: 3px solid #667eea;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header { 
          text-align: center; 
          margin-bottom: 20px; 
          background: #667eea !important;
          color: white !important;
          padding: 30px 20px;
          border-radius: 15px 15px 0 0;
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .logo { 
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 5px;
        }
        .logo img {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }
        .logo-text {
          font-size: 32px; 
          font-weight: bold; 
          color: white;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          margin-bottom: 10px;
        }
        .receipt-title { 
          font-size: 24px; 
          font-weight: bold; 
          margin-bottom: 10px;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        .header-date {
          color: rgba(255,255,255,0.9);
          font-size: 14px;
        }
        .section { 
          margin-bottom: 15px; 
          padding: 15px;
          border: 1px solid #e0e6ff;
          border-radius: 8px;
          background: #fafbff;
          margin: 15px 20px;
        }
        .section-title { 
          font-weight: bold; 
          font-size: 14px; 
          margin-bottom: 12px;
          color: #667eea;
          border-bottom: 2px solid #667eea;
          padding-bottom: 5px;
        }
        .row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 5px;
        }
        .label { 
          font-weight: bold; 
        }
        .value { 
          text-align: right; 
        }
        .total { 
          background: #667eea !important;
          color: white !important;
          padding: 15px; 
          border-radius: 8px;
          margin: 15px 20px;
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .total-amount { 
          font-size: 18px; 
          font-weight: bold; 
          color: white;
        }
        .interstate-badge {
          background-color: #ff5722;
          color: white;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: bold;
        }
        .local-badge {
          background-color: #4caf50;
          color: white;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: bold;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 2px solid #667eea;
          padding: 15px 20px;
          background: #f8f9ff;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <div class="logo">
            ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="RentX Logo" />` : ''}
            <div class="logo-text">RentX</div>
          </div>
          <div class="ader-date">Generated: ${bookingDate}</div>
      </div>

      <div class="section">
        <div class="section-title">Booking Information</div>
        <div class="row">
          <span class="label">Booking ID:</span>
          <span class="value">${booking.bookingId || generateBookingId(booking)}</span>
        </div>
        <div class="row">
          <span class="label">Invoice Number:</span>
          <span class="value">${booking.invoiceNumber || 'INV-' + booking._id.toString().slice(-8).toUpperCase()}</span>
        </div>
        <div class="row">
          <span class="label">Status:</span>
          <span class="value">${booking.status || booking.bookingStatus || 'Confirmed'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Customer Details</div>
        <div class="row">
          <span class="label">Name:</span>
          <span class="value">${booking.user?.name || booking.user?.username || 'N/A'}</span>
        </div>
        <div class="row">
          <span class="label">Email:</span>
          <span class="value">${booking.user?.email || 'N/A'}</span>
        </div>
        <div class="row">
          <span class="label">Phone:</span>
          <span class="value">${booking.user?.phone || booking.user?.phoneNumber || 'N/A'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Vehicle Details</div>
        <div class="row">
          <span class="label">Vehicle:</span>
          <span class="value">${booking.car?.company || booking.car?.brand} ${booking.car?.name || booking.car?.model}</span>
        </div>
        <div class="row">
          <span class="label">Registration:</span>
          <span class="value">${booking.car?.registeration_number || booking.car?.registrationNumber || 'N/A'}</span>
        </div>
        <div class="row">
          <span class="label">Type:</span>
          <span class="value">${booking.car?.car_type || booking.car?.type || 'sedan'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Trip Details</div>
        <div class="row">
          <span class="label">Pickup Location:</span>
          <span class="value">${booking.pickUpLocation || booking.pickupLocation?.address || 'N/A'}</span>
        </div>
        ${booking.pickUpCity ? `
        <div class="row">
          <span class="label">Pickup City:</span>
          <span class="value">${booking.pickUpCity}, ${booking.pickUpState || ''}</span>
        </div>` : ''}
        <div class="row">
          <span class="label">Pickup Date & Time:</span>
          <span class="value">${pickupDate.format('DD/MM/YYYY HH:mm')}</span>
        </div>
        <div class="row">
          <span class="label">Drop-off Location:</span>
          <span class="value">${booking.dropOffLocation || booking.dropoffLocation?.address || 'N/A'}</span>
        </div>
        ${booking.dropOffCity ? `
        <div class="row">
          <span class="label">Drop-off City:</span>
          <span class="value">${booking.dropOffCity}, ${booking.dropOffState || ''}</span>
        </div>` : ''}
        <div class="row">
          <span class="label">Drop-off Date & Time:</span>
          <span class="value">${dropOffDate.format('DD/MM/YYYY HH:mm')}</span>
        </div>
        <div class="row">
          <span class="label">Duration:</span>
          <span class="value">${booking.totalDays || 1} day(s)</span>
        </div>
        ${(booking.totalDistance && booking.totalDistance > 0) || (booking.estimatedDistance && booking.estimatedDistance > 0) ? `
        <div class="row">
          <span class="label">Distance:</span>
          <span class="value" style="font-weight: bold; color: #2e7d32;">${booking.totalDistance || booking.estimatedDistance} km</span>
        </div>` : `
        <div class="row">
          <span class="label">Distance:</span>
          <span class="value">To be calculated at pickup</span>
        </div>`}
      </div>

      <div class="section">
        <div class="section-title">Payment Details</div>
        <div class="row">
          <span class="label">Base Price:</span>
          <span class="value">₹${booking.basePrice || booking.totalAmount || 0}</span>
        </div>
        ${booking.driverAllowance > 0 ? `
        <div class="row">
          <span class="label">Interstate Allowance:</span>
          <span class="value">₹${booking.driverAllowance}</span>
        </div>` : ''}
        <div class="row">
          <span class="label">Payment Method:</span>
          <span class="value">${booking.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Online Payment'}</span>
        </div>
        <div class="row">
          <span class="label">Payment Status:</span>
          <span class="value" style="color: ${(booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid') ? '#28a745' : '#ffc107'}; font-weight: bold;">
            ${(booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid') ? 'Paid' : 'Pending'}
          </span>
        </div>
        <div class="total">
          <div class="row">
            <span class="label total-amount">Total Amount:</span>
            <span class="value total-amount">₹${booking.totalPrice || booking.totalAmount}</span>
          </div>
          <div style="margin-top: 5px; font-size: 12px; color: white !important; font-weight: bold !important;">
            ${(booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid') ? 'Payment completed' : (booking.paymentMethod === 'cash' ? 'To be paid at pickup' : 'Payment pending')}
          </div>
        </div>
      </div>

      ${booking.specialRequests ? `
      <div class="section">
        <div class="section-title">Special Requests</div>
        <div>${booking.specialRequests}</div>
      </div>` : ''}

      <div class="footer">
        <p><strong>Important:</strong> Please carry valid driving license and government ID proof</p>
        <p>For support: support@rentx.com | Thank you for choosing RentX!</p>
        <p>This is a computer-generated receipt and does not require a signature.</p>
      </div>
    </body>
    </html>
  `;
};

// Generate PDF from HTML
const generateInvoicePDF = (booking, returnBuffer = false) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Generating PDF for booking:', booking._id);
      const html = generateInvoiceHTML(booking);
      
      const options = {
        format: 'A4',
        border: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        header: {
          height: '0mm'
        },
        footer: {
          height: '0mm'
        },
        renderDelay: 1000,
        quality: '100',
        type: 'pdf',
        orientation: 'portrait',
        phantomArgs: ['--load-images=yes', '--local-to-remote-url-access=yes'],
        childProcessOptions: {
          env: {
            OPENSSL_CONF: '/dev/null',
          },
        }
      };

      pdf.create(html, options).toBuffer((err, buffer) => {
        if (err) {
          console.error('PDF generation error:', err);
          reject(err);
        } else {
          console.log('PDF generated successfully, buffer size:', buffer.length);
          resolve(buffer);
        }
      });
    } catch (error) {
      console.error('PDF generation setup error:', error);
      reject(error);
    }
  });
};

// Send booking confirmation email with PDF
const sendBookingEmail = async (booking) => {
  try {
    console.log('Starting email send for booking:', booking._id);
    console.log('User email:', booking.user.email);
    
    const pdfBuffer = await generateInvoicePDF(booking, true);
    console.log('PDF generated, buffer size:', pdfBuffer.length);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: booking.user.email,
      subject: `🎉 Booking Confirmed - ${booking.invoiceNumber || 'INV-' + booking._id.toString().slice(-8).toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 20px;">
          <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            <div style="background: #2e7d32; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🚗 Booking Confirmed!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">RentX</p>
            </div>
            
            <div style="padding: 30px;">
              <h2 style="color: #2c3e50;">Dear ${booking.user.name},</h2>
              
              <p style="color: #34495e; line-height: 1.6;">
                Great news! Your car rental booking has been confirmed. Get ready to explore with RentX!
              </p>
              
              <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 5px solid #2e7d32;">
                <h3 style="color: #2c3e50; margin-top: 0;">📋 Booking Summary</h3>
                <p><strong>Invoice Number:</strong> ${booking.invoiceNumber || 'INV-' + booking._id.toString().slice(-8).toUpperCase()}</p>
                <p><strong>Vehicle:</strong> ${booking.car?.company || booking.car?.brand} ${booking.car?.name || booking.car?.model}</p>
                <p><strong>Rental Period:</strong> ${moment(booking.startDate).format('DD/MM/YYYY')} to ${moment(booking.endDate).format('DD/MM/YYYY')}</p>
                <p><strong>Total Amount:</strong> ₹${booking.totalPrice || booking.totalAmount}</p>
                <p><strong>Payment Method:</strong> ${booking.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment'}</p>
              </div>
              
              <div style="background: #e8f5e8; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #27ae60; margin-top: 0;">🗺️ Your Journey</h3>
                <p><strong>From:</strong> ${booking.pickUpLocation || booking.pickupLocation?.address}</p>
                <p><strong>To:</strong> ${booking.dropOffLocation || booking.dropoffLocation?.address}</p>
                <p><strong>Distance:</strong> ${booking.estimatedDistance || booking.totalDistance || 'TBD'} km</p>
              </div>
              
              <p style="color: #34495e; line-height: 1.6;">
                Please find your detailed invoice attached to this email. Keep it handy for your records and present it during vehicle pickup.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #2e7d32; color: white; padding: 15px 30px; border-radius: 25px; display: inline-block;">
                  <strong>🎊 Happy Travels! 🎊</strong>
                </div>
              </div>
            </div>
            
            <div style="background: #34495e; color: white; padding: 20px; text-align: center;">
              <p style="margin: 5px 0;">🚗 Discover with RentX 🚗</p>
              <p style="margin: 5px 0;">📧 support@rentx.com | 🌐 www.rentx.com</p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `invoice-${booking.invoiceNumber || 'INV-' + booking._id.toString().slice(-8).toUpperCase()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Booking email sent successfully to:', booking.user.email);
  } catch (error) {
    console.error('❌ Error sending booking email:', error);
    throw error;
  }
};

module.exports = {
  generateInvoicePDF,
  sendBookingEmail
};