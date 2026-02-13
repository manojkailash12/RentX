const Review = require('../models/review');
const Booking = require('../models/booking');
const Car = require('../models/car');
const User = require('../models/user');
const { updateCarRating, canUserReview } = require('../services/reviewService');

/**
 * POST /api/reviews/create
 * Create a new review for a completed booking
 * Auth: Required (verified renter)
 * Body: { bookingId, carId, rating, reviewText }
 */
const createReview = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { bookingId, carId, rating, reviewText } = req.body;

    // Validate required fields
    if (!bookingId || !carId || !rating || !reviewText) {
      return res.json({ 
        success: false, 
        message: 'All fields are required: bookingId, carId, rating, reviewText' 
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.json({ 
        success: false, 
        message: 'Rating must be an integer between 1 and 5' 
      });
    }

    // Validate review text length
    const trimmedText = reviewText.trim();
    if (trimmedText.length < 10) {
      return res.json({ 
        success: false, 
        message: 'Review text must be at least 10 characters long' 
      });
    }
    if (trimmedText.length > 2000) {
      return res.json({ 
        success: false, 
        message: 'Review text cannot exceed 2000 characters' 
      });
    }

    // Check if review text is only whitespace
    if (reviewText.trim().length === 0) {
      return res.json({ 
        success: false, 
        message: 'Review text cannot be empty or contain only whitespace' 
      });
    }

    // Verify user can review this booking
    const eligibility = await canUserReview(userId.toString(), bookingId);
    if (!eligibility.canReview) {
      return res.json({ 
        success: false, 
        message: eligibility.reason 
      });
    }

    // Verify car exists
    const car = await Car.findById(carId);
    if (!car) {
      return res.json({ 
        success: false, 
        message: 'Car not found' 
      });
    }

    // Create review
    const review = await Review.create({
      bookingId,
      carId,
      userId,
      rating,
      reviewText: trimmedText
    });

    // Update car's average rating
    await updateCarRating(carId);

    // Populate user data for response
    await review.populate('userId', 'name email');

    res.json({ 
      success: true, 
      message: 'Review submitted successfully',
      review 
    });
  } catch (error) {
    console.error('Create review error:', error);
    
    // Handle duplicate review error
    if (error.code === 11000) {
      return res.json({ 
        success: false, 
        message: 'You have already submitted a review for this booking' 
      });
    }
    
    res.json({ 
      success: false, 
      message: error.message || 'Failed to create review' 
    });
  }
};

/**
 * GET /api/reviews/car/:carId
 * Get all reviews for a specific car with pagination
 * Auth: Optional
 * Query params: page (default 1), limit (default 10)
 */
const getCarReviews = async (req, res) => {
  try {
    const { carId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Verify car exists
    const car = await Car.findById(carId);
    if (!car) {
      return res.json({ 
        success: false, 
        message: 'Car not found' 
      });
    }

    // Build query - exclude deleted reviews for non-admin users
    const query = { carId, isDeleted: false };

    // Get total count for pagination
    const totalReviews = await Review.countDocuments(query);

    // Get reviews with pagination
    const reviews = await Review.find(query)
      .populate('userId', 'name email image profileImage')
      .populate('ownerResponse.respondedBy', 'name')
      .populate('likedBy', '_id')
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit);

    // Transform userId to user for frontend compatibility
    const transformedReviews = reviews.map(review => {
      const reviewObj = review.toObject();
      reviewObj.user = reviewObj.userId;
      return reviewObj;
    });

    // Calculate rating distribution
    const allReviews = await Review.find(query);
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = allReviews.filter(r => r.rating === i).length;
    }

    res.json({ 
      success: true, 
      reviews: transformedReviews,
      ratingDistribution,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasMore: skip + reviews.length < totalReviews
      },
      carRating: {
        averageRating: car.averageRating || 0,
        totalReviews: car.totalReviews || 0
      }
    });
  } catch (error) {
    console.error('Get car reviews error:', error);
    res.json({ 
      success: false, 
      message: error.message || 'Failed to fetch reviews' 
    });
  }
};

