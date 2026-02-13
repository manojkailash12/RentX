const mongoose = require('mongoose');
const Car = require('../models/car');
require('dotenv').config();

/**
 * Migration script to approve all existing cars in the database
 * Run this once to update existing cars to isApproved: true
 */
async function approveAllCars() {
  try {
    console.log('🚀 Starting car approval migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all cars that are not approved
    const unapprovedCars = await Car.find({ isApproved: false });
    console.log(`📋 Found ${unapprovedCars.length} unapproved cars`);
    
    if (unapprovedCars.length === 0) {
      console.log('✅ All cars are already approved!');
      return;
    }
    
    // Update all cars to approved
    const result = await Car.updateMany(
      { isApproved: false },
      { 
        $set: { 
          isApproved: true,
          approvedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Successfully approved ${result.modifiedCount} cars`);
    
    // Verify the update
    const remainingUnapproved = await Car.countDocuments({ isApproved: false });
    console.log(`📊 Remaining unapproved cars: ${remainingUnapproved}`);
    
    // Show total approved cars
    const totalApproved = await Car.countDocuments({ isApproved: true });
    console.log(`✅ Total approved cars: ${totalApproved}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
approveAllCars();
