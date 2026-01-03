const express = require('express');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const User = require('../models/User');
const Commission = require('../models/Commission');
const auth = require('../middleware/auth');
const { generateReportPDF } = require('../utils/reportGenerator');
const router = express.Router();

// Middleware to check admin role
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Get all cars for admin
router.get('/cars', auth, adminAuth, async (req, res) => {
  try {
    const cars = await Car.find()
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(cars);
  } catch (error) {
    console.error('Get admin cars error:', error);
    res.status(500).json({ message: 'Server error while fetching cars' });
  }
});

// Get all users for admin
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -otp -otpExpires')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// Update car status (approve/reject)
router.put('/cars/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const car = await Car.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('owner', 'name email');

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.json({
      message: `Car ${status} successfully`,
      car
    });
  } catch (error) {
    console.error('Update car status error:', error);
    res.status(500).json({ message: 'Server error while updating car status' });
  }
});

// Delete car
router.delete('/cars/:id', auth, adminAuth, async (req, res) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.json({
      message: 'Car deleted successfully'
    });
  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({ message: 'Server error while deleting car' });
  }
});

// Dashboard statistics
router.get('/dashboard', auth, adminAuth, async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    // Total statistics
    const totalCars = await Car.countDocuments({ status: 'approved' });
    const pendingCars = await Car.countDocuments({ status: 'pending' });
    const totalBookings = await Booking.countDocuments();
    const totalUsers = await User.countDocuments();

    // Current month statistics
    const currentMonthBookings = await Booking.countDocuments({
      createdAt: { $gte: currentMonth }
    });

    const currentMonthEarnings = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: currentMonth },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Commission statistics
    const totalCommissions = await Commission.aggregate([
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0]
            }
          },
          totalPending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0]
            }
          }
        }
      }
    ]);

    // Last month statistics for comparison
    const lastMonthBookings = await Booking.countDocuments({
      createdAt: { $gte: lastMonth, $lt: currentMonth }
    });

    const lastMonthEarnings = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: lastMonth, $lt: currentMonth },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Payment method wise earnings
    const paymentWiseEarnings = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate('user', 'name email')
      .populate('car', 'name brand model')
      .sort({ createdAt: -1 })
      .limit(10);

    // Top performing cars
    const topCars = await Booking.aggregate([
      {
        $group: {
          _id: '$car',
          bookings: { $sum: 1 },
          earnings: { $sum: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'cars',
          localField: '_id',
          foreignField: '_id',
          as: 'carDetails'
        }
      },
      {
        $unwind: '$carDetails'
      },
      {
        $sort: { bookings: -1 }
      },
      {
        $limit: 5
      }
    ]);

    res.json({
      totalStats: {
        totalCars,
        pendingCars,
        totalBookings,
        totalUsers
      },
      currentMonth: {
        bookings: currentMonthBookings,
        earnings: currentMonthEarnings[0]?.total || 0
      },
      lastMonth: {
        bookings: lastMonthBookings,
        earnings: lastMonthEarnings[0]?.total || 0
      },
      commissions: totalCommissions[0] || { totalPaid: 0, totalPending: 0 },
      paymentWiseEarnings,
      recentBookings,
      topCars
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard data' });
  }
});

// Get all pending vehicles for approval
router.get('/pending-vehicles', auth, adminAuth, async (req, res) => {
  try {
    const pendingCars = await Car.find({ status: 'pending' })
      .populate('owner', 'name email phone address')
      .sort({ createdAt: -1 });

    res.json(pendingCars);
  } catch (error) {
    console.error('Get pending vehicles error:', error);
    res.status(500).json({ message: 'Server error while fetching pending vehicles' });
  }
});

// Approve or reject vehicle
router.put('/vehicles/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData = { status };
    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const car = await Car.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('owner', 'name email');

    if (!car) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // TODO: Send email notification to vehicle owner about approval/rejection

    res.json({
      message: `Vehicle ${status} successfully`,
      car
    });
  } catch (error) {
    console.error('Update vehicle status error:', error);
    res.status(500).json({ message: 'Server error while updating vehicle status' });
  }
});

