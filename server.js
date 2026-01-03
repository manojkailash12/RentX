const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const carRoutes = require('./routes/cars');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const auth = require('./middleware/auth');
const { startCarAvailabilityUpdater } = require('./utils/carAvailabilityUpdater');

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// MongoDB Connection with retry logic
const connectDB = async (useSimpleConnection = false) => {
  try {
    let connectionOptions;
    
    if (useSimpleConnection) {
      // Simple connection options for fallback
      connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      };
      console.log('🔄 Attempting simple MongoDB connection...');
    } else {
      // Advanced connection options
      connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // Timeout after 10s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        maxPoolSize: 10, // Maintain up to 10 socket connections
      };
      console.log('🔄 Attempting MongoDB connection with advanced options...');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Manoj:Manoj@cluster0.0w661ny.mongodb.net/RentX?retryWrites=true&w=majority', connectionOptions);

    console.log('✅ Connected to MongoDB Atlas');
    
    // Start car availability updater after database connection
    startCarAvailabilityUpdater();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // If advanced connection failed, try simple connection
    if (!useSimpleConnection && (error.message.includes('not supported') || error.message.includes('option'))) {
      console.log('🔄 Trying simple connection method...');
      setTimeout(() => connectDB(true), 2000);
      return;
    }
    
    // Only retry if it's a network/connection error
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      console.log('🔄 Retrying MongoDB connection in 10 seconds...');
      setTimeout(() => connectDB(useSimpleConnection), 10000);
    } else {
      console.error('💥 Fatal MongoDB configuration error. Please check your connection string and credentials.');
      console.error('Full error:', error);
    }
  }
};

// Connect to database
connectDB();

// Database connection event handlers
mongoose.connection.on('error', (err) => {
  if (err.name !== 'MongoServerSelectionError') {
    console.error('❌ MongoDB connection error:', err.message);
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'South India Car Rentals API is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for debugging
app.get('/api/test-auth', auth, (req, res) => {
  res.json({
    message: 'Authentication working',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check user's bookings
app.get('/api/debug/my-bookings', auth, async (req, res) => {
  try {
    const Booking = require('./models/Booking');
    const bookings = await Booking.find({ user: req.user.userId })
      .populate('user', 'name email')
      .populate('car', 'name brand model');
    
    res.json({
      user: req.user,
      bookingsCount: bookings.length,
      bookings: bookings.map(b => ({
        id: b._id,
        invoiceNumber: b.invoiceNumber,
        userId: b.user._id,
        userEmail: b.user.email,
        carName: b.car?.name || 'Unknown'
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app only in production
if (process.env.NODE_ENV === 'production') {
  // Check if build directory exists
  const buildPath = path.join(__dirname, 'client/build');
  if (fs.existsSync(buildPath)) {
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });
  } else {
    console.log('⚠️  Build directory not found. Run "npm run build" to create production build.');
  }
} else {
  // In development, provide helpful API-only message
  app.get('*', (req, res) => {
    res.json({
      message: 'RentX API Server',
      environment: 'development',
      note: 'React app should be running on http://localhost:3000',
      availableEndpoints: [
        'GET /api/health',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/cars',
        'POST /api/cars',
        'GET /api/bookings',
        'POST /api/bookings'
      ]
    });
  });
}

const PORT = process.env.PORT || 5001; // Changed from 5000 to 5001
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📱 React app should be running on http://localhost:3000`);
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    app.listen(PORT + 1, () => {
      console.log(`🚀 Server running on port ${PORT + 1}`);
    });
  } else {
    console.error('❌ Server error:', err);
  }
});