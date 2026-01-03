const chromium = require('chrome-aws-lambda');
const mongoose = require('mongoose');

// MongoDB connection for serverless
let cachedDb = null;

const connectToDatabase = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    cachedDb = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Generate PDF HTML template
const generatePDFHTML = (booking) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>RentX Booking Receipt</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .header {
          background: #667eea;
          color: white;
          padding: 20px;
          text-align: center;
          margin-bottom: 30px;
        }
        .booking-details {
          margin-bottom: 30px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
        }
        .total {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚗 RentX</h1>
        <h2>Booking Receipt</h2>
        <p>Invoice #${booking.invoiceNumber || 'N/A'}</p>
      </div>
      
      <div class="booking-details">
        <div class="detail-row">
          <span><strong>Booking ID:</strong></span>
          <span>${booking.bookingId || booking._id}</span>
        </div>
        <div class="detail-row">
          <span><strong>Car:</strong></span>
          <span>${booking.car?.brand} ${booking.car?.name}</span>
        </div>
        <div class="detail-row">
          <span><strong>Customer:</strong></span>
          <span>${booking.user?.name}</span>
        </div>
        <div class="detail-row">
          <span><strong>Email:</strong></span>
          <span>${booking.user?.email}</span>
        </div>
        <div class="detail-row">
          <span><strong>Start Date:</strong></span>
          <span>${new Date(booking.startDate).toLocaleDateString()}</span>
        </div>
        <div class="detail-row">
          <span><strong>End Date:</strong></span>
          <span>${new Date(booking.endDate).toLocaleDateString()}</span>
        </div>
        <div class="detail-row">
          <span><strong>Payment Method:</strong></span>
          <span>${booking.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Online Payment'}</span>
        </div>
        <div class="detail-row">
          <span><strong>Payment Status:</strong></span>
          <span>${booking.paymentStatus}</span>
        </div>
      </div>
      
      <div class="total">
        Total Amount: ₹${(booking.totalAmount || 0).toLocaleString()}
      </div>
      
      <div class="footer">
        <p>Thank you for choosing RentX!</p>
        <p>South India's Premier Car Rental Service</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Connect to database
    await connectToDatabase();

    // Get booking ID from path
    const bookingId = event.path.split('/').pop();
    
    if (!bookingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Booking ID required' }),
      };
    }

    // Import Booking model
    const Booking = require('../../models/Booking');
    
    // Find booking
    const booking = await Booking.findById(bookingId)
      .populate('user', 'name email')
      .populate('car', 'name brand model');

    if (!booking) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Booking not found' }),
      };
    }

    // Launch Puppeteer with chrome-aws-lambda
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Generate HTML content
    const htmlContent = generatePDFHTML(booking);
    
    // Set content and generate PDF
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    // Return PDF as base64
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${booking.invoiceNumber || bookingId}.pdf"`,
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'PDF generation failed',
        error: error.message 
      }),
    };
  }
};