const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

// Load environment variables
dotenv.config();
// Updated: Added detailed logging for registration debugging

// Validate environment variables
const { checkEnvironment, getEnvironmentInfo } = require('./utils/envValidator.js');
// Only validate in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.VALIDATE_ENV === 'true') {
  checkEnvironment(false); // Don't exit on error in serverless environment
}

// Import database connection
const connectDB = require('./utils/db.js');
const User = require('./models/user.js');

// Start automatic account deletion cron service
let cronStarted = false;
async function startAccountDeletionCron() {
  if (cronStarted) return;
  cronStarted = true;
  
  console.log('🚀 [AUTO-DELETE] Starting automatic account deletion service...');
  console.log('⏰ [AUTO-DELETE] Schedule: Every minute');
  
  const { processScheduledDeletions } = require('./utils/accountDeletion');
  
  // Schedule the job to run every minute
  cron.schedule('* * * * *', async () => {
    try {
      console.log('🕐 [AUTO-DELETE] Checking for accounts to delete...');
      const result = await processScheduledDeletions();
      
      if (result.deletedCount > 0) {
        console.log(`✅ [AUTO-DELETE] Deleted ${result.deletedCount} account(s)`);
      }
    } catch (error) {
      console.error('❌ [AUTO-DELETE] Error:', error.message);
    }
  });
  
  console.log('✅ [AUTO-DELETE] Automatic deletion service started');
  
  // Run once immediately on startup
  try {
    console.log('🔄 [AUTO-DELETE] Running initial check...');
    const result = await processScheduledDeletions();
    if (result.deletedCount > 0) {
      console.log(`✅ [AUTO-DELETE] Initial check: Deleted ${result.deletedCount} account(s)`);
    } else {
      console.log('ℹ️  [AUTO-DELETE] Initial check: No accounts to delete');
    }
  } catch (error) {
    console.error('❌ [AUTO-DELETE] Initial check error:', error.message);
  }
}

// Import controllers
const { 
  getCars, 
  getUserData, 
  loginUser,
  logoutUser,
  logoutAllDevices,
  registerUser, 
  verifyOTP,
  verifyEmailViaLink,
  resendOTP, 
  getRoles, 
  updateProfile, 
  updateProfileImage,
  forgotPassword,
  resetPassword,
  changePassword,
  requestAccountDeletion,
  verifyDeletionOTP,
  cancelAccountDeletion,
  getDeletionStatus
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
  getCarApprovalStats,
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
  resendInvoiceEmail,
  resendReviewEmail
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
  getAdminUsers,
  getAllBookings,
  replaceCarInBooking,
  getAvailableCarsForReplacement,
  recalculatePlatformEarnings,
  recalculateAllCarRatings,
  deleteUserAccountByAdmin,
  getEmployeeDeletionRequests,
  approveEmployeeDeletion,
  rejectEmployeeDeletion
} = require('./controllers/adminController.js');

const {
  createReview,
  getCarReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  respondToReview,
  getDeletedReviews,
  submitReviewFromEmail,
  getAllReviews
} = require('./controllers/reviewController.js');

const {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markAsRead
} = require('./controllers/chatController.js');

const {
  getLoyaltyData,
  redeemPoints,
  getLoyaltyHistory,
  calculateLoyaltyDiscount
} = require('./controllers/loyaltyController.js');

const {
  getInsurancePlans,
  calculateInsuranceCost,
  addInsuranceToBooking,
  getBookingInsurance
} = require('./controllers/insuranceController.js');

const {
  startGPSTracking,
  updateGPSLocation,
  stopGPSTracking,
  getGPSTracking,
  getGPSTrackingHistory
} = require('./controllers/gpsController.js');

const {
  getOverview,
  getRevenue,
  getBookings,
  getUsers,
  getOwners,
  getGeographic,
  exportData,
  clearAnalyticsCache,
  exportAnalyticsExcel,
  exportAnalyticsPDF,
  getRevenueTrend,
  getPaymentMethods,
  // Individual section exports
  exportOverviewPDF,
  exportOverviewExcel,
  exportBookingStatusPDF,
  exportBookingStatusExcel,
  exportTopCarsPDF,
  exportTopCarsExcel,
  exportTopOwnersPDF,
  exportTopOwnersExcel,
  exportGeographicPDF,
  exportGeographicExcel
} = require('./controllers/analyticsController.js');

