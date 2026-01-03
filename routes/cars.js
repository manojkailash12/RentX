const express = require('express');
const Car = require('../models/Car');
const auth = require('../middleware/auth');
const multer = require('multer');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Get all cars with filters (only approved cars for regular users)
router.get('/', async (req, res) => {
  try {
    const {
      city,
      district,
      state,
      type,
      seats,
      transmission,
      fuelType,
      minPrice,
      maxPrice,
      startDate,
      endDate
    } = req.query;

    let query = { 
      status: 'approved' // Only show approved cars
    };

    // Location filters
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (district) query['location.district'] = new RegExp(district, 'i');
    if (state) query['location.state'] = new RegExp(state, 'i');

    // Car specification filters
    if (type) query.type = type;
    if (seats) query.seats = parseInt(seats);
    if (transmission) query.transmission = transmission;
    if (fuelType) query.fuelType = fuelType;

    // Price filters
    if (minPrice || maxPrice) {
      query.pricePerDay = {};
      if (minPrice) query.pricePerDay.$gte = parseInt(minPrice);
      if (maxPrice) query.pricePerDay.$lte = parseInt(maxPrice);
    }

    // Get all cars matching the basic criteria
    let cars = await Car.find(query)
      .populate('owner', 'name phone email')
      .sort({ createdAt: -1 });

    // If date range is provided, filter out cars that are booked during that period
    if (startDate && endDate) {
      const Booking = require('../models/Booking');
      
      const requestedStart = new Date(startDate);
      const requestedEnd = new Date(endDate);
      
      // Find cars that have conflicting bookings
      const conflictingBookings = await Booking.find({
        bookingStatus: { $in: ['confirmed', 'ongoing'] },
        $or: [
          {
            // Booking starts during requested period
            startDate: { $gte: requestedStart, $lt: requestedEnd }
          },
          {
            // Booking ends during requested period
            endDate: { $gt: requestedStart, $lte: requestedEnd }
          },
          {
            // Booking spans the entire requested period
            startDate: { $lte: requestedStart },
            endDate: { $gte: requestedEnd }
          }
        ]
      });
      
      const bookedCarIds = conflictingBookings.map(booking => booking.car.toString());
      
      // Filter out cars that are booked during the requested period
      cars = cars.filter(car => !bookedCarIds.includes(car._id.toString()));
    } else {
      // If no date range provided, just check basic availability and exclude currently ongoing bookings
      const Booking = require('../models/Booking');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const ongoingBookings = await Booking.find({
        bookingStatus: 'ongoing',
        startDate: { $lte: today },
        endDate: { $gte: today }
      });
      
      const ongoingCarIds = ongoingBookings.map(booking => booking.car.toString());
      
      // Filter out cars that are currently in use and check basic availability
      cars = cars.filter(car => 
        car.availability !== false && 
        !ongoingCarIds.includes(car._id.toString())
      );
    }

    res.json(cars);
  } catch (error) {
    console.error('Get cars error:', error);
    res.status(500).json({ message: 'Server error while fetching cars' });
  }
});

// Get car by ID
router.get('/:id', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id)
      .populate('owner', 'name phone email');

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.json(car);
  } catch (error) {
    console.error('Get car error:', error);
    res.status(500).json({ message: 'Server error while fetching car' });
  }
});

// Add new car (Any authenticated user can add)
router.post('/', auth, upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'rcBook', maxCount: 1 },
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'insuranceCertificate', maxCount: 1 },
  { name: 'pollutionCertificate', maxCount: 1 }
]), async (req, res) => {
  try {
    // Check if user is admin
    const isAdmin = req.user.role === 'admin';
    
    // For non-admin users, validate required documents
    if (!isAdmin) {
      if (!req.files || !req.files.rcBook || !req.files.registrationCertificate) {
        return res.status(400).json({ 
          message: 'RC Book and Registration Certificate are required for vehicle submission' 
        });
      }
    }

    const carData = {
      ...req.body,
      owner: req.user.userId,
      // If admin is adding car directly, approve it immediately
      status: isAdmin ? 'approved' : 'pending'
    };

    // Handle file uploads
    if (req.files) {
      if (req.files.images) {
        carData.images = req.files.images.map(file => `/uploads/${file.filename}`);
      }
      
      carData.documents = {};
      if (req.files.rcBook) {
        carData.documents.rcBook = `/uploads/${req.files.rcBook[0].filename}`;
      }
      if (req.files.registrationCertificate) {
        carData.documents.registrationCertificate = `/uploads/${req.files.registrationCertificate[0].filename}`;
      }
      if (req.files.insuranceCertificate) {
        carData.documents.insuranceCertificate = `/uploads/${req.files.insuranceCertificate[0].filename}`;
      }
      if (req.files.pollutionCertificate) {
        carData.documents.pollutionCertificate = `/uploads/${req.files.pollutionCertificate[0].filename}`;
      }
    } else if (!isAdmin) {
      // If no files uploaded and not admin, return error
      return res.status(400).json({ 
        message: 'Vehicle documents are required for submission' 
      });
    }

    const car = new Car(carData);
    await car.save();

    const message = isAdmin 
      ? 'Vehicle added successfully and is now live!'
      : 'Vehicle submitted successfully! It will be reviewed by admin before going live.';

    res.status(201).json({
      message,
      car
    });
  } catch (error) {
    console.error('Add car error:', error);
    res.status(500).json({ message: 'Server error while adding car' });
  }
});

// Get user's own cars
router.get('/my/vehicles', auth, async (req, res) => {
  try {
    const cars = await Car.find({ owner: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(cars);
  } catch (error) {
    console.error('Get user cars error:', error);
    res.status(500).json({ message: 'Server error while fetching your vehicles' });
  }
});

// Update car (Owner or Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Check if user is owner or admin
    if (car.owner.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedCar = await Car.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Car updated successfully',
      car: updatedCar
    });
  } catch (error) {
    console.error('Update car error:', error);
    res.status(500).json({ message: 'Server error while updating car' });
  }
});

