const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// Booking Schema
const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  pickupLocation: { type: String, required: true },
  dropoffLocation: { type: String, required: true },
  totalDays: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'online'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  bookingStatus: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  specialRequests: String,
  invoiceNumber: String
}, { timestamps: true });

// Generate booking ID
bookingSchema.pre('save', async function(next) {
  if (!this.bookingId) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingId = `BID${String(count + 1).padStart(3, '0')}`;
  }
  if (!this.invoiceNumber) {
    this.invoiceNumber = `INV-${this._id.toString().slice(-8).toUpperCase()}`;
  }
  next();
});

let Booking;
try {
  Booking = mongoose.model('Booking');
} catch {
  Booking = mongoose.model('Booking', bookingSchema);
}

// Car Schema (for reference)
const carSchema = new mongoose.Schema({
  name: String,
  brand: String,
  model: String,
  type: String,
  pricePerDay: Number,
  registrationNumber: String,
  location: String,
  state: String,
  city: String,
  status: String,
  isAvailable: Boolean,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

let Car;
try {
  Car = mongoose.model('Car');
} catch {
  Car = mongoose.model('Car', carSchema);
}

// User Schema (for reference)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  role: String,
  isVerified: Boolean
}, { timestamps: true });

let User;
try {
  User = mongoose.model('User');
} catch {
  User = mongoose.model('User', userSchema);
}

// MongoDB connection
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
    });
    
    cachedDb = connection;
    console.log('✅ MongoDB Connected');
    return connection;
  } catch (error) {
    console.error('❌ MongoDB Error:', error.message);
    throw error;
  }
};

// Email service
const sendBookingEmail = async (booking) => {
  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2e7d32; color: white; padding: 30px; text-align: center; border-radius: 10px;">
          <h1 style="margin: 0;">🎉 Booking Confirmed!</h1>
          <h2 style="margin: 10px 0 0 0;">RentX</h2>
        </div>
        <div style="padding: 30px; background: #f9f9f9; margin: 20px 0; border-radius: 10px;">
          <h2>Dear ${booking.user.name},</h2>
          <p>Your car rental booking has been confirmed!</p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>📋 Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p><strong>Invoice:</strong> ${booking.invoiceNumber}</p>
            <p><strong>Vehicle:</strong> ${booking.car.brand} ${booking.car.name}</p>
            <p><strong>Pickup:</strong> ${booking.pickupLocation}</p>
            <p><strong>Drop-off:</strong> ${booking.dropoffLocation}</p>
            <p><strong>Duration:</strong> ${booking.totalDays} day(s)</p>
            <p><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
            <p><strong>Payment:</strong> ${booking.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Online Payment'}</p>
          </div>
          
          <p>Thank you for choosing RentX!</p>
        </div>
        <div style="text-align: center; color: #666; font-size: 12px;">
          <p>© 2024 RentX - South India Car Rentals</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: booking.user.email,
      subject: `🎉 Booking Confirmed - ${booking.bookingId}`,
      html: emailHTML
    });

    console.log('✅ Booking email sent to:', booking.user.email);
  } catch (error) {
    console.error('❌ Email error:', error.message);
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await connectDB();

    const path = event.path.replace('/.netlify/functions/bookings', '');
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    // CREATE BOOKING
    if (path === '' && method === 'POST') {
      const {
        userId,
        carId,
        startDate,
        endDate,
        pickupLocation,
        dropoffLocation,
        totalDays,
        totalAmount,
        paymentMethod,
        specialRequests
      } = body;

      // Validation
      if (!userId || !carId || !startDate || !endDate || !pickupLocation || !dropoffLocation || !totalAmount || !paymentMethod) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'All required fields must be provided' })
        };
      }

      // Check if car exists and is available
      const car = await Car.findById(carId);
      if (!car || !car.isAvailable || car.status !== 'approved') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Car is not available for booking' })
        };
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'User not found' })
        };
      }

      // Create booking
      const booking = new Booking({
        user: userId,
        car: carId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        pickupLocation,
        dropoffLocation,
        totalDays: totalDays || 1,
        totalAmount,
        paymentMethod,
        specialRequests,
        paymentStatus: paymentMethod === 'cash' ? 'pending' : 'completed'
      });

      await booking.save();

      // Populate booking for email
      const populatedBooking = await Booking.findById(booking._id)
        .populate('user', 'name email phone')
        .populate('car', 'name brand model registrationNumber');

      // Send confirmation email
      sendBookingEmail(populatedBooking).catch(console.error);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Booking created successfully!',
          booking: populatedBooking
        })
      };
    }

    // GET USER BOOKINGS
    if (path === '/user' && method === 'GET') {
      const { userId } = event.queryStringParameters || {};

      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'User ID is required' })
        };
      }

      const bookings = await Booking.find({ user: userId })
        .populate('car', 'name brand model registrationNumber images')
        .sort({ createdAt: -1 });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ bookings })
      };
    }

    // GET ALL BOOKINGS (Admin)
    if (path === '/all' && method === 'GET') {
      const bookings = await Booking.find()
        .populate('user', 'name email phone')
        .populate('car', 'name brand model registrationNumber')
        .sort({ createdAt: -1 });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ bookings })
      };
    }

    // GET BOOKING BY ID
    if (path.startsWith('/') && method === 'GET') {
      const bookingId = path.substring(1);
      
      const booking = await Booking.findById(bookingId)
        .populate('user', 'name email phone')
        .populate('car', 'name brand model registrationNumber images');

      if (!booking) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Booking not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ booking })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Bookings function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Server error',
        error: error.message 
      })
    };
  }
};