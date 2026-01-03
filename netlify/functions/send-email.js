const nodemailer = require('nodemailer');
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
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    cachedDb = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Generate OTP email HTML
const generateOTPEmailHTML = (otp, userName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>RentX - Email Verification</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
          background: #2e7d32;
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 30px;
        }
        .otp-box {
          background: #f8f9fa;
          border: 2px dashed #2e7d32;
          border-radius: 10px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          color: #2e7d32;
          letter-spacing: 5px;
        }
        .footer {
          background: #34495e;
          color: white;
          padding: 20px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚗 RentX</h1>
          <p>Email Verification Required</p>
        </div>
        
        <div class="content">
          <h2>Hello ${userName}!</h2>
          
          <p>Welcome to RentX! To complete your registration, please verify your email address using the OTP code below:</p>
          
          <div class="otp-box">
            <p>Your verification code is:</p>
            <div class="otp-code">${otp}</div>
            <p><small>This code expires in 10 minutes</small></p>
          </div>
          
          <p><strong>Security Note:</strong> Never share this code with anyone. RentX will never ask for your OTP via phone or other channels.</p>
          
          <p>If you didn't create an account with RentX, please ignore this email.</p>
        </div>
        
        <div class="footer">
          <p>🚗 RentX - South India's Premier Car Rental Service 🚗</p>
          <p>📧 support@rentx.com | 🌐 www.rentx.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate booking confirmation email HTML
const generateBookingEmailHTML = (booking) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>RentX - Booking Confirmed</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
          background: #2e7d32;
          color: white;
          padding: 30px;
          text-align: center;
        }
        .content {
          padding: 30px;
        }
        .booking-info {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
        }
        .footer {
          background: #34495e;
          color: white;
          padding: 20px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Booking Confirmed!</h1>
          <p>RentX</p>
        </div>
        
        <div class="content">
          <h2>Dear ${booking.user?.name || 'Customer'},</h2>
          
          <p>Great news! Your car rental booking has been confirmed.</p>
          
          <div class="booking-info">
            <h3>📋 Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId || booking._id}</p>
            <p><strong>Vehicle:</strong> ${booking.car?.brand} ${booking.car?.name}</p>
            <p><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
            <p><strong>Payment Method:</strong> ${booking.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Online Payment'}</p>
          </div>
          
          <p>Your detailed invoice is attached to this email.</p>
        </div>
        
        <div class="footer">
          <p>🚗 RentX - South India's Premier Car Rental Service 🚗</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    const { type, to, subject, data } = JSON.parse(event.body);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email credentials not configured');
    }

    const transporter = createTransporter();
    let htmlContent = '';
    let attachments = [];

    switch (type) {
      case 'otp':
        htmlContent = generateOTPEmailHTML(data.otp, data.userName);
        break;
      
      case 'booking':
        await connectToDatabase();
        const Booking = require('../../models/Booking');
        const booking = await Booking.findById(data.bookingId)
          .populate('user', 'name email')
          .populate('car', 'name brand model');
        
        if (!booking) {
          throw new Error('Booking not found');
        }
        
        htmlContent = generateBookingEmailHTML(booking);
        
        // Generate PDF attachment if requested
        if (data.includePDF) {
          // This would call the PDF generation function
          // For now, we'll skip the PDF attachment
        }
        break;
      
      default:
        throw new Error('Invalid email type');
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: htmlContent,
      attachments: attachments
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Email sent successfully',
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Email sending error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Email sending failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};