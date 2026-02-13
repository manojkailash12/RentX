const Car = require("../models/car.js");
const User = require("../models/user.js");
const Booking = require("../models/booking.js");
const fs = require("fs");
const path = require("path");

// api to change role to owner (deprecated - users can now add cars directly)
const changeRoleToOwner = async (req, res) => {
  try {
    const { id } = req.user;
    await User.findByIdAndUpdate(id, { role: "owner" });
    res.json({ success: true, message: "Now you can list cars" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to add car (for both admin and users)
// Admin: Adds cars to platform inventory (auto-approved)
// User: Adds personal car for rent through enterprise feature (requires approval)
const addCar = async (req, res) => {
  try {
    const { _id, role } = req.user;
    
    console.log('🚗 Add car request received:', { userId: _id, role });
    
    if (!req.body.carData) {
      return res.status(400).json({ success: false, message: "Car data is required" });
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Car image is required" });
    }

    let car;
    try {
      car = JSON.parse(req.body.carData);
    } catch (error) {
      return res.status(400).json({ success: false, message: "Invalid car data format" });
    }

    // Validate required fields
    const requiredFields = ['brand', 'model', 'registration_number', 'year', 'pricePerDay', 'category', 'transmission', 'fuel_type', 'seating_capacity', 'location', 'description'];
    for (const field of requiredFields) {
      if (!car[field] || car[field].toString().trim() === '') {
        return res.status(400).json({ success: false, message: `${field} is required` });
      }
    }

    // Additional validations
    if (car.registration_number.length < 3) {
      return res.status(400).json({ success: false, message: "Registration number must be at least 3 characters" });
    }

    if (car.registration_number.length > 20) {
      return res.status(400).json({ success: false, message: "Registration number cannot exceed 20 characters" });
    }

    if (car.year < 1990 || car.year > new Date().getFullYear() + 1) {
      return res.status(400).json({ success: false, message: "Please enter a valid year" });
    }

    if (car.pricePerDay < 100) {
      return res.status(400).json({ success: false, message: "Daily price must be at least ₹100" });
    }

    if (car.description.length < 10) {
      return res.status(400).json({ success: false, message: "Description must be at least 10 characters" });
    }

    const imageFile = req.file;
    console.log('📁 File received:', { 
      filename: imageFile.filename, 
      size: imageFile.size, 
      mimetype: imageFile.mimetype,
      cloudinary: imageFile.path ? 'Cloudinary URL' : 'Local file'
    });

    // Get image URL - Cloudinary provides it in file.path, local storage uses filename
    let imageUrl;
    
    if (imageFile.path && imageFile.path.startsWith('http')) {
      // Cloudinary URL
      imageUrl = imageFile.path;
      console.log('☁️ Cloudinary image URL:', imageUrl);
    } else {
      // Fallback to local storage (development only)
      const uploadsDir = process.env.NETLIFY 
        ? '/tmp/uploads/cars' 
        : path.join(process.cwd(), 'uploads', 'cars');
        
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = imageFile.filename || `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(imageFile.originalname)}`;
      const filePath = path.join(uploadsDir, fileName);
      
      if (imageFile.buffer) {
        fs.writeFileSync(filePath, imageFile.buffer);
      } else if (imageFile.path) {
        fs.renameSync(imageFile.path, filePath);
      }
      
      imageUrl = process.env.NETLIFY 
        ? `/.netlify/functions/api/uploads/cars/${fileName}`
        : `/uploads/cars/${fileName}`;
      
      console.log('💾 Local image URL:', imageUrl);
    }

    // Car approval logic based on role:
    // 1. Employee adding admin car (platform inventory) → Auto-approved, owner = admin
    // 2. Employee adding their own car → Needs admin approval
    // 3. User adding their car → Needs employee approval
    // 4. Admin adding their car → Auto-approved (shouldn't happen, employees add for admin)
    
    let isApproved = false;
    let ownerType = 'user';
    let carOwner = _id; // Default: person adding is the owner
    let addedBy = null;
    
    // Check if employee is adding a car for admin (platform inventory)
    if (role === 'employee' && req.body.addForAdmin === 'true') {
      // Employee adding admin car (platform inventory)
      isApproved = true; // Auto-approved
      ownerType = 'admin';
      // Find an admin user to set as owner
      const adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        return res.status(400).json({ success: false, message: "No admin found in system" });
      }
      carOwner = adminUser._id;
      addedBy = _id; // Track which employee added it
    } else {
      // Person adding their own car
      ownerType = role === 'admin' ? 'admin' : (role === 'employee' ? 'employee' : 'user');
      carOwner = _id;
      
      // Approval logic:
      // - Admin cars: auto-approved (but shouldn't happen)
      // - Employee cars: need admin approval
      // - User cars: need employee approval
      if (role === 'admin') {
        isApproved = true;
      } else {
        isApproved = false; // Needs approval
      }
    }
    
    console.log('💾 Creating car in database...', { isApproved, ownerType, carOwner, addedBy });
    
    const newCar = await Car.create({ 
      ...car, 
      owner: carOwner, 
      image: imageUrl,
      isApproved,
      ownerType,
      addedBy,
      approvedBy: isApproved ? carOwner : undefined,
      approvedAt: isApproved ? new Date() : undefined,
      name: `${car.brand} ${car.model}`,
      year: parseInt(car.year),
      pricePerDay: parseFloat(car.pricePerDay),
      seating_capacity: parseInt(car.seating_capacity)
    });

    console.log('✅ Car created successfully:', newCar._id);

    const message = isApproved 
      ? "Car added successfully and is now available for rent!"
      : "Car added successfully and is pending approval";

    res.json({ 
      success: true, 
      message, 
      carId: newCar._id,
      car: {
        id: newCar._id,
        name: newCar.name,
        brand: newCar.brand,
        model: newCar.model,
        isApproved: newCar.isApproved,
        ownerType: newCar.ownerType
      }
    });
  } catch (error) {
    console.error('❌ Add car error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to add car. Please try again.' 
    });
  }
};

// api to list owner cars
const getOwnerCars = async (req, res) => {
  try {
    const { _id, role } = req.user;
    
    console.log('🔍 getOwnerCars request:', { userId: _id, role });
    
    // Only Employee sees all cars, users see only their cars, admin sees nothing
    let query;
    if (role === 'employee') {
      query = {}; // Employee sees all cars
    } else if (role === 'admin') {
      return res.json({ success: true, cars: [] }); // Admin sees no cars
    } else {
      query = { owner: _id }; // Users see only their cars
    }
    
    console.log('📋 Query:', JSON.stringify(query));
    
    const cars = await Car.find(query)
      .populate('owner', 'name email role')
      .sort({ createdAt: -1 });
    
    console.log(`📋 Fetched ${cars.length} cars for ${role}`);
    
    if (cars.length > 0) {
      console.log('🚗 First car:', {
        id: cars[0]._id,
        brand: cars[0].brand,
        model: cars[0].model,
        isAvailable: cars[0].isAvailable,
        isApproved: cars[0].isApproved
      });
    }
    
    res.json({ success: true, cars });
  } catch (error) {
    console.error('Error fetching owner cars:', error);
    res.json({ success: false, message: error.message });
  }
};

// api to get pending cars for approval
// Employees see user cars, Admins see employee cars
const getPendingCars = async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'employee' && role !== 'admin') {
      return res.json({ success: false, message: "Unauthorized. Employee or Admin access required." });
    }
    
    // Employees approve user cars, Admins approve employee cars
    const ownerTypeFilter = role === 'employee' ? 'user' : 'employee';
    
    const pendingCars = await Car.find({ 
      isApproved: false,
      ownerType: ownerTypeFilter 
    })
    .populate('owner', 'name email role')
    .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      cars: pendingCars,
      approverRole: role,
      filteringFor: ownerTypeFilter
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to get car approval statistics
const getCarApprovalStats = async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'employee' && role !== 'admin') {
      return res.json({ success: false, message: "Unauthorized. Employee or Admin access required." });
    }
    
    // Employees approve user cars, Admins approve employee cars
    const ownerTypeFilter = role === 'employee' ? 'user' : 'employee';
    
    const [pending, approved, rejected] = await Promise.all([
      Car.countDocuments({ isApproved: false, ownerType: ownerTypeFilter }),
      Car.countDocuments({ isApproved: true, ownerType: ownerTypeFilter }),
      Car.countDocuments({ isApproved: false, rejectionReason: { $exists: true, $ne: '' }, ownerType: ownerTypeFilter })
    ]);
    
    res.json({ 
      success: true, 
      stats: {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected
      }
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};


// api to approve/reject car
// Employees approve user cars, Admins approve employee cars
const approveRejectCar = async (req, res) => {
  try {
    const { role, _id } = req.user;
    const { carId, action, rejectionReason } = req.body;
    
    if (role !== 'employee' && role !== 'admin') {
      return res.json({ success: false, message: "Unauthorized. Employee or Admin access required." });
    }
    
    const car = await Car.findById(carId).populate('owner', 'name email role');
    
    if (!car) {
      return res.json({ success: false, message: "Car not found" });
    }
    
    // Verify approval authority:
    // Employees can approve user cars
    // Admins can approve employee cars
    if (role === 'employee' && car.ownerType !== 'user') {
      return res.json({ success: false, message: "Employees can only approve user cars" });
    }
    
    if (role === 'admin' && car.ownerType !== 'employee') {
      return res.json({ success: false, message: "Admins can only approve employee cars" });
    }
    
    if (action === 'approve') {
      car.isApproved = true;
      car.approvedBy = _id;
      car.approvedAt = new Date();
      car.rejectionReason = undefined;
      await car.save();
      
      res.json({ success: true, message: "Car approved successfully!" });
    } else if (action === 'reject') {
      car.rejectionReason = rejectionReason || 'No reason provided';
      await car.save();
      
      res.json({ success: true, message: "Car rejected successfully!" });
    } else {
      res.json({ success: false, message: "Invalid action" });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to get single car for editing
const getCarForEdit = async (req, res) => {
  try {
    const { _id, role } = req.user;
    const { carId } = req.params;
    
    const car = await Car.findById(carId);
    
    if (!car) {
      return res.json({ success: false, message: "Car not found" });
    }
    
    // Check if user owns the car or is employee (admin cannot edit)
    const isOwner = car.owner.toString() === _id.toString();
    const isEmployee = role === 'employee';
    
    if (!isOwner && !isEmployee) {
      return res.json({ success: false, message: "Unauthorized to edit this car" });
    }
    
    res.json({ success: true, car });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to update car
const updateCar = async (req, res) => {
  try {
    const { _id, role } = req.user;
    const { carId } = req.params;
    
    if (!req.body.carData) {
      return res.json({ success: false, message: "Car data is required" });
    }
    
    let carData = JSON.parse(req.body.carData);
    const imageFile = req.file;
    
    const existingCar = await Car.findById(carId);
    
    if (!existingCar) {
      return res.json({ success: false, message: "Car not found" });
    }
    
    // Check if user owns the car or is employee (admin cannot edit)
    const isOwner = existingCar.owner.toString() === _id.toString();
    const isEmployee = role === 'employee';
    
    if (!isOwner && !isEmployee) {
      return res.json({ success: false, message: "Unauthorized to edit this car" });
    }
    
    // Validate required fields
    const requiredFields = ['brand', 'model', 'registration_number', 'year', 'pricePerDay', 'category', 'transmission', 'fuel_type', 'seating_capacity', 'location', 'description'];
    for (const field of requiredFields) {
      if (!carData[field]) {
        return res.json({ success: false, message: `${field} is required` });
      }
    }
    
    let imageUrl = existingCar.image; // Keep existing image by default
    
    // Handle new image upload if provided
    if (imageFile) {
      const uploadsDir = process.env.NETLIFY 
        ? '/tmp/uploads/cars' 
        : path.join(process.cwd(), 'uploads', 'cars');
        
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      if (process.env.NETLIFY) {
        const fileName = imageFile.filename || `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(imageFile.originalname)}`;
        
        // Save file to /tmp/uploads/cars
        const filePath = path.join(uploadsDir, fileName);
        if (imageFile.path) {
          fs.renameSync(imageFile.path, filePath);
        }
        
        imageUrl = `/.netlify/functions/api/uploads/cars/${fileName}`;
      } else {
        // Local development - use relative path
        const fileExtension = path.extname(imageFile.originalname);
        const fileName = `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
        const filePath = path.join(uploadsDir, fileName);
        
        fs.renameSync(imageFile.path, filePath);
        
        // Use relative path for local development
        imageUrl = `/uploads/cars/${fileName}`;
      }
    }
    
    // Update car data
    const updatedCar = await Car.findByIdAndUpdate(carId, {
      ...carData,
      image: imageUrl,
      name: `${carData.brand} ${carData.model}`,
      // If user-owned car is edited, it needs re-approval (unless employee is editing)
      isApproved: (existingCar.ownerType === 'admin' || role === 'employee') ? true : false,
      rejectionReason: undefined, // Clear any previous rejection reason
      updatedAt: new Date()
    }, { new: true });
    
    const message = (existingCar.ownerType === 'user' && role !== 'employee') 
      ? "Car updated successfully! It will need re-approval before being available for booking."
      : "Car updated successfully!";
    
    res.json({ success: true, message, car: updatedCar });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to delete car
const deleteCar = async (req, res) => {
  try {
    const { _id, role } = req.user;
    const { carId } = req.body;
    
    const car = await Car.findById(carId);
    
    if (!car) {
      return res.json({ success: false, message: "Car not found" });
    }
    
    // Check if user owns the car or is employee (admin cannot delete)
    const isOwner = car.owner.toString() === _id.toString();
    const isEmployee = role === 'employee';
    
    if (!isOwner && !isEmployee) {
      return res.json({ success: false, message: "Unauthorized to delete this car" });
    }
    
    // Check if car has active bookings
    const activeBookings = await Booking.find({
      $or: [
        { carId: carId },
        { car: carId }
      ],
      status: { $in: ['confirmed', 'pending'] },
      returnDate: { $gte: new Date() }
    });
    
    if (activeBookings.length > 0) {
      return res.json({ 
        success: false, 
        message: "Cannot delete car with active bookings. Please wait for bookings to complete or cancel them first." 
      });
    }
    
    await Car.findByIdAndDelete(carId);
    
    res.json({ success: true, message: "Car deleted successfully!" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to toggle car availability
const toggleCarAvailability = async (req, res) => {
  try {
    const { _id, role } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    if (!car) {
      return res.json({ success: false, message: "Car not found" });
    }

    // checking if car belongs to the user or if user is employee (admin cannot toggle)
    const isOwner = car.owner.toString() === _id.toString();
    const isEmployee = role === 'employee';
    
    if (!isOwner && !isEmployee) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    car.isAvailable = !car.isAvailable;
    await car.save();

    res.json({ success: true, message: "Availability Toggled" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to get dashboard data
const getDashboardData = async (req, res) => {
  try {
    const { _id, role } = req.user;

    if (!['admin', 'owner'].includes(role)) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    let carsQuery = {};
    let bookingsQuery = {};
    
    if (role === 'owner' || role === 'user') {
      carsQuery = { owner: _id };
      bookingsQuery = { 
        $or: [
          { ownerId: _id },
          { owner: _id } // backward compatibility
        ]
      };
    }
    // If admin, get all data (no filter)

    const cars = await Car.find(carsQuery);
    const bookings = await Booking.find(bookingsQuery)
      .populate("carId car")
      .sort({ createdAt: -1 });

    const pendingBookings = await Booking.find({
      ...bookingsQuery,
      status: "pending",
    });
    
    const confirmedBookings = await Booking.find({
      ...bookingsQuery,
      status: "confirmed",
    });
    
    const completedBookings = await Booking.find({
      ...bookingsQuery,
      status: "completed",
    });

    // Calculate monthly revenue
    // For admin: total revenue from all bookings
    // For users: only their earnings after commission
    const monthlyRevenue = bookings
      .filter(booking => ['confirmed', 'completed'].includes(booking.status))
      .reduce((acc, booking) => {
        if (role === 'admin') {
          // Admin gets platform earnings from user cars + full amount from admin cars
          return acc + (booking.totalAmount || booking.price || 0);
        } else {
          // Users get their earnings after commission
          return acc + (booking.ownerEarnings || booking.totalAmount || booking.price || 0);
        }
      }, 0);
    
    // Calculate platform commission (admin only)
    const platformCommission = role === 'admin' ? bookings
      .filter(booking => ['confirmed', 'completed'].includes(booking.status))
      .reduce((acc, booking) => acc + (booking.platformEarnings || 0), 0) : 0;

    const dashboardData = {
      totalCars: cars.length,
      totalBookings: bookings.length,
      pendingBookings: pendingBookings.length,
      completedBookings: confirmedBookings.length, // Show confirmed bookings count
      recentBookings: bookings.slice(0, 3),
      monthlyRevenue,
      platformCommission: role === 'admin' ? platformCommission : undefined,
      approvedCars: cars.filter(car => car.isApproved).length,
      pendingApprovalCars: cars.filter(car => !car.isApproved).length,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to update user image
const updateUserImage = async (req, res) => {
  try {
    const { _id } = req.user;
    const imageFile = req.file;

    if (!imageFile) {
      return res.json({ success: false, message: "Image file is required" });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'users');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(imageFile.originalname);
    const fileName = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Move uploaded file to permanent location
    fs.renameSync(imageFile.path, filePath);

    // Create image URL (full URL for serving)
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const imageUrl = `${baseUrl}/uploads/users/${fileName}`;

    await User.findByIdAndUpdate(_id, { image: imageUrl });
    res.json({ success: true, message: "Image Updated" });

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
module.exports = {
  changeRoleToOwner,
  addCar,
  getOwnerCars,
  getPendingCars,
  getCarApprovalStats,
  approveRejectCar,
  getCarForEdit,
  updateCar,
  deleteCar,
  toggleCarAvailability,
  getDashboardData,
  updateUserImage
};