/**
 * GET /api/reviews/user
 * Get all reviews written by the logged-in user
 * Auth: Required
 */
const getUserReviews = async (req, res) => {
  try {
    const { _id: userId } = req.user;

    const reviews = await Review.find({ userId, isDeleted: false })
      .populate('carId', 'brand model image')
      .populate('bookingId', 'bookingId pickupDate returnDate')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      reviews,
      count: reviews.length
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.json({ 
      success: false, 
      message: error.message || 'Failed to fetch user reviews' 
    });
  }
};

/**
 * PUT /api/reviews/:reviewId
 * Update an existing review (user can edit their own review)
 * Auth: Required
 * Body: { rating, reviewText }
 */
const updateReview = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { reviewId } = req.params;
    const { rating, reviewText } = req.body;

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.json({ 
        success: false, 
        message: 'Review not found' 
      });
    }

    // Check if user owns this review
    if (review.userId.toString() !== userId.toString()) {
      return res.json({ 
        success: false, 
        message: 'Not authorized to update this review' 
      });
    }

    // Check if review is deleted
    if (review.isDeleted) {
      return res.json({ 
        success: false, 
        message: 'Cannot update a deleted review' 
      });
    }

    // Validate rating if provided
    if (rating !== undefined) {
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return res.json({ 
          success: false, 
          message: 'Rating must be an integer between 1 and 5' 
        });
      }
      review.rating = rating;
    }

    // Validate review text if provided
    if (reviewText !== undefined) {
      const trimmedText = reviewText.trim();
      if (trimmedText.length < 10) {
        return res.json({ 
          success: false, 
          message: 'Review text must be at least 10 characters long' 
        });
      }
      if (trimmedText.length > 2000) {
        return res.json({ 
          success: false, 
          message: 'Review text cannot exceed 2000 characters' 
        });
      }
      if (trimmedText.length === 0) {
        return res.json({ 
          success: false, 
          message: 'Review text cannot be empty or contain only whitespace' 
        });
      }
      review.reviewText = trimmedText;
    }

    await review.save();

    // Update car rating if rating changed
    if (rating !== undefined) {
      await updateCarRating(review.carId);
    }

    res.json({ 
      success: true, 
      message: 'Review updated successfully',
      review 
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.json({ 
      success: false, 
      message: error.message || 'Failed to update review' 
    });
  }
};

/**
 * DELETE /api/reviews/:reviewId
 * Employee deletes a review (soft delete)
 * Auth: Required (employee only)
 * Body: { reason } (optional)
 */
const deleteReview = async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { reviewId } = req.params;
    const { reason } = req.body;

    // Check if user is employee
    if (role !== 'employee') {
      return res.json({ 
        success: false, 
        message: 'Not authorized. Employee access required.' 
      });
    }

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.json({ 
        success: false, 
        message: 'Review not found' 
      });
    }

    // Check if already deleted
    if (review.isDeleted) {
      return res.json({ 
        success: false, 
        message: 'Review is already deleted' 
      });
    }

    // Soft delete the review
    review.isDeleted = true;
    review.deletedBy = employeeId;
    review.deletedAt = new Date();
    if (reason) {
      review.deletionReason = reason;
    }
    await review.save();

    // Recalculate car's average rating (excluding deleted reviews)
    await updateCarRating(review.carId);

    res.json({ 
      success: true, 
      message: 'Review deleted successfully. Car rating has been recalculated.' 
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.json({ 
      success: false, 
      message: error.message || 'Failed to delete review' 
    });
  }
};

/**
 * POST /api/reviews/:reviewId/respond
 * Car owner responds to a review
 * Auth: Required (car owner)
 * Body: { responseText }
 */