const {
  createSupportTicket,
  getAllSupportTickets,
  getSupportTicket,
  updateSupportTicketStatus,
  addSupportTicketResponse,
  assignSupportTicket,
  addSupportTicketAttachment,
  getSupportTicketAnalytics
} = require('./controllers/supportController.js');

const {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  clockIn,
  clockOut,
  getAttendance,
  generatePayroll,
  getPayroll,
  paySalary,
  exportUsersPDF,
  exportUsersExcel,
  getDeletedUsers,
  exportDeletedUsersPDF,
  exportDeletedUsersExcel,
  getEmployeeRoleUsers,
  generateAndEmailPayslip,
  downloadPayslip,
  requestAccountDeletion: requestEmployeeAccountDeletion,
  getMyDeletionRequest,
  cancelMyDeletionRequest
} = require('./controllers/employeeController.js');

const {
  employeeCheckIn,
  employeeCheckOut,
  getEmployeeAttendanceHistory,
  getTodayAttendanceStatus
} = require('./controllers/employeeAttendanceController.js');

const {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  getLeaveRequest,
  updateLeaveRequest,
  cancelLeaveRequest,
  reviewLeaveRequest,
  getLeaveBalance
} = require('./controllers/leaveController.js');

// Import middleware
const { protect, isEmployee, isEmployeeOrAdmin } = require('./middleware/auth.js');
const { upload, isCloudinaryConfigured } = require('./middleware/multerCloudinary.js');

const app = express();

