const Booking = require('../models/booking');
const Car = require('../models/car');
const User = require('../models/user');

/**
 * Analytics Service
 * Provides calculation functions for platform analytics
 */

/**
 * Calculate revenue metrics for a given date range
 * @param {Date} startDate - Start date for calculation
 * @param {Date} endDate - End date for calculation
 * @returns {Object} Revenue metrics including total, by payment method, average booking value, platform earnings
 */
async function calculateRevenueMetrics(startDate, endDate) {
  try {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = {
      status: { $in: ['confirmed', 'completed'] }, // Count confirmed and completed bookings
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    };

    // Total revenue and booking count with platform earnings
    const revenueData = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$totalAmount', '$price'] } },
          platformEarnings: { $sum: { $ifNull: ['$platformEarnings', 0] } },
          ownerEarnings: { $sum: { $ifNull: ['$ownerEarnings', { $ifNull: ['$totalAmount', '$price'] }] } },
          totalBookings: { $sum: 1 },
          cashRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentMethod', 'cash'] }, 
                { $ifNull: ['$totalAmount', '$price'] }, 
                0
              ]
            }
          },
          onlineRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentMethod', 'online'] }, 
                { $ifNull: ['$totalAmount', '$price'] }, 
                0
              ]
            }
          }
        }
      }
    ]);

    const result = revenueData[0] || {
      totalRevenue: 0,
      platformEarnings: 0,
      ownerEarnings: 0,
      totalBookings: 0,
      cashRevenue: 0,
      onlineRevenue: 0
    };

    // Get total users and cars count
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalCars = await Car.countDocuments();

    // Add to result
    result.totalUsers = totalUsers;
    result.totalCars = totalCars;
    result.cashEarnings = result.cashRevenue;
    result.onlineEarnings = result.onlineRevenue;

    // Calculate average booking value
    result.averageBookingValue = result.totalBookings > 0
      ? Math.round((result.totalRevenue / result.totalBookings) * 100) / 100
      : 0;

    // Revenue by payment method breakdown
    result.revenueByPaymentMethod = {
      cash: result.cashRevenue,
      online: result.onlineRevenue
    };

    // Commission rate (platform earnings as percentage of total revenue)
    result.commissionRate = result.totalRevenue > 0
      ? Math.round((result.platformEarnings / result.totalRevenue) * 100 * 100) / 100
      : 0;

    return result;
  } catch (error) {
    console.error('Calculate revenue metrics error:', error);
    throw error;
  }
}

/**
 * Calculate booking trends over time
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {String} groupBy - Grouping period: 'day', 'week', 'month'
 * @returns {Array} Booking trends data
 */
async function calculateBookingTrends(startDate, endDate, groupBy = 'day') {
  try {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = Object.keys(dateFilter).length > 0
      ? { createdAt: dateFilter }
      : {};

    // Determine grouping format
    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
        break;
      case 'month':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default: // day
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const trends = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateFormat,
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalAmount', '$price'] } },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return trends;
  } catch (error) {
    console.error('Calculate booking trends error:', error);
    throw error;
  }
}

/**
 * Get top performing cars by booking count
 * @param {Number} limit - Number of top cars to return
 * @returns {Array} Top cars with booking counts
 */
async function getTopCars(limit = 10) {
  try {
    const topCars = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: '$carId',
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$totalAmount', '$price'] } }
        }
      },
      { $sort: { bookingCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'cars',
          localField: '_id',
          foreignField: '_id',
          as: 'carDetails'
        }
      },
      { $unwind: '$carDetails' },
      {
        $project: {
          _id: 1,
          bookingCount: 1,
          totalRevenue: 1,
          brand: '$carDetails.brand',
          model: '$carDetails.model',
          year: '$carDetails.year',
          image: '$carDetails.image',
          averageRating: { $ifNull: ['$carDetails.averageRating', 0] },
          pricePerDay: '$carDetails.pricePerDay'
        }
      }
    ]);

    return topCars;
  } catch (error) {
    console.error('Get top cars error:', error);
    throw error;
  }
}

/**
 * Calculate user metrics
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} User metrics including total users, new registrations, active users
 */
async function calculateUserMetrics(startDate, endDate) {
  try {
    // Total registered users
    const totalUsers = await User.countDocuments();

    // New user registrations in date range
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const newUsers = Object.keys(dateFilter).length > 0
      ? await User.countDocuments({ createdAt: dateFilter })
      : 0;

    // Users who have listed cars (car owners)
    const carOwners = await Car.distinct('owner');
    const totalCarOwners = carOwners.length;

    // Active users (users with bookings in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUserIds = await Booking.distinct('userId', {
      createdAt: { $gte: thirtyDaysAgo }
    });
    const activeUsers = activeUserIds.length;

    // User to owner ratio
    const userToOwnerRatio = totalCarOwners > 0
      ? Math.round((totalUsers / totalCarOwners) * 100) / 100
      : 0;

    return {
      totalUsers,
      newUsers,
      totalCarOwners,
      activeUsers,
      userToOwnerRatio,
      inactiveUsers: totalUsers - activeUsers
    };
  } catch (error) {
    console.error('Calculate user metrics error:', error);
    throw error;
  }
}

/**
 * Get top performing car owners
 * @param {Number} limit - Number of top owners to return
 * @returns {Array} Top owners with performance metrics (only user-owned cars)
 */
