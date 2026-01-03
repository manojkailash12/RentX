const pdf = require('html-pdf');
const moment = require('moment');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const User = require('../models/User');

// Generate report HTML template
const generateReportHTML = (reportType, data, filters) => {
  const currentDate = moment().format('DD/MM/YYYY');
  
  let title = '';
  let content = '';
  
  switch (reportType) {
    case 'monthly-earnings':
    case 'earnings':
      title = 'Financial Report';
      content = generateMonthlyEarningsContent(data);
      break;
    case 'bookings':
      title = 'Bookings Report';
      content = generateBookingsContent(data);
      break;
    case 'cars':
      title = 'Cars Report';
      content = generateCarsContent(data);
      break;
    case 'users':
      title = 'Users Report';
      content = generateUsersContent(data);
      break;
    case 'approvals':
      title = 'Approvals Report';
      content = generateApprovalsContent(data);
      break;
    case 'travel-analytics':
      title = 'RentX Travel Analytics Report';
      content = generateTravelAnalyticsContent(data);
      break;
    default:
      title = 'Report';
      content = '<p>No data available</p>';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .report-container {
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: white;
          color: #333;
          padding: 30px;
          text-align: center;
          border-bottom: 3px solid #007bff;
        }
        .header .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .header .logo-icon {
          width: 40px;
          height: 40px;
          background: #007bff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
          color: #007bff;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          color: #666;
        }
        .content {
          padding: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        th {
          background: #007bff;
          color: white;
          padding: 15px;
          text-align: center;
          font-weight: bold;
        }
        td {
          padding: 12px 15px;
          border-bottom: 1px solid #ecf0f1;
          text-align: center;
        }
        tr:hover {
          background: #f8f9fa;
        }
        .footer {
          background: #34495e;
          color: white;
          padding: 20px;
          text-align: center;
        }
        @media print {
          body { background: white; }
          .report-container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="header">
          <div class="logo">
            <div class="logo-icon">🚗</div>
            <h1>RentX</h1>
          </div>
          <p>${title}</p>
          <p>Generated on: ${currentDate}</p>
        </div>
        
        <div class="content">
          ${content}
        </div>

        <div class="footer">
          <p>This report was generated automatically by RentX Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate monthly earnings content
const generateMonthlyEarningsContent = (data) => {
  if (!data || data.length === 0) {
    return '<p>No earnings data available for the selected period.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th>Total Earnings</th>
          <th>Total Bookings</th>
          <th>Cash Payments</th>
          <th>Online Payments</th>
          <th>Avg per Booking</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(item => `
          <tr>
            <td>${item.month}</td>
            <td>₹${item.totalEarnings.toLocaleString()}</td>
            <td>${item.totalBookings}</td>
            <td>₹${item.cashPayments.toLocaleString()}</td>
            <td>₹${item.onlinePayments.toLocaleString()}</td>
            <td>₹${Math.round(item.totalEarnings / item.totalBookings).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

// Generate bookings content
const generateBookingsContent = (data) => {
  if (!data || data.length === 0) {
    return `
      <table>
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Customer</th>
            <th>Vehicle</th>
            <th>Pickup</th>
            <th>Pickup Date</th>
            <th>Dropoff</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="8" style="text-align: center; padding: 40px; color: #666;">No booking data available</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Booking ID</th>
          <th>Customer</th>
          <th>Vehicle</th>
          <th>Pickup</th>
          <th>Pickup Date</th>
          <th>Dropoff</th>
          <th>Status</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(booking => {
          // Get the correct booking ID (BID format)
          const bookingId = booking.bookingId || 'BID001';
          
          // Get the correct vehicle name
          let vehicleName = 'Unknown Vehicle';
          if (booking.car) {
            if (booking.car.name) {
              vehicleName = booking.car.name;
            } else if (booking.car.brand && booking.car.model) {
              vehicleName = `${booking.car.brand} ${booking.car.model}`;
            }
          }
          
          // Get customer name - use actual user name from database
          const customerName = booking.user?.name || 'Customer';
          
          // Get locations
          const pickupCity = booking.pickupLocation?.city || booking.pickupLocation?.address || 'N/A';
          const dropoffCity = booking.dropoffLocation?.city || booking.dropoffLocation?.address || 'N/A';
          
          // Get dates
          const pickupDate = booking.startDate ? moment(booking.startDate).format('DD/MM/YYYY') : 'N/A';
          
          // Get status
          const status = (booking.bookingStatus || 'confirmed').toUpperCase();
          
          // Get amount
          const amount = booking.totalAmount || booking.totalPrice || 0;
          
          return `
            <tr>
              <td>${bookingId}</td>
              <td>${customerName}</td>
              <td>${vehicleName}</td>
              <td>${pickupCity}</td>
              <td>${pickupDate}</td>
              <td>${dropoffCity}</td>
              <td style="color: #007bff; font-weight: bold;">${status}</td>
              <td>₹${amount.toLocaleString()}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
};

// Generate travel analytics content
const generateTravelAnalyticsContent = (bookings) => {
  if (!bookings || bookings.length === 0) {
    return `
      <table>
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Customer</th>
            <th>Vehicle</th>
            <th>Pickup</th>
            <th>Pickup Date</th>
            <th>Dropoff</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="8" style="text-align: center; padding: 40px; color: #666;">No travel analytics data available</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Booking ID</th>
          <th>Customer</th>
          <th>Vehicle</th>
          <th>Pickup</th>
          <th>Pickup Date</th>
          <th>Dropoff</th>
          <th>Status</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${bookings.map(booking => {
          const bookingId = booking.bookingId || 'BID001';
          const customerName = booking.user?.name || 'Customer';
          let vehicleName = 'Unknown Vehicle';
          if (booking.car) {
            if (booking.car.name) {
              vehicleName = booking.car.name;
            } else if (booking.car.brand && booking.car.model) {
              vehicleName = `${booking.car.brand} ${booking.car.model}`;
            }
          }
          const pickupCity = booking.pickupLocation?.city || 'N/A';
          const dropoffCity = booking.dropoffLocation?.city || 'N/A';
          const pickupDate = booking.startDate ? moment(booking.startDate).format('DD/MM/YYYY') : 'N/A';
          const status = (booking.bookingStatus || 'confirmed').toUpperCase();
          const amount = booking.totalAmount || 0;

          return `
            <tr>
              <td>${bookingId}</td>
              <td>${customerName}</td>
              <td>${vehicleName}</td>
              <td>${pickupCity}</td>
              <td>${pickupDate}</td>
              <td>${dropoffCity}</td>
              <td style="color: #007bff; font-weight: bold;">${status}</td>
              <td>₹${amount.toLocaleString()}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
};

// Generate cars content
const generateCarsContent = (data) => {
  if (!data || data.length === 0) {
    return '<p>No cars data available.</p>';
  }

  const approvedCars = data.filter(car => car.status === 'approved').length;
  const pendingCars = data.filter(car => car.status === 'pending').length;
  const rejectedCars = data.filter(car => car.status === 'rejected').length;

  return `
    <div class="summary-cards">
      <div class="summary-card">
        <h3>${data.length}</h3>
        <p>Total Cars</p>
      </div>
      <div class="summary-card">
        <h3>${approvedCars}</h3>
        <p>Approved</p>
      </div>
      <div class="summary-card">
        <h3>${pendingCars}</h3>
        <p>Pending</p>
      </div>
      <div class="summary-card">
        <h3>${rejectedCars}</h3>
        <p>Rejected</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Registration No</th>
          <th>Vehicle Name</th>
          <th>Brand</th>
          <th>Model</th>
          <th>Type</th>
          <th>Owner</th>
          <th>Status</th>
          <th>Price/Day</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(car => `
          <tr>
            <td>${car.registrationNumber}</td>
            <td>${car.name}</td>
            <td>${car.brand}</td>
            <td>${car.model}</td>
            <td>${car.type.toUpperCase()}</td>
            <td>${car.owner?.name || 'N/A'}</td>
            <td>${car.status.toUpperCase()}</td>
            <td>₹${car.pricePerDay.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

// Generate users content
const generateUsersContent = (data) => {
  if (!data || data.length === 0) {
    return '<p>No users data available.</p>';
  }

  const verifiedUsers = data.filter(user => user.isVerified).length;
  const unverifiedUsers = data.filter(user => !user.isVerified).length;

  return `
    <div class="summary-cards">
      <div class="summary-card">
        <h3>${data.length}</h3>
        <p>Total Users</p>
      </div>
      <div class="summary-card">
        <h3>${verifiedUsers}</h3>
        <p>Verified</p>
      </div>
      <div class="summary-card">
        <h3>${unverifiedUsers}</h3>
        <p>Unverified</p>
      </div>
      <div class="summary-card">
        <h3>${Math.round((verifiedUsers / data.length) * 100)}%</h3>
        <p>Verification Rate</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Status</th>
          <th>Joined Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(user => `
          <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${user.isVerified ? 'VERIFIED' : 'PENDING'}</td>
            <td>${moment(user.createdAt).format('DD/MM/YYYY')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

// Generate approvals content
const generateApprovalsContent = (data) => {
  if (!data || data.length === 0) {
    return '<p>No pending approvals data available.</p>';
  }

  return `
    <div class="summary-cards">
      <div class="summary-card">
        <h3>${data.length}</h3>
        <p>Pending Approvals</p>
      </div>
      <div class="summary-card">
        <h3>${data.filter(car => car.type === 'sedan').length}</h3>
        <p>Sedans</p>
      </div>
      <div class="summary-card">
        <h3>${data.filter(car => car.type === 'suv').length}</h3>
        <p>SUVs</p>
      </div>
      <div class="summary-card">
        <h3>${data.filter(car => car.type === 'luxury').length}</h3>
        <p>Luxury Cars</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Registration No</th>
          <th>Vehicle Name</th>
          <th>Brand & Model</th>
          <th>Type</th>
          <th>Owner</th>
          <th>Submitted Date</th>
          <th>Price/Day</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(car => `
          <tr>
            <td>${car.registrationNumber}</td>
            <td>${car.name}</td>
            <td>${car.brand} ${car.model}</td>
            <td>${car.type.toUpperCase()}</td>
            <td>${car.owner?.name || 'N/A'}</td>
            <td>${moment(car.createdAt).format('DD/MM/YYYY')}</td>
            <td>₹${car.pricePerDay.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

// Generate PDF report
const generateReportPDF = async (reportType, filters) => {
  try {
    let data = {};

    switch (reportType) {
      case 'monthly-earnings':
      case 'earnings':
        const year = filters?.year || new Date().getFullYear();
        data = await Booking.aggregate([
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
          { $sort: { _id: 1 } }
        ]);

        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];

        data = data.map(item => ({
          month: monthNames[item._id - 1],
          monthNumber: item._id,
          totalEarnings: item.totalEarnings,
          totalBookings: item.totalBookings,
          cashPayments: item.cashPayments,
          onlinePayments: item.onlinePayments
        }));
        break;

      case 'bookings':
        // Map frontend filter names to database field names
        let bookingFilters = {};
        if (filters) {
          if (filters.status) bookingFilters.bookingStatus = filters.status;
          if (filters.paymentMethod) bookingFilters.paymentMethod = filters.paymentMethod;
          if (filters.paymentStatus) bookingFilters.paymentStatus = filters.paymentStatus;
          if (filters.startDate || filters.endDate) {
            bookingFilters.createdAt = {};
            if (filters.startDate) bookingFilters.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate) bookingFilters.createdAt.$lte = new Date(filters.endDate);
          }
        }
        
        // Get actual bookings with populated data
        data = await Booking.find(bookingFilters)
          .populate('user', 'name email phone')
          .populate('car', 'name brand model registrationNumber')
          .sort({ createdAt: -1 })
          .limit(100);
        break;

      case 'cars':
        data = await Car.find(filters || {})
          .populate('owner', 'name email phone')
          .sort({ createdAt: -1 });
        break;

      case 'users':
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
        
        data = await User.find(userFilters)
          .select('-password -otp -otpExpires')
          .sort({ createdAt: -1 });
        break;

      case 'approvals':
        data = await Car.find({ status: 'pending', ...(filters || {}) })
          .populate('owner', 'name email phone')
          .sort({ createdAt: -1 });
        break;

      case 'travel-analytics':
        // Get actual bookings for travel analytics
        data = await Booking.find({})
          .populate('user', 'name email')
          .populate('car', 'name brand model')
          .sort({ createdAt: -1 })
          .limit(10);
        
        title = 'RentX Travel Analytics Report';
        content = generateTravelAnalyticsContent(data);
        break;
    }

    const html = generateReportHTML(reportType, data, filters);

    return new Promise((resolve, reject) => {
      const options = {
        format: 'A4',
        border: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      };

      pdf.create(html, options).toBuffer((err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });
  } catch (error) {
    console.error('Generate report PDF error:', error);
    throw error;
  }
};

module.exports = {
  generateReportPDF
};