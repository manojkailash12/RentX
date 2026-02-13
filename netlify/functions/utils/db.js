const mongoose = require("mongoose");

let isConnected = false;
let connectionPromise = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 500; // Start with 500ms (faster)
const MAX_RETRY_DELAY = 3000; // Max 3 seconds (reduced from 8s)

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current retry attempt (0-indexed)
 * @returns {number} Delay in milliseconds
 */
const getRetryDelay = (attempt) => {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  return Math.min(delay, MAX_RETRY_DELAY);
};

/**
 * Connect to MongoDB with connection pooling and retry logic
 * Implements exponential backoff for retries
 * Reuses connections across serverless function invocations
 */
const connectDB = async () => {
    // Check if mongoose is already connected
    if (mongoose.connection.readyState === 1) {
        isConnected = true;
        return mongoose.connection;
    }

    // If connection is in progress, wait for it
    if (connectionPromise) {
        return connectionPromise;
    }

    // If currently connecting, wait a bit
    if (mongoose.connection.readyState === 2) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (mongoose.connection.readyState === 1) {
            isConnected = true;
            return mongoose.connection;
        }
    }

    // Set mongoose options globally
    mongoose.set('strictQuery', false);
    
    // Set up event listeners only once
    if (!mongoose.connection.listenerCount('connected')) {
        mongoose.connection.on('connected', () => {
            console.log("✅ Database Connected");
            isConnected = true;
            retryCount = 0;
            connectionPromise = null;
        });
        
        mongoose.connection.on('error', (err) => {
            console.error("❌ Database Error:", err.message);
            isConnected = false;
            connectionPromise = null;
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log("⚠️ Database Disconnected");
            isConnected = false;
            connectionPromise = null;
        });

        // Handle idle connections (close after 5 minutes of inactivity)
        mongoose.connection.on('close', () => {
            console.log("🔒 Database Connection Closed");
            isConnected = false;
            connectionPromise = null;
        });
    }

    // Retry logic with exponential backoff
    while (retryCount < MAX_RETRIES) {
        try {
            const delay = retryCount > 0 ? getRetryDelay(retryCount - 1) : 0;
            if (delay > 0) {
                console.log(`⏳ Waiting ${delay/1000}s before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            console.log(`🔄 Connecting to MongoDB... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            
            // Connection options optimized for serverless environment
            const options = {
                // Connection pooling
                maxPoolSize: 10,        // Maximum 10 connections in pool
                minPoolSize: 2,         // Minimum 2 connections
                
                // Timeouts - INCREASED for slow networks
                serverSelectionTimeoutMS: 15000,  // 15 seconds (increased from 5s)
                socketTimeoutMS: 45000,           // 45 seconds socket timeout
                connectTimeoutMS: 15000,          // 15 seconds (increased from 5s)
                
                // Retry configuration
                retryWrites: true,      // Retry write operations
                retryReads: true,       // Retry read operations
                
                // Network configuration
                family: 4,              // Force IPv4 (more reliable in serverless)
                
                // Connection management
                maxIdleTimeMS: 300000,  // Close idle connections after 5 minutes
                
                // Buffering - CRITICAL: Enable buffering to prevent "Cannot call before connection" errors
                bufferCommands: true,   // Enable buffering (changed from false)
                autoIndex: false,       // Disable auto-indexing in production
                
                // DNS resolution
                directConnection: false, // Use SRV connection string
                tls: true               // Enable TLS
            };

            connectionPromise = mongoose.connect(process.env.MONGODB_URI, options);

            await connectionPromise;
            isConnected = true;
            retryCount = 0;
            console.log("✅ Database connection established");
            return mongoose.connection;
        } catch (error) {
            retryCount++;
            console.error(`❌ Database connection failed (Attempt ${retryCount}/${MAX_RETRIES}):`, error.message);
            
            // Check if it's a network/DNS timeout error
            if (error.message.includes('ETIMEOUT') || error.message.includes('querySrv')) {
                console.error("⚠️ Network/DNS timeout detected. Possible causes:");
                console.error("   1. Slow internet connection");
                console.error("   2. Firewall blocking MongoDB Atlas");
                console.error("   3. VPN/Proxy interference");
                console.error("   4. MongoDB Atlas cluster paused/unavailable");
            }
            
            isConnected = false;
            connectionPromise = null;
            
            if (retryCount >= MAX_RETRIES) {
                console.error("❌ Max retries reached. Database connection failed.");
                console.error("💡 Troubleshooting tips:");
                console.error("   - Check your internet connection");
                console.error("   - Verify MongoDB Atlas cluster is running");
                console.error("   - Check firewall/antivirus settings");
                console.error("   - Try using mobile hotspot");
                throw new Error(`Database connection failed after ${MAX_RETRIES} attempts: ${error.message}`);
            }
        }
    }
};

/**
 * Close database connection gracefully
 * Useful for cleanup in non-serverless environments
 */
const closeDB = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        isConnected = false;
        connectionPromise = null;
        console.log("🔒 Database connection closed");
    }
};

/**
 * Get current connection status
 * @returns {Object} Connection status information
 */
const getConnectionStatus = () => {
    return {
        isConnected,
        readyState: mongoose.connection.readyState,
        readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        retryCount
    };
};

module.exports = connectDB;
module.exports.closeDB = closeDB;
module.exports.getConnectionStatus = getConnectionStatus;