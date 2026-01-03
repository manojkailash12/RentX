const Car = require('../models/Car');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

// Update car availability based on current bookings
const updateCarAvailability = async () => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ Database not connected, skipping car availability update');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all cars
    const cars = await Car.find();
    
    for (const car of cars) {
      // Check if car has any ongoing bookings (started but not ended)
      const ongoingBookings = await Booking.find({
        car: car._id,
        bookingStatus: { $in: ['confirmed', 'ongoing'] },
        startDate: { $lte: today },
        endDate: { $gte: today }
      });

      const shouldBeUnavailable = ongoingBookings.length > 0;
      
      // Update availability if it's different from current state
      if (car.availability === shouldBeUnavailable) {
        await Car.findByIdAndUpdate(car._id, { 
          availability: !shouldBeUnavailable 
        });
        
        console.log(`Updated ${car.name} availability to ${!shouldBeUnavailable}`);
      }
    }
    
    // Also update booking statuses
    // Mark bookings as 'ongoing' if they started today
    await Booking.updateMany(
      {
        bookingStatus: 'confirmed',
        startDate: { $lte: today }
      },
      {
        bookingStatus: 'ongoing'
      }
    );
    
    // Mark bookings as 'completed' if they ended yesterday or earlier
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    await Booking.updateMany(
      {
        bookingStatus: 'ongoing',
        endDate: { $lt: today }
      },
      {
        bookingStatus: 'completed'
      }
    );
    
  } catch (error) {
    // Only log error if it's not a connection issue
    if (error.name !== 'MongoServerSelectionError' && error.name !== 'MongoNetworkError') {
      console.error('Error updating car availability:', error.message);
    }
  }
};

// Run the updater every hour
const startCarAvailabilityUpdater = () => {
  // Run immediately after a short delay to ensure DB is connected
  setTimeout(() => {
    updateCarAvailability();
  }, 5000);
  
  // Then run every hour
  setInterval(updateCarAvailability, 60 * 60 * 1000); // 1 hour
  
  console.log('🚗 Car availability updater started');
};

module.exports = {
  updateCarAvailability,
  startCarAvailabilityUpdater
};