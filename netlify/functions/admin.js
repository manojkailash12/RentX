const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  role: String,
  isVerified: Boolean
}, { timestamps: true });

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

const bookingSchema = new mongoose.Schema({
  bookingId: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
  startDate: Date,
  endDate: Date,
  totalAmount: Number,
  paymentMethod: String,
  paymentStatus: String,
  bookingStatus: String
}, { timestamps: true });

let User, Car, Booking;
try {
  User = mongoose.model('User');
  Car = mongoose.model('Car');
  Booking = mongoose.model('Booking');
} catch {
  User = mongoose.model('User', userSchema);
  Car = mongoose.model('Car', carSchema);
  Booking = mongoose.model('Booking', bookingSchema);
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

// Auth middleware
const verifyAdmin = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch {
    return null;
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

    // Check admin authorization
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Authorization required' })
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const admin = verifyAdmin(token);
    if (!admin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: 'Admin access required' })
      };
    }

    const path = event.path.replace('/.netlify/functions/admin', '');
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    // DASHBOARD STATS
    if (path === '/dashboard' && method === 'GET') {
      const totalUsers = await User.countDocuments();
      const totalCars = await Car.countDocuments();
      const totalBookings = await Booking.countDocuments();
      const pendingApprovals = await Car.countDocuments({ status: 'pending' });
      
      const recentBookings = await Booking.find()
        .populate('user', 'name email')
        .populate('car', 'name brand')
        .sort({ createdAt: -1 })
        .limit(5);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          stats: {
            totalUsers,
            totalCars,
            totalBookings,
            pendingApprovals
          },
          recentBookings
        })
      };
    }

    // GET ALL USERS
    if (path === '/users' && method === 'GET') {
      const users = await User.find()
        .select('-password -otp -otpExpires')
        .sort({ createdAt: -1 });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ users })
      };
    }

    // GET PENDING CARS
    if (path === '/cars/pending' && method === 'GET') {
      const pendingCars = await Car.find({ status: 'pending' })
        .populate('owner', 'name email phone')
        .sort({ createdAt: -1 });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ cars: pendingCars })
      };
    }

    // APPROVE/REJECT CAR
    if (path.startsWith('/cars/') && path.includes('/status') && method === 'PUT') {
      const carId = path.split('/')[2];
      const { status } = body;

      if (!['approved', 'rejected'].includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid status' })
        };
      }

      const car = await Car.findByIdAndUpdate(
        carId,
        { status, isAvailable: status === 'approved' },
        { new: true }
      );

      if (!car) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Car not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: `Car ${status} successfully`,
          car
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Admin function error:', error);
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