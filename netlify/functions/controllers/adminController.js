const User = require("../models/user.js");
const Car = require("../models/car.js");
const Booking = require("../models/booking.js");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Configure PDFKit font path for serverless environment
// Copy font files to the expected location if they don't exist
const ensureFontFiles = () => {
  try {
    const targetDir = path.join(__dirname, 'data');
    const sourceDir = path.join(require.resolve('pdfkit'), '../../js/data');
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Copy essential font files if they don't exist
    const fontFiles = ['Helvetica.afm', 'Courier.afm', 'Helvetica-Bold.afm', 'Courier-Bold.afm'];
    fontFiles.forEach(file => {
      const targetPath = path.join(targetDir, file);
      const sourcePath = path.join(sourceDir, file);
      if (!fs.existsSync(targetPath) && fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    });
  } catch (error) {
    console.warn('Font file setup warning:', error.message);
  }
};

// Ensure font files are available
ensureFontFiles();

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
    
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=earnings-report-${year}.pdf`);
    
    doc.pipe(res);
    
    // Set font to Courier to avoid Helvetica loading issues
    doc.font('Courier');
    
    // Title
    doc.fontSize(20).text('Car Rental - Earnings Report', { align: 'center' });
    doc.fontSize(14).text(`Year: ${year}`, { align: 'center' });
    doc.moveDown(2);
    
    // Get monthly data
    let totalYearlyEarnings = 0;
    let totalYearlyBookings = 0;
    
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
      
      doc.fontSize(12)
         .text(`${monthName}:`, 50, doc.y)
         .text(`Total: Rs.${totalEarnings}`, 150, doc.y - 12)
         .text(`Cash: Rs.${cashEarnings}`, 250, doc.y - 12)
         .text(`Online: Rs.${onlineEarnings}`, 350, doc.y - 12)
         .text(`Bookings: ${bookings.length}`, 450, doc.y - 12);
      doc.moveDown(0.5);
    }
    
    doc.moveDown(2);
    doc.fontSize(14)
       .text(`Total Yearly Earnings: Rs.${totalYearlyEarnings.toLocaleString('en-IN')}`, { align: 'center' })
       .text(`Total Yearly Bookings: ${totalYearlyBookings}`, { align: 'center' });
    
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// Export earnings to Excel
const exportEarningsExcel = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Car Rental Admin';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    const worksheet = workbook.addWorksheet('Earnings Report');
    
    // Headers
    worksheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Total Earnings', key: 'totalEarnings', width: 15 },
      { header: 'Cash Earnings', key: 'cashEarnings', width: 15 },
      { header: 'Online Earnings', key: 'onlineEarnings', width: 15 },
      { header: 'Total Bookings', key: 'totalBookings', width: 15 }
    ];
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    
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
      
      worksheet.addRow({
        month: monthName,
        totalEarnings: `Rs.${totalEarnings}`,
        cashEarnings: `Rs.${cashEarnings}`,
        onlineEarnings: `Rs.${onlineEarnings}`,
        totalBookings: bookings.length
      });
    }
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=earnings-report-${year}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
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
    
    // Create PDF with minimal options to avoid font loading issues
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cars-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
    doc.pipe(res);
    
    // Set font to Courier to avoid Helvetica loading issues
    doc.font('Courier');
    
    doc.pipe(res);
    
    // Title
    doc.fontSize(20).text('Car Rental - Cars Report', { align: 'center' });
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Summary
    doc.fontSize(14).text(`Total Cars: ${cars.length}`, { underline: true });
    doc.fontSize(12).text(`Available: ${cars.filter(c => c.isAvailable).length}`);
    doc.text(`Approved: ${cars.filter(c => c.isApproved).length}`);
    doc.text(`Pending Approval: ${cars.filter(c => !c.isApproved).length}`);
    doc.moveDown(2);
    
    // Cars list
    doc.fontSize(14).text('Cars List:', { underline: true });
    doc.moveDown();
    
    cars.forEach((car, index) => {
      doc.fontSize(10)
         .text(`${index + 1}. ${car.brand} ${car.model} (${car.year})`, { continued: true })
         .text(` - Rs.${car.pricePerDay}/day`, { align: 'right' });
      doc.fontSize(9)
         .text(`   Category: ${car.category} | Seats: ${car.seating_capacity} | ${car.transmission}`)
         .text(`   Location: ${car.location}`)
         .text(`   Status: ${car.isApproved ? 'Approved' : 'Pending'} | ${car.isAvailable ? 'Available' : 'Unavailable'}`)
         .text(`   Owner: ${car.owner?.name || 'N/A'} (${car.ownerType})`);
      doc.moveDown(0.5);
      
      // Add page break if needed
      if (doc.y > 700) {
        doc.addPage();
      }
    });
    
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// Export cars to Excel
const exportCarsExcel = async (req, res) => {
  try {
    const cars = await Car.find().populate('owner', 'name email');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cars Report');
    
    // Set workbook properties
    workbook.creator = 'Car Rental Admin';
    workbook.created = new Date();
    
    // Headers
    worksheet.columns = [
      { header: 'Brand', key: 'brand', width: 15 },
      { header: 'Model', key: 'model', width: 15 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Price/Day', key: 'price', width: 12 },
      { header: 'Seats', key: 'seats', width: 8 },
      { header: 'Transmission', key: 'transmission', width: 12 },
      { header: 'Fuel', key: 'fuel', width: 10 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Approved', key: 'approved', width: 10 },
      { header: 'Owner', key: 'owner', width: 20 },
      { header: 'Owner Type', key: 'ownerType', width: 12 }
    ];
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    
    // Add data
    cars.forEach(car => {
      worksheet.addRow({
        brand: car.brand,
        model: car.model,
        year: car.year,
        category: car.category,
        price: `Rs.${car.pricePerDay}`,
        seats: car.seating_capacity,
        transmission: car.transmission,
        fuel: car.fuel_type,
        location: car.location,
        status: car.isAvailable ? 'Available' : 'Unavailable',
        approved: car.isApproved ? 'Yes' : 'No',
        owner: car.owner?.name || 'N/A',
        ownerType: car.ownerType
      });
    });
    
    // Set response headers before writing
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=cars-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// Export bookings to PDF
const exportBookingsPDF = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('carId', 'brand model');
    
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bookings-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
    doc.pipe(res);
    
    // Set font to Courier to avoid Helvetica loading issues
    doc.font('Courier');
    
    // Title
    doc.fontSize(20).text('Car Rental - Bookings Report', { align: 'center' });
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Summary
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    doc.fontSize(14).text(`Total Bookings: ${bookings.length}`, { underline: true });
    doc.fontSize(12).text(`Total Revenue: Rs.${totalRevenue.toLocaleString('en-IN')}`);
    doc.text(`Confirmed: ${bookings.filter(b => b.status === 'confirmed').length}`);
    doc.text(`Completed: ${bookings.filter(b => b.status === 'completed').length}`);
    doc.text(`Pending: ${bookings.filter(b => b.status === 'pending').length}`);
    doc.moveDown(2);
    
    // Bookings list
    doc.fontSize(14).text('Bookings List:', { underline: true });
    doc.moveDown();
    
    bookings.forEach((booking, index) => {
      const car = booking.carId;
      const user = booking.userId;
      
      doc.fontSize(10)
         .text(`${index + 1}. ${booking.bookingId || `#${index + 1}`}`, { continued: true })
         .text(` - Rs.${(booking.totalAmount || 0).toLocaleString('en-IN')}`, { align: 'right' });
      doc.fontSize(9)
         .text(`   Car: ${car?.brand || 'N/A'} ${car?.model || ''}`)
         .text(`   Customer: ${user?.name || 'N/A'} (${user?.email || 'N/A'})`)
         .text(`   Dates: ${new Date(booking.pickupDate).toLocaleDateString()} - ${new Date(booking.returnDate).toLocaleDateString()}`)
         .text(`   Status: ${booking.status} | Payment: ${booking.paymentStatus || 'pending'}`);
      doc.moveDown(0.5);
      
      // Add page break if needed
      if (doc.y > 700) {
        doc.addPage();
      }
    });
    
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// Export bookings to Excel
const exportBookingsExcel = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email phone')
      .populate('carId', 'brand model');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bookings Report');
    
    // Set workbook properties
    workbook.creator = 'Car Rental Admin';
    workbook.created = new Date();
    
    // Headers
    worksheet.columns = [
      { header: 'Booking ID', key: 'bookingId', width: 15 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Car', key: 'car', width: 20 },
      { header: 'Pickup Date', key: 'pickupDate', width: 15 },
      { header: 'Return Date', key: 'returnDate', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Payment', key: 'payment', width: 12 },
      { header: 'Created', key: 'created', width: 15 }
    ];
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    
    // Add data
    bookings.forEach((booking, index) => {
      const car = booking.carId;
      const user = booking.userId;
      
      worksheet.addRow({
        bookingId: booking.bookingId || `#${index + 1}`,
        customer: user?.name || 'N/A',
        email: user?.email || 'N/A',
        car: car ? `${car.brand} ${car.model}` : 'N/A',
        pickupDate: new Date(booking.pickupDate).toLocaleDateString(),
        returnDate: new Date(booking.returnDate).toLocaleDateString(),
        amount: `Rs.${(booking.totalAmount || 0).toLocaleString('en-IN')}`,
        status: booking.status,
        payment: booking.paymentStatus || 'pending',
        created: new Date(booking.createdAt).toLocaleDateString()
      });
    });
    
    // Set response headers before writing
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bookings-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
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
  getAllBookings
};