const respondToReview = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { reviewId } = req.params;
    const { responseText } = req.body;

    // Validate response text
    if (!responseText) {
      return res.json({ 
        success: false, 
        message: 'Response text is required' 
      });
    }

    const trimmedResponse = responseText.trim();
    if (trimmedResponse.length < 10) {
      return res.json({ 
        success: false, 
        message: 'Response text must be at least 10 characters long' 
      });
    }
    if (trimmedResponse.length > 1000) {
      return res.json({ 
        success: false, 
        message: 'Response text cannot exceed 1000 characters' 
      });
    }

    // Find review and populate car with owner
    const review = await Review.findById(reviewId).populate('carId');
    if (!review) {
      return res.json({ 
        success: false, 
        message: 'Review not found' 
      });
    }

    // Check if review is deleted
    if (review.isDeleted) {
      return res.json({ 
        success: false, 
        message: 'Cannot respond to a deleted review' 
      });
    }

    // Verify user owns the car
    if (review.carId.owner.toString() !== userId.toString()) {
      return res.json({ 
        success: false, 
        message: 'Not authorized. You can only respond to reviews on your own cars.' 
      });
    }

    // Check if response already exists
    const isUpdating = review.ownerResponse && review.ownerResponse.text;

    // Add or update owner response
    review.ownerResponse = {
      text: trimmedResponse,
      respondedAt: new Date(),
      respondedBy: userId
    };

    await review.save();

    // Populate respondedBy for response
    await review.populate('ownerResponse.respondedBy', 'name');

    res.json({ 
      success: true, 
      message: isUpdating ? 'Response updated successfully' : 'Response added successfully',
      review 
    });
  } catch (error) {
    console.error('Respond to review error:', error);
    res.json({ 
      success: false, 
      message: error.message || 'Failed to respond to review' 
    });
  }
};

/**
 * GET /api/reviews/deleted
 * Employee views all deleted reviews
 * Auth: Required (employee only)
 */
const getDeletedReviews = async (req, res) => {
  try {
    const { role } = req.user;

    // Check if user is employee
    if (role !== 'employee') {
      return res.json({ 
        success: false, 
        message: 'Not authorized. Employee access required.' 
      });
    }

    const deletedReviews = await Review.find({ isDeleted: true })
      .populate('userId', 'name email profileImage')
      .populate('carId', 'brand model')
      .populate('deletedBy', 'name email')
      .populate('likedBy', '_id')
      .sort({ deletedAt: -1 });

    // Transform userId to user for frontend compatibility
    const transformedReviews = deletedReviews.map(review => {
      const reviewObj = review.toObject();
      reviewObj.user = reviewObj.userId;
      return reviewObj;
    });

    res.json({ 
      success: true, 
      reviews: transformedReviews,
      count: transformedReviews.length
    });
  } catch (error) {
    console.error('Get deleted reviews error:', error);
    res.json({ 
      success: false, 
      message: error.message || 'Failed to fetch deleted reviews' 
    });
  }
};

/**
 * POST /api/reviews/submit-from-email
 * Submit review directly from email (no auth required, uses email verification)
 * Body: { bookingId, carId, rating, comment, userEmail }
 */
