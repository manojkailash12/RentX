const ExcelJS = require('exceljs');
const mongoose = require('mongoose');

// MongoDB connection for serverless
let cachedDb = null;

const connectToDatabase = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    cachedDb = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Connect to database
    await connectToDatabase();

    // Parse query parameters
    const queryParams = new URLSearchParams(event.rawQuery || '');
    const reportType = queryParams.get('type') || 'bookings';

    // Import models
    const Booking = require('../../models/Booking');
    const Car = require('../../models/Car');
    const User = require('../../models/User');

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RentX Admin';
    workbook.created = new Date();

    let data = [];
    let filename = '';

    switch (reportType) {
      case 'bookings':
        const bookings = await Booking.find()
          .populate('user', 'name email phone')
          .populate('car', 'name brand model')
          .sort({ createdAt: -1 });

        const worksheet = workbook.addWorksheet('Bookings Report');
        
        // Add headers
        worksheet.columns = [
          { header: 'Booking ID', key: 'bookingId', width: 15 },
          { header: 'Invoice Number', key: 'invoiceNumber', width: 15 },
          { header: 'Customer Name', key: 'customerName', width: 20 },
          { header: 'Customer Email', key: 'customerEmail', width: 25 },
          { header: 'Car', key: 'car', width: 25 },
          { header: 'Start Date', key: 'startDate', width: 15 },
          { header: 'End Date', key: 'endDate', width: 15 },
          { header: 'Total Amount', key: 'totalAmount', width: 15 },
          { header: 'Payment Method', key: 'paymentMethod', width: 15 },
          { header: 'Payment Status', key: 'paymentStatus', width: 15 },
          { header: 'Booking Status', key: 'bookingStatus', width: 15 },
          { header: 'Created At', key: 'createdAt', width: 20 },
        ];

        // Add data
        bookings.forEach(booking => {
          worksheet.addRow({
            bookingId: booking.bookingId || booking._id.toString(),
            invoiceNumber: booking.invoiceNumber || 'N/A',
            customerName: booking.user?.name || 'N/A',
            customerEmail: booking.user?.email || 'N/A',
            car: `${booking.car?.brand || ''} ${booking.car?.name || ''}`.trim() || 'N/A',
            startDate: booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A',
            endDate: booking.endDate ? new Date(booking.endDate).toLocaleDateString() : 'N/A',
            totalAmount: `₹${(booking.totalAmount || 0).toLocaleString()}`,
            paymentMethod: booking.paymentMethod || 'N/A',
            paymentStatus: booking.paymentStatus || 'N/A',
            bookingStatus: booking.bookingStatus || 'N/A',
            createdAt: booking.createdAt ? new Date(booking.createdAt).toLocaleString() : 'N/A',
          });
        });

        filename = `bookings-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        break;

      case 'cars':
        const cars = await Car.find().sort({ createdAt: -1 });
        
        const carsWorksheet = workbook.addWorksheet('Cars Report');
        
        carsWorksheet.columns = [
          { header: 'Car ID', key: 'carId', width: 15 },
          { header: 'Brand', key: 'brand', width: 15 },
          { header: 'Name', key: 'name', width: 20 },
          { header: 'Model', key: 'model', width: 15 },
          { header: 'Year', key: 'year', width: 10 },
          { header: 'Type', key: 'type', width: 15 },
          { header: 'Seats', key: 'seats', width: 10 },
          { header: 'Transmission', key: 'transmission', width: 15 },
          { header: 'Fuel Type', key: 'fuelType', width: 15 },
          { header: 'Price Per Day', key: 'pricePerDay', width: 15 },
          { header: 'Price Per KM', key: 'pricePerKm', width: 15 },
          { header: 'Location', key: 'location', width: 25 },
          { header: 'Available', key: 'available', width: 10 },
          { header: 'Created At', key: 'createdAt', width: 20 },
        ];

        cars.forEach(car => {
          carsWorksheet.addRow({
            carId: car._id.toString(),
            brand: car.brand || 'N/A',
            name: car.name || 'N/A',
            model: car.model || 'N/A',
            year: car.year || 'N/A',
            type: car.type || 'N/A',
            seats: car.seats || 'N/A',
            transmission: car.transmission || 'N/A',
            fuelType: car.fuelType || 'N/A',
            pricePerDay: `₹${(car.pricePerDay || 0).toLocaleString()}`,
            pricePerKm: `₹${car.pricePerKm || 0}`,
            location: `${car.location?.city || ''}, ${car.location?.state || ''}`.trim() || 'N/A',
            available: car.available ? 'Yes' : 'No',
            createdAt: car.createdAt ? new Date(car.createdAt).toLocaleString() : 'N/A',
          });
        });

        filename = `cars-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        break;

      case 'users':
        const users = await User.find().sort({ createdAt: -1 });
        
        const usersWorksheet = workbook.addWorksheet('Users Report');
        
        usersWorksheet.columns = [
          { header: 'User ID', key: 'userId', width: 15 },
          { header: 'Name', key: 'name', width: 20 },
          { header: 'Email', key: 'email', width: 25 },
          { header: 'Phone', key: 'phone', width: 15 },
          { header: 'Role', key: 'role', width: 10 },
          { header: 'Verified', key: 'isVerified', width: 10 },
          { header: 'Created At', key: 'createdAt', width: 20 },
        ];

        users.forEach(user => {
          usersWorksheet.addRow({
            userId: user._id.toString(),
            name: user.name || 'N/A',
            email: user.email || 'N/A',
            phone: user.phone || 'N/A',
            role: user.role || 'user',
            isVerified: user.isVerified ? 'Yes' : 'No',
            createdAt: user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A',
          });
        });

        filename = `users-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid report type' }),
        };
    }

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('Excel generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Excel generation failed',
        error: error.message 
      }),
    };
  }
};