// Database connection with proper waiting
const ensureDBConnection = async () => {
  try {
    await connectDB();
    
    // Start automatic account deletion cron service after DB connection
    await startAccountDeletionCron();
    
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
        // Only parse if there's actual content
        if (jsonString.trim().length > 0) {
          req.body = JSON.parse(jsonString);
          console.log('✅ Converted Buffer to JSON:', req.body);
        } else {
          // Empty body - set to empty object
          req.body = {};
        }
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
    
    // Check if file exists locally
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
      // File not found locally - likely using Cloudinary
      // Return 404 silently (this is expected when using cloud storage)
      res.status(404).json({ success: false, message: 'File not found - using cloud storage' });
    }
  } catch (error) {
    console.error('❌ Error serving file:', error);
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
    const { getEnvironmentInfo } = require('./utils/envValidator.js');
    
    const healthCheck = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: getEnvironmentInfo(),
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
app.get('/user/verify-email', requireDB, verifyEmailViaLink);
app.post('/user/resend-otp', requireDB, resendOTP);
app.post('/user/login', requireDB, loginUser);
app.post('/user/logout', logoutUser); // No protect middleware - uses token from header
app.post('/user/logout-all', protect, requireDB, logoutAllDevices); // Requires authentication
app.get('/user/data', protect, requireDB, getUserData);
app.put('/user/profile', protect, requireDB, updateProfile);
app.put('/user/profile-image', protect, requireDB, upload.single('image'), updateProfileImage);

// Password Reset Routes
app.post('/user/forgot-password', requireDB, forgotPassword);
app.post('/user/reset-password', requireDB, resetPassword);
app.post('/user/change-password', protect, requireDB, changePassword);

// Account Deletion Routes
app.post('/user/request-deletion', protect, requireDB, requestAccountDeletion);
app.post('/user/verify-deletion-otp', protect, requireDB, verifyDeletionOTP);
app.post('/user/cancel-deletion', protect, requireDB, cancelAccountDeletion);
app.get('/user/deletion-status', protect, requireDB, getDeletionStatus);
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
app.get('/owner/pending-cars', protect, requireDB, isEmployeeOrAdmin, getPendingCars);
app.get('/owner/car-approval-stats', protect, requireDB, isEmployeeOrAdmin, getCarApprovalStats);
app.post('/owner/approve-reject-car', protect, requireDB, isEmployeeOrAdmin, approveRejectCar);
app.post('/owner/toggle-car', protect, requireDB, toggleCarAvailability);
app.post('/owner/delete-car', protect, requireDB, deleteCar);
app.get('/owner/dashboard', protect, requireDB, getDashboardData);
app.post('/owner/update-image', upload.single("image"), protect, requireDB, updateUserImage);

// Employee-specific car routes
app.post('/employee/add-platform-car', upload.single("image"), protect, requireDB, isEmployee, addCar); // For adding admin cars
app.post('/employee/add-own-car', upload.single("image"), protect, requireDB, isEmployee, addCar); // For adding employee's own car

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
app.post('/bookings/resend-review-email/:bookingId', protect, requireDB, resendReviewEmail);

// Admin Routes (with admin middleware)
app.get('/admin/dashboard', protect, requireDB, isAdmin, getDashboardAnalytics);
app.get('/admin/earnings/monthly', protect, requireDB, isAdmin, getMonthlyEarnings);
app.get('/admin/earnings/export/pdf', protect, requireDB, isAdmin, exportEarningsPDF);
app.get('/admin/earnings/export/excel', protect, requireDB, isAdmin, exportEarningsExcel);
app.post('/admin/recalculate-earnings', protect, requireDB, isAdmin, recalculatePlatformEarnings);
app.post('/admin/recalculate-ratings', protect, requireDB, isAdmin, recalculateAllCarRatings);
app.get('/admin/cars/export/pdf', protect, requireDB, isAdmin, exportCarsPDF);
app.get('/admin/cars/export/excel', protect, requireDB, isAdmin, exportCarsExcel);
app.get('/admin/bookings/export/pdf', protect, requireDB, isAdmin, exportBookingsPDF);
app.get('/admin/bookings/export/excel', protect, requireDB, isAdmin, exportBookingsExcel);
app.get('/admin/users', protect, requireDB, isEmployeeOrAdmin, getAllUsers);
app.get('/admin/get-admins', protect, requireDB, getAdminUsers); // Accessible by all authenticated users
app.get('/admin/bookings', protect, requireDB, isEmployee, getAllBookings);
app.post('/admin/replace-car', protect, requireDB, isEmployee, replaceCarInBooking);
app.get('/admin/available-cars', protect, requireDB, isEmployee, getAvailableCarsForReplacement);
app.post('/admin/delete-user', protect, requireDB, isEmployee, deleteUserAccountByAdmin);

// Employee Account Deletion Request Routes
app.post('/employee/request-account-deletion', protect, requireDB, requestEmployeeAccountDeletion);
app.get('/employee/my-deletion-request', protect, requireDB, getMyDeletionRequest);
app.post('/employee/cancel-deletion-request', protect, requireDB, cancelMyDeletionRequest);

// Admin - Employee Deletion Request Management
app.get('/admin/employee-deletion-requests', protect, requireDB, isAdmin, getEmployeeDeletionRequests);
app.post('/admin/approve-employee-deletion', protect, requireDB, isAdmin, approveEmployeeDeletion);
app.post('/admin/reject-employee-deletion', protect, requireDB, isAdmin, rejectEmployeeDeletion);

// Manual trigger for scheduled account deletions (Admin only)
app.post('/admin/process-scheduled-deletions', protect, requireDB, isAdmin, async (req, res) => {
  try {
    const { processScheduledDeletions } = require('./utils/accountDeletion');
    const result = await processScheduledDeletions();
    
    res.json({
      success: true,
      message: `Successfully processed ${result.deletedCount} account deletions`,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing scheduled deletions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process scheduled deletions',
      error: error.message
    });
  }
});

// Development-only endpoint for testing scheduled deletions (NO AUTH - LOCAL ONLY)
// WARNING: Remove or secure this endpoint in production!
if (process.env.NODE_ENV !== 'production') {
  app.post('/dev/trigger-deletion', requireDB, async (req, res) => {
    try {
      console.log('🔄 [DEV] Manually triggering scheduled deletions...');
      const { processScheduledDeletions } = require('./utils/accountDeletion');
      const result = await processScheduledDeletions();
      
      console.log(`✅ [DEV] Processed ${result.deletedCount} deletions`);
      
      res.json({
        success: true,
        message: `[DEV] Successfully processed ${result.deletedCount} account deletions`,
        deletedCount: result.deletedCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DEV] Error processing scheduled deletions:', error);
      res.status(500).json({
        success: false,
        message: '[DEV] Failed to process scheduled deletions',
        error: error.message
      });
    }
  });
}

// Review Routes
app.post('/reviews/create', protect, requireDB, createReview);
app.post('/reviews/submit-from-email', requireDB, submitReviewFromEmail); // No auth - email verification
app.get('/reviews/all', protect, requireDB, isEmployee, getAllReviews); // Employee only
app.get('/reviews/car/:carId', getCarReviews);
app.get('/reviews/user', protect, requireDB, getUserReviews);
app.put('/reviews/:reviewId', protect, requireDB, updateReview);
app.delete('/reviews/:reviewId', protect, requireDB, isEmployee, deleteReview); // Employee only
app.post('/reviews/:reviewId/respond', protect, requireDB, respondToReview);
app.get('/reviews/deleted', protect, requireDB, isEmployee, getDeletedReviews); // Employee only

// Chat Routes
app.post('/chat/conversations/create', protect, requireDB, getOrCreateConversation);
app.get('/chat/conversations', protect, requireDB, getUserConversations);
app.get('/chat/conversations/:conversationId/messages', protect, requireDB, getConversationMessages);
app.post('/chat/messages/send', protect, requireDB, sendMessage);
app.post('/chat/conversations/:conversationId/read', protect, requireDB, markAsRead);

// Loyalty Program Routes
app.get('/loyalty', protect, requireDB, getLoyaltyData);
app.post('/loyalty/redeem', protect, requireDB, redeemPoints);
app.get('/loyalty/history', protect, requireDB, getLoyaltyHistory);
app.post('/loyalty/calculate-discount', protect, requireDB, calculateLoyaltyDiscount);

// Insurance Routes
app.get('/insurance/plans', protect, requireDB, getInsurancePlans);
app.post('/insurance/calculate', protect, requireDB, calculateInsuranceCost);
app.post('/insurance/add-to-booking', protect, requireDB, addInsuranceToBooking);
app.get('/insurance/booking/:bookingId', protect, requireDB, getBookingInsurance);

// GPS Tracking Routes
app.post('/gps/start', protect, requireDB, startGPSTracking);
app.post('/gps/update', protect, requireDB, updateGPSLocation);
app.post('/gps/stop', protect, requireDB, stopGPSTracking);
app.get('/gps/booking/:bookingId', protect, requireDB, getGPSTracking);
app.get('/gps/booking/:bookingId/history', protect, requireDB, getGPSTrackingHistory);

// Advanced Analytics Routes (Admin only)
app.get('/analytics/overview', protect, requireDB, getOverview);
app.get('/analytics/revenue', protect, requireDB, getRevenue);
app.get('/analytics/bookings', protect, requireDB, getBookings);
app.get('/analytics/user-metrics', protect, requireDB, getUsers);
app.get('/analytics/owners', protect, requireDB, getOwners);
app.get('/analytics/geographic', protect, requireDB, getGeographic);
app.get('/analytics/revenue-trend', protect, requireDB, getRevenueTrend);
app.get('/analytics/payment-methods', protect, requireDB, getPaymentMethods);
app.get('/analytics/export-excel', protect, requireDB, exportAnalyticsExcel);
app.get('/analytics/export-pdf', protect, requireDB, exportAnalyticsPDF);
app.post('/analytics/export', protect, requireDB, exportData);
app.post('/analytics/clear-cache', protect, requireDB, clearAnalyticsCache);

// Individual Section Export Routes
app.get('/analytics/export-overview-pdf', protect, requireDB, exportOverviewPDF);
app.get('/analytics/export-overview-excel', protect, requireDB, exportOverviewExcel);
app.get('/analytics/export-booking-status-pdf', protect, requireDB, exportBookingStatusPDF);
app.get('/analytics/export-booking-status-excel', protect, requireDB, exportBookingStatusExcel);
app.get('/analytics/export-top-cars-pdf', protect, requireDB, exportTopCarsPDF);
app.get('/analytics/export-top-cars-excel', protect, requireDB, exportTopCarsExcel);
app.get('/analytics/export-top-owners-pdf', protect, requireDB, exportTopOwnersPDF);
app.get('/analytics/export-top-owners-excel', protect, requireDB, exportTopOwnersExcel);
app.get('/analytics/export-geographic-pdf', protect, requireDB, exportGeographicPDF);
app.get('/analytics/export-geographic-excel', protect, requireDB, exportGeographicExcel);

// Support Ticket Routes
app.post('/support/tickets/create', createSupportTicket); // Public endpoint for email submissions
app.get('/support/tickets', protect, requireDB, isEmployee, getAllSupportTickets); // Employee only
app.get('/support/tickets/:ticketId', protect, requireDB, isEmployee, getSupportTicket); // Employee only
app.put('/support/tickets/:ticketId', protect, requireDB, isEmployee, updateSupportTicketStatus); // Employee only
app.post('/support/tickets/:ticketId/respond', protect, requireDB, isEmployee, addSupportTicketResponse); // Employee only
app.put('/support/tickets/:ticketId/assign', protect, requireDB, isEmployee, assignSupportTicket); // Employee only
app.post('/support/tickets/:ticketId/attachments', protect, requireDB, isEmployee, upload.single('file'), addSupportTicketAttachment); // Employee only
app.get('/support/analytics', protect, requireDB, isEmployee, getSupportTicketAnalytics); // Employee only

// Employee & Payroll Routes
app.get('/employees/available-users', protect, requireDB, isAdmin, getEmployeeRoleUsers); // Get users with employee role
app.post('/employees/create', protect, requireDB, isAdmin, createEmployee);
app.get('/employees', protect, requireDB, isAdmin, getAllEmployees);
app.get('/employees/:employeeId', protect, requireDB, getEmployee);
app.put('/employees/:employeeId', protect, requireDB, isAdmin, updateEmployee);

// Attendance Routes
app.post('/attendance/clock-in', protect, requireDB, clockIn);
app.post('/attendance/clock-out', protect, requireDB, clockOut);
app.get('/attendance', protect, requireDB, getAttendance);

// Employee Attendance Routes (Self-Service)
app.post('/employee-attendance/checkin', protect, requireDB, employeeCheckIn);
app.put('/employee-attendance/checkout', protect, requireDB, employeeCheckOut);
app.get('/employee-attendance/history/:userId', protect, requireDB, getEmployeeAttendanceHistory);
app.get('/employee-attendance/today/:userId', protect, requireDB, getTodayAttendanceStatus);

// Debug endpoint for employee attendance (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/employee-attendance/debug/:userId', protect, requireDB, async (req, res) => {
    try {
      const { userId } = req.params;
      const Employee = require('./models/employee.js');
      const User = require('./models/user.js');
      
      const user = await User.findById(userId);
      const employee = await Employee.findOne({ userId });
      
      res.json({
        success: true,
        userId,
        userExists: !!user,
        userRole: user?.role,
        employeeExists: !!employee,
        employeeData: employee ? {
          employeeId: employee.employeeId,
          shift: employee.shift,
          status: employee.status
        } : null
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// Leave Management Routes
app.post('/leave/request', protect, requireDB, isEmployee, createLeaveRequest);
app.get('/leave/my-requests', protect, requireDB, isEmployee, getMyLeaveRequests);
app.get('/leave/all', protect, requireDB, isEmployeeOrAdmin, getAllLeaveRequests);
app.get('/leave/balance', protect, requireDB, isEmployee, getLeaveBalance);
app.get('/leave/:leaveId', protect, requireDB, getLeaveRequest);
app.put('/leave/:leaveId', protect, requireDB, isEmployee, updateLeaveRequest);
app.post('/leave/:leaveId/cancel', protect, requireDB, isEmployee, cancelLeaveRequest);
app.post('/leave/:leaveId/review', protect, requireDB, isEmployeeOrAdmin, reviewLeaveRequest);

// Payroll Routes (Employee can view their own, Admin can view all)
app.post('/payroll/generate', protect, requireDB, isAdmin, generatePayroll);
app.get('/payroll', protect, requireDB, isEmployeeOrAdmin, getPayroll);
app.post('/payroll/:payrollId/pay', protect, requireDB, isAdmin, paySalary);
app.post('/payroll/:payrollId/email', protect, requireDB, isAdmin, generateAndEmailPayslip);
app.get('/payroll/:payrollId/download', protect, requireDB, isEmployeeOrAdmin, downloadPayslip);

// Employee Users Export Routes (Admin can also access)
app.get('/employees/users/export/pdf', protect, requireDB, isEmployeeOrAdmin, exportUsersPDF);
app.get('/employees/users/export/excel', protect, requireDB, isEmployeeOrAdmin, exportUsersExcel);

// ========== NEW FEATURES ROUTES ==========

// Biometric Attendance Routes
const {
  registerDevice,
  enrollBiometric,
  verifyBiometric,
  getDevices,
  getEmployeeTemplates
} = require('./controllers/biometricController.js');

app.post('/biometric/register-device', protect, requireDB, isAdmin, registerDevice);
app.post('/biometric/enroll', protect, requireDB, enrollBiometric);
app.post('/biometric/verify', requireDB, verifyBiometric);
app.get('/biometric/devices', protect, requireDB, isEmployeeOrAdmin, getDevices);
app.get('/biometric/templates/:userId', protect, requireDB, getEmployeeTemplates);

// AI-Powered Car Recommendations Routes
const {
  getRecommendations,
  trackSearch,
  getSimilarCars,
  getTrendingCars
} = require('./controllers/recommendationController.js');

app.get('/recommendations', protect, requireDB, getRecommendations);
app.post('/recommendations/track-search', protect, requireDB, trackSearch);
app.get('/recommendations/similar/:carId', requireDB, getSimilarCars);
app.get('/recommendations/trending', requireDB, getTrendingCars);

// Dynamic Pricing Routes
const {
  calculateDynamicPrice,
  createPricingRule,
  getPricingRules,
  updatePricingRule,
  deletePricingRule,
  getDemandAnalytics
} = require('./controllers/dynamicPricingController.js');

app.post('/pricing/calculate', requireDB, calculateDynamicPrice);
app.post('/pricing/rules', protect, requireDB, isAdmin, createPricingRule);
app.get('/pricing/rules', protect, requireDB, isAdmin, getPricingRules);
app.put('/pricing/rules/:ruleId', protect, requireDB, isAdmin, updatePricingRule);
app.delete('/pricing/rules/:ruleId', protect, requireDB, isAdmin, deletePricingRule);
app.get('/pricing/analytics', protect, requireDB, isAdmin, getDemandAnalytics);

// Performance Review Routes
const {
  createReview: createPerformanceReview,
  getReviews: getPerformanceReviews,
  updateReview: updatePerformanceReview,
  acknowledgeReview,
  getPerformanceAnalytics
} = require('./controllers/performanceController.js');

app.post('/performance/reviews', protect, requireDB, isAdmin, createPerformanceReview);
app.get('/performance/reviews', protect, requireDB, getPerformanceReviews);
app.put('/performance/reviews/:reviewId', protect, requireDB, isAdmin, updatePerformanceReview);
app.post('/performance/reviews/:reviewId/acknowledge', protect, requireDB, acknowledgeReview);
app.get('/performance/analytics', protect, requireDB, getPerformanceAnalytics);

// Training and Certification Routes
const {
  createTraining,
  getTrainings,
  updateTraining,
  enrollEmployee,
  getEnrollments,
  markAttendance,
  submitAssessment,
  submitFeedback,
  getEmployeeCertifications,
  getTrainingAnalytics
} = require('./controllers/trainingController.js');

app.post('/training/create', protect, requireDB, isAdmin, createTraining);
app.get('/training/list', protect, requireDB, getTrainings);
app.put('/training/:trainingId', protect, requireDB, isAdmin, updateTraining);
app.post('/training/enroll', protect, requireDB, isAdmin, enrollEmployee);
app.get('/training/enrollments', protect, requireDB, getEnrollments);
app.post('/training/attendance/:enrollmentId', protect, requireDB, isAdmin, markAttendance);
app.post('/training/assessment/:enrollmentId', protect, requireDB, isAdmin, submitAssessment);
app.post('/training/feedback/:enrollmentId', protect, requireDB, submitFeedback);
app.get('/training/certifications/:employeeId', protect, requireDB, getEmployeeCertifications);
app.get('/training/analytics', protect, requireDB, isAdmin, getTrainingAnalytics);

// ========== END NEW FEATURES ROUTES ==========

// Predictive Maintenance Routes
const {
  predictMaintenance,
  getMaintenanceAlerts,
  createMaintenanceAlert,
  updateMaintenanceStatus
} = require('./controllers/maintenanceController.js');

app.get('/maintenance/predict/:carId', protect, requireDB, predictMaintenance);
app.get('/maintenance/alerts', protect, requireDB, getMaintenanceAlerts);
app.post('/maintenance/alerts', protect, requireDB, createMaintenanceAlert);
app.put('/maintenance/alerts/:alertId', protect, requireDB, updateMaintenanceStatus);

// EV Charging Station Routes
const {
  getNearbyStations,
  getAllStations,
  createStation,
  updateStationAvailability,
  addStationReview,
  seedStations
} = require('./controllers/chargingStationController.js');

app.get('/charging/nearby', getNearbyStations);
app.get('/charging/stations', getAllStations);
app.post('/charging/stations', protect, requireDB, isAdmin, createStation);
app.put('/charging/stations/:stationId/availability', protect, requireDB, updateStationAvailability);
app.post('/charging/stations/:stationId/review', protect, requireDB, addStationReview);
app.post('/charging/seed', protect, requireDB, isAdmin, seedStations);

// Seed charging stations (Admin only - for development)
app.post('/charging/seed', protect, requireDB, isAdmin, async (req, res) => {
  try {
    const { seedChargingStations } = require('./utils/seedChargingStations.js');
    const result = await seedChargingStations();
    res.json({ success: true, message: `Seeded ${result.count} charging stations` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Removed: Geofencing, Voice Commands, Third-Party APIs, AR Preview, 3D Customization, Demand Forecasting, and Damage Detection routes

// Smart Contract Routes
const {
  createSmartContract,
  getSmartContract,
  updateMilestone,
  addPayment,
  fileDispute,
  resolveDispute,
  completeContract,
  getAllContracts,
  getContractStatistics
} = require('./controllers/smartContractController.js');

app.post('/smart-contract/create', protect, requireDB, createSmartContract);
app.get('/smart-contract/booking/:bookingId', protect, requireDB, getSmartContract);
app.post('/smart-contract/milestone', protect, requireDB, updateMilestone);
app.post('/smart-contract/payment', protect, requireDB, addPayment);
app.post('/smart-contract/dispute', protect, requireDB, fileDispute);
app.post('/smart-contract/resolve-dispute', protect, requireDB, isAdmin, resolveDispute);
app.put('/smart-contract/:contractId/complete', protect, requireDB, completeContract);
app.get('/smart-contract/all', protect, requireDB, isAdmin, getAllContracts);
app.get('/smart-contract/statistics', protect, requireDB, isAdmin, getContractStatistics);

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
      'GET /admin/dashboard',
      'POST /employee-attendance/checkin',
      'PUT /employee-attendance/checkout',
      'GET /employee-attendance/history/:userId',
      'GET /employee-attendance/today/:userId'
    ]
  });
});

// Export the serverless function with proper binary handling
module.exports.handler = serverless(app, {
  binary: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/*'
  ], // Specify binary MIME types
  request: (request, event, context) => {
    // Pass through binary data
    request.isBase64Encoded = event.isBase64Encoded;
  }
});