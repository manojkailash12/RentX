const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Core review data
  bookingId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  carId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Car', 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  reviewText: { 
    type: String, 
    required: true,
    minlength: 10,
    maxlength: 2000
  },
  
  // Owner response
  ownerResponse: {
    text: { 
      type: String, 
      minlength: 10,
      maxlength: 1000 
    },
    respondedAt: { 
      type: Date 
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Admin features
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredAt: {
    type: Date
  },
  
  // Moderation and deletion
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  deletedAt: { 
    type: Date 
  },
  deletionReason: { 
    type: String 
  },
  
  // Legacy flagging fields (kept for backward compatibility)
  isFlagged: { 
    type: Boolean, 
    default: false 
  },
  flaggedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  flaggedAt: { 
    type: Date 
  },
  flagReason: { 
    type: String 
  }
}, { 
  timestamps: true 
});

// Indexes for performance
reviewSchema.index({ carId: 1, createdAt: -1 }); // Car reviews sorted by date
reviewSchema.index({ userId: 1, createdAt: -1 }); // User reviews
reviewSchema.index({ bookingId: 1, userId: 1 }, { unique: true }); // One review per user per booking
reviewSchema.index({ isDeleted: 1 }); // Filter deleted reviews
reviewSchema.index({ isFlagged: 1 }); // Flagged reviews

module.exports = mongoose.model('Review', reviewSchema);
