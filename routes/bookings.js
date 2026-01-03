const express = require('express');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const User = require('../models/User');
const Commission = require('../models/Commission');
const auth = require('../middleware/auth');
// Note: PDF generation is handled by separate serverless function
const router = express.Router();

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance);
};

// Create commission for vehicle owner
const createCommission = async (booking, car) => {
  try {
    const commission = new Commission({
      vehicleOwner: car.owner,
      booking: booking._id,
      car: car._id,
      commissionAmount: car.commissionRate || 200,
      status: 'pending'
    });

    await commission.save();

    // Update car statistics
    await Car.findByIdAndUpdate(car._id, {
      $inc: { 
        totalBookings: 1,
        totalEarnings: car.commissionRate || 200
      }
    });

    console.log('Commission created for vehicle owner:', car.owner);
  } catch (error) {
    console.error('Error creating commission:', error);
  }
};

// Create booking
router.post('/', auth, async (req, res) => {
  try {
    const {
      carId,
      startDate,
      endDate,
      pickupLocation,
      dropoffLocation,
      paymentMethod,
      driverRequired,
      specialRequests,
      pricingType,
      estimatedDistance
    } = req.body;

    // Check if car exists and is available
    const car = await Car.findById(carId).populate('owner');
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    if (!car.availability || car.status !== 'approved') {
      return res.status(400).json({ message: 'Car is not available' });
    }

    // Check for conflicting bookings
    const conflictingBooking = await Booking.findOne({
      car: carId,
      bookingStatus: { $in: ['confirmed', 'ongoing'] },
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ]
    });

    if (conflictingBooking) {
      return res.status(400).json({ message: 'Car is already booked for selected dates' });
    }

    // Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Calculate distance if coordinates are provided
    let totalDistance = 0;
    if (pickupLocation.coordinates && dropoffLocation.coordinates) {
      totalDistance = calculateDistance(
        pickupLocation.coordinates.lat,
        pickupLocation.coordinates.lng,
        dropoffLocation.coordinates.lat,
        dropoffLocation.coordinates.lng
      );
    }

    // Calculate total amount based on pricing type
    let dayCharges = 0;
    let distanceCharges = 0;
    let totalAmount = 0;

    if (req.body.pricingType === 'perKm') {
      // Per kilometer pricing
      distanceCharges = car.pricePerKm * (req.body.estimatedDistance || 0);
      totalAmount = distanceCharges;
    } else {
      // Per day pricing (default)
      dayCharges = car.pricePerDay * totalDays;
      distanceCharges = car.pricePerKm * totalDistance;
      totalAmount = dayCharges + distanceCharges;
    }

    // Create booking
    const booking = new Booking({
      user: req.user.userId,
      car: carId,
      startDate,
      endDate,
      pickupLocation,
      dropoffLocation,
      totalDays,
      totalDistance: pricingType === 'perKm' ? (estimatedDistance || 0) : totalDistance,
      totalAmount,
      paymentMethod,
      driverRequired,
      specialRequests,
      bookingStatus: 'confirmed',
      paymentStatus: paymentMethod === 'cash' ? 'paid' : 'pending', // Cash payments are immediately marked as paid
      commissionAmount: car.commissionRate || 200,
      pricingType: pricingType || 'perDay',
      estimatedDistance: estimatedDistance || 0
    });

    await booking.save();

    // Update car availability only if booking starts today or is ongoing
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingStart = new Date(startDate);
    bookingStart.setHours(0, 0, 0, 0);
    
    // Only set availability to false if booking starts today or earlier
    if (bookingStart <= today) {
      await Car.findByIdAndUpdate(carId, { availability: false });
    }

    // Create commission for vehicle owner (only if car owner is not admin and car was added by user)
    const carOwner = await User.findById(car.owner);
    if (carOwner && carOwner.role === 'user') {
      await createCommission(booking, car);
      booking.commissionGenerated = true;
      await booking.save();
    }

    // Populate booking details
    const populatedBooking = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('car', 'name brand model registrationNumber');

    // Ensure invoice number is set
    if (!populatedBooking.invoiceNumber) {
      populatedBooking.invoiceNumber = 'INV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
      await populatedBooking.save();
    }

    // Note: Email sending is handled by frontend calling serverless function
    console.log('Booking created successfully, email will be sent via serverless function');

    res.status(201).json({
      message: 'Booking created successfully',
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error while creating booking' });
  }
});

// Get user bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.userId })
      .populate('car', 'name brand model images registrationNumber location')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error while fetching bookings' });
  }
});

// Get user's vehicle bookings (for vehicle owners)
router.get('/my-vehicle-bookings', auth, async (req, res) => {
  try {
    // Find all cars owned by the user
    const userCars = await Car.find({ owner: req.user.userId });
    const carIds = userCars.map(car => car._id);

    // Find all bookings for user's cars
    const bookings = await Booking.find({ car: { $in: carIds } })
      .populate('user', 'name email phone')
      .populate('car', 'name brand model registrationNumber')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get vehicle bookings error:', error);
    res.status(500).json({ message: 'Server error while fetching vehicle bookings' });
  }
});

