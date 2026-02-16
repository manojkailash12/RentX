const User = require("../models/user.js");
const Car = require("../models/car.js");
const Booking = require("../models/booking.js");
const Employee = require("../models/employee.js");
const EmployeeAccountDeletionRequest = require('../models/employeeAccountDeletionRequest');
const { generateEarningsReportPDF, generateCarsReportPDF, generateBookingsReportPDF } = require('../utils/adminPdfGenerator.js');
const { sendCarReplacementEmail } = require('../utils/emailService.js');
const { deleteUserAccount } = require('../utils/accountDeletion');

// Centralized locale configuration
const CURRENCY_LOCALE = 'en-IN';

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
    // Count only active users (exclude deleted and pending deletion)
    const totalUsers = await User.countDocuments({ role: 'user', accountStatus: 'active' });
    const totalEmployees = await Employee.countDocuments();
    const totalCars = await Car.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const availableCars = await Car.countDocuments({ isAvailable: true, isApproved: true });
    const pendingApprovalCars = await Car.countDocuments({ isApproved: false, ownerType: 'employee' });
    
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
    
    // Payment method wise earnings - ALL TIME (not just monthly)
    const allBookings = await Booking.find({
      status: { $in: ['confirmed', 'completed'] }
    });
    
    const cashEarnings = allBookings
      .filter(booking => booking.paymentMethod === 'cash')
      .reduce((total, booking) => total + (booking.totalAmount || booking.price || 0), 0);
    
    const onlineEarnings = allBookings
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
        totalEmployees,
        totalCars,
        totalBookings,
        availableCars,
        pendingApprovalCars,
        monthlyEarnings: `₹${monthlyEarnings.toLocaleString(CURRENCY_LOCALE)}`,
        platformEarnings: `₹${platformEarnings.toLocaleString(CURRENCY_LOCALE)}`,
        ownerEarnings: `₹${ownerEarnings.toLocaleString(CURRENCY_LOCALE)}`,
        cashEarnings: `₹${cashEarnings.toLocaleString(CURRENCY_LOCALE)}`,
        onlineEarnings: `₹${onlineEarnings.toLocaleString(CURRENCY_LOCALE)}`,
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
    console.log('📄 Starting PDF export for earnings...');
    const { year = new Date().getFullYear() } = req.query;
    
    // Get monthly data
    let totalYearlyEarnings = 0;
    let totalYearlyBookings = 0;
    const monthlyData = [];
    
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
      
      monthlyData.push({
        monthName,
        totalEarnings,
        cashEarnings,
        onlineEarnings,
        bookings: bookings.length
      });
    }
    
    console.log('📝 Generating PDF with pdfmake...');
    const pdfBuffer = await generateEarningsReportPDF(year, monthlyData, totalYearlyEarnings, totalYearlyBookings);
    console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
    
    // Set proper headers for PDF download
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="earnings-report-${year}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.end(pdfBuffer);
  } catch (error) {
    console.error('❌ PDF export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export earnings to Excel (proper XLSX format)
const exportEarningsExcel = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const ExcelJS = require('exceljs');
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RentX Admin';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Earnings Report');
    
    // Add title
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'RentX - Car Rental';
    worksheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFF97316' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;
    
    // Add subtitle
    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = `Earnings Report - ${year}`;
    worksheet.getCell('A2').font = { size: 14, bold: false, color: { argb: 'FF6B7280' } };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;
    
    // Add headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(['Month', 'Total Earnings', 'Cash Earnings', 'Online Earnings', 'Total Bookings']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF97316' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;
    
    // Set column widths
    worksheet.columns = [
      { key: 'month', width: 15 },
      { key: 'total', width: 18 },
      { key: 'cash', width: 18 },
      { key: 'online', width: 18 },
      { key: 'bookings', width: 15 }
    ];
    
    let totalYearlyEarnings = 0;
    let totalYearlyBookings = 0;
    
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
      
      totalYearlyEarnings += totalEarnings;
      totalYearlyBookings += bookings.length;
      
      const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
      
      const dataRow = worksheet.addRow([
        monthName,
        `₹${totalEarnings.toLocaleString(CURRENCY_LOCALE)}`,
        `₹${cashEarnings.toLocaleString(CURRENCY_LOCALE)}`,
        `₹${onlineEarnings.toLocaleString(CURRENCY_LOCALE)}`,
        bookings.length
      ]);
      
      dataRow.alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    }
    
    // Add summary row
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow([
      'TOTAL',
      `₹${totalYearlyEarnings.toLocaleString(CURRENCY_LOCALE)}`,
      '',
      '',
      totalYearlyBookings
    ]);
    summaryRow.font = { bold: true, size: 12 };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0FDF4' }
    };
    summaryRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=earnings-report-${year}.xlsx`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    // Only return active users (exclude deleted and pending deletion)
    const users = await User.find({ role: 'user', accountStatus: 'active' }).select('-password -otp -otpExpiry');
    res.json({ success: true, users });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get admin users for chat (accessible by all authenticated users)
const getAdminUsers = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin', isVerified: true })
      .select('_id name email image')
      .limit(10);
    
    res.json({ success: true, admins });
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
    console.log('📄 Starting PDF export for cars...');
    const cars = await Car.find().populate('owner', 'name email');
    console.log(`📊 Found ${cars.length} cars to export`);
    
    console.log('📝 Generating PDF with pdfmake...');
    const pdfBuffer = await generateCarsReportPDF(cars);
    console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
    
    // Set proper headers for PDF download
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cars-report-${new Date().toISOString().split('T')[0]}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.end(pdfBuffer);
  } catch (error) {
    console.error('❌ PDF export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export cars to Excel (proper XLSX format)
const exportCarsExcel = async (req, res) => {
  try {
    const cars = await Car.find().populate('owner', 'name email');
    const ExcelJS = require('exceljs');
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RentX Admin';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Cars Report');
    
    // Add title
    worksheet.mergeCells('A1:M1');
    worksheet.getCell('A1').value = 'RentX - Car Rental';
    worksheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFF97316' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;
    
    // Add subtitle
    worksheet.mergeCells('A2:M2');
    worksheet.getCell('A2').value = 'Cars Report';
    worksheet.getCell('A2').font = { size: 14, bold: false, color: { argb: 'FF6B7280' } };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;
    
    // Add headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      'Brand', 'Model', 'Year', 'Category', 'Price/Day', 'Seats', 
      'Transmission', 'Fuel', 'Location', 'Status', 'Approved', 'Owner', 'Owner Type'
    ]);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF97316' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;
    
    // Set column widths
    worksheet.columns = [
      { key: 'brand', width: 15 },
      { key: 'model', width: 15 },
      { key: 'year', width: 10 },
      { key: 'category', width: 12 },
      { key: 'price', width: 12 },
      { key: 'seats', width: 8 },
      { key: 'transmission', width: 12 },
      { key: 'fuel', width: 10 },
      { key: 'location', width: 20 },
      { key: 'status', width: 12 },
      { key: 'approved', width: 10 },
      { key: 'owner', width: 20 },
      { key: 'ownerType', width: 12 }
    ];
    
    // Add data rows
    cars.forEach(car => {
      const dataRow = worksheet.addRow([
        car.brand,
        car.model,
        car.year,
        car.category,
        `₹${car.pricePerDay}`,
        car.seating_capacity,
        car.transmission,
        car.fuel_type,
        car.location,
        car.isAvailable ? 'Available' : 'Unavailable',
        car.isApproved ? 'Yes' : 'No',
        car.owner?.name || 'N/A',
        car.ownerType
      ]);
      
      dataRow.alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
    
    // Add summary
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow([
      'SUMMARY',
      `Total: ${cars.length}`,
      `Available: ${cars.filter(c => c.isAvailable).length}`,
      `Approved: ${cars.filter(c => c.isApproved).length}`
    ]);
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0FDF4' }
    };
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=cars-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export bookings to PDF
const exportBookingsPDF = async (req, res) => {
  try {
    console.log('📄 Starting PDF export for bookings...');
    const bookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('carId', 'brand model');
    
    console.log(`📊 Found ${bookings.length} bookings to export`);
    
    console.log('📝 Generating PDF with pdfmake...');
    const pdfBuffer = await generateBookingsReportPDF(bookings);
    console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
    
    // Set proper headers for PDF download
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bookings-report-${new Date().toISOString().split('T')[0]}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.end(pdfBuffer);
  } catch (error) {
    console.error('❌ PDF export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export bookings to Excel (proper XLSX format)
const exportBookingsExcel = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email phone')
      .populate('carId', 'brand model');
    
    const ExcelJS = require('exceljs');
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RentX Admin';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Bookings Report');
    
    // Add title
    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = 'RentX - Car Rental';
    worksheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFF97316' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;
    
    // Add subtitle
    worksheet.mergeCells('A2:K2');
    worksheet.getCell('A2').value = 'Bookings Report';
    worksheet.getCell('A2').font = { size: 14, bold: false, color: { argb: 'FF6B7280' } };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;
    
    // Add headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      'Booking ID', 'Customer', 'Email', 'Phone', 'Car', 
      'Pickup Date', 'Return Date', 'Amount', 'Status', 'Payment Status', 'Created'
    ]);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF97316' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;
    
    // Set column widths
    worksheet.columns = [
      { key: 'bookingId', width: 15 },
      { key: 'customer', width: 20 },
      { key: 'email', width: 25 },
      { key: 'phone', width: 15 },
      { key: 'car', width: 20 },
      { key: 'pickup', width: 15 },
      { key: 'return', width: 15 },
      { key: 'amount', width: 15 },
      { key: 'status', width: 12 },
      { key: 'payment', width: 15 },
      { key: 'created', width: 15 }
    ];
    
    // Add data rows
    bookings.forEach((booking, index) => {
      const car = booking.carId;
      const user = booking.userId;
      
      const dataRow = worksheet.addRow([
        booking.bookingId || `#${index + 1}`,
        user?.name || 'N/A',
        user?.email || 'N/A',
        user?.phone || 'N/A',
        car ? `${car.brand} ${car.model}` : 'N/A',
        new Date(booking.pickupDate).toLocaleDateString(),
        new Date(booking.returnDate).toLocaleDateString(),
        `₹${(booking.totalAmount || 0).toLocaleString(CURRENCY_LOCALE)}`,
        booking.status,
        booking.paymentStatus || 'pending',
        new Date(booking.createdAt).toLocaleDateString()
      ]);
      
      dataRow.alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
    
    // Add summary
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow([
      'SUMMARY',
      `Total Bookings: ${bookings.length}`,
      `Total Revenue: ₹${totalRevenue.toLocaleString(CURRENCY_LOCALE)}`,
      `Confirmed: ${bookings.filter(b => b.status === 'confirmed').length}`,
      `Completed: ${bookings.filter(b => b.status === 'completed').length}`
    ]);
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0FDF4' }
    };
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bookings-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
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

