const Booking = require("../models/booking.js");
const Car = require("../models/car.js");
const User = require("../models/user.js");
const { generateBookingInvoice } = require("../utils/pdfGenerator.js");
const { sendBookingConfirmation, sendReviewReminder } = require("../utils/emailService.js");
const { createServerlessResponse } = require("../utils/serverlessResponse.js");
const axios = require("axios");
const { calculateAccurateDistance, getDistanceFromDatabase } = require("../utils/distanceCalculator.js");
const { earnPoints } = require("./loyaltyController.js");

// function to check availability of car for a given date
const checkAvailability = async (car, pickupDate, returnDate) => {
  console.log(`Checking availability for car ${car} from ${pickupDate} to ${returnDate}`);
  
  // Convert to Date objects to ensure proper comparison
  const newPickup = new Date(pickupDate);
  const newReturn = new Date(returnDate);
  
  const bookings = await Booking.find({
    $or: [
      { carId: car },
      { car: car } // backward compatibility
    ],
    status: { $in: ['confirmed', 'pending'] }
  });
  
  // Check for overlapping bookings manually for better debugging
  const conflictingBookings = bookings.filter(booking => {
    const existingPickup = new Date(booking.pickupDate);
    const existingReturn = new Date(booking.returnDate);
    
    // Check if dates overlap
    const overlap = (newPickup < existingReturn) && (newReturn > existingPickup);
    
    if (overlap) {
      console.log(`Conflict found:`, {
        existing: { pickup: existingPickup, return: existingReturn },
        new: { pickup: newPickup, return: newReturn },
        bookingId: booking._id
      });
    }
    
    return overlap;
  });
  
  console.log(`Found ${conflictingBookings.length} conflicting bookings out of ${bookings.length} total bookings`);
  
  return conflictingBookings.length === 0;
};

// Calculate distance between two locations
// Priority: 1. Database lookup (instant) 2. OpenStreetMap geocoding (accurate, free) 3. Google Maps (if available)
const calculateDistance = async (pickupLocation, dropLocation) => {
  try {
    // Step 1: Check database first (instant, no API calls)
    const dbDistance = getDistanceFromDatabase(pickupLocation, dropLocation);
    if (dbDistance !== null) {
      return dbDistance;
    }
    
    // Step 2: Try OpenStreetMap geocoding + Haversine (accurate, free, no API key needed)
    console.log('🗺️ Using OpenStreetMap for accurate distance calculation...');
    const accurateDistance = await calculateAccurateDistance(pickupLocation, dropLocation);
    if (accurateDistance) {
      return accurateDistance;
    }
    
    // Step 3: Try Google Maps if API key is available
    if (process.env.GOOGLE_MAPS_API_KEY && !process.env.GOOGLE_MAPS_API_KEY.includes('your_google_maps')) {
      console.log('🗺️ Trying Google Maps API...');
      
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
          params: {
            origins: pickupLocation,
            destinations: dropLocation,
            units: 'metric',
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });

        if (response.data.status === 'OK' && 
            response.data.rows[0] && 
            response.data.rows[0].elements[0] && 
            response.data.rows[0].elements[0].status === 'OK') {
          
          const distanceInMeters = response.data.rows[0].elements[0].distance.value;
          const distanceInKm = Math.round(distanceInMeters / 1000);
          console.log(`✅ Google Maps distance: ${distanceInKm} km`);
          return distanceInKm;
        }
      } catch (googleError) {
        console.warn('⚠️ Google Maps API error:', googleError.message);
      }
    }
    
    // Step 4: Fallback to reasonable estimate
    console.warn('⚠️ Using fallback distance estimation');
    const randomDistance = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
    console.log(`Using fallback distance: ${randomDistance} km`);
    return randomDistance;
    
  } catch (error) {
    console.error('Distance calculation error:', error.message);
    // Return a reasonable default
    return 250;
  }
};

