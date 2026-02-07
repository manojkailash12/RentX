const mongoose = require("mongoose");

let isConnected = false;
let connectionPromise = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const connectDB = async () => {
    // Check if mongoose is already connected
    if (mongoose.connection.readyState === 1) {
        isConnected = true;
        return;
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
            return;
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
    }

    // Retry logic
    while (retryCount < MAX_RETRIES) {
        try {
            console.log(`🔄 Connecting to MongoDB... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            
            connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 10000, // Reduced to 10 seconds per attempt
                socketTimeoutMS: 45000, // 45 seconds
                connectTimeoutMS: 10000, // 10 seconds
                minPoolSize: 2,
                retryWrites: true,
                retryReads: true,
                family: 4 // Force IPv4
            });

            await connectionPromise;
            isConnected = true;
            retryCount = 0;
            console.log("✅ Database connection established");
            return;
        } catch (error) {
            retryCount++;
            console.error(`❌ Database connection failed (Attempt ${retryCount}/${MAX_RETRIES}):`, error.message);
            isConnected = false;
            connectionPromise = null;
            
            if (retryCount >= MAX_RETRIES) {
                console.error("❌ Max retries reached. Database connection failed.");
                throw error;
            }
            
            // Wait before retrying
            console.log(`⏳ Retrying in ${RETRY_DELAY/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
};

module.exports = connectDB;