// Recalculate platform earnings for all existing bookings
const recalculatePlatformEarnings = async (req, res) => {
  try {
    console.log('🔄 Starting platform earnings recalculation...');
    
    const bookings = await Booking.find({});
    console.log(`📊 Found ${bookings.length} bookings to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const booking of bookings) {
      try {
        // Get car details
        const car = await Car.findById(booking.carId || booking.car);
        
        if (!car) {
          console.log(`⚠️  Car not found for booking ${booking._id}`);
          skipped++;
          continue;
        }
        
        const totalAmount = booking.totalAmount || booking.price || 0;
        
        let platformEarnings = 0;
        let ownerEarnings = 0;
        let commissionRate = 60;
        
        if (car.ownerType === 'user' || car.ownerType === 'employee') {
          // User/Employee-owned car: owner gets 40%, platform gets 60%
          ownerEarnings = Math.round((totalAmount * 40) / 100);
          platformEarnings = totalAmount - ownerEarnings;
        } else {
          // Admin-owned car: platform gets 100%
          platformEarnings = totalAmount;
          ownerEarnings = 0;
        }
        
        // Update booking
        await Booking.updateOne(
          { _id: booking._id },
          { 
            $set: { 
              platformEarnings,
              ownerEarnings,
              commissionRate
            } 
          }
        );
        
        updated++;
        
        if (updated % 10 === 0) {
          console.log(`✅ Updated ${updated} bookings...`);
        }
      } catch (error) {
        console.error(`❌ Error updating booking ${booking._id}:`, error.message);
        skipped++;
      }
    }
    
    console.log(`✅ Recalculation complete! Updated: ${updated}, Skipped: ${skipped}`);
    
    res.json({ 
      success: true, 
      message: `Successfully updated ${updated} bookings`,
      updated,
      skipped,
      total: bookings.length
    });
  } catch (error) {
    console.error('❌ Recalculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Employee delete user account (from chat request)
const deleteUserAccountByAdmin = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Import account deletion utility
    const { deleteUserAccount } = require('../utils/accountDeletion');

    // Delete user account immediately
    await deleteUserAccount(userId);

    // Send deletion confirmation email
    const { sendAccountDeletionEmail } = require('../utils/emailService');
    await sendAccountDeletionEmail(user.email, user.name);

    res.json({ 
      success: true, 
      message: "User account deleted successfully and confirmation email sent" 
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Recalculate all car ratings
const recalculateAllCarRatings = async (req, res) => {
  try {
    console.log('🔄 Starting car ratings recalculation...');
    
    const { updateCarRating } = require('../services/reviewService');
    const cars = await Car.find({});
    console.log(`📊 Found ${cars.length} cars to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const car of cars) {
      try {
        await updateCarRating(car._id);
        updated++;
        
        if (updated % 10 === 0) {
          console.log(`✅ Updated ${updated} cars...`);
        }
      } catch (error) {
        console.error(`❌ Error updating car ${car._id}:`, error.message);
        skipped++;
      }
    }
    
    console.log(`✅ Recalculation complete! Updated: ${updated}, Skipped: ${skipped}`);
    
    res.json({ 
      success: true, 
      message: `Successfully updated ${updated} car ratings`,
      updated,
      skipped,
      total: cars.length
    });
  } catch (error) {
    console.error('❌ Recalculation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Employee Account Deletion Request Management

const getEmployeeDeletionRequests = async (req, res) => {
  try {
    const requests = await EmployeeAccountDeletionRequest.find({ status: 'pending' })
      .populate('employeeId', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      requests 
    });
  } catch (error) {
    console.error('Get employee deletion requests error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch deletion requests' 
    });
  }
};

const approveEmployeeDeletion = async (req, res) => {
  try {
    const { requestId } = req.body;
    const adminId = req.user._id;

    const request = await EmployeeAccountDeletionRequest.findById(requestId)
      .populate('employeeId', 'name email');

    if (!request) {
      return res.json({ success: false, message: 'Deletion request not found' });
    }

    if (request.status !== 'pending') {
      return res.json({ success: false, message: 'Request already processed' });
    }

    // Delete the employee account
    await deleteUserAccount(request.employeeId._id);

    // Update request status
    request.status = 'approved';
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    await request.save();

    res.json({ 
      success: true, 
      message: `Employee account ${request.employeeId.name} deleted successfully` 
    });
  } catch (error) {
    console.error('Approve employee deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to approve deletion request' 
    });
  }
};

const rejectEmployeeDeletion = async (req, res) => {
  try {
    const { requestId, rejectionReason } = req.body;
    const adminId = req.user._id;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.json({ success: false, message: 'Rejection reason is required' });
    }

    const request = await EmployeeAccountDeletionRequest.findById(requestId);

    if (!request) {
      return res.json({ success: false, message: 'Deletion request not found' });
    }

    if (request.status !== 'pending') {
      return res.json({ success: false, message: 'Request already processed' });
    }

    // Update request status
    request.status = 'rejected';
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason.trim();
    await request.save();

    res.json({ 
      success: true, 
      message: 'Deletion request rejected successfully' 
    });
  } catch (error) {
    console.error('Reject employee deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reject deletion request' 
    });
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
  getAdminUsers,
  getAllBookings,
  replaceCarInBooking,
  getAvailableCarsForReplacement,
  recalculatePlatformEarnings,
  recalculateAllCarRatings,
  deleteUserAccountByAdmin,
  getEmployeeDeletionRequests,
  approveEmployeeDeletion,
  rejectEmployeeDeletion
};

