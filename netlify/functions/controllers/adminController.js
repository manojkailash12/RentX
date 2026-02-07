const User = require("../models/user.js");
const Car = require("../models/car.js");
const Booking = require("../models/booking.js");
const { generatePdfFromHtml } = require('../utils/htmlToPdfGenerator.js');
const { sendCarReplacementEmail } = require('../utils/emailService.js');

// Admin middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.json({ success: false, message: "Access denied. Admin only." });
  }
  next();
};

// Get dashboard analytics
const getDashboardAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user', isVerified: true });
    const totalCars = await Car.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const availableCars = await Car.countDocuments({ isAvailable: true, isApproved: true });
    const pendingApprovalCars = await Car.countDocuments({ isApproved: false, ownerType: 'user' });
    
    // Monthly earnings
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const monthlyBookings = await Booking.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $in: ['confirmed', 'completed'] }
    });
    
    // Calculate total earnings and platform earnings
    const monthlyEarnings = monthlyBookings.reduce((total, booking) => total + (booking.totalAmount || booking.price || 0), 0);
    const platformEarnings = monthlyBookings.reduce((total, booking) => total + (booking.platformEarnings || 0), 0);
    const ownerEarnings = monthlyBookings.reduce((total, booking) => total + (booking.ownerEarnings || booking.totalAmount || booking.price || 0), 0);
    
    // Payment method wise earnings
    const cashEarnings = monthlyBookings
      .filter(booking => booking.paymentMethod === 'cash')
      .reduce((total, booking) => total + (booking.totalAmount || booking.price || 0), 0);
    
    const onlineEarnings = monthlyBookings
      .filter(booking => booking.paymentMethod === 'online')
      .reduce((total, booking) => total + (booking.totalAmount || booking.price || 0), 0);
    
    // Recent bookings
    const recentBookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('carId', 'name model brand')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      analytics: {
        totalUsers,
        totalCars,
        totalBookings,
        availableCars,
        pendingApprovalCars,
        monthlyEarnings: `₹${monthlyEarnings.toLocaleString('en-IN')}`,
        platformEarnings: `₹${platformEarnings.toLocaleString('en-IN')}`,
        ownerEarnings: `₹${ownerEarnings.toLocaleString('en-IN')}`,
        cashEarnings: `₹${cashEarnings.toLocaleString('en-IN')}`,
        onlineEarnings: `₹${onlineEarnings.toLocaleString('en-IN')}`,
        recentBookings
      }
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get monthly earnings report
const getMonthlyEarnings = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const monthlyData = [];
    
    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      const bookings = await Booking.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $in: ['confirmed', 'completed'] }
      });
      
      const totalEarnings = bookings.reduce((total, booking) => total + booking.totalAmount, 0);
      const cashEarnings = bookings
        .filter(booking => booking.paymentMethod === 'cash')
        .reduce((total, booking) => total + booking.totalAmount, 0);
      const onlineEarnings = bookings
        .filter(booking => booking.paymentMethod === 'online')
        .reduce((total, booking) => total + booking.totalAmount, 0);
      
      monthlyData.push({
        month: month + 1,
        monthName: new Date(year, month).toLocaleString('default', { month: 'long' }),
        totalEarnings,
        cashEarnings,
        onlineEarnings,
        totalBookings: bookings.length
      });
    }
    
    res.json({ success: true, monthlyData });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Export earnings to PDF