// Get all bookings with filters
router.get('/bookings', auth, adminAuth, async (req, res) => {
  try {
    const {
      status,
      paymentMethod,
      paymentStatus,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    let query = {};

    if (status) query.bookingStatus = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const bookings = await Booking.find(query)
      .populate('user', 'name email phone')
      .populate('car', 'name brand model registrationNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get admin bookings error:', error);
    res.status(500).json({ message: 'Server error while fetching bookings' });
  }
});

// Update booking status
router.put('/bookings/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { bookingStatus: status },
      { new: true }
    ).populate('user', 'name email').populate('car', 'name brand model');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // If booking is completed, make car available
    if (status === 'completed') {
      await Car.findByIdAndUpdate(booking.car._id, { availability: true });
    }

    res.json({
      message: 'Booking status updated successfully',
      booking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error while updating booking status' });
  }
});

// Get all commissions
router.get('/commissions', auth, adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (status) query.status = status;

    const commissions = await Commission.find(query)
      .populate('vehicleOwner', 'name email phone')
      .populate('car', 'name brand model registrationNumber')
      .populate('booking', 'invoiceNumber totalAmount')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Commission.countDocuments(query);

    // Summary statistics
    const summary = await Commission.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$commissionAmount' }
        }
      }
    ]);

    res.json({
      commissions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      summary
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ message: 'Server error while fetching commissions' });
  }
});

// Update commission status (mark as paid)
router.put('/commissions/:id/pay', auth, adminAuth, async (req, res) => {
  try {
    const { paymentMethod, transactionId, notes } = req.body;

    const commission = await Commission.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        paidDate: new Date(),
        paymentMethod: paymentMethod || 'bank_transfer',
        transactionId,
        notes
      },
      { new: true }
    ).populate('vehicleOwner', 'name email');

    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    // TODO: Send email notification to vehicle owner about payment

    res.json({
      message: 'Commission marked as paid successfully',
      commission
    });
  } catch (error) {
    console.error('Pay commission error:', error);
    res.status(500).json({ message: 'Server error while processing commission payment' });
  }
});

