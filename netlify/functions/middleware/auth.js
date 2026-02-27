const jwt = require('jsonwebtoken');
const User = require('../models/user.js');
const { verifySession, extendSession } = require('../utils/sessionManager');
const connectDB = require('../utils/db');

// MongoDB session-based authentication
const protect = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware - checking authentication for:', req.url);
    
    // Ensure database is connected before proceeding
    try {
      await connectDB();
      console.log('✅ Database connected');
    } catch (dbError) {
      console.error('❌ Database connection failed in auth middleware:', dbError);
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again.'
      });
    }

    let sessionToken;

    // Get session token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      sessionToken = req.headers.authorization.split(' ')[1];
      console.log('🔑 Session token found in Authorization header');
    }

    if (!sessionToken) {
      console.warn('⚠️ No session token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no session token'
      });
    }

    try {
      console.log('🔍 Verifying session...');
      // Verify session from MongoDB
      const user = await verifySession(sessionToken);
      
      if (!user) {
        console.warn('⚠️ Session verification failed - invalid or expired session');
        return res.status(401).json({
          success: false,
          message: 'Not authorized, invalid or expired session'
        });
      }

      console.log('✅ Session verified for user:', user.name, 'Role:', user.role);

      // Extend session on each request (keep user logged in)
      await extendSession(sessionToken);

      req.user = user;
      next();
    } catch (error) {
      console.error('❌ Error verifying session:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, session verification failed'
      });
    }
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Middleware to check if user is an employee
const isEmployee = async (req, res, next) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employee access required.'
      });
    }
    next();
  } catch (error) {
    console.error('Employee middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authorization'
    });
  }
};

// Middleware to check if user is an employee or admin
const isEmployeeOrAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'employee' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employee or Admin access required.'
      });
    }
    next();
  } catch (error) {
    console.error('Employee/Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authorization'
    });
  }
};

module.exports = { protect, isEmployee, isEmployeeOrAdmin };