// Get user's commission earnings
router.get('/my-earnings', auth, async (req, res) => {
  try {
    const commissions = await Commission.find({ vehicleOwner: req.user.userId })
      .populate('booking', 'invoiceNumber totalAmount createdAt')
      .populate('car', 'name brand model registrationNumber')
      .sort({ createdAt: -1 });

    const totalEarnings = commissions.reduce((sum, commission) => {
      return sum + (commission.status === 'paid' ? commission.commissionAmount : 0);
    }, 0);

    const pendingEarnings = commissions.reduce((sum, commission) => {
      return sum + (commission.status === 'pending' ? commission.commissionAmount : 0);
    }, 0);

    res.json({
      commissions,
      totalEarnings,
      pendingEarnings,
      totalCommissions: commissions.length
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Server error while fetching earnings' });
  }
});

// Get booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone address')
      .populate('car', 'name brand model registrationNumber location owner');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns this booking, owns the car, or is admin
    const isOwner = booking.user._id.toString() === req.user.userId;
    const isCarOwner = booking.car.owner.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isCarOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Server error while fetching booking' });
  }
});

// Resend booking receipt
router.post('/:id/resend-receipt', auth, async (req, res) => {
  try {
    console.log('Resend receipt request for booking:', req.params.id);
    console.log('User:', req.user);

    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('car', 'name brand model registrationNumber');

    if (!booking) {
      console.log('Booking not found:', req.params.id);
      return res.status(404).json({ message: 'Booking not found' });
    }

    console.log('Found booking:', booking._id, 'for user:', booking.user._id);

    // Check if user owns this booking
    const isOwner = booking.user._id.toString() === req.user.userId.toString();
    
    if (!isOwner) {
      console.log('Access denied. Booking belongs to user:', booking.user._id.toString(), 'Request from user:', req.user.userId.toString());
      return res.status(403).json({ message: 'Access denied' });
    }

    // Note: Email sending is handled by serverless function
    console.log('Receipt request for booking:', booking._id);
    res.json({ 
      message: 'Please use the PDF download function or contact support',
      bookingId: booking._id 
    });
  } catch (error) {
    console.error('Resend receipt error:', error);
    res.status(500).json({ message: 'Server error while sending receipt', error: error.message });
  }
});

// Download booking receipt
router.get('/:id/download-receipt', auth, async (req, res) => {
  try {
    console.log('Download receipt request for booking:', req.params.id);
    console.log('Authenticated user:', req.user);

    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone address')
      .populate('car', 'name brand model registrationNumber location');

    if (!booking) {
      console.log('Booking not found:', req.params.id);
      return res.status(404).json({ message: 'Booking not found' });
    }

    console.log('Found booking:', {
      id: booking._id,
      bookingUserId: booking.user._id.toString(),
      requestUserId: req.user.userId,
      userRole: req.user.role,
      bookingUserEmail: booking.user.email
    });

    // Check if user owns this booking or is admin
    const isOwner = booking.user._id.toString() === req.user.userId.toString();
    const isAdmin = req.user.role === 'admin';
    
    console.log('Authorization check:', { 
      isOwner, 
      isAdmin,
      bookingUserIdString: booking.user._id.toString(),
      requestUserIdString: req.user.userId.toString(),
      bookingUserIdType: typeof booking.user._id,
      requestUserIdType: typeof req.user.userId
    });

    if (!isOwner && !isAdmin) {
      console.log('Access denied. Booking belongs to user:', booking.user._id.toString(), 'Request from user:', req.user.userId.toString());
      return res.status(403).json({ 
        message: 'Access denied - You can only download receipts for your own bookings',
        debug: {
          bookingUserId: booking.user._id.toString(),
          requestUserId: req.user.userId.toString(),
          isOwner,
          isAdmin
        }
      });
    }

    // Redirect to serverless PDF generation function
    console.log('Redirecting to PDF generation for booking:', booking._id);
    res.redirect(`/.netlify/functions/generate-pdf/${booking._id}`);
  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({ message: 'Server error while downloading receipt', error: error.message });
  }
});

// Cancel booking
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if booking can be cancelled
    if (booking.bookingStatus === 'completed' || booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ message: 'Cannot cancel this booking' });
    }

    // Update booking status
    booking.bookingStatus = 'cancelled';
    await booking.save();

    // Make car available again
    await Car.findByIdAndUpdate(booking.car, { availability: true });

    // Cancel commission if it exists
    if (booking.commissionGenerated) {
      await Commission.findOneAndUpdate(
        { booking: booking._id },
        { status: 'cancelled' }
      );
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error while cancelling booking' });
  }
});

module.exports = router;