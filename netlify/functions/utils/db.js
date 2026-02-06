const mongoose = require("mongoose");

let isConnected = false;
let connectionPromise = null;

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

    try {
        // Set mongoose options globally
        mongoose.set('strictQuery', false);
        
        // Set up event listeners only once
        if (!mongoose.connection.listenerCount('connected')) {
            mongoose.connection.on('connected', () => {
                console.log("✅ Database Connected");
                isConnected = true;
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

        // Create connection promise
        console.log("🔄 Connecting to MongoDB...");
        connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
            socketTimeoutMS: 0, // No timeout
            minPoolSize: 2
        });

        await connectionPromise;
        isConnected = true;
        console.log("✅ Database connection established");
    } catch (error) {
        console.error("❌ Database connection failed:", error.message);
        isConnected = false;
        connectionPromise = null;
        throw error;
    }
};

module.exports = connectDB;