// api to check specific car availability for given dates
const checkSpecificCarAvailability = async (req, res) => {
  try {
    const { carId, pickupDate, returnDate } = req.body;

    if (!carId || !pickupDate || !returnDate) {
      return res.json({ success: false, message: "Car ID, pickup date, and return date are required" });
    }

    // Check if car exists and is available
    const car = await Car.findById(carId);
    if (!car) {
      return res.json({ success: false, message: "Car not found" });
    }

    if (!car.isAvailable || !car.isApproved) {
      return res.json({ 
        success: false, 
        available: false, 
        message: "Car is not available for booking" 
      });
    }

    // Check date-based availability
    const isAvailable = await checkAvailability(carId, pickupDate, returnDate);
    
    if (!isAvailable) {
      // Get conflicting bookings to show user with detailed information
      const conflictingBookings = await Booking.find({
        $or: [
          { carId: carId },
          { car: carId }
        ],
        status: { $in: ['confirmed', 'pending'] }
      }).select('pickupDate returnDate status bookingId');

      // Filter for actual conflicts
      const newPickup = new Date(pickupDate);
      const newReturn = new Date(returnDate);
      
      const actualConflicts = conflictingBookings.filter(booking => {
        const existingPickup = new Date(booking.pickupDate);
        const existingReturn = new Date(booking.returnDate);
        return (newPickup < existingReturn) && (newReturn > existingPickup);
      });

      return res.json({ 
        success: false, 
        available: false, 
        message: `Car is already booked during this period. Found ${actualConflicts.length} conflicting booking(s).`,
        conflictingBookings: actualConflicts.map(booking => ({
          bookingId: booking.bookingId || booking._id,
          pickupDate: booking.pickupDate,
          returnDate: booking.returnDate,
          status: booking.status
        }))
      });
    }

    res.json({ 
      success: true, 
      available: true, 
      message: "Car is available for the selected dates" 
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
// api to check availability of cars for the given date and location
const checkAvailabilityOfCar = async (req, res) => {
  try {
    const { location, pickupDate, returnDate } = req.body;

    // fetch all available cars for the given location
    const cars = await Car.find({ location, isAvailable: true });

    //check car availability for the given date range using promise
    const availableCarsPromise = cars.map(async (car) => {
      const isAvailable = await checkAvailability(
        car._id,
        pickupDate,
        returnDate
      );
      return { ...car._doc, isAvailable: isAvailable };
    });

    let availableCars = await Promise.all(availableCarsPromise);
    availableCars = availableCars.filter(car => car.isAvailable === true);

    res.json({ success: true, availableCars });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to create booking with enhanced features
const createBooking = async (req, res) => {
  try {
    const { _id, role } = req.user;
    const { 
      carId, 
      pickupDate, 
      returnDate, 
      pickupLocation,
      pickupCity,
      dropLocation,
      dropCity,
      pricingType = 'daily', // 'daily' or 'per_km'
      paymentMethod,
      insurance // { selected: boolean, type: 'basic'|'comprehensive'|'premium' }
    } = req.body;

    // Prevent admin from booking cars
    if (role === 'admin') {
      return res.json({ 
        success: false, 
        message: "Admins cannot book cars. Admin accounts are for platform management only." 
      });
    }

    // Validate required fields
    if (!carId || !pickupDate || !returnDate || !pickupLocation || !pickupCity || !dropLocation || !dropCity || !paymentMethod) {
      return res.json({ success: false, message: "All fields including pickup/drop locations and cities are required" });
    }

    // Validate dates
    const pickup = new Date(pickupDate);
    const returnD = new Date(returnDate);
    const now = new Date();

    if (pickup < now) {
      return res.json({ success: false, message: "Pickup date cannot be in the past" });
    }

    if (returnD <= pickup) {
      return res.json({ success: false, message: "Return date must be after pickup date" });
    }

    // Check availability (double-check right before booking creation)
    const isAvailable = await checkAvailability(carId, pickupDate, returnDate);
    if (!isAvailable) {
      return res.json({ success: false, message: "Car is not available for the selected dates and times. Another booking may have been made." });
    }

    const carData = await Car.findById(carId).populate('owner');
    if (!carData) {
      return res.json({ success: false, message: "Car not found" });
    }

    // Check if car is approved
    if (!carData.isApproved) {
      return res.json({ success: false, message: "Car is not approved for booking" });
    }

    const userData = await User.findById(_id);

    // Calculate booking details based on pricing type
    const picked = new Date(pickupDate);
    const returned = new Date(returnDate);
    const diffTime = returned.getTime() - picked.getTime();
    const totalDays = Math.max(0.04, Math.round((diffTime / (1000 * 60 * 60 * 24)) * 100) / 100);
    
    // Use city names for more accurate distance calculation
    const fullPickupLocation = `${pickupLocation}, ${pickupCity}`;
    const fullDropLocation = `${dropLocation}, ${dropCity}`;
    const distance = await calculateDistance(fullPickupLocation, fullDropLocation);
    
    let totalAmount;
    let pricePerDay = carData.pricePerDay;
    let pricePerKm = 15; // Fixed price per km for all vehicles
    
    if (pricingType === 'per_km') {
      // Per-KM pricing includes round trip (pickup + return)
      const roundTripDistance = distance * 2;
      totalAmount = Math.round(roundTripDistance * pricePerKm);
    } else {
      totalAmount = Math.round(carData.pricePerDay * totalDays);
    }

    // Calculate commission and owner earnings
    // Commission structure:
    // - Admin-owned cars: Platform gets 100% (admin earnings = platform earnings)
    // - User-owned cars: Owner gets 40%, Platform gets 60%
    // - Employee-owned cars: Owner gets 40%, Platform gets 60%
    let ownerEarnings = 0;
    let platformEarnings = totalAmount;
    let commissionRate = 60;

    if (carData.ownerType === 'user' || carData.ownerType === 'employee') {
      // User/Employee-owned car: owner gets 40%, platform gets 60%
      ownerEarnings = Math.round((totalAmount * 40) / 100);
      platformEarnings = totalAmount - ownerEarnings;
    }
    // Admin-owned car: platform gets 100%

    // Handle insurance if selected
    let insuranceData = { selected: false };
    if (insurance && insurance.selected && insurance.type) {
      const INSURANCE_PLANS = {
        basic: { coverage: 500000, costPerDay: 200 },
        comprehensive: { coverage: 1000000, costPerDay: 400 },
        premium: { coverage: 2000000, costPerDay: 600 }
      };

      const plan = INSURANCE_PLANS[insurance.type];
      if (plan) {
        const insuranceCost = plan.costPerDay * totalDays;
        insuranceData = {
          selected: true,
          type: insurance.type,
          cost: insuranceCost,
          coverage: plan.coverage,
          provider: 'RentX Insurance'
        };

        // Add insurance cost to total
        totalAmount += insuranceCost;
        
        // Adjust earnings with insurance cost
        if (carData.ownerType === 'user' || carData.ownerType === 'employee') {
          const additionalOwnerEarnings = Math.round(insuranceCost * 40 / 100);
          const additionalPlatformEarnings = insuranceCost - additionalOwnerEarnings;
          ownerEarnings += additionalOwnerEarnings;
          platformEarnings += additionalPlatformEarnings;
        } else {
          // Admin car: all insurance goes to platform
          platformEarnings += insuranceCost;
        }
      }
    }

    // Create booking
    const booking = await Booking.create({
      carId,
      userId: _id,
      ownerId: carData.owner._id,
      pickupDate,
      returnDate,
      pickupLocation,
      pickupCity,
      dropLocation,
      dropCity,
      distance,
      totalDays,
      pricingType,
      pricePerDay: carData.pricePerDay,
      pricePerKm,
      totalAmount,
      ownerEarnings,
      platformEarnings,
      commissionRate,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pay_at_dropoff' : 'paid',
      status: 'confirmed',
      insurance: insuranceData,
      // Legacy fields for backward compatibility
      car: carId,
      user: _id,
      owner: carData.owner._id,
      price: totalAmount
    });

    // Wait for the booking to be saved and IDs to be generated
    await booking.save();

    // Generate PDF invoice with proper IDs
    const bookingDetails = {
      bookingId: booking.bookingId || `BID${Date.now().toString().slice(-3)}`,
      invoiceNumber: booking.invoiceNumber || `INV${Date.now().toString().slice(-3)}`,
      userName: userData.name,
      userEmail: userData.email,
      userPhone: userData.phone || userData.phoneNumber || 'N/A',
      carName: carData.name || `${carData.brand} ${carData.model}`,
      carModel: carData.model,
      carBrand: carData.brand,
      carType: carData.category || carData.car_type || 'N/A',
      carYear: carData.year || 'N/A',
      carRegistration: carData.registration_number || carData.registeration_number || 'N/A',
      pickupLocation: `${pickupLocation}, ${pickupCity}`,
      pickupCity,
      dropLocation: `${dropLocation}, ${dropCity}`,
      dropCity,
      pickupDate,
      returnDate,
      totalDays,
      distance: pricingType === 'per_km' ? distance * 2 : distance, // Show round trip for per-km
      pricingType,
      pricePerDay: carData.pricePerDay,
      pricePerKm,
      basePrice: totalAmount - (insuranceData.cost || 0), // Base price without insurance
      insurancePlan: insuranceData.selected ? insuranceData.type : null,
      insuranceCost: insuranceData.selected ? insuranceData.cost : null,
      totalAmount,
      ownerEarnings,
      commissionRate,
      paymentMethod,
      paymentStatus: 'pay_at_dropoff',
      createdAt: booking.createdAt
    };

    const pdfBuffer = await generateBookingInvoice(bookingDetails);

    // Send confirmation email with PDF
    await sendBookingConfirmation(userData.email, bookingDetails, pdfBuffer);

    res.json({ 
      success: true, 
      message: "Booking created successfully! Confirmation email sent with invoice.",
      bookingId: booking.bookingId,
      invoiceNumber: booking.invoiceNumber
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to list user bookings
const getUserBookings = async (req, res) => {
  try {
    const {_id} = req.user;
    const bookings = await Booking.find({
      $or: [
        { userId: _id },
        { user: _id } // backward compatibility
      ]
    })
    .populate("carId car") // populate both new and old field names
    .populate("originalCarId") // populate replacement car info
    .sort({createdAt: -1});
    
    res.json({success: true, bookings});
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to get owner/employee bookings (admin excluded)
const getOwnerBookings = async (req, res) => {
  try {
    // Allow employee and any logged-in user (users can see bookings for their cars)
    if(!req.user || !req.user._id){
        return res.json({success: false, message: "Unauthorized - Please login"});
    }
    
    let query = {};
    if (req.user.role === 'employee') {
      // Employee sees all bookings (no filter)
      query = {};
    } else if (req.user.role === 'admin') {
      // Admin sees no bookings
      return res.json({ success: true, bookings: [] });
    } else {
      // Regular users see bookings for their cars only
      query = {
        $or: [
          { ownerId: req.user._id },
          { owner: req.user._id } // backward compatibility
        ]
      };
    }
    
    const bookings = await Booking.find(query)
      .populate('carId car userId user') // populate both new and old field names
      .select("-user.password -userId.password")
      .sort({createdAt: -1});
      
    res.json({success: true, bookings});
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to change booking status
const changeBookingStatus = async (req, res) => {
  try {
    const {_id} = req.user;
    const {bookingId, status} = req.body;
    
    const booking = await Booking.findById(bookingId)
      .populate('carId car userId user');
    if (!booking) {
      return res.json({success: false, message: "Booking not found"});
    }
    
    // Check authorization (employee only, not admin)
    const isOwner = booking.ownerId?.toString() === _id.toString() || 
                   booking.owner?.toString() === _id.toString();
    const isEmployee = req.user.role === 'employee';
    
    if (!isOwner && !isEmployee) {
      return res.json({success: false, message: "Unauthorized"});
    }
    
    const previousStatus = booking.status;
    booking.status = status;
    await booking.save();
    
    // Award loyalty points when booking is completed
    if (status === 'completed' && previousStatus !== 'completed') {
      try {
        await earnPoints(bookingId);
      } catch (error) {
        console.error('Error awarding loyalty points:', error);
        // Don't fail the status update if loyalty points fail
      }
      
      // Send review reminder email when booking is completed
      try {
        const userData = booking.userId || booking.user;
        const carData = booking.carId || booking.car;
        
        if (userData && userData.email) {
          await sendReviewReminder(userData.email, {
            userName: userData.name,
            bookingId: booking.bookingId || booking._id,
            carId: carData._id.toString(),
            carName: `${carData.brand} ${carData.model}`,
            pickupDate: booking.pickupDate,
            returnDate: booking.returnDate
          });
          console.log(`✅ Review reminder email sent to ${userData.email}`);
        }
      } catch (emailError) {
        console.error('Error sending review reminder email:', emailError);
        // Don't fail the status update if email fails
      }
    }
    
    res.json({success: true, message: "Status updated successfully"});
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const {_id} = req.user;
    const {bookingId, paymentStatus} = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.json({success: false, message: "Booking not found"});
    }
    
    // Check authorization - only owner/employee can update payment status (not admin)
    const isOwner = booking.ownerId?.toString() === _id.toString() || 
                   booking.owner?.toString() === _id.toString();
    const isEmployee = req.user.role === 'employee';
    
    if (!isOwner && !isEmployee) {
      return res.json({success: false, message: "Unauthorized"});
    }
    
    booking.paymentStatus = paymentStatus;
    await booking.save();
    
    res.json({success: true, message: "Payment status updated successfully"});
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to calculate distance between two locations
const calculateDistanceAPI = async (req, res) => {
  try {
    const { pickupLocation, dropLocation } = req.body;
    
    if (!pickupLocation || !dropLocation) {
      return res.json({ success: false, message: "Both pickup and drop locations are required" });
    }
    
    const distance = await calculateDistance(pickupLocation, dropLocation);
    
    res.json({ 
      success: true, 
      distance,
      message: `Distance from ${pickupLocation} to ${dropLocation} is ${distance} km`
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
const downloadInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { _id } = req.user;
    
    console.log('📄 PDF Download request for booking:', bookingId);
    
    const booking = await Booking.findById(bookingId)
      .populate('carId car userId user ownerId owner');
    
    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    
    // Check if user is authorized to download this invoice (employee only, not admin)
    const isBookingUser = booking.userId?._id.toString() === _id.toString() || 
                         booking.user?._id.toString() === _id.toString();
    const isOwner = booking.ownerId?._id.toString() === _id.toString() || 
                   booking.owner?._id.toString() === _id.toString();
    const isEmployee = req.user.role === 'employee';
    
    if (!isBookingUser && !isOwner && !isEmployee) {
      console.error('❌ Unauthorized access attempt by user:', _id);
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    
    // Get car and user data (handle both new and old field names)
    const carData = booking.carId || booking.car;
    const userData = booking.userId || booking.user;
    
    console.log('✅ Generating PDF for booking:', {
      bookingId: booking._id,
      user: userData.name,
      car: `${carData.brand} ${carData.model}`
    });
    
    const bookingDetails = {
      bookingId: booking.bookingId || booking._id, // Use formatted bookingId first, fallback to _id
      invoiceNumber: booking.invoiceNumber || `INV${Date.now().toString().slice(-3)}`,
      userName: userData.name,
      userEmail: userData.email,
      userPhone: userData.phone || userData.phoneNumber || 'N/A',
      carName: carData.name || `${carData.brand} ${carData.model}`,
      carModel: carData.model,
      carBrand: carData.brand,
      carType: carData.category || carData.car_type || 'N/A',
      carYear: carData.year || 'N/A',
      carRegistration: carData.registration_number || carData.registeration_number || 'N/A',
      pickupLocation: booking.pickupLocation || 'N/A',
      pickupCity: booking.pickupCity || 'N/A',
      dropLocation: booking.dropLocation || 'N/A',
      dropCity: booking.dropCity || 'N/A',
      pickupDate: booking.pickupDate,
      returnDate: booking.returnDate,
      totalDays: booking.totalDays || Math.ceil((new Date(booking.returnDate) - new Date(booking.pickupDate)) / (1000 * 60 * 60 * 24)),
      distance: booking.distance || 0,
      pricingType: booking.pricingType || 'daily',
      pricePerDay: booking.pricePerDay || carData.pricePerDay,
      pricePerKm: booking.pricePerKm || 15,
      basePrice: booking.insurance?.selected ? (booking.totalAmount || booking.price) - (booking.insurance.cost || 0) : (booking.totalAmount || booking.price),
      insurancePlan: booking.insurance?.selected ? booking.insurance.type : null,
      insuranceCost: booking.insurance?.selected ? booking.insurance.cost : null,
      totalAmount: booking.totalAmount || booking.price,
      ownerEarnings: booking.ownerEarnings || booking.totalAmount || booking.price,
      commissionRate: booking.commissionRate || 0,
      paymentMethod: booking.paymentMethod || 'cash',
      paymentStatus: booking.paymentStatus || 'pay_at_dropoff',
      createdAt: booking.createdAt
    };
    
    // Generate PDF using PDFKit (via pdfGenerator.js)
    const pdfBuffer = await generateBookingInvoice(bookingDetails);
    
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${bookingId}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the PDF buffer - use res.end() for binary data
    // This ensures proper binary handling in both Express and serverless environments
    res.end(pdfBuffer, 'binary');
    
    console.log('✅ PDF sent to client');
    
  } catch (error) {
    console.error('❌ PDF download error:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate invoice. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// API for user to cancel their own booking
const cancelUserBooking = async (req, res) => {
  try {
    const { _id } = req.user;
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }
    
    // Check if user owns this booking
    const isBookingUser = booking.userId?.toString() === _id.toString() || 
                         booking.user?.toString() === _id.toString();
    
    if (!isBookingUser) {
      return res.json({ success: false, message: "Unauthorized to cancel this booking" });
    }
    
    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return res.json({ success: false, message: "Booking is already cancelled" });
    }
    
    if (booking.status === 'completed') {
      return res.json({ success: false, message: "Cannot cancel completed booking" });
    }
    
    // Check if cancellation is within allowed time (2 minutes before pickup)
    const now = new Date();
    const pickupTime = new Date(booking.pickupDate);
    const timeDifferenceInMinutes = (pickupTime - now) / (1000 * 60);
    
    if (timeDifferenceInMinutes <= 2) {
      return res.json({ 
        success: false, 
        message: "Cannot cancel booking. Cancellation is only allowed up to 2 minutes before pickup time." 
      });
    }
    
    // Update booking status to cancelled
    booking.status = 'cancelled';
    await booking.save();
    
    // Car becomes available immediately (no need to update car availability as it's handled by date-based availability check)
    
    console.log(`✅ Booking ${bookingId} cancelled by user ${_id}`);
    
    res.json({ 
      success: true, 
      message: "Booking cancelled successfully. The car is now available for others to book." 
    });
  } catch (error) {
    console.error('Cancel booking error:', error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to resend invoice to user's email
const resendInvoiceEmail = async (req, res) => {
  try {
    const { _id } = req.user;
    const { bookingId } = req.params;
    
    console.log('📧 Resend invoice request for booking:', bookingId);
    
    const booking = await Booking.findById(bookingId)
      .populate('carId car userId user ownerId owner');
    
    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    
    // Check if user owns this booking (employee only, not admin)
    const isBookingUser = booking.userId?._id.toString() === _id.toString() || 
                         booking.user?._id.toString() === _id.toString();
    const isOwner = booking.ownerId?._id.toString() === _id.toString() || 
                   booking.owner?._id.toString() === _id.toString();
    const isEmployee = req.user.role === 'employee';
    
    if (!isBookingUser && !isOwner && !isEmployee) {
      console.error('❌ Unauthorized access attempt by user:', _id);
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    
    // Get car and user data
    const carData = booking.carId || booking.car;
    const userData = booking.userId || booking.user;
    
    if (!carData || !userData) {
      console.error('❌ Missing car or user data');
      return res.status(400).json({ success: false, message: "Incomplete booking data" });
    }
    
    const bookingDetails = {
      bookingId: booking.bookingId || booking._id,
      invoiceNumber: booking.invoiceNumber || `INV${Date.now().toString().slice(-3)}`,
      userName: userData.name,
      userEmail: userData.email,
      userPhone: userData.phone || userData.phoneNumber || 'N/A',
      carName: carData.name || `${carData.brand} ${carData.model}`,
      carModel: carData.model,
      carBrand: carData.brand,
      carType: carData.category || carData.car_type || 'N/A',
      carYear: carData.year || 'N/A',
      carRegistration: carData.registration_number || carData.registeration_number || 'N/A',
      pickupLocation: booking.pickupLocation || 'N/A',
      pickupCity: booking.pickupCity || 'N/A',
      dropLocation: booking.dropLocation || 'N/A',
      dropCity: booking.dropCity || 'N/A',
      pickupDate: booking.pickupDate,
      returnDate: booking.returnDate,
      totalDays: booking.totalDays || Math.ceil((new Date(booking.returnDate) - new Date(booking.pickupDate)) / (1000 * 60 * 60 * 24)),
      distance: booking.distance || 0,
      pricingType: booking.pricingType || 'daily',
      pricePerDay: booking.pricePerDay || carData.pricePerDay,
      pricePerKm: booking.pricePerKm || 15,
      basePrice: booking.insurance?.selected ? (booking.totalAmount || booking.price) - (booking.insurance.cost || 0) : (booking.totalAmount || booking.price),
      insurancePlan: booking.insurance?.selected ? booking.insurance.type : null,
      insuranceCost: booking.insurance?.selected ? booking.insurance.cost : null,
      totalAmount: booking.totalAmount || booking.price,
      ownerEarnings: booking.ownerEarnings || booking.totalAmount || booking.price,
      commissionRate: booking.commissionRate || 0,
      paymentMethod: booking.paymentMethod || 'cash',
      paymentStatus: booking.paymentStatus || 'pay_at_dropoff',
      status: booking.status,
      createdAt: booking.createdAt
    };
    
    console.log('📄 Generating PDF invoice...');
    
    // Generate PDF with error handling
    let pdfBuffer;
    try {
      pdfBuffer = await generateBookingInvoice(bookingDetails);
      
      // Ensure we have a valid buffer
      if (!pdfBuffer) {
        throw new Error('PDF buffer is null or undefined');
      }
      
      // Convert to Buffer if it's not already
      if (!Buffer.isBuffer(pdfBuffer)) {
        console.log('⚠️ PDF output is not a Buffer, converting...');
        pdfBuffer = Buffer.from(pdfBuffer);
      }
      
      if (pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty');
      }
      
      console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    } catch (pdfError) {
      console.error('❌ PDF generation error:', pdfError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate invoice PDF: ' + pdfError.message 
      });
    }
    
    console.log('📧 Sending email to:', userData.email);
    
    // Send email with PDF attachment
    try {
      const { sendBookingConfirmation } = require('../utils/emailService');
      await sendBookingConfirmation(userData.email, bookingDetails, pdfBuffer);
      console.log('✅ Invoice email sent successfully to:', userData.email);
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send email: ' + emailError.message 
      });
    }
    
    return res.json({ 
      success: true, 
      message: `Invoice sent successfully to ${userData.email}` 
    });
  } catch (error) {
    console.error('❌ Resend invoice error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to resend invoice: ' + error.message 
    });
  }
};

// API to resend review email to user
const resendReviewEmail = async (req, res) => {
  try {
    const { _id } = req.user;
    const { bookingId } = req.params;
    
    console.log('📧 Resend review email request for booking:', bookingId);
    
    const booking = await Booking.findById(bookingId)
      .populate('carId car userId user');
    
    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    
    // Check if user owns this booking
    const isBookingUser = booking.userId?._id.toString() === _id.toString() || 
                         booking.user?._id.toString() === _id.toString();
    
    if (!isBookingUser && req.user.role !== 'admin') {
      console.error('❌ Unauthorized access attempt by user:', _id);
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    
    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.json({ 
        success: false, 
        message: "Review email can only be sent for completed bookings" 
      });
    }
    
    // Get car and user data
    const carData = booking.carId || booking.car;
    const userData = booking.userId || booking.user;
    
    if (!carData || !userData) {
      console.error('❌ Missing car or user data');
      return res.status(400).json({ success: false, message: "Incomplete booking data" });
    }
    
    // Send review reminder email
    try {
      await sendReviewReminder(userData.email, {
        userName: userData.name,
        bookingId: booking.bookingId || booking._id,
        carId: carData._id.toString(),
        carName: `${carData.brand} ${carData.model}`,
        pickupDate: booking.pickupDate,
        returnDate: booking.returnDate
      });
      console.log(`✅ Review reminder email sent to ${userData.email}`);
      
      return res.json({ 
        success: true, 
        message: `Review email sent successfully to ${userData.email}` 
      });
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send review email: ' + emailError.message 
      });
    }
  } catch (error) {
    console.error('❌ Resend review email error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to resend review email: ' + error.message 
    });
  }
};


module.exports = {
  checkSpecificCarAvailability,
  checkAvailabilityOfCar,
  createBooking,
  getUserBookings,
  getOwnerBookings,
  changeBookingStatus,
  updatePaymentStatus,
  calculateDistanceAPI,
  downloadInvoice,
  cancelUserBooking,
  resendInvoiceEmail,
  resendReviewEmail
};