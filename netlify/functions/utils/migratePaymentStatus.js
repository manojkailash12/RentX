const mongoose = require('mongoose');
const Booking = require('../models/booking.js');
require('dotenv').config();

/**
 * Migration script to update payment status from old values to new values
 * Old: "pending", "completed", "failed"
 * New: "pay_at_dropoff", "paid", "failed"
 */
async function migratePaymentStatus() {
  try {
    console.log('🔄 Starting payment status migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Update "pending" to "pay_at_dropoff"
    const pendingResult = await Booking.updateMany(
      { paymentStatus: 'pending' },
      { $set: { paymentStatus: 'pay_at_dropoff' } }
    );
    console.log(`✅ Updated ${pendingResult.modifiedCount} bookings from "pending" to "pay_at_dropoff"`);
    
    // Update "completed" to "paid"
    const completedResult = await Booking.updateMany(
      { paymentStatus: 'completed' },
      { $set: { paymentStatus: 'paid' } }
    );
    console.log(`✅ Updated ${completedResult.modifiedCount} bookings from "completed" to "paid"`);
    
    // Count total bookings
    const totalBookings = await Booking.countDocuments();
    console.log(`📊 Total bookings in database: ${totalBookings}`);
    
    // Show current status distribution
    const statusDistribution = await Booking.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n📊 Current payment status distribution:');
    statusDistribution.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migratePaymentStatus();
}

module.exports = migratePaymentStatus;