const exportEarningsPDF = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    // Get monthly data
    let totalYearlyEarnings = 0;
    let totalYearlyBookings = 0;
    let monthlyRows = '';
    
    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      const bookings = await Booking.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $in: ['confirmed', 'completed'] }
      });
      
      const totalEarnings = bookings.reduce((total, booking) => total + (booking.totalAmount || 0), 0);
      const cashEarnings = bookings
        .filter(booking => booking.paymentMethod === 'cash')
        .reduce((total, booking) => total + (booking.totalAmount || 0), 0);
      const onlineEarnings = bookings
        .filter(booking => booking.paymentMethod === 'online')
        .reduce((total, booking) => total + (booking.totalAmount || 0), 0);
      
      totalYearlyEarnings += totalEarnings;
      totalYearlyBookings += bookings.length;
      
      const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
      
      monthlyRows += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${monthName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${totalEarnings.toLocaleString('en-IN')}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${cashEarnings.toLocaleString('en-IN')}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${onlineEarnings.toLocaleString('en-IN')}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${bookings.length}</td>
        </tr>
      `;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Earnings Report ${year}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #059669; text-align: center; margin-bottom: 10px; }
          h2 { color: #6b7280; text-align: center; margin-bottom: 30px; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #059669; color: white; padding: 12px; text-align: left; }
          .summary { background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 30px; text-align: center; }
          .summary h3 { color: #059669; margin-bottom: 10px; }
          .summary p { font-size: 18px; color: #374151; margin: 5px 0; }
        </style>
      </head>
      <body>
        <h1>🚗 RentX - Earnings Report</h1>
        <h2>Year: ${year}</h2>
        
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th style="text-align: right;">Total Earnings</th>
              <th style="text-align: right;">Cash Earnings</th>
              <th style="text-align: right;">Online Earnings</th>
              <th style="text-align: center;">Bookings</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyRows}
          </tbody>
        </table>
        
        <div class="summary">
          <h3>📊 Yearly Summary</h3>
          <p><strong>Total Earnings:</strong> ₹${totalYearlyEarnings.toLocaleString('en-IN')}</p>
          <p><strong>Total Bookings:</strong> ${totalYearlyBookings}</p>
        </div>
      </body>
      </html>
    `;
    
    const pdfBuffer = await generatePdfFromHtml(htmlContent);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=earnings-report-${year}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(pdfBuffer, 'binary');
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export earnings to Excel (CSV format)
const exportEarningsExcel = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    let csvContent = 'Month,Total Earnings,Cash Earnings,Online Earnings,Total Bookings\n';
    
    // Get monthly data
    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      const bookings = await Booking.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $in: ['confirmed', 'completed'] }
      });
      
      const totalEarnings = bookings.reduce((total, booking) => total + (booking.totalAmount || 0), 0);
      const cashEarnings = bookings
        .filter(booking => booking.paymentMethod === 'cash')
        .reduce((total, booking) => total + (booking.totalAmount || 0), 0);
      const onlineEarnings = bookings
        .filter(booking => booking.paymentMethod === 'online')
        .reduce((total, booking) => total + (booking.totalAmount || 0), 0);
      
      const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
      
      csvContent += `${monthName},₹${totalEarnings},₹${cashEarnings},₹${onlineEarnings},${bookings.length}\n`;
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=earnings-report-${year}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password -otp -otpExpiry');
    res.json({ success: true, users });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get all bookings with details
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('carId', 'name model brand')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, bookings });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Export cars to PDF
const exportCarsPDF = async (req, res) => {
  try {
    const cars = await Car.find().populate('owner', 'name email');
    
    let carsRows = '';
    cars.forEach((car, index) => {
      carsRows += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px;">${index + 1}</td>
          <td style="padding: 12px;">${car.brand} ${car.model}</td>
          <td style="padding: 12px;">${car.year}</td>
          <td style="padding: 12px;">${car.category}</td>
          <td style="padding: 12px; text-align: right;">₹${car.pricePerDay}/day</td>
          <td style="padding: 12px; text-align: center;">${car.seating_capacity}</td>
          <td style="padding: 12px;">${car.location}</td>
          <td style="padding: 12px; text-align: center;">
            <span style="background: ${car.isApproved ? '#dcfce7' : '#fef3c7'}; color: ${car.isApproved ? '#166534' : '#92400e'}; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
              ${car.isApproved ? 'Approved' : 'Pending'}
            </span>
          </td>
          <td style="padding: 12px;">${car.owner?.name || 'N/A'}</td>
        </tr>
      `;
    });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Cars Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; font-size: 12px; }
          h1 { color: #059669; text-align: center; margin-bottom: 10px; }
          h2 { color: #6b7280; text-align: center; margin-bottom: 30px; font-weight: normal; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #059669; color: white; padding: 10px; text-align: left; font-size: 11px; }
          .summary { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .summary p { margin: 5px 0; color: #374151; }
        </style>
      </head>
      <body>
        <h1>🚗 RentX - Cars Report</h1>
        <h2>Generated: ${new Date().toLocaleString()}</h2>
        
        <div class="summary">
          <p><strong>Total Cars:</strong> ${cars.length}</p>
          <p><strong>Available:</strong> ${cars.filter(c => c.isAvailable).length}</p>
          <p><strong>Approved:</strong> ${cars.filter(c => c.isApproved).length}</p>
          <p><strong>Pending Approval:</strong> ${cars.filter(c => !c.isApproved).length}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Car</th>
              <th>Year</th>
              <th>Category</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: center;">Seats</th>
              <th>Location</th>
              <th style="text-align: center;">Status</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            ${carsRows}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const pdfBuffer = await generatePdfFromHtml(htmlContent);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cars-report-${new Date().toISOString().split('T')[0]}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(pdfBuffer, 'binary');
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export cars to Excel (CSV format)
const exportCarsExcel = async (req, res) => {
  try {
    const cars = await Car.find().populate('owner', 'name email');
    
    let csvContent = 'Brand,Model,Year,Category,Price/Day,Seats,Transmission,Fuel,Location,Status,Approved,Owner,Owner Type\n';
    
    cars.forEach(car => {
      csvContent += `${car.brand},${car.model},${car.year},${car.category},₹${car.pricePerDay},${car.seating_capacity},${car.transmission},${car.fuel_type},${car.location},${car.isAvailable ? 'Available' : 'Unavailable'},${car.isApproved ? 'Yes' : 'No'},${car.owner?.name || 'N/A'},${car.ownerType}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=cars-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export bookings to PDF
const exportBookingsPDF = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('carId', 'brand model');
    
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
    const completedCount = bookings.filter(b => b.status === 'completed').length;
    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    
    let bookingsRows = '';
    bookings.forEach((booking, index) => {
      const car = booking.carId;
      const user = booking.userId;
      
      const statusColors = {
        confirmed: { bg: '#dcfce7', text: '#166534' },
        completed: { bg: '#dbeafe', text: '#1e40af' },
        pending: { bg: '#fef3c7', text: '#92400e' },
        cancelled: { bg: '#fee2e2', text: '#dc2626' }
      };
      
      const statusColor = statusColors[booking.status] || { bg: '#f3f4f6', text: '#374151' };
      
      bookingsRows += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px;">${index + 1}</td>
          <td style="padding: 10px;">${booking.bookingId || `#${index + 1}`}</td>
          <td style="padding: 10px;">${user?.name || 'N/A'}</td>
          <td style="padding: 10px;">${car ? `${car.brand} ${car.model}` : 'N/A'}</td>
          <td style="padding: 10px;">${new Date(booking.pickupDate).toLocaleDateString()}</td>
          <td style="padding: 10px;">${new Date(booking.returnDate).toLocaleDateString()}</td>
          <td style="padding: 10px; text-align: right;">₹${(booking.totalAmount || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 10px; text-align: center;">
            <span style="background: ${statusColor.bg}; color: ${statusColor.text}; padding: 4px 8px; border-radius: 4px; font-size: 10px;">
              ${booking.status}
            </span>
          </td>
        </tr>
      `;
    });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bookings Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; font-size: 11px; }
          h1 { color: #059669; text-align: center; margin-bottom: 10px; }
          h2 { color: #6b7280; text-align: center; margin-bottom: 30px; font-weight: normal; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #059669; color: white; padding: 10px; text-align: left; font-size: 10px; }
          .summary { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-around; }
          .summary-item { text-align: center; }
          .summary-item h3 { color: #059669; margin: 0; font-size: 24px; }
          .summary-item p { margin: 5px 0; color: #6b7280; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>🚗 RentX - Bookings Report</h1>
        <h2>Generated: ${new Date().toLocaleString()}</h2>
        
        <div class="summary">
          <div class="summary-item">
            <h3>${bookings.length}</h3>
            <p>Total Bookings</p>
          </div>
          <div class="summary-item">
            <h3>₹${totalRevenue.toLocaleString('en-IN')}</h3>
            <p>Total Revenue</p>
          </div>
          <div class="summary-item">
            <h3>${confirmedCount}</h3>
            <p>Confirmed</p>
          </div>
          <div class="summary-item">
            <h3>${completedCount}</h3>
            <p>Completed</p>
          </div>
          <div class="summary-item">
            <h3>${pendingCount}</h3>
            <p>Pending</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Car</th>
              <th>Pickup</th>
              <th>Return</th>
              <th style="text-align: right;">Amount</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${bookingsRows}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const pdfBuffer = await generatePdfFromHtml(htmlContent);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bookings-report-${new Date().toISOString().split('T')[0]}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(pdfBuffer, 'binary');
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export bookings to Excel (CSV format)
const exportBookingsExcel = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email phone')
      .populate('carId', 'brand model');
    
    let csvContent = 'Booking ID,Customer,Email,Phone,Car,Pickup Date,Return Date,Amount,Status,Payment Status,Created\n';
    
    bookings.forEach((booking, index) => {
      const car = booking.carId;
      const user = booking.userId;
      
      csvContent += `${booking.bookingId || `#${index + 1}`},${user?.name || 'N/A'},${user?.email || 'N/A'},${user?.phone || 'N/A'},${car ? `${car.brand} ${car.model}` : 'N/A'},${new Date(booking.pickupDate).toLocaleDateString()},${new Date(booking.returnDate).toLocaleDateString()},₹${(booking.totalAmount || 0).toLocaleString('en-IN')},${booking.status},${booking.paymentStatus || 'pending'},${new Date(booking.createdAt).toLocaleDateString()}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bookings-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Replace car in booking
const replaceCarInBooking = async (req, res) => {
  try {
    const { bookingId, newCarId, reason } = req.body;

    if (!bookingId || !newCarId || !reason) {
      return res.json({ 
        success: false, 
        message: "Booking ID, new car ID, and reason are required" 
      });
    }

    // Find the booking with populated data
    const booking = await Booking.findById(bookingId)
      .populate('carId', 'brand model year category seating_capacity transmission fuel_type')
      .populate('userId', 'name email');

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    // Check if booking is active (not cancelled or completed)
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.json({ 
        success: false, 
        message: "Cannot replace car for cancelled or completed bookings" 
      });
    }

    // Find the new car
    const newCar = await Car.findById(newCarId);
    if (!newCar) {
      return res.json({ success: false, message: "New car not found" });
    }

    // Check if new car is available and approved
    if (!newCar.isAvailable || !newCar.isApproved) {
      return res.json({ 
        success: false, 
        message: "Selected car is not available or not approved" 
      });
    }

    // Store original car details
    const originalCar = booking.carId;

    // Update booking with replacement info
    booking.originalCarId = booking.carId;
    booking.carId = newCarId;
    booking.isCarReplaced = true;
    booking.replacementReason = reason;
    booking.replacedAt = new Date();

    await booking.save();

    // Send email notification to user
    try {
      await sendCarReplacementEmail(booking.userId.email, {
        userName: booking.userId.name,
        bookingId: booking.bookingId || booking._id,
        originalCar: {
          brand: originalCar.brand,
          model: originalCar.model,
          year: originalCar.year,
          category: originalCar.category
        },
        newCar: {
          brand: newCar.brand,
          model: newCar.model,
          year: newCar.year,
          category: newCar.category,
          seating_capacity: newCar.seating_capacity,
          transmission: newCar.transmission,
          fuel_type: newCar.fuel_type
        },
        reason: reason,
        pickupDate: booking.pickupDate,
        returnDate: booking.returnDate,
        pickupLocation: booking.pickupLocation
      });
    } catch (emailError) {
      console.error('Error sending replacement email:', emailError);
      // Continue even if email fails
    }

    res.json({ 
      success: true, 
      message: "Car replaced successfully and user notified via email",
      booking: await Booking.findById(bookingId)
        .populate('carId', 'brand model year category')
        .populate('originalCarId', 'brand model year category')
        .populate('userId', 'name email')
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get available cars for replacement
const getAvailableCarsForReplacement = async (req, res) => {
  try {
    const { bookingId } = req.query;

    if (!bookingId) {
      return res.json({ success: false, message: "Booking ID is required" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    // Find available cars (excluding the current car)
    const availableCars = await Car.find({
      _id: { $ne: booking.carId },
      isAvailable: true,
      isApproved: true
    }).select('brand model year category seating_capacity transmission fuel_type pricePerDay location image');

    res.json({ success: true, cars: availableCars });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

module.exports = {
  isAdmin,
  getDashboardAnalytics,
  getMonthlyEarnings,
  exportEarningsPDF,
  exportEarningsExcel,
  exportCarsPDF,
  exportCarsExcel,
  exportBookingsPDF,
  exportBookingsExcel,
  getAllUsers,
  getAllBookings,
  replaceCarInBooking,
  getAvailableCarsForReplacement
};