// Delete car (Owner or Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Check if user is owner or admin
    if (car.owner.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Car.findByIdAndDelete(req.params.id);

    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({ message: 'Server error while deleting car' });
  }
});

// Get South India locations
router.get('/locations/south-india', (req, res) => {
  const southIndiaLocations = {
    "Tamil Nadu": {
      districts: {
        "Chennai": ["T. Nagar", "Anna Nagar", "Velachery", "Adyar", "Mylapore"],
        "Coimbatore": ["RS Puram", "Gandhipuram", "Peelamedu", "Saravanampatti"],
        "Madurai": ["Anna Nagar", "KK Nagar", "Sellur", "Vilangudi"],
        "Salem": ["Five Roads", "Fairlands", "Ammapet", "Hasthampatti"],
        "Tiruchirappalli": ["Cantonment", "Srirangam", "Thillai Nagar"],
        "Tirunelveli": ["Palayamkottai", "Town", "Melapalayam"],
        "Vellore": ["Katpadi", "Bagayam", "Officer's Line"],
        "Erode": ["Perundurai Road", "Rangampalayam", "Surampatti"],
        "Thoothukudi": ["New Colony", "Millerpuram", "Roche Park"],
        "Dindigul": ["Chatram", "Begampur", "Palani Road"]
      }
    },
    "Karnataka": {
      districts: {
        "Bengaluru Urban": ["Koramangala", "Indiranagar", "Whitefield", "Electronic City", "Jayanagar"],
        "Mysuru": ["Saraswathipuram", "Kuvempunagar", "Vijayanagar", "Hebbal"],
        "Mangaluru": ["Kadri", "Bejai", "Falnir", "Kankanady"],
        "Hubballi": ["Vidyanagar", "Keshwapur", "Unkal", "Gokul Road"],
        "Belagavi": ["Tilakwadi", "Camp", "Hindwadi", "Shahapur"],
        "Kalaburagi": ["Gulbarga", "Aland Road", "Super Market"],
        "Davanagere": ["MCC B Block", "Shivaji Nagar", "Anjaneya Nagar"],
        "Ballari": ["Cantonment", "Cowl Bazaar", "Gandhi Nagar"],
        "Vijayapura": ["Station Road", "Solapur Road", "Tikota"],
        "Shivamogga": ["Kuvempu Nagar", "Vidyanagar", "BH Road"]
      }
    },
    "Kerala": {
      districts: {
        "Thiruvananthapuram": ["Pattom", "Kowdiar", "Vellayambalam", "Sasthamangalam"],
        "Kochi": ["Marine Drive", "MG Road", "Kakkanad", "Edapally"],
        "Kozhikode": ["Mavoor Road", "West Hill", "Palayam", "Mukkom"],
        "Thrissur": ["Swaraj Round", "East Fort", "West Fort", "Ollur"],
        "Kollam": ["Chinnakada", "Kadappakada", "Kottiyam", "Paravur"],
        "Alappuzha": ["Mullakkal", "Thathampally", "Vadai", "Punnapra"],
        "Palakkad": ["Town", "Mettupalayam", "Sulthan Bathery Road"],
        "Malappuram": ["Mini Civil Station", "Kottakkal", "Perinthalmanna"],
        "Kannur": ["Fort Road", "Thalassery Road", "Payyambalam"],
        "Kottayam": ["MC Road", "Baker Junction", "Collectorate"]
      }
    },
    "Andhra Pradesh": {
      districts: {
        "Visakhapatnam": ["MVP Colony", "Dwaraka Nagar", "Gajuwaka", "Madhurawada"],
        "Vijayawada": ["Benz Circle", "Labbipet", "Governorpet", "Auto Nagar"],
        "Guntur": ["Brodipet", "Kothapet", "Arundelpet", "Nagarampalem"],
        "Nellore": ["Trunk Road", "Vedayapalem", "Stonehousepet"],
        "Kurnool": ["Kothapet", "Nandyal Road", "Railway Station Road"],
        "Rajahmundry": ["Danavaipeta", "T. Nagar", "Innispeta"],
        "Tirupati": ["Renigunta Road", "Air Bypass Road", "Korlagunta"],
        "Kakinada": ["Suryaraopet", "Jagannaickpur", "Ramanayyapeta"],
        "Anantapur": ["Subash Road", "Park Road", "Railway Station Road"],
        "Chittoor": ["Tirupati Road", "Madras Road", "Renigunta Road"]
      }
    },
    "Telangana": {
      districts: {
        "Hyderabad": ["Banjara Hills", "Jubilee Hills", "Gachibowli", "Hitech City", "Secunderabad"],
        "Warangal": ["Hanamkonda", "Kazipet", "Subedari"],
        "Nizamabad": ["Armoor Road", "Bodhan Road", "Clock Tower"],
        "Khammam": ["Wyra Road", "Station Road", "Collectorate"],
        "Karimnagar": ["Civil Lines", "Mukarampura", "Rekurthi"],
        "Mahbubnagar": ["Station Road", "Jadcherla Road", "Court Road"],
        "Nalgonda": ["Clock Tower", "Miryalaguda Road", "Station Road"],
        "Adilabad": ["Station Road", "Collectorate Road", "Gandhi Chowk"],
        "Medak": ["Sangareddy", "Patancheru", "Medak Town"],
        "Rangareddy": ["LB Nagar", "Vanasthalipuram", "Uppal"]
      }
    }
  };

  res.json(southIndiaLocations);
});

module.exports = router;