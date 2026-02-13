const Car = require('../models/car');
const Booking = require('../models/booking');
const PricingRule = require('../models/pricingRule');

// Calculate dynamic price
exports.calculateDynamicPrice = async (req, res) => {
  try {
    const { carId, pickupDate, returnDate, location } = req.body;

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    const basePrice = car.pricePerDay;
    const pickup = new Date(pickupDate);
    const returnD = new Date(returnDate);
    const duration = Math.ceil((returnD - pickup) / (1000 * 60 * 60 * 24));

    // Get demand level
    const demandLevel = await calculateDemandLevel(carId, pickup, returnD, location);

    // Get applicable pricing rules
    const rules = await PricingRule.find({
      isActive: true,
      $or: [
        { 'conditions.category': car.category },
        { 'conditions.location': location },
        { 'conditions.demandLevel': demandLevel },
        {
          'conditions.dateRange.start': { $lte: pickup },
          'conditions.dateRange.end': { $gte: returnD }
        },
        {
          'conditions.minDuration': { $lte: duration },
          'conditions.maxDuration': { $gte: duration }
        }
      ]
    }).sort({ priority: -1 });

    let finalPrice = basePrice;
    const appliedRules = [];

    // Apply rules
    for (const rule of rules) {
      let applies = true;

      // Check all conditions
      if (rule.conditions.category && rule.conditions.category !== car.category) {
        applies = false;
      }

      if (rule.conditions.location && rule.conditions.location !== location) {
        applies = false;
      }

      if (rule.conditions.demandLevel && rule.conditions.demandLevel !== demandLevel) {
        applies = false;
      }

      if (rule.conditions.minDuration && duration < rule.conditions.minDuration) {
        applies = false;
      }

      if (rule.conditions.maxDuration && duration > rule.conditions.maxDuration) {
        applies = false;
      }

      if (rule.conditions.dayOfWeek && rule.conditions.dayOfWeek.length > 0) {
        const dayName = pickup.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (!rule.conditions.dayOfWeek.includes(dayName)) {
          applies = false;
        }
      }

      if (applies) {
        if (rule.adjustment.type === 'percentage') {
          finalPrice = finalPrice * (1 + rule.adjustment.value / 100);
        } else {
          finalPrice = finalPrice + rule.adjustment.value;
        }

        appliedRules.push({
          name: rule.name,
          type: rule.type,
          adjustment: rule.adjustment
        });
      }
    }

    // Ensure minimum price
    finalPrice = Math.max(finalPrice, basePrice * 0.5);

    const totalAmount = finalPrice * duration;

    res.json({
      success: true,
      pricing: {
        basePrice,
        finalPricePerDay: Math.round(finalPrice),
        duration,
        totalAmount: Math.round(totalAmount),
        demandLevel,
        appliedRules,
        savings: basePrice > finalPrice ? (basePrice - finalPrice) * duration : 0,
        surcharge: finalPrice > basePrice ? (finalPrice - basePrice) * duration : 0
      }
    });
  } catch (error) {
    console.error('Calculate dynamic price error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate demand level
async function calculateDemandLevel(carId, startDate, endDate, location) {
  try {
    // Count bookings in the same period
    const bookingsCount = await Booking.countDocuments({
      pickupDate: { $lte: endDate },
      returnDate: { $gte: startDate },
      status: { $in: ['confirmed', 'pending'] },
      pickupCity: location
    });

    // Count available cars in location
    const availableCars = await Car.countDocuments({
      location,
      isAvailable: true,
      isApproved: true
    });

    const demandRatio = availableCars > 0 ? bookingsCount / availableCars : 0;

    if (demandRatio < 0.3) return 'low';
    if (demandRatio < 0.6) return 'medium';
    if (demandRatio < 0.8) return 'high';
    return 'peak';
  } catch (error) {
    console.error('Calculate demand level error:', error);
    return 'medium';
  }
}

// Create pricing rule
exports.createPricingRule = async (req, res) => {
  try {
    const adminId = req.user._id;
    const ruleData = {
      ...req.body,
      createdBy: adminId
    };

    const rule = await PricingRule.create(ruleData);

    res.status(201).json({
      success: true,
      message: 'Pricing rule created successfully',
      rule
    });
  } catch (error) {
    console.error('Create pricing rule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all pricing rules
exports.getPricingRules = async (req, res) => {
  try {
    const { type, isActive } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const rules = await PricingRule.find(filter)
      .populate('createdBy', 'name email')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      rules,
      count: rules.length
    });
  } catch (error) {
    console.error('Get pricing rules error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update pricing rule
exports.updatePricingRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    const rule = await PricingRule.findByIdAndUpdate(
      ruleId,
      updates,
      { new: true }
    ).populate('createdBy', 'name email');

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Pricing rule not found'
      });
    }

    res.json({
      success: true,
      message: 'Pricing rule updated successfully',
      rule
    });
  } catch (error) {
    console.error('Update pricing rule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete pricing rule
exports.deletePricingRule = async (req, res) => {
  try {
    const { ruleId } = req.params;

    const rule = await PricingRule.findByIdAndDelete(ruleId);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Pricing rule not found'
      });
    }

    res.json({
      success: true,
      message: 'Pricing rule deleted successfully'
    });
  } catch (error) {
    console.error('Delete pricing rule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get demand analytics
exports.getDemandAnalytics = async (req, res) => {
  try {
    const { location, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    const filter = {
      pickupDate: { $gte: start, $lte: end }
    };

    if (location) {
      filter.pickupCity = location;
    }

    const bookings = await Booking.find(filter)
      .populate('carId', 'category location pricePerDay');

    // Analyze by category
    const categoryDemand = {};
    const locationDemand = {};
    const dailyDemand = {};

    bookings.forEach(booking => {
      if (booking.carId) {
        // Category demand
        const category = booking.carId.category;
        if (!categoryDemand[category]) {
          categoryDemand[category] = { count: 0, revenue: 0 };
        }
        categoryDemand[category].count++;
        categoryDemand[category].revenue += booking.totalAmount;

        // Location demand
        const loc = booking.pickupCity;
        if (!locationDemand[loc]) {
          locationDemand[loc] = { count: 0, revenue: 0 };
        }
        locationDemand[loc].count++;
        locationDemand[loc].revenue += booking.totalAmount;

        // Daily demand
        const date = booking.pickupDate.toISOString().split('T')[0];
        if (!dailyDemand[date]) {
          dailyDemand[date] = { count: 0, revenue: 0 };
        }
        dailyDemand[date].count++;
        dailyDemand[date].revenue += booking.totalAmount;
      }
    });

    res.json({
      success: true,
      analytics: {
        totalBookings: bookings.length,
        categoryDemand,
        locationDemand,
        dailyDemand,
        period: { start, end }
      }
    });
  } catch (error) {
    console.error('Get demand analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
