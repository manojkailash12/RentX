const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();
// Updated: Added detailed logging for registration debugging

// Import database connection
const connectDB = require('./utils/db.js');
const User = require('./models/user.js');

// Import controllers
const { 
  getCars, 
  getUserData, 
  loginUser,
  logoutUser,
  logoutAllDevices,
  registerUser, 
  verifyOTP, 
  resendOTP, 
  getRoles, 
  updateProfile, 
  updateProfileImage 
} = require('./controllers/userController.js');

const { 
  addCar, 
  changeRoleToOwner, 
  deleteCar, 
  getDashboardData, 
  getOwnerCars, 
  getCarForEdit, 
  updateCar, 
  toggleCarAvailability, 
  updateUserImage, 
  getPendingCars, 
  approveRejectCar 
} = require('./controllers/ownerController.js');

const { 
  changeBookingStatus, 
  checkAvailabilityOfCar, 
  checkSpecificCarAvailability, 
  createBooking, 
  getOwnerBookings, 
  getUserBookings, 
  downloadInvoice, 
  calculateDistanceAPI,
  updatePaymentStatus,
  cancelUserBooking,
  resendInvoiceEmail
} = require('./controllers/bookingController.js');

const {
  isAdmin,
  getDashboardAnalytics,
  getMonthlyEarnings,
  exportEarningsPDF,
  exportEarningsExcel,
  exportCarsPDF,
  exportCarsExcel,
  exportBookingsPDF,
  exportBookingsExcel,
  getAllUsers,
  getAllBookings,
  replaceCarInBooking,
  getAvailableCarsForReplacement
} = require('./controllers/adminController.js');

// Import middleware
const { protect } = require('./middleware/auth.js');
const { upload, isCloudinaryConfigured } = require('./middleware/multerCloudinary.js');

const app = express();

// Database connection with proper waiting
const ensureDBConnection = async () => {
  try {
    await connectDB();
    // Removed verbose logging - connection status is logged in db.js
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Middleware to ensure database connection before DB operations
const requireDB = async (req, res, next) => {
  try {
    const connected = await ensureDBConnection();
    if (!connected) {
      return res.status(500).json({
        success: false,
        message: "Database connection failed. Please try again."
      });
    }
    next();
  } catch (error) {
    console.error("Database middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Database connection error"
    });
  }
};

// Initialize database connection and wait for it
(async () => {
  console.log('🔄 Initializing database connection...');
  await ensureDBConnection();
})();

// Create uploads directories - use /tmp for Netlify Functions, local folder for dev
const uploadsDir = process.env.NETLIFY 
  ? '/tmp/uploads' 
  : path.join(process.cwd(), 'uploads');
const carsDir = path.join(uploadsDir, 'cars');
const usersDir = path.join(uploadsDir, 'users');

// Ensure upload directories exist
const ensureUploadDirs = () => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(carsDir)) {
      fs.mkdirSync(carsDir, { recursive: true });
    }
    if (!fs.existsSync(usersDir)) {
      fs.mkdirSync(usersDir, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

ensureUploadDirs();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:8888',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8888',
    'https://*.netlify.app',
    process.env.URL,
    process.env.DEPLOY_PRIME_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Middleware
app.use(cors(corsOptions));

// Simple body parsing for Netlify Functions
app.use(express.raw({ type: 'application/json', limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom middleware to handle Buffer parsing
app.use((req, res, next) => {
  // Skip buffer parsing for multipart/form-data (file uploads)
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    // If body is a Buffer, convert it to JSON
    if (Buffer.isBuffer(req.body)) {
      try {
        const jsonString = req.body.toString('utf8');
        req.body = JSON.parse(jsonString);
        console.log('✅ Converted Buffer to JSON:', req.body);
      } catch (error) {
        console.error('❌ Failed to parse Buffer:', error.message);
        req.body = {};
      }
    }
  }
  next();
});

// Debug middleware to check body parsing (minimal logging)
app.use((req, res, next) => {
  if (req.method === 'POST' && process.env.NODE_ENV === 'development') {
    console.log('🔍 POST Request:', req.url);
  }
  next();
});

// Middleware to rewrite paths for serverless functions
app.use((req, res, next) => {
  // Remove the function prefix from the URL
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '');
    if (req.url === '') {
      req.url = '/';
    }
  }
  // Only log in development and for non-GET requests
  if (process.env.NODE_ENV === 'development' && req.method !== 'GET') {
    console.log(`🔄 ${req.method} ${req.url}`);
  }
  next();
});

// Request logging (simplified)
app.use((req, res, next) => {
  // Only log non-GET requests or errors in production
  if (process.env.NODE_ENV === 'development' || req.method !== 'GET') {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
  }
  next();
});

// Handle preflight requests for specific routes
app.options('/user/roles', cors(corsOptions));
app.options('/user/cars', cors(corsOptions));
app.options('/user/register', cors(corsOptions));
app.options('/user/login', cors(corsOptions));
app.options('/owner/add-car', cors(corsOptions));
app.options('/bookings/create', cors(corsOptions));
app.options('/admin/dashboard', cors(corsOptions));

// Serve static files from /tmp/uploads
app.use('/uploads', express.static(uploadsDir));

// File serving endpoint for uploaded images
app.get('/uploads/:folder/:filename', (req, res) => {
  try {
    const { folder, filename } = req.params;
    const filePath = path.join(uploadsDir, folder, filename);
    
    console.log('📁 File request:', { folder, filename, filePath, exists: fs.existsSync(filePath) });
    
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'image/jpeg',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'image/jpeg',
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } else {
      console.log('❌ File not found:', filePath);
      console.log('📂 Uploads dir:', uploadsDir);
      console.log('📂 Cars dir contents:', fs.existsSync(carsDir) ? fs.readdirSync(carsDir) : 'Directory does not exist');
      res.status(404).json({ success: false, message: 'File not found' });
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ success: false, message: 'Error serving file' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'RentX API is running on Netlify Functions!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      auth: ['/user/register', '/user/login', '/user/verify-otp'],
      cars: ['/user/cars', '/owner/add-car', '/owner/cars'],
      bookings: ['/bookings/create', '/bookings/user', '/bookings/owner'],
      admin: ['/admin/dashboard', '/owner/pending-cars']
    }
  });
});

