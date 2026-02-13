const Session = require('../models/session');
const crypto = require('crypto');

// Generate a secure random session token
const generateSessionToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Create a new session in MongoDB
const createSession = async (userId, userAgent = '', ipAddress = '') => {
    try {
        // Generate session token
        const sessionToken = generateSessionToken();
        
        // Session expires in 7 days
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        // Create session in MongoDB
        const session = await Session.create({
            userId,
            sessionToken,
            expiresAt,
            userAgent,
            ipAddress,
            isActive: true
        });
        
        return sessionToken;
    } catch (error) {
        console.error('Error creating session:', error);
        throw error;
    }
};

// Verify session token and get user ID with timeout
const verifySession = async (sessionToken) => {
    try {
        if (!sessionToken) {
            return null;
        }
        
        // Add timeout to prevent hanging - INCREASED timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Session verification timeout')), 10000); // Increased to 10s
        });
        
        // Find active session that hasn't expired
        const sessionPromise = Session.findOne({
            sessionToken,
            isActive: true,
            expiresAt: { $gt: new Date() }
        })
        .maxTimeMS(10000) // MongoDB query timeout - increased to 10s
        .populate('userId');
        
        const session = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!session) {
            return null;
        }
        
        return session.userId;
    } catch (error) {
        console.error('Error verifying session:', error);
        return null;
    }
};

// Delete a specific session (logout)
const deleteSession = async (sessionToken) => {
    try {
        await Session.findOneAndUpdate(
            { sessionToken },
            { isActive: false }
        );
        return true;
    } catch (error) {
        console.error('Error deleting session:', error);
        return false;
    }
};

// Delete all sessions for a user (logout from all devices)
const deleteAllUserSessions = async (userId) => {
    try {
        await Session.updateMany(
            { userId },
            { isActive: false }
        );
        return true;
    } catch (error) {
        console.error('Error deleting user sessions:', error);
        return false;
    }
};

// Clean up expired sessions (can be run periodically)
const cleanupExpiredSessions = async () => {
    try {
        const result = await Session.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        console.log(`Cleaned up ${result.deletedCount} expired sessions`);
        return result.deletedCount;
    } catch (error) {
        console.error('Error cleaning up sessions:', error);
        return 0;
    }
};

// Extend session expiry (refresh session) with timeout
const extendSession = async (sessionToken) => {
    try {
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Extend session timeout')), 3000);
        });
        
        const updatePromise = Session.findOneAndUpdate(
            { sessionToken, isActive: true },
            { expiresAt: newExpiresAt }
        ).maxTimeMS(3000);
        
        await Promise.race([updatePromise, timeoutPromise]);
        
        return true;
    } catch (error) {
        console.error('Error extending session:', error);
        return false;
    }
};

module.exports = {
    createSession,
    verifySession,
    deleteSession,
    deleteAllUserSessions,
    cleanupExpiredSessions,
    extendSession
};