const submitReviewFromEmail = async (req, res) => {
  try {
    const { bookingId, carId, rating, comment, userEmail } = req.body;

    // Validate required fields
    if (!bookingId || !carId || !rating || !comment || !userEmail) {
      return res.json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Validate rating
    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }

    // Validate comment length
    const trimmedComment = comment.trim();
    if (trimmedComment.length < 10) {
      return res.json({ 
        success: false, 
        message: 'Review must be at least 10 characters long' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Find booking and verify it belongs to this user
    const booking = await Booking.findOne({
      $or: [
        { bookingId: bookingId },
        { _id: bookingId }
      ]
    });

    if (!booking) {
      return res.json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    // Verify booking belongs to user
    const bookingUserId = booking.userId || booking.user;
    if (bookingUserId.toString() !== user._id.toString()) {
      return res.json({ 
        success: false, 
        message: 'This booking does not belong to your account' 
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.json({ 
        success: false, 
        message: 'You can only review completed bookings' 
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ 
      bookingId: booking._id,
      userId: user._id 
    });

    if (existingReview) {
      return res.json({ 
        success: false, 
        message: 'You have already submitted a review for this booking' 
      });
    }

    // Create review
    const review = await Review.create({
      bookingId: booking._id,
      carId,
      userId: user._id,
      rating: ratingNum,
      reviewText: trimmedComment
    });

    // Update car's average rating
    await updateCarRating(carId);

    res.json({ 
      success: true, 
      message: 'Thank you! Your review has been submitted successfully.',
      review 
    });
  } catch (error) {
    console.error('Submit review from email error:', error);
    
    // Handle duplicate review error
    if (error.code === 11000) {
      return res.json({ 
        success: false, 
        message: 'You have already submitted a review for this booking' 
      });
    }
    
    res.json({ 
      success: false, 
      message: error.message || 'Failed to submit review' 
    });
  }
};

/**
 * POST /api/reviews/:reviewId/like
 * Like/Unlike a review (Admin only)
 * Auth: Required (Admin)
 */
const likeReview = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.json({ 
        success: false, 
        message: 'Review not found' 
      });
    }

    // Check if already liked
    const likedIndex = review.likedBy.indexOf(userId);
    
    if (likedIndex > -1) {
      // Unlike
      review.likedBy.splice(likedIndex, 1);
      review.likes = Math.max(0, review.likes - 1);
    } else {
      // Like
      review.likedBy.push(userId);
      review.likes += 1;
    }

    await review.save();

    res.json({ 
      success: true, 
      message: likedIndex > -1 ? 'Review unliked' : 'Review liked',
      likes: review.likes,
      isLiked: likedIndex === -1
    });
  } catch (error) {
    console.error('Like review error:', error);
    res.json({ 
      success: false, 
      message: error.message || 'Failed to like review' 
    });
  }
};

/**
 * POST /api/reviews/:reviewId/feature
 * Feature/Unfeature a review (Admin only)
 * Auth: Required (Admin)
 */
const featureReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.json({ 
        success: false, 
        message: 'Review not found' 
      });
    }

    review.isFeatured = !review.isFeatured;
    review.featuredAt = review.isFeatured ? new Date() : null;

    await review.save();

    res.json({ 
      success: true, 
      message: review.isFeatured ? 'Review featured successfully' : 'Review unfeatured',
      isFeatured: review.isFeatured
    });
  } catch (error) {
    console.error('Feature review error:', error);
    res.json({ 
      success: false, 
      message: error.message || 'Failed to feature review' 
    });
  }
};

/**
 * GET /api/reviews/featured
 * Get all featured reviews
 */
const getFeaturedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isFeatured: true, isDeleted: false })
      .populate('userId', 'name email')
      .populate('carId', 'brand model image')
      .populate('bookingId', 'bookingId pickupDate returnDate')
      .sort({ featuredAt: -1 })
      .limit(20);

    res.json({ 
      success: true, 
      reviews,
      count: reviews.length
    });
  } catch (error) {
    console.error('Get featured reviews error:', error);
    res.json({ 
      success: false, 
      message: error.message || 'Failed to fetch featured reviews' 
    });
  }
};

/**
 * GET /api/reviews/all
 * Get all reviews (employee only)
 * Auth: Required (employee)
 */
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isDeleted: false })
      .populate('userId', 'name email profileImage')
      .populate('carId', 'brand model year image')
      .populate('bookingId', 'bookingId')
      .populate('likedBy', '_id')
      .sort({ createdAt: -1 });

    // Transform userId to user for frontend compatibility
    const transformedReviews = reviews.map(review => {
      const reviewObj = review.toObject();
      reviewObj.user = reviewObj.userId;
      return reviewObj;
    });

    res.json({ 
      success: true, 
      reviews: transformedReviews,
      count: transformedReviews.length
    });
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.json({ 
      success: false, 
      message: error.message || 'Failed to fetch reviews' 
    });
  }
};

module.exports = {
  createReview,
  getCarReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  respondToReview,
  getDeletedReviews,
  submitReviewFromEmail,
  likeReview,
  featureReview,
  getFeaturedReviews,
  getAllReviews
};