async function getTopOwners(limit = 10) {
  try {
    // Get only user-owned cars (exclude admin-owned cars)
    const cars = await Car.find({ ownerType: 'user' }).populate('owner', 'name email image');

    // Group by owner and calculate metrics
    const ownerMetrics = {};

    for (const car of cars) {
      if (!car.owner) continue;

      const ownerId = car.owner._id.toString();

      if (!ownerMetrics[ownerId]) {
        ownerMetrics[ownerId] = {
          owner: car.owner,
          totalCars: 0,
          approvedCars: 0,
          totalBookings: 0,
          totalEarnings: 0,
          platformCommission: 0,
          averageRating: 0,
          ratingCount: 0
        };
      }

      ownerMetrics[ownerId].totalCars++;
      if (car.isApproved) ownerMetrics[ownerId].approvedCars++;

      // Add rating
      if (car.averageRating > 0) {
        ownerMetrics[ownerId].averageRating += car.averageRating;
        ownerMetrics[ownerId].ratingCount++;
      }
    }

    // Get booking data for each owner (exclude cancelled bookings)
    const bookings = await Booking.find({ 
      status: { $in: ['confirmed', 'completed'] } 
    }).populate('carId');

    for (const booking of bookings) {
      if (!booking.carId || !booking.carId.owner) continue;
      
      // Skip admin-owned cars
      if (booking.carId.ownerType === 'admin') continue;

      const ownerId = booking.carId.owner.toString();

      if (ownerMetrics[ownerId]) {
        ownerMetrics[ownerId].totalBookings++;
        // Use ownerEarnings (after commission) for user earnings
        ownerMetrics[ownerId].totalEarnings += booking.ownerEarnings || 0;
        // Track platform commission
        ownerMetrics[ownerId].platformCommission += booking.platformEarnings || 0;
      }
    }

    // Calculate average ratings
    const topOwners = Object.values(ownerMetrics).map(metrics => {
      const avgRating = metrics.ratingCount > 0
        ? Math.round((metrics.averageRating / metrics.ratingCount) * 10) / 10
        : 0;

      return {
        ...metrics,
        averageRating: avgRating,
        bookingsPerCar: metrics.totalCars > 0
          ? Math.round((metrics.totalBookings / metrics.totalCars) * 100) / 100
          : 0
      };
    });

    // Sort by total earnings and limit
    topOwners.sort((a, b) => b.totalEarnings - a.totalEarnings);

    return topOwners.slice(0, limit);
  } catch (error) {
    console.error('Get top owners error:', error);
    throw error;
  }
}

/**
 * Calculate geographic distribution of bookings and cars
 * @returns {Object} Geographic distribution data
 */
async function calculateGeographicDistribution() {
  try {
    // Bookings by location
    const bookingsByLocation = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      {
        $lookup: {
          from: 'cars',
          localField: 'carId',
          foreignField: '_id',
          as: 'car'
        }
      },
      { $unwind: '$car' },
      {
        $group: {
          _id: '$car.location',
          bookingCount: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalAmount', '$price'] } }
        }
      },
      { $sort: { bookingCount: -1 } }
    ]);

    // Cars by location
    const carsByLocation = await Car.aggregate([
      { $match: { isApproved: true } },
      {
        $group: {
          _id: '$location',
          carCount: { $sum: 1 }
        }
      },
      { $sort: { carCount: -1 } }
    ]);

    // Merge data
    const locationMap = {};

    bookingsByLocation.forEach(item => {
      locationMap[item._id] = {
        location: item._id,
        bookings: item.bookingCount,
        revenue: item.revenue,
        cars: 0
      };
    });

    carsByLocation.forEach(item => {
      if (locationMap[item._id]) {
        locationMap[item._id].cars = item.carCount;
      } else {
        locationMap[item._id] = {
          location: item._id,
          bookings: 0,
          revenue: 0,
          cars: item.carCount
        };
      }
    });

    // Calculate supply-demand ratio
    const locations = Object.values(locationMap).map(loc => ({
      ...loc,
      demandSupplyRatio: loc.cars > 0
        ? Math.round((loc.bookings / loc.cars) * 100) / 100
        : loc.bookings
    }));

    return locations;
  } catch (error) {
    console.error('Calculate geographic distribution error:', error);
    throw error;
  }
}

/**
 * Get booking status distribution
 * @returns {Object} Count of bookings by status
 */
async function getBookingStatusDistribution() {
  try {
    const distribution = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    };

    distribution.forEach(item => {
      if (result.hasOwnProperty(item._id)) {
        result[item._id] = item.count;
      }
    });

    return result;
  } catch (error) {
    console.error('Get booking status distribution error:', error);
    throw error;
  }
}

/**
 * Calculate average booking duration
 * @returns {Number} Average duration in days
 */
async function calculateAverageBookingDuration() {
  try {
    const bookings = await Booking.find({
      status: { $in: ['confirmed', 'completed'] },
      pickupDate: { $exists: true },
      returnDate: { $exists: true }
    });

    if (bookings.length === 0) return 0;

    const totalDays = bookings.reduce((sum, booking) => {
      const pickup = new Date(booking.pickupDate);
      const returnDate = new Date(booking.returnDate);
      const days = Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return Math.round((totalDays / bookings.length) * 100) / 100;
  } catch (error) {
    console.error('Calculate average booking duration error:', error);
    throw error;
  }
}

module.exports = {
  calculateRevenueMetrics,
  calculateBookingTrends,
  getTopCars,
  calculateUserMetrics,
  getTopOwners,
  calculateGeographicDistribution,
  getBookingStatusDistribution,
  calculateAverageBookingDuration
};
