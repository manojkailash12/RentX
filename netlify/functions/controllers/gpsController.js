const Booking = require('../models/booking');

// Start GPS tracking for a booking
exports.startGPSTracking = async (req, res) => {
  try {
    const { bookingId, deviceId, latitude, longitude, address } = req.body;
    const userId = req.user._id;

    if (!bookingId || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking ID, latitude, and longitude are required' 
      });
    }

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

    // Check if booking is active
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ 
        success: false, 
        message: 'GPS tracking can only be started for confirmed bookings' 
      });
    }

    const now = new Date();
    booking.gpsTracking = {
      enabled: true,
      deviceId: deviceId || `GPS-${bookingId}`,
      currentLocation: {
        latitude,
        longitude,
        address: address || 'Location',
        lastUpdated: now
      },
      startLocation: {
        latitude,
        longitude,
        address: address || booking.pickupLocation,
        timestamp: now
      },
      trackingHistory: [{
        latitude,
        longitude,
        timestamp: now,
        speed: 0,
        address: address || 'Start Location'
      }],
      totalDistanceTraveled: 0
    };

    await booking.save();

    res.json({
      success: true,
      message: 'GPS tracking started successfully',
      gpsTracking: booking.gpsTracking
    });
  } catch (error) {
    console.error('Start GPS tracking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update GPS location
exports.updateGPSLocation = async (req, res) => {
  try {
    const { bookingId, latitude, longitude, speed, address } = req.body;
    const userId = req.user._id;

    if (!bookingId || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking ID, latitude, and longitude are required' 
      });
    }

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
    
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    if (!booking.gpsTracking || !booking.gpsTracking.enabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'GPS tracking is not enabled for this booking' 
      });
    }

    const now = new Date();
    const lastLocation = booking.gpsTracking.currentLocation;

    // Calculate distance from last location using Haversine formula
    let distanceTraveled = 0;
    if (lastLocation && lastLocation.latitude && lastLocation.longitude) {
      distanceTraveled = calculateHaversineDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        latitude,
        longitude
      );
    }

    // Update current location
    booking.gpsTracking.currentLocation = {
      latitude,
      longitude,
      address: address || 'Current Location',
      lastUpdated: now
    };

    // Add to tracking history
    booking.gpsTracking.trackingHistory.push({
      latitude,
      longitude,
      timestamp: now,
      speed: speed || 0,
      address: address || 'Location'
    });

    // Update total distance
    booking.gpsTracking.totalDistanceTraveled += distanceTraveled;

    // Keep only last 1000 tracking points to avoid document size issues
    if (booking.gpsTracking.trackingHistory.length > 1000) {
      booking.gpsTracking.trackingHistory = booking.gpsTracking.trackingHistory.slice(-1000);
    }

    await booking.save();

    res.json({
      success: true,
      message: 'GPS location updated successfully',
      currentLocation: booking.gpsTracking.currentLocation,
      totalDistanceTraveled: booking.gpsTracking.totalDistanceTraveled
    });
  } catch (error) {
    console.error('Update GPS location error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Stop GPS tracking
exports.stopGPSTracking = async (req, res) => {
  try {
    const { bookingId, latitude, longitude, address } = req.body;
    const userId = req.user._id;

    if (!bookingId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking ID is required' 
      });
    }

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

    if (!booking.gpsTracking || !booking.gpsTracking.enabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'GPS tracking is not enabled for this booking' 
      });
    }

    const now = new Date();

    // Set end location
    if (latitude && longitude) {
      booking.gpsTracking.endLocation = {
        latitude,
        longitude,
        address: address || booking.dropLocation,
        timestamp: now
      };

      // Add final location to history
      booking.gpsTracking.trackingHistory.push({
        latitude,
        longitude,
        timestamp: now,
        speed: 0,
        address: address || 'End Location'
      });
    }

    // Disable tracking
    booking.gpsTracking.enabled = false;

    await booking.save();

    res.json({
      success: true,
      message: 'GPS tracking stopped successfully',
      totalDistanceTraveled: booking.gpsTracking.totalDistanceTraveled,
      endLocation: booking.gpsTracking.endLocation
    });
  } catch (error) {
    console.error('Stop GPS tracking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get GPS tracking data for a booking
exports.getGPSTracking = async (req, res) => {
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
      gpsTracking: booking.gpsTracking || { enabled: false }
    });
  } catch (error) {
    console.error('Get GPS tracking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get GPS tracking history with pagination
exports.getGPSTrackingHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { page = 1, limit = 100 } = req.query;
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

    if (!booking.gpsTracking || !booking.gpsTracking.trackingHistory) {
      return res.json({
        success: true,
        history: [],
        pagination: { page: 1, limit, total: 0, pages: 0 }
      });
    }

    const history = booking.gpsTracking.trackingHistory;
    const total = history.length;
    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const paginatedHistory = history.slice(start, end);

    res.json({
      success: true,
      history: paginatedHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalDistanceTraveled: booking.gpsTracking.totalDistanceTraveled,
        startLocation: booking.gpsTracking.startLocation,
        endLocation: booking.gpsTracking.endLocation,
        currentLocation: booking.gpsTracking.currentLocation,
        enabled: booking.gpsTracking.enabled
      }
    });
  } catch (error) {
    console.error('Get GPS tracking history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function: Calculate distance between two coordinates using Haversine formula
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = exports;
