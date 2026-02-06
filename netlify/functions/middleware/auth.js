const jwt = require('jsonwebtoken');
const User = require('../models/user.js');
const { verifySession, extendSession } = require('../utils/sessionManager');

// MongoDB session-based authentication
const protect = async (req, res, next) => {
  try {
    let sessionToken;

    // Get session token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      sessionToken = req.headers.authorization.split(' ')[1];
    }

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no session token'
      });
    }

    try {
      // Verify session from MongoDB
      const user = await verifySession(sessionToken);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, invalid or expired session'
        });
      }

      // Extend session on each request (keep user logged in)
      await extendSession(sessionToken);

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, session verification failed'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

module.exports = { protect };