// Monthly earnings report
router.get('/reports/monthly-earnings', auth, adminAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const monthlyEarnings = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${parseInt(year) + 1}-01-01`)
          },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalEarnings: { $sum: '$totalAmount' },
          totalBookings: { $sum: 1 },
          cashPayments: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$totalAmount', 0]
            }
          },
          onlinePayments: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'online'] }, '$totalAmount', 0]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formattedData = monthlyEarnings.map(item => ({
      month: monthNames[item._id - 1],
      monthNumber: item._id,
      totalEarnings: item.totalEarnings,
      totalBookings: item.totalBookings,
      cashPayments: item.cashPayments,
      onlinePayments: item.onlinePayments
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Monthly earnings report error:', error);
    res.status(500).json({ message: 'Server error while generating monthly earnings report' });
  }
});

// Travel analytics
router.get('/analytics/travel', auth, adminAuth, async (req, res) => {
  try {
    // Most popular destinations
    const popularDestinations = await Booking.aggregate([
      {
        $group: {
          _id: {
            city: '$dropoffLocation.city',
            district: '$dropoffLocation.district',
            state: '$dropoffLocation.state'
          },
          count: { $sum: 1 },
          totalDistance: { $sum: '$totalDistance' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Average trip distance
    const avgTripDistance = await Booking.aggregate([
      {
        $group: {
          _id: null,
          avgDistance: { $avg: '$totalDistance' },
          totalTrips: { $sum: 1 }
        }
      }
    ]);

    // State-wise bookings
    const stateWiseBookings = await Booking.aggregate([
      {
        $group: {
          _id: '$pickupLocation.state',
          bookings: { $sum: 1 },
          earnings: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { bookings: -1 }
      }
    ]);

    // Distance range analysis
    const distanceRanges = await Booking.aggregate([
      {
        $bucket: {
          groupBy: '$totalDistance',
          boundaries: [0, 50, 100, 200, 500, 1000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgEarnings: { $avg: '$totalAmount' }
          }
        }
      }
    ]);

    res.json({
      popularDestinations,
      avgTripDistance: avgTripDistance[0] || { avgDistance: 0, totalTrips: 0 },
      stateWiseBookings,
      distanceRanges
    });
  } catch (error) {
    console.error('Travel analytics error:', error);
    res.status(500).json({ message: 'Server error while generating travel analytics' });
  }
});

// Export reports to PDF
router.post('/reports/export-pdf', auth, adminAuth, async (req, res) => {
  try {
    const { reportType, filters } = req.body;
    
    const pdfBuffer = await generateReportPDF(reportType, filters);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report-${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ message: 'Server error while exporting PDF' });
  }
});

// Update user status (verify/unverify)
router.put('/users/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { isVerified } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified },
      { new: true }
    ).select('-password -otp -otpExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error while updating user status' });
  }
});

// Delete user
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Also delete user's bookings and cars
    await Booking.deleteMany({ user: req.params.id });
    await Car.deleteMany({ owner: req.params.id });

    res.json({
      message: 'User and associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
});

// Export reports to Excel
router.post('/reports/export-excel', auth, adminAuth, async (req, res) => {
  try {
    const { reportType, filters } = req.body;
    
    let data = [];
    
    if (reportType === 'bookings') {
      const bookings = await Booking.find(filters || {})
        .populate('user', 'name email phone')
        .populate('car', 'name brand model registrationNumber')
        .lean();
      
      data = bookings.map(booking => ({
        invoiceNumber: booking.invoiceNumber,
        customerName: booking.user?.name || 'N/A',
        customerEmail: booking.user?.email || 'N/A',
        customerPhone: booking.user?.phone || 'N/A',
        vehicleName: booking.car?.name || 'N/A',
        vehicleBrand: booking.car?.brand || 'N/A',
        vehicleModel: booking.car?.model || 'N/A',
        registrationNumber: booking.car?.registrationNumber || 'N/A',
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalAmount: booking.totalAmount,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus,
        createdAt: booking.createdAt
      }));
    } else if (reportType === 'cars') {
      const cars = await Car.find(filters || {})
        .populate('owner', 'name email phone')
        .lean();
      
      data = cars.map(car => ({
        registrationNumber: car.registrationNumber,
        name: car.name,
        brand: car.brand,
        model: car.model,
        year: car.year,
        type: car.type,
        seats: car.seats,
        transmission: car.transmission,
        fuelType: car.fuelType,
        pricePerDay: car.pricePerDay,
        pricePerKm: car.pricePerKm,
        ownerName: car.owner?.name || 'N/A',
        ownerEmail: car.owner?.email || 'N/A',
        ownerPhone: car.owner?.phone || 'N/A',
        status: car.status,
        createdAt: car.createdAt
      }));
    } else if (reportType === 'users') {
      // Handle searchTerm filter for users
      let userFilters = {};
      if (filters && filters.searchTerm && filters.searchTerm.trim()) {
        const searchRegex = new RegExp(filters.searchTerm.trim(), 'i');
        userFilters.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ];
      }
      
      const users = await User.find(userFilters)
        .select('-password -otp -otpExpires')
        .lean();
      
      data = users.map(user => ({
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified ? 'Yes' : 'No',
        role: user.role,
        createdAt: user.createdAt
      }));
    } else if (reportType === 'approvals') {
      const approvals = await Car.find({ status: 'pending', ...(filters || {}) })
        .populate('owner', 'name email phone')
        .lean();
      
      data = approvals.map(car => ({
        registrationNumber: car.registrationNumber,
        name: car.name,
        brand: car.brand,
        model: car.model,
        type: car.type,
        pricePerDay: car.pricePerDay,
        ownerName: car.owner?.name || 'N/A',
        ownerEmail: car.owner?.email || 'N/A',
        status: car.status,
        createdAt: car.createdAt
      }));
    } else if (reportType === 'earnings') {
      data = await Booking.aggregate([
        { $match: { paymentStatus: 'paid', ...(filters || {}) } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalEarnings: { $sum: '$totalAmount' },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    } else if (reportType === 'travel-analytics') {
      // Get comprehensive travel analytics data
      const bookings = await Booking.find({ bookingStatus: 'completed' })
        .populate('user', 'name email')
        .populate('car', 'name brand model')
        .lean();

      data = bookings.map(booking => ({
        bookingId: booking._id,
        userName: booking.user?.name || 'N/A',
        userEmail: booking.user?.email || 'N/A',
        carName: booking.car?.name || 'N/A',
        carBrand: booking.car?.brand || 'N/A',
        carModel: booking.car?.model || 'N/A',
        pickupLocation: `${booking.pickupLocation?.city || 'N/A'}, ${booking.pickupLocation?.state || 'N/A'}`,
        dropoffLocation: `${booking.dropoffLocation?.city || 'N/A'}, ${booking.dropoffLocation?.state || 'N/A'}`,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalAmount: booking.totalAmount,
        paymentMethod: booking.paymentMethod,
        distance: booking.distance || 0,
        duration: booking.duration || 0,
        createdAt: booking.createdAt
      }));
    }
    
    res.json({
      data,
      filename: `${reportType}-report-${Date.now()}.csv`
    });
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ message: 'Server error while exporting Excel' });
  }
});

module.exports = router;