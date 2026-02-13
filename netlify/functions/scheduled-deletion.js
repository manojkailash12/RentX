const { schedule } = require('@netlify/functions');
const mongoose = require('mongoose');
const { processScheduledDeletions } = require('./utils/accountDeletion');

// Run every minute
exports.handler = schedule('* * * * *', async (event) => {
  console.log('🕐 Running scheduled account deletion job...');
  
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Database configuration missing' })
      };
    }

    // Connect if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');
    }

    // Process scheduled deletions
    const result = await processScheduledDeletions();
    
    console.log(`✅ Scheduled deletion job completed. Deleted ${result.deletedCount} accounts`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Processed ${result.deletedCount} account deletions`,
        deletedCount: result.deletedCount,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ Error in scheduled deletion job:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
});