// Test endpoint for debugging
app.get('/test', (req, res) => {
  console.log("Test endpoint called");
  res.json({
    success: true,
    message: 'Test endpoint working perfectly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set',
    jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set',
    nodeVersion: process.version,
    platform: process.platform
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      uploads: {
        directory: uploadsDir,
        exists: fs.existsSync(uploadsDir),
        cars: fs.existsSync(carsDir) ? fs.readdirSync(carsDir).length : 0,
        users: fs.existsSync(usersDir) ? fs.readdirSync(usersDir).length : 0
      }
    };

    // Test database connection
    try {
      await ensureDBConnection();
      const mongoose = require('mongoose');
      healthCheck.database = {
        status: 'connected',
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      };
    } catch (dbError) {
      healthCheck.database = {
        status: 'disconnected',
        error: dbError.message
      };
      healthCheck.status = 'degraded';
    }

    res.json(healthCheck);
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// User Routes
app.get('/user/roles', getRoles);

// Debug endpoint to check if user exists (remove in production)
app.get('/user/check-email/:email', requireDB, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const user = await User.findOne({ email });
    res.json({
      success: true,
      exists: !!user,
      isVerified: user?.isVerified || false,
      hasOTP: !!user?.otp,
      email: user?.email
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.post('/user/register', requireDB, registerUser);
app.post('/user/verify-otp', requireDB, verifyOTP);
app.post('/user/resend-otp', requireDB, resendOTP);
app.post('/user/login', requireDB, loginUser);
app.post('/user/logout', logoutUser); // No protect middleware - uses token from header
app.post('/user/logout-all', protect, requireDB, logoutAllDevices); // Requires authentication
app.get('/user/data', protect, requireDB, getUserData);
app.put('/user/profile', protect, requireDB, updateProfile);
app.put('/user/profile-image', protect, requireDB, upload.single('image'), updateProfileImage);
// User cars endpoint - with fallback if DB fails
app.get('/user/cars', async (req, res) => {
  try {
    // Try to connect to database
    const connected = await ensureDBConnection();
    if (connected) {
      // Use the real controller if DB is connected
      return getCars(req, res);
    } else {
      // Fallback response if DB is not available
      console.log('⚠️ Database not available, returning empty cars list');
      return res.json({
        success: true,
        cars: [],
        count: 0,
        message: "No cars available at the moment (database connecting...)"
      });
    }
  } catch (error) {
    console.error('Error in cars endpoint:', error);
    res.json({
      success: true,
      cars: [],
      count: 0,
      message: "No cars available at the moment"
    });
  }
});

// Owner Routes
app.post('/owner/change-role', protect, requireDB, changeRoleToOwner);
app.post('/owner/add-car', upload.single("image"), protect, requireDB, addCar);
app.get('/owner/cars', protect, requireDB, getOwnerCars);
app.get('/owner/car/:carId', protect, requireDB, getCarForEdit);
app.put('/owner/car/:carId', upload.single("image"), protect, requireDB, updateCar);
app.get('/owner/pending-cars', protect, requireDB, getPendingCars);
app.post('/owner/approve-reject-car', protect, requireDB, approveRejectCar);
app.post('/owner/toggle-car', protect, requireDB, toggleCarAvailability);
app.post('/owner/delete-car', protect, requireDB, deleteCar);
app.get('/owner/dashboard', protect, requireDB, getDashboardData);
app.post('/owner/update-image', upload.single("image"), protect, requireDB, updateUserImage);

// Booking Routes
app.post('/bookings/check-availability', requireDB, checkAvailabilityOfCar);
app.post('/bookings/check-car-availability', requireDB, checkSpecificCarAvailability);
app.post('/bookings/calculate-distance', calculateDistanceAPI);
app.post('/bookings/create', protect, requireDB, createBooking);
app.get('/bookings/user', protect, requireDB, getUserBookings);
app.get('/bookings/owner', protect, requireDB, getOwnerBookings);
app.post('/bookings/change-status', protect, requireDB, changeBookingStatus);
app.post('/bookings/update-payment-status', protect, requireDB, updatePaymentStatus);
app.get('/bookings/invoice/:bookingId', protect, requireDB, downloadInvoice);
app.post('/bookings/cancel/:bookingId', protect, requireDB, cancelUserBooking);
app.post('/bookings/resend-invoice/:bookingId', protect, requireDB, resendInvoiceEmail);

// Admin Routes (with admin middleware)
app.get('/admin/dashboard', protect, requireDB, isAdmin, getDashboardAnalytics);
app.get('/admin/earnings/monthly', protect, requireDB, isAdmin, getMonthlyEarnings);
app.get('/admin/earnings/export/pdf', protect, requireDB, isAdmin, exportEarningsPDF);
app.get('/admin/earnings/export/excel', protect, requireDB, isAdmin, exportEarningsExcel);
app.get('/admin/cars/export/pdf', protect, requireDB, isAdmin, exportCarsPDF);
app.get('/admin/cars/export/excel', protect, requireDB, isAdmin, exportCarsExcel);
app.get('/admin/bookings/export/pdf', protect, requireDB, isAdmin, exportBookingsPDF);
app.get('/admin/bookings/export/excel', protect, requireDB, isAdmin, exportBookingsExcel);
app.get('/admin/users', protect, requireDB, isAdmin, getAllUsers);
app.get('/admin/bookings', protect, requireDB, isAdmin, getAllBookings);
app.post('/admin/replace-car', protect, requireDB, isAdmin, replaceCarInBooking);
app.get('/admin/available-cars', protect, requireDB, isAdmin, getAvailableCarsForReplacement);

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('=== API ERROR ===');
  console.error('URL:', req.method, req.url);
  console.error('Headers:', req.headers);
  console.error('Body:', req.body);
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('================');
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation error',
      details: isDevelopment ? error.message : 'Invalid data provided'
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid ID format',
      details: isDevelopment ? error.message : 'Invalid identifier'
    });
  }
  
  if (error.code === 11000) {
    return res.status(400).json({ 
      success: false, 
      message: 'Duplicate entry',
      details: isDevelopment ? error.message : 'Data already exists'
    });
  }
  
  res.status(error.status || 500).json({ 
    success: false, 
    message: error.message || 'Internal server error',
    ...(isDevelopment && { 
      stack: error.stack,
      details: error 
    })
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   Original URL: ${req.originalUrl}`);
  console.log(`   Headers:`, req.headers);
  console.log(`   User-Agent:`, req.headers['user-agent']);
  console.log(`   Referer:`, req.headers.referer);
  
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /',
      'GET /test',
      'GET /health',
      'GET /user/roles',
      'GET /user/cars',
      'POST /user/register',
      'POST /user/verify-otp',
      'POST /user/resend-otp',
      'POST /user/login',
      'GET /user/data',
      'PUT /user/profile',
      'POST /owner/add-car',
      'GET /owner/cars',
      'GET /owner/dashboard',
      'POST /bookings/create',
      'GET /bookings/user',
      'GET /admin/dashboard'
    ]
  });
});

// Export the serverless function with proper binary handling
module.exports.handler = serverless(app, {
  binary: ['application/pdf', 'image/*'], // Specify binary MIME types
  request: (request, event, context) => {
    // Pass through binary data
    request.isBase64Encoded = event.isBase64Encoded;
  }
});