const Booking = require('../models/booking');

// Insurance plans configuration
const INSURANCE_PLANS = {
  basic: {
    name: 'Basic Insurance',
    coverage: 500000, // ₹5 Lakh
    costPerDay: 200,
    features: [
      'Third-party liability coverage',
      'Basic accident coverage',
      'Roadside assistance'
    ]
  },
  comprehensive: {
    name: 'Comprehensive Insurance',
    coverage: 1000000, // ₹10 Lakh
    costPerDay: 400,
    features: [
      'Full damage coverage',
      'Theft protection',
      'Third-party liability',
      'Personal accident cover',
      '24/7 roadside assistance',
      'Zero depreciation'
    ]
  },
  premium: {
    name: 'Premium Insurance',
    coverage: 2000000, // ₹20 Lakh
    costPerDay: 600,
    features: [
      'Complete damage coverage',
      'Theft & fire protection',
      'Third-party liability',
      'Personal accident cover (₹10 Lakh)',
      '24/7 premium roadside assistance',
      'Zero depreciation',
      'Engine protection',
      'Return to invoice cover',
      'Key replacement'
    ]
  }
};

// Get available insurance plans
exports.getInsurancePlans = async (req, res) => {
  try {
    const { totalDays } = req.query;
    const days = parseInt(totalDays) || 1;

    const plans = Object.entries(INSURANCE_PLANS).map(([key, plan]) => ({
      type: key,
      name: plan.name,
      coverage: plan.coverage,
      costPerDay: plan.costPerDay,
      totalCost: plan.costPerDay * days,
      features: plan.features
    }));

    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Get insurance plans error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate insurance cost
exports.calculateInsuranceCost = async (req, res) => {
  try {
    const { insuranceType, totalDays } = req.body;

    if (!insuranceType || !totalDays) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insurance type and total days are required' 
      });
    }

    const plan = INSURANCE_PLANS[insuranceType];
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid insurance type' 
      });
    }

    const cost = plan.costPerDay * totalDays;

    res.json({
      success: true,
      insuranceType,
      coverage: plan.coverage,
      costPerDay: plan.costPerDay,
      totalDays,
      totalCost: cost,
      features: plan.features
    });
  } catch (error) {
    console.error('Calculate insurance cost error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add insurance to existing booking
exports.addInsuranceToBooking = async (req, res) => {
  try {
    const { bookingId, insuranceType } = req.body;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    // Check if user owns this booking
    const isOwner = booking.userId?.toString() === userId.toString() || 
                   booking.user?.toString() === userId.toString();
    
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    // Check if booking is still active
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot add insurance to completed or cancelled booking' 
      });
    }

    const plan = INSURANCE_PLANS[insuranceType];
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid insurance type' 
      });
    }

    const insuranceCost = plan.costPerDay * booking.totalDays;

    booking.insurance = {
      selected: true,
      type: insuranceType,
      cost: insuranceCost,
      coverage: plan.coverage,
      provider: 'RentX Insurance'
    };

    // Update total amount
    booking.totalAmount += insuranceCost;
    if (booking.ownerType === 'user' || booking.ownerType === 'employee') {
      const additionalOwnerEarnings = Math.round(insuranceCost * 40 / 100);
      const additionalPlatformEarnings = insuranceCost - additionalOwnerEarnings;
      booking.ownerEarnings += additionalOwnerEarnings;
      booking.platformEarnings += additionalPlatformEarnings;
    } else {
      // Admin car: all insurance goes to platform
      booking.platformEarnings += insuranceCost;
    }

    await booking.save();

    res.json({
      success: true,
      message: 'Insurance added successfully',
      insurance: booking.insurance,
      newTotalAmount: booking.totalAmount
    });
  } catch (error) {
    console.error('Add insurance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get insurance details for a booking
exports.getBookingInsurance = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    // Check authorization
    const isOwner = booking.userId?.toString() === userId.toString() || 
                   booking.user?.toString() === userId.toString();
    const isCarOwner = booking.ownerId?.toString() === userId.toString() || 
                      booking.owner?.toString() === userId.toString();
    
    if (!isOwner && !isCarOwner && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    res.json({
      success: true,
      insurance: booking.insurance || { selected: false }
    });
  } catch (error) {
    console.error('Get booking insurance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
