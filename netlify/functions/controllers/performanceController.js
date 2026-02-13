const PerformanceReview = require('../models/performanceReview');
const Employee = require('../models/employee');
const Attendance = require('../models/attendance');

// Create performance review
exports.createReview = async (req, res) => {
  try {
    const reviewerId = req.user._id;
    const reviewData = {
      ...req.body,
      reviewedBy: reviewerId
    };

    // Calculate overall score
    const ratings = reviewData.ratings;
    const scores = Object.values(ratings).map(r => r.score).filter(s => s);
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    reviewData.overallScore = Math.round(overallScore * 10) / 10;

    const review = await PerformanceReview.create(reviewData);

    const populatedReview = await PerformanceReview.findById(review._id)
      .populate({
        path: 'employeeId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('reviewedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Performance review created successfully',
      review: populatedReview
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get reviews
exports.getReviews = async (req, res) => {
  try {
    const { employeeId, status, reviewType } = req.query;

    const filter = {};

    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        filter.employeeId = employee._id;
      }
    }

    if (status) filter.status = status;
    if (reviewType) filter.reviewType = reviewType;

    const reviews = await PerformanceReview.find(filter)
      .populate({
        path: 'employeeId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      reviews,
      count: reviews.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update review
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const updates = req.body;

    // Recalculate overall score if ratings updated
    if (updates.ratings) {
      const scores = Object.values(updates.ratings).map(r => r.score).filter(s => s);
      updates.overallScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }

    const review = await PerformanceReview.findByIdAndUpdate(
      reviewId,
      updates,
      { new: true }
    )
      .populate({
        path: 'employeeId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('reviewedBy', 'name email');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Employee acknowledge review
exports.acknowledgeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { employeeComments } = req.body;
    const userId = req.user._id;

    const review = await PerformanceReview.findById(reviewId)
      .populate('employeeId');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (!review.employeeId.userId.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    review.status = 'acknowledged';
    review.acknowledgedAt = new Date();
    if (employeeComments) {
      review.employeeComments = employeeComments;
    }

    await review.save();

    res.json({
      success: true,
      message: 'Review acknowledged successfully',
      review
    });
  } catch (error) {
    console.error('Acknowledge review error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get performance analytics
exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    const filter = {};

    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        filter.employeeId = employee._id;
      }
    }

    if (startDate || endDate) {
      filter['reviewPeriod.start'] = {};
      if (startDate) filter['reviewPeriod.start'].$gte = new Date(startDate);
      if (endDate) filter['reviewPeriod.start'].$lte = new Date(endDate);
    }

    const reviews = await PerformanceReview.find(filter);

    // Calculate trends
    const trends = {
      overallScores: [],
      attendanceScores: [],
      punctualityScores: [],
      workQualityScores: [],
      averageScore: 0,
      improvement: 0
    };

    reviews.forEach(review => {
      trends.overallScores.push({
        date: review.reviewPeriod.start,
        score: review.overallScore
      });
      trends.attendanceScores.push(review.ratings.attendance?.score || 0);
      trends.punctualityScores.push(review.ratings.punctuality?.score || 0);
      trends.workQualityScores.push(review.ratings.workQuality?.score || 0);
    });

    if (reviews.length > 0) {
      trends.averageScore = reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length;
      
      if (reviews.length > 1) {
        const firstScore = reviews[reviews.length - 1].overallScore;
        const lastScore = reviews[0].overallScore;
        trends.improvement = ((lastScore - firstScore) / firstScore) * 100;
      }
    }

    res.json({
      success: true,
      analytics: trends,
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('Get performance analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
