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

// Verify session token and get user ID
const verifySession = async (sessionToken) => {
    try {
        if (!sessionToken) {
            return null;
        }
        
        // Find active session that hasn't expired
        const session = await Session.findOne({
            sessionToken,
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).populate('userId');
        
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

// Extend session expiry (refresh session)
const extendSession = async (sessionToken) => {
    try {
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        await Session.findOneAndUpdate(
            { sessionToken, isActive: true },
            { expiresAt: newExpiresAt }
        );
        
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
