const LoyaltyProgram = require('../models/loyaltyProgram');
const Booking = require('../models/booking');

// Get user loyalty data
exports.getLoyaltyData = async (req, res) => {
  try {
    const userId = req.user._id;

    let loyalty = await LoyaltyProgram.findOne({ user: userId });
    
    if (!loyalty) {
      // Create loyalty account if doesn't exist
      loyalty = await LoyaltyProgram.create({ user: userId });
    }

    const benefits = loyalty.getTierBenefits();

    res.json({
      success: true,
      loyalty: {
        points: loyalty.points,
        tier: loyalty.tier,
        totalEarned: loyalty.totalEarned,
        totalRedeemed: loyalty.totalRedeemed,
        benefits,
        history: loyalty.history.slice(-10).reverse() // Last 10 transactions
      }
    });
  } catch (error) {
    console.error('Get loyalty data error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Earn points (called after booking completion)
exports.earnPoints = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return;

    let loyalty = await LoyaltyProgram.findOne({ user: booking.user });
    if (!loyalty) {
      loyalty = await LoyaltyProgram.create({ user: booking.user });
    }

    // Calculate points: 1 point per ₹100 spent * tier multiplier
    const benefits = loyalty.getTierBenefits();
    const basePoints = Math.floor(booking.totalPrice / 100);
    const earnedPoints = Math.floor(basePoints * benefits.pointsMultiplier);

    loyalty.points += earnedPoints;
    loyalty.totalEarned += earnedPoints;
    loyalty.history.push({
      type: 'earned',
      points: earnedPoints,
      description: `Earned from booking #${booking.bookingId}`,
      booking: bookingId
    });

    loyalty.updateTier();
    await loyalty.save();

    return earnedPoints;
  } catch (error) {
    console.error('Earn points error:', error);
  }
};

// Redeem points
exports.redeemPoints = async (req, res) => {
  try {
    const { points } = req.body;
    const userId = req.user._id;

    const loyalty = await LoyaltyProgram.findOne({ user: userId });
    if (!loyalty) {
      return res.status(404).json({ success: false, message: 'Loyalty account not found' });
    }

    if (loyalty.points < points) {
      return res.status(400).json({ success: false, message: 'Insufficient points' });
    }

    // Minimum redemption: 100 points = ₹100 discount
    if (points < 100) {
      return res.status(400).json({ success: false, message: 'Minimum 100 points required for redemption' });
    }

    loyalty.points -= points;
    loyalty.totalRedeemed += points;
    loyalty.history.push({
      type: 'redeemed',
      points: points,
      description: `Redeemed ${points} points for ₹${points} discount`
    });

    await loyalty.save();

    res.json({
      success: true,
      message: 'Points redeemed successfully',
      discount: points, // 1 point = ₹1
      remainingPoints: loyalty.points
    });
  } catch (error) {
    console.error('Redeem points error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get loyalty history
exports.getLoyaltyHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const loyalty = await LoyaltyProgram.findOne({ user: userId });
    if (!loyalty) {
      return res.json({
        success: true,
        history: [],
        pagination: { page: 1, limit, total: 0, pages: 0 }
      });
    }

    const total = loyalty.history.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const history = loyalty.history.slice().reverse().slice(start, end);

    res.json({
      success: true,
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get loyalty history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate discount for booking
exports.calculateLoyaltyDiscount = async (req, res) => {
  try {
    const { totalPrice } = req.body;
    const userId = req.user._id;

    const loyalty = await LoyaltyProgram.findOne({ user: userId });
    if (!loyalty) {
      return res.json({
        success: true,
        discount: 0,
        tierDiscount: 0,
        pointsDiscount: 0
      });
    }

    const benefits = loyalty.getTierBenefits();
    const tierDiscount = Math.floor((totalPrice * benefits.discount) / 100);
    
    // Max points discount: 50% of remaining amount
    const maxPointsDiscount = Math.floor((totalPrice - tierDiscount) * 0.5);
    const availablePointsDiscount = Math.min(loyalty.points, maxPointsDiscount);

    res.json({
      success: true,
      discount: tierDiscount + availablePointsDiscount,
      tierDiscount,
      pointsDiscount: availablePointsDiscount,
      availablePoints: loyalty.points,
      tier: loyalty.tier
    });
  } catch (error) {
    console.error('Calculate discount error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
