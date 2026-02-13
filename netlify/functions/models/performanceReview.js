const mongoose = require('mongoose');

const performanceReviewSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  reviewPeriod: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  reviewType: {
    type: String,
    enum: ['quarterly', 'half-yearly', 'annual', 'probation'],
    required: true
  },
  ratings: {
    attendance: {
      score: { type: Number, min: 1, max: 5 },
      comments: String
    },
    punctuality: {
      score: { type: Number, min: 1, max: 5 },
      comments: String
    },
    workQuality: {
      score: { type: Number, min: 1, max: 5 },
      comments: String
    },
    teamwork: {
      score: { type: Number, min: 1, max: 5 },
      comments: String
    },
    communication: {
      score: { type: Number, min: 1, max: 5 },
      comments: String
    },
    initiative: {
      score: { type: Number, min: 1, max: 5 },
      comments: String
    },
    customerService: {
      score: { type: Number, min: 1, max: 5 },
      comments: String
    }
  },
  overallScore: {
    type: Number,
    min: 1,
    max: 5
  },
  strengths: [String],
  areasForImprovement: [String],
  goals: [{
    description: String,
    deadline: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    }
  }],
  trainingRecommendations: [String],
  reviewerComments: String,
  employeeComments: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'completed', 'acknowledged'],
    default: 'draft'
  },
  acknowledgedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

performanceReviewSchema.index({ employeeId: 1, 'reviewPeriod.start': 1 });

const PerformanceReview = mongoose.models.PerformanceReview || mongoose.model('PerformanceReview', performanceReviewSchema);

module.exports = PerformanceReview;
