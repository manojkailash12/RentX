const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('../../routes/auth-serverless');
const carRoutes = require('../../routes/cars');
const bookingRoutes = require('../../routes/bookings');
const adminRoutes = require('../../routes/admin');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection with caching for serverless
let cachedDb = null;

const connectToDatabase = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('🔄 Using cached MongoDB connection');
    return cachedDb;
  }

  try {
    console.log('🔄 Establishing new MongoDB connection...');
    
    // Check if MongoDB URI is available
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    console.log('MongoDB URI format check: ✅');
    
    // Disconnect any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5, // Reduced for serverless
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    });
    
    cachedDb = connection;
    console.log('✅ Successfully connected to MongoDB Atlas');
    console.log('Database name:', mongoose.connection.db.databaseName);
    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Environment check:');
    console.error('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.error('- NODE_ENV:', process.env.NODE_ENV);
    throw error;
  }
};

// Connect to database middleware with retry logic
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    res.status(500).json({ 
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check with detailed database info
app.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStates = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };
    
    res.json({ 
      status: 'OK', 
      message: 'RentX Serverless API is running on Netlify',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      database: {
        status: dbStates[dbStatus],
        readyState: dbStatus,
        name: mongoose.connection.db?.databaseName || 'Unknown'
      },
      environmentVariables: {
        mongodbUri: !!process.env.MONGODB_URI,
        jwtSecret: !!process.env.JWT_SECRET,
        emailUser: !!process.env.EMAIL_USER,
        emailPass: !!process.env.EMAIL_PASS
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/auth', authRoutes);
app.use('/cars', carRoutes);
app.use('/bookings', bookingRoutes);
app.use('/admin', adminRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(error.status || 500).json({ 
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Export the serverless function
module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
});