const Car = require('../models/car');
const Booking = require('../models/booking');
const UserPreference = require('../models/userPreference');
const Review = require('../models/review');

// AI-powered car recommendations
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    // Get or create user preferences
    let userPrefs = await UserPreference.findOne({ userId });
    
    if (!userPrefs) {
      // Create default preferences
      userPrefs = await UserPreference.create({
        userId,
        preferredCategories: [],
        preferredFuelTypes: [],
        preferredTransmission: [],
        priceRange: { min: 0, max: 10000 },
        preferredSeatingCapacity: [],
        preferredLocations: []
      });
    }

    // Get user's booking history
    const bookings = await Booking.find({ userId })
      .populate('carId')
      .sort({ createdAt: -1 })
      .limit(10);

    // Update preferences based on booking history
    if (bookings.length > 0) {
      const categories = new Set();
      const fuelTypes = new Set();
      const transmissions = new Set();
      const seatingCapacities = new Set();
      const locations = new Set();
      let totalPrice = 0;

      bookings.forEach(booking => {
        if (booking.carId) {
          categories.add(booking.carId.category);
          fuelTypes.add(booking.carId.fuel_type);
          transmissions.add(booking.carId.transmission);
          seatingCapacities.add(booking.carId.seating_capacity);
          locations.add(booking.carId.location);
          totalPrice += booking.carId.pricePerDay;
        }
      });

      const avgPrice = totalPrice / bookings.length;

      userPrefs.preferredCategories = Array.from(categories);
      userPrefs.preferredFuelTypes = Array.from(fuelTypes);
      userPrefs.preferredTransmission = Array.from(transmissions);
      userPrefs.preferredSeatingCapacity = Array.from(seatingCapacities);
      userPrefs.preferredLocations = Array.from(locations);
      userPrefs.priceRange = {
        min: Math.max(0, avgPrice - 1000),
        max: avgPrice + 1000
      };
      userPrefs.lastUpdated = new Date();

      await userPrefs.save();
    }

    // Build recommendation query
    const recommendationQuery = {
      isAvailable: true,
      isApproved: true
    };

    // Score-based recommendation system
    const allCars = await Car.find(recommendationQuery)
      .populate('owner', 'name email')
      .lean();

    // Calculate recommendation score for each car
    const scoredCars = allCars.map(car => {
      let score = 0;

      // Category match (30 points)
      if (userPrefs.preferredCategories.includes(car.category)) {
        score += 30;
      }

      // Fuel type match (20 points)
      if (userPrefs.preferredFuelTypes.includes(car.fuel_type)) {
        score += 20;
      }

      // Transmission match (15 points)
      if (userPrefs.preferredTransmission.includes(car.transmission)) {
        score += 15;
      }

      // Seating capacity match (10 points)
      if (userPrefs.preferredSeatingCapacity.includes(car.seating_capacity)) {
        score += 10;
      }

      // Location match (15 points)
      if (userPrefs.preferredLocations.includes(car.location)) {
        score += 15;
      }

      // Price range match (10 points)
      if (car.pricePerDay >= userPrefs.priceRange.min && 
          car.pricePerDay <= userPrefs.priceRange.max) {
        score += 10;
      }

      // Rating bonus (up to 20 points)
      if (car.averageRating > 0) {
        score += (car.averageRating / 5) * 20;
      }

      // Popularity bonus (up to 10 points based on total reviews)
      if (car.totalReviews > 0) {
        score += Math.min(10, car.totalReviews);
      }

      return {
        ...car,
        recommendationScore: score,
        matchReasons: getMatchReasons(car, userPrefs)
      };
    });

    // Sort by score and limit
    const recommendations = scoredCars
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      recommendations,
      userPreferences: userPrefs,
      totalCars: allCars.length
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to get match reasons
function getMatchReasons(car, prefs) {
  const reasons = [];

  if (prefs.preferredCategories.includes(car.category)) {
    reasons.push(`Matches your preferred category: ${car.category}`);
  }

  if (prefs.preferredFuelTypes.includes(car.fuel_type)) {
    reasons.push(`Your preferred fuel type: ${car.fuel_type}`);
  }

  if (prefs.preferredTransmission.includes(car.transmission)) {
    reasons.push(`Your preferred transmission: ${car.transmission}`);
  }

  if (prefs.preferredLocations.includes(car.location)) {
    reasons.push(`Available in your preferred location: ${car.location}`);
  }

  if (car.averageRating >= 4.5) {
    reasons.push(`Highly rated (${car.averageRating.toFixed(1)}/5)`);
  }

  if (car.totalReviews > 10) {
    reasons.push(`Popular choice (${car.totalReviews} reviews)`);
  }

  return reasons;
}

// Track user search
exports.trackSearch = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, location, priceRange } = req.body;

    let userPrefs = await UserPreference.findOne({ userId });

    if (!userPrefs) {
      userPrefs = await UserPreference.create({
        userId,
        searchHistory: []
      });
    }

    userPrefs.searchHistory.push({
      category,
      location,
      priceRange,
      searchedAt: new Date()
    });

    // Keep only last 50 searches
    if (userPrefs.searchHistory.length > 50) {
      userPrefs.searchHistory = userPrefs.searchHistory.slice(-50);
    }

    await userPrefs.save();

    res.json({
      success: true,
      message: 'Search tracked successfully'
    });
  } catch (error) {
    console.error('Track search error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get similar cars
exports.getSimilarCars = async (req, res) => {
  try {
    const { carId } = req.params;
    const { limit = 5 } = req.query;

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Find similar cars
    const similarCars = await Car.find({
      _id: { $ne: carId },
      isAvailable: true,
      isApproved: true,
      $or: [
        { category: car.category },
        { fuel_type: car.fuel_type },
        { transmission: car.transmission },
        { location: car.location },
        {
          pricePerDay: {
            $gte: car.pricePerDay - 500,
            $lte: car.pricePerDay + 500
          }
        }
      ]
    })
      .populate('owner', 'name email')
      .limit(parseInt(limit))
      .lean();

    // Calculate similarity score
    const scoredCars = similarCars.map(similarCar => {
      let score = 0;

      if (similarCar.category === car.category) score += 30;
      if (similarCar.fuel_type === car.fuel_type) score += 20;
      if (similarCar.transmission === car.transmission) score += 20;
      if (similarCar.location === car.location) score += 15;
      if (Math.abs(similarCar.pricePerDay - car.pricePerDay) < 500) score += 15;

      return {
        ...similarCar,
        similarityScore: score
      };
    });

    const sortedCars = scoredCars.sort((a, b) => b.similarityScore - a.similarityScore);

    res.json({
      success: true,
      similarCars: sortedCars,
      baseCar: car
    });
  } catch (error) {
    console.error('Get similar cars error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get trending cars
exports.getTrendingCars = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get cars with most bookings in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendingCarIds = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $group: {
          _id: '$carId',
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { bookingCount: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    const carIds = trendingCarIds.map(item => item._id);

    const cars = await Car.find({
      _id: { $in: carIds },
      isAvailable: true,
      isApproved: true
    })
      .populate('owner', 'name email')
      .lean();

    // Add trending stats
    const trendingCars = cars.map(car => {
      const stats = trendingCarIds.find(item => item._id.equals(car._id));
      return {
        ...car,
        trendingStats: {
          bookingCount: stats.bookingCount,
          totalRevenue: stats.totalRevenue
        }
      };
    });

    res.json({
      success: true,
      trendingCars
    });
  } catch (error) {
    console.error('Get trending cars error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
