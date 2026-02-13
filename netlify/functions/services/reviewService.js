const Review = require('../models/review');
const Booking = require('../models/booking');
const Car = require('../models/car');
const mongoose = require('mongoose');

/**
 * Calculate and update car's average rating
 * Aggregates non-deleted reviews and updates Car model cache
 * @param {String} carId - Car ID to update rating for
 * @returns {Object} - { averageRating, totalReviews }
 */
async function updateCarRating(carId) {
  try {
    // Aggregate non-deleted reviews for the car
    const result = await Review.aggregate([
      { 
        $match: { 
          carId: new mongoose.Types.ObjectId(carId), 
          isDeleted: false 
        } 
      },
      { 
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);
    
    const averageRating = result[0]?.averageRating || 0;
    const totalReviews = result[0]?.totalReviews || 0;
    
    // Update car document with rounded average (1 decimal place)
    await Car.findByIdAndUpdate(carId, {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      lastRatingUpdate: new Date()
    });
    
    return { 
      averageRating: Math.round(averageRating * 10) / 10, 
      totalReviews 
    };
  } catch (error) {
    console.error('Error calculating car rating:', error);
    throw error;
  }
}

/**
 * Verify that a user can submit a review for a booking
 * Checks: booking exists, belongs to user, is completed, no existing review
 * @param {String} userId - User ID submitting review
 * @param {String} bookingId - Booking ID to review
 * @returns {Object} - { canReview: Boolean, reason?: String, booking?: Object }
 */
async function canUserReview(userId, bookingId) {
  try {
    // Check booking exists and belongs to user
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return { canReview: false, reason: 'Booking not found' };
    }
    
    if (booking.userId.toString() !== userId.toString()) {
      return { canReview: false, reason: 'Booking does not belong to user' };
    }
    
    // Check booking is completed
    if (booking.status !== 'completed') {
      return { canReview: false, reason: 'Can only review completed bookings' };
    }
    
    // Check no existing review for this booking by this user
    const existingReview = await Review.findOne({ 
      bookingId,
      userId 
    });
    if (existingReview) {
      return { canReview: false, reason: 'Review already exists for this booking' };
    }
    
    return { canReview: true, booking };
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    throw error;
  }
}

/**
 * Validate that a user can submit a review for a booking
 * Checks: booking exists, belongs to user, is completed, no existing review
 * @param {String} userId - User ID submitting review
 * @param {String} bookingId - Booking ID to review
 * @returns {Object} - Booking object if valid
 * @throws {Error} - If validation fails
 */
async function validateReviewEligibility(userId, bookingId) {
  // Check booking exists and belongs to user
  const booking = await Booking.findOne({ 
    bookingId, 
    userId 
  });
  
  if (!booking) {
    throw new Error('Booking not found or does not belong to user');
  }
  
  // Check booking is completed
  if (booking.status !== 'completed') {
    throw new Error('Can only review completed bookings');
  }
  
  // Check no existing review for this booking by this user
  const existingReview = await Review.findOne({ 
    bookingId,
    userId 
  });
  if (existingReview) {
    throw new Error('Review already exists for this booking');
  }
  
  return booking;
}

/**
 * Verify that a user owns the car associated with a review
 * @param {String} userId - User ID to verify
 * @param {String} reviewId - Review ID to check
 * @returns {Object} - Review object with populated car
 * @throws {Error} - If review not found or user not authorized
 */
async function verifyCarOwnership(userId, reviewId) {
  const review = await Review.findById(reviewId).populate('carId');
  
  if (!review) {
    throw new Error('Review not found');
  }
  
  if (review.carId.owner.toString() !== userId.toString()) {
    throw new Error('Not authorized to respond to this review');
  }
  
  return review;
}

module.exports = {
  updateCarRating,
  canUserReview,
  validateReviewEligibility,
  verifyCarOwnership
};
