const mongoose = require('mongoose');

const loyaltyProgramSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  totalEarned: {
    type: Number,
    default: 0
  },
  totalRedeemed: {
    type: Number,
    default: 0
  },
  history: [{
    type: {
      type: String,
      enum: ['earned', 'redeemed', 'expired'],
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    description: String,
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Calculate tier based on total earned points
loyaltyProgramSchema.methods.updateTier = function() {
  if (this.totalEarned >= 10000) {
    this.tier = 'platinum';
  } else if (this.totalEarned >= 5000) {
    this.tier = 'gold';
  } else if (this.totalEarned >= 2000) {
    this.tier = 'silver';
  } else {
    this.tier = 'bronze';
  }
};

// Get tier benefits
loyaltyProgramSchema.methods.getTierBenefits = function() {
  const benefits = {
    bronze: {
      discount: 0,
      pointsMultiplier: 1,
      perks: ['Earn 1 point per ₹100 spent']
    },
    silver: {
      discount: 5,
      pointsMultiplier: 1.25,
      perks: ['5% discount on bookings', 'Earn 1.25 points per ₹100 spent', 'Priority support']
    },
    gold: {
      discount: 10,
      pointsMultiplier: 1.5,
      perks: ['10% discount on bookings', 'Earn 1.5 points per ₹100 spent', 'Free cancellation', 'Priority support']
    },
    platinum: {
      discount: 15,
      pointsMultiplier: 2,
      perks: ['15% discount on bookings', 'Earn 2 points per ₹100 spent', 'Free cancellation', 'Free upgrades', '24/7 dedicated support']
    }
  };
  return benefits[this.tier];
};

module.exports = mongoose.model('LoyaltyProgram', loyaltyProgramSchema);
