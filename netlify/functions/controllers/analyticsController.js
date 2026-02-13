const analyticsService = require('../services/analyticsService');
const { getCachedData, setCachedData, clearCache } = require('../utils/analyticsCache');
const { generateAnalyticsExcel } = require('../services/excelExportService');
const { generateAnalyticsPDF } = require('../utils/analyticsPdfGenerator');

/**
 * Analytics Controller
 * Handles all analytics-related API endpoints
 */

/**
 * Get overview analytics
 * GET /api/analytics/overview
 */
async function getOverview(req, res) {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { startDate, endDate, refresh } = req.query;

    // Generate cache key
    const cacheKey = `overview_${startDate || 'all'}_${endDate || 'all'}`;

    // Check cache unless refresh is requested
    if (!refresh) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json({ ...cachedData, cached: true });
      }
    }

    // Calculate all metrics
    const [
      revenueMetrics,
      userMetrics,
      bookingStatus,
      avgDuration
    ] = await Promise.all([
      analyticsService.calculateRevenueMetrics(startDate, endDate),
      analyticsService.calculateUserMetrics(startDate, endDate),
      analyticsService.getBookingStatusDistribution(),
      analyticsService.calculateAverageBookingDuration()
    ]);

    const overview = {
      revenue: revenueMetrics,
      users: userMetrics,
      bookingStatus,
      averageBookingDuration: avgDuration
    };

    // Cache the result
    setCachedData(cacheKey, overview);

    res.json(overview);
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({ message: 'Failed to fetch overview analytics', error: error.message });
  }
}

/**
 * Get revenue analytics
 * GET /api/analytics/revenue
 */
async function getRevenue(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { startDate, endDate, refresh } = req.query;
    const cacheKey = `revenue_${startDate || 'all'}_${endDate || 'all'}`;

    if (!refresh) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json({ ...cachedData, cached: true });
      }
    }

    const revenueMetrics = await analyticsService.calculateRevenueMetrics(startDate, endDate);

    setCachedData(cacheKey, revenueMetrics);

    res.json(revenueMetrics);
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({ message: 'Failed to fetch revenue analytics', error: error.message });
  }
}

/**
 * Get booking analytics
 * GET /api/analytics/bookings
 */
async function getBookings(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { startDate, endDate, groupBy, refresh } = req.query;
    const cacheKey = `bookings_${startDate || 'all'}_${endDate || 'all'}_${groupBy || 'day'}`;

    if (!refresh) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json({ ...cachedData, cached: true });
      }
    }

    const [trends, statusDistribution, avgDuration, topCars] = await Promise.all([
      analyticsService.calculateBookingTrends(startDate, endDate, groupBy),
      analyticsService.getBookingStatusDistribution(),
      analyticsService.calculateAverageBookingDuration(),
      analyticsService.getTopCars(10)
    ]);

    const bookingAnalytics = {
      trends,
      statusDistribution,
      averageBookingDuration: avgDuration,
      topCars
    };

    setCachedData(cacheKey, bookingAnalytics);

    res.json(bookingAnalytics);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Failed to fetch booking analytics', error: error.message });
  }
}

/**
 * Get user analytics
 * GET /api/analytics/users
 */
async function getUsers(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { startDate, endDate, refresh } = req.query;
    const cacheKey = `users_${startDate || 'all'}_${endDate || 'all'}`;

    if (!refresh) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json({ ...cachedData, cached: true });
      }
    }

    const userMetrics = await analyticsService.calculateUserMetrics(startDate, endDate);

    setCachedData(cacheKey, userMetrics);

    res.json(userMetrics);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch user analytics', error: error.message });
  }
}

/**
 * Get car owner analytics
 * GET /api/analytics/owners
 */
async function getOwners(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { limit, refresh } = req.query;
    const ownerLimit = parseInt(limit) || 10;
    const cacheKey = `owners_${ownerLimit}`;

    if (!refresh) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json({ ...cachedData, cached: true });
      }
    }

    const topOwners = await analyticsService.getTopOwners(ownerLimit);

    setCachedData(cacheKey, { topOwners });

    res.json({ topOwners });
  } catch (error) {
    console.error('Get owners error:', error);
    res.status(500).json({ message: 'Failed to fetch owner analytics', error: error.message });
  }
}

/**
 * Get geographic analytics
 * GET /api/analytics/geographic
 */
async function getGeographic(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { refresh } = req.query;
    const cacheKey = 'geographic';

    if (!refresh) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return res.json({ ...cachedData, cached: true });
      }
    }

    const locations = await analyticsService.calculateGeographicDistribution();

    setCachedData(cacheKey, { locations });

    res.json({ locations });
  } catch (error) {
    console.error('Get geographic error:', error);
    res.status(500).json({ message: 'Failed to fetch geographic analytics', error: error.message });
  }
}

/**
 * Export analytics data
 * POST /api/analytics/export
 */
async function exportData(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { type, format, startDate, endDate } = req.body;

    // Fetch data based on type
    let data;
    switch (type) {
      case 'revenue':
        data = await analyticsService.calculateRevenueMetrics(startDate, endDate);
        break;
      case 'bookings':
        data = await analyticsService.calculateBookingTrends(startDate, endDate);
        break;
      case 'users':
        data = await analyticsService.calculateUserMetrics(startDate, endDate);
        break;
      case 'owners':
        data = await analyticsService.getTopOwners(50);
        break;
      case 'geographic':
        data = await analyticsService.calculateGeographicDistribution();
        break;
      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    // For now, return JSON data
    // In a full implementation, you would use ExcelJS to generate Excel files
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics.csv"`);
      
      // Simple CSV conversion
      const csv = convertToCSV(data);
      res.send(csv);
    } else {
      // Return JSON for now (Excel generation would require ExcelJS library)
      res.json({
        message: 'Export data ready',
        type,
        format,
        data,
        note: 'Excel export requires ExcelJS library installation'
      });
    }
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ message: 'Failed to export analytics data', error: error.message });
  }
}

/**
 * Clear analytics cache
 * POST /api/analytics/clear-cache
 */
async function clearAnalyticsCache(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    clearCache();

    res.json({ message: 'Analytics cache cleared successfully' });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ message: 'Failed to clear cache', error: error.message });
  }
}

/**
 * Helper function to convert data to CSV
 */
function convertToCSV(data) {
  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    return `${headers}\n${rows}`;
  } else if (typeof data === 'object') {
    const headers = Object.keys(data).join(',');
    const values = Object.values(data).join(',');
    return `${headers}\n${values}`;
  }
  return '';
}

/**
 * Export analytics to Excel
 * GET /api/analytics/export-excel
 */
async function exportAnalyticsExcel(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('📊 Starting Excel export for analytics...');

    const { startDate, endDate } = req.query;

    // Fetch all analytics data
    const [revenueMetrics, bookingData, topOwners, locations, statusDist] = await Promise.all([
      analyticsService.calculateRevenueMetrics(startDate, endDate),
      analyticsService.getTopCars(20),
      analyticsService.getTopOwners(20),
      analyticsService.calculateGeographicDistribution(),
      analyticsService.getBookingStatusDistribution()
    ]);

    const analyticsData = {
      totalRevenue: revenueMetrics.totalRevenue,
      totalBookings: revenueMetrics.totalBookings,
      totalUsers: revenueMetrics.totalUsers || 0,
      totalCars: revenueMetrics.totalCars || 0,
      platformEarnings: revenueMetrics.platformEarnings,
      cashEarnings: revenueMetrics.cashEarnings,
      onlineEarnings: revenueMetrics.onlineEarnings,
      topCars: bookingData,
      topOwners: topOwners,
      locations: locations,
      bookingStatus: statusDist
    };

    console.log('📝 Generating Excel file...');
    const excelBuffer = await generateAnalyticsExcel(analyticsData);
    console.log(`✅ Excel generated successfully (${excelBuffer.length} bytes)`);

    // Set proper headers for Excel download
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Length': excelBuffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.end(excelBuffer);
  } catch (error) {
    console.error('❌ Excel export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get revenue trend data for charts
 * GET /api/analytics/revenue-trend
 */
async function getRevenueTrend(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { months = 12 } = req.query;
    const Booking = require('../models/booking');
    
    const monthsData = [];
    const now = new Date();
    
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const bookings = await Booking.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $in: ['confirmed', 'completed'] }
      });
      
      const revenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      
      monthsData.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue
      });
    }
    
    res.json({
      labels: monthsData.map(d => d.month),
      values: monthsData.map(d => d.revenue)
    });
  } catch (error) {
    console.error('Get revenue trend error:', error);
    res.status(500).json({ message: 'Failed to fetch revenue trend', error: error.message });
  }
}

/**
 * Get payment methods distribution
 * GET /api/analytics/payment-methods
 */
async function getPaymentMethods(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const Booking = require('../models/booking');
    
    const bookings = await Booking.find({ status: { $in: ['confirmed', 'completed'] } });
    
    const cash = bookings
      .filter(b => b.paymentMethod === 'cash')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    const online = bookings
      .filter(b => b.paymentMethod === 'online')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    res.json({ cash, online });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Failed to fetch payment methods', error: error.message });
  }
}

/**
 * Export analytics to PDF
 * GET /api/analytics/export-pdf
 */
async function exportAnalyticsPDF(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('📊 Starting PDF export for analytics...');

    const { startDate, endDate } = req.query;

    // Fetch all analytics data
    const [revenueMetrics, bookingData, topOwners, locations, statusDist] = await Promise.all([
      analyticsService.calculateRevenueMetrics(startDate, endDate),
      analyticsService.getTopCars(20),
      analyticsService.getTopOwners(20),
      analyticsService.calculateGeographicDistribution(),
      analyticsService.getBookingStatusDistribution()
    ]);

    const analyticsData = {
      totalRevenue: revenueMetrics.totalRevenue,
      totalBookings: revenueMetrics.totalBookings,
      totalUsers: revenueMetrics.totalUsers || 0,
      totalCars: revenueMetrics.totalCars || 0,
      platformEarnings: revenueMetrics.platformEarnings,
      cashEarnings: revenueMetrics.cashEarnings,
      onlineEarnings: revenueMetrics.onlineEarnings,
      topCars: bookingData,
      topOwners: topOwners,
      locations: locations,
      bookingStatus: statusDist
    };

    console.log('📝 Generating PDF file...');
    const pdfBuffer = await generateAnalyticsPDF(analyticsData);
    console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);

    // Set proper headers for PDF download
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.pdf"`,
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
}

module.exports = {
  getOverview,
  getRevenue,
  getBookings,
  getUsers,
  getOwners,
  getGeographic,
  exportData,
  clearAnalyticsCache,
  exportAnalyticsExcel,
  exportAnalyticsPDF,
  getRevenueTrend,
  getPaymentMethods,
  // Individual section exports
  exportOverviewPDF,
  exportOverviewExcel,
  exportBookingStatusPDF,
  exportBookingStatusExcel,
  exportTopCarsPDF,
  exportTopCarsExcel,
  exportTopOwnersPDF,
  exportTopOwnersExcel,
  exportGeographicPDF,
  exportGeographicExcel
};

/**
 * Export Overview Section to PDF
 */
async function exportOverviewPDF(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { startDate, endDate } = req.query;
    const [revenueMetrics, userMetrics] = await Promise.all([
      analyticsService.calculateRevenueMetrics(startDate, endDate),
      analyticsService.calculateUserMetrics(startDate, endDate)
    ]);

    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

    const docDefinition = {
      content: [
        { text: 'RentX - Car Rental', style: 'header', color: '#f97316', alignment: 'center' },
        { text: 'Overview Report', style: 'subheader', margin: [0, 5, 0, 20], alignment: 'center' },
        { text: `Generated: ${new Date().toLocaleDateString()}`, style: 'date', margin: [0, 0, 0, 20], alignment: 'center' },
        
        { text: 'Revenue Metrics', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Total Revenue', `₹${revenueMetrics.totalRevenue?.toLocaleString() || 0}`],
              ['Total Bookings', revenueMetrics.totalBookings || 0],
              ['Platform Earnings', `₹${revenueMetrics.platformEarnings?.toLocaleString() || 0}`],
              ['Cash Earnings', `₹${revenueMetrics.cashEarnings?.toLocaleString() || 0}`],
              ['Online Earnings', `₹${revenueMetrics.onlineEarnings?.toLocaleString() || 0}`]
            ]
          },
          margin: [0, 10, 0, 20]
        },
        
        { text: 'User Metrics', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Total Users', userMetrics.totalUsers || 0],
              ['Active Users', userMetrics.activeUsers || 0],
              ['New Users', userMetrics.newUsers || 0]
            ]
          },
          margin: [0, 10, 0, 0]
        }
      ],
      styles: {
        header: { fontSize: 22, bold: true },
        subheader: { fontSize: 16, bold: true },
        date: { fontSize: 10, color: '#666' },
        sectionHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] }
      }
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBuffer((buffer) => {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="overview-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': buffer.length
      });
      res.end(buffer);
    });
  } catch (error) {
    console.error('Overview PDF export error:', error);
    res.status(500).json({ message: 'Failed to export overview PDF', error: error.message });
  }
}

/**
 * Export Overview Section to Excel
 */
async function exportOverviewExcel(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { startDate, endDate } = req.query;
    const [revenueMetrics, userMetrics] = await Promise.all([
      analyticsService.calculateRevenueMetrics(startDate, endDate),
      analyticsService.calculateUserMetrics(startDate, endDate)
    ]);

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Overview');

    // Title
    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = 'RentX - Car Rental';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFf97316' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:B2');
    sheet.getCell('A2').value = 'Overview Report';
    sheet.getCell('A2').font = { size: 12, bold: true };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    // Revenue Metrics
    sheet.getCell('A4').value = 'Revenue Metrics';
    sheet.getCell('A4').font = { bold: true };
    sheet.addRow(['Total Revenue', `₹${revenueMetrics.totalRevenue?.toLocaleString() || 0}`]);
    sheet.addRow(['Total Bookings', revenueMetrics.totalBookings || 0]);
    sheet.addRow(['Platform Earnings', `₹${revenueMetrics.platformEarnings?.toLocaleString() || 0}`]);
    sheet.addRow(['Cash Earnings', `₹${revenueMetrics.cashEarnings?.toLocaleString() || 0}`]);
    sheet.addRow(['Online Earnings', `₹${revenueMetrics.onlineEarnings?.toLocaleString() || 0}`]);

    // User Metrics
    sheet.getCell('A11').value = 'User Metrics';
    sheet.getCell('A11').font = { bold: true };
    sheet.addRow(['Total Users', userMetrics.totalUsers || 0]);
    sheet.addRow(['Active Users', userMetrics.activeUsers || 0]);
    sheet.addRow(['New Users', userMetrics.newUsers || 0]);

    sheet.columns = [{ width: 25 }, { width: 25 }];

    const buffer = await workbook.xlsx.writeBuffer();
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="overview-${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Length': buffer.length
    });
    res.end(buffer);
  } catch (error) {
    console.error('Overview Excel export error:', error);
    res.status(500).json({ message: 'Failed to export overview Excel', error: error.message });
  }
}

/**
 * Export Booking Status to PDF
 */
async function exportBookingStatusPDF(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const statusDist = await analyticsService.getBookingStatusDistribution();

    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

    const docDefinition = {
      content: [
        { text: 'RentX - Car Rental', style: 'header', color: '#f97316', alignment: 'center' },
        { text: 'Booking Status Distribution', style: 'subheader', margin: [0, 5, 0, 20], alignment: 'center' },
        { text: `Generated: ${new Date().toLocaleDateString()}`, style: 'date', margin: [0, 0, 0, 20], alignment: 'center' },
        
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Status', 'Count'],
              ...Object.entries(statusDist).map(([status, count]) => [
                status.charAt(0).toUpperCase() + status.slice(1),
                count
              ])
            ]
          }
        }
      ],
      styles: {
        header: { fontSize: 22, bold: true },
        subheader: { fontSize: 16, bold: true },
        date: { fontSize: 10, color: '#666' }
      }
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBuffer((buffer) => {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="booking-status-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': buffer.length
      });
      res.end(buffer);
    });
  } catch (error) {
    console.error('Booking status PDF export error:', error);
    res.status(500).json({ message: 'Failed to export booking status PDF', error: error.message });
  }
}

/**
 * Export Booking Status to Excel
 */
async function exportBookingStatusExcel(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const statusDist = await analyticsService.getBookingStatusDistribution();

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Booking Status');

    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = 'RentX - Car Rental';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFf97316' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:B2');
    sheet.getCell('A2').value = 'Booking Status Distribution';
    sheet.getCell('A2').font = { size: 12, bold: true };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.addRow([]);
    sheet.addRow(['Status', 'Count']).font = { bold: true };
    
    Object.entries(statusDist).forEach(([status, count]) => {
      sheet.addRow([status.charAt(0).toUpperCase() + status.slice(1), count]);
    });

    sheet.columns = [{ width: 20 }, { width: 15 }];

    const buffer = await workbook.xlsx.writeBuffer();
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="booking-status-${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Length': buffer.length
    });
    res.end(buffer);
  } catch (error) {
    console.error('Booking status Excel export error:', error);
    res.status(500).json({ message: 'Failed to export booking status Excel', error: error.message });
  }
}

/**
 * Export Top Cars to PDF
 */
async function exportTopCarsPDF(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const topCars = await analyticsService.getTopCars(20);

    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

    const docDefinition = {
      content: [
        { text: 'RentX - Car Rental', style: 'header', color: '#f97316', alignment: 'center' },
        { text: 'Top Performing Cars', style: 'subheader', margin: [0, 5, 0, 20], alignment: 'center' },
        { text: `Generated: ${new Date().toLocaleDateString()}`, style: 'date', margin: [0, 0, 0, 20], alignment: 'center' },
        
        {
          table: {
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              ['Car', 'Bookings', 'Revenue', 'Rating'],
              ...topCars.map(car => [
                `${car.brand} ${car.model} (${car.year})`,
                car.bookingCount,
                `₹${car.totalRevenue?.toLocaleString() || 0}`,
                car.averageRating && car.averageRating > 0 ? car.averageRating.toFixed(1) : '0.0'
              ])
            ]
          }
        }
      ],
      styles: {
        header: { fontSize: 22, bold: true },
        subheader: { fontSize: 16, bold: true },
        date: { fontSize: 10, color: '#666' }
      }
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBuffer((buffer) => {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="top-cars-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': buffer.length
      });
      res.end(buffer);
    });
  } catch (error) {
    console.error('Top cars PDF export error:', error);
    res.status(500).json({ message: 'Failed to export top cars PDF', error: error.message });
  }
}

/**
 * Export Top Cars to Excel
 */
async function exportTopCarsExcel(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const topCars = await analyticsService.getTopCars(20);

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Top Cars');

    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'RentX - Car Rental';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFf97316' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:D2');
    sheet.getCell('A2').value = 'Top Performing Cars';
    sheet.getCell('A2').font = { size: 12, bold: true };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.addRow([]);
    const headerRow = sheet.addRow(['Car', 'Bookings', 'Revenue', 'Rating']);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf97316' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    topCars.forEach(car => {
      sheet.addRow([
        `${car.brand} ${car.model} (${car.year})`,
        car.bookingCount,
        car.totalRevenue || 0,
        car.averageRating?.toFixed(1) || 'N/A'
      ]);
    });

    sheet.columns = [{ width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }];

    const buffer = await workbook.xlsx.writeBuffer();
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="top-cars-${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Length': buffer.length
    });
    res.end(buffer);
  } catch (error) {
    console.error('Top cars Excel export error:', error);
    res.status(500).json({ message: 'Failed to export top cars Excel', error: error.message });
  }
}

/**
 * Export Top Owners to PDF
 */
async function exportTopOwnersPDF(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const topOwners = await analyticsService.getTopOwners(20);

    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

    const docDefinition = {
      content: [
        { text: 'RentX - Car Rental', style: 'header', color: '#f97316', alignment: 'center' },
        { text: 'Top Performing Owners', style: 'subheader', margin: [0, 5, 0, 20], alignment: 'center' },
        { text: `Generated: ${new Date().toLocaleDateString()}`, style: 'date', margin: [0, 0, 0, 20], alignment: 'center' },
        
        {
          table: {
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              ['Owner', 'Cars', 'Bookings', 'Earnings', 'Commission'],
              ...topOwners.map(owner => [
                owner.owner?.name || 'N/A',
                `${owner.totalCars} (${owner.approvedCars})`,
                owner.totalBookings,
                `₹${owner.totalEarnings?.toLocaleString() || 0}`,
                `₹${owner.platformCommission?.toLocaleString() || 0}`
              ])
            ]
          }
        }
      ],
      styles: {
        header: { fontSize: 22, bold: true },
        subheader: { fontSize: 16, bold: true },
        date: { fontSize: 10, color: '#666' }
      },
      pageOrientation: 'landscape'
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBuffer((buffer) => {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="top-owners-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': buffer.length
      });
      res.end(buffer);
    });
  } catch (error) {
    console.error('Top owners PDF export error:', error);
    res.status(500).json({ message: 'Failed to export top owners PDF', error: error.message });
  }
}

/**
 * Export Top Owners to Excel
 */
async function exportTopOwnersExcel(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const topOwners = await analyticsService.getTopOwners(20);

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Top Owners');

    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = 'RentX - Car Rental';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFf97316' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:E2');
    sheet.getCell('A2').value = 'Top Performing Owners';
    sheet.getCell('A2').font = { size: 12, bold: true };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.addRow([]);
    const headerRow = sheet.addRow(['Owner', 'Cars', 'Bookings', 'Earnings', 'Commission']);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf97316' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    topOwners.forEach(owner => {
      sheet.addRow([
        owner.owner?.name || 'N/A',
        `${owner.totalCars} (${owner.approvedCars} approved)`,
        owner.totalBookings,
        owner.totalEarnings || 0,
        owner.platformCommission || 0
      ]);
    });

    sheet.columns = [{ width: 25 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }];

    const buffer = await workbook.xlsx.writeBuffer();
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="top-owners-${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Length': buffer.length
    });
    res.end(buffer);
  } catch (error) {
    console.error('Top owners Excel export error:', error);
    res.status(500).json({ message: 'Failed to export top owners Excel', error: error.message });
  }
}

/**
 * Export Geographic Distribution to PDF
 */
async function exportGeographicPDF(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const locations = await analyticsService.calculateGeographicDistribution();

    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

    const docDefinition = {
      content: [
        { text: 'RentX - Car Rental', style: 'header', color: '#f97316', alignment: 'center' },
        { text: 'Geographic Distribution', style: 'subheader', margin: [0, 5, 0, 20], alignment: 'center' },
        { text: `Generated: ${new Date().toLocaleDateString()}`, style: 'date', margin: [0, 0, 0, 20], alignment: 'center' },
        
        {
          table: {
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              ['Location', 'Bookings', 'Cars', 'Revenue', 'D/S Ratio'],
              ...locations.map(loc => [
                loc.location,
                loc.bookings,
                loc.cars,
                `₹${loc.revenue?.toLocaleString() || 0}`,
                loc.demandSupplyRatio?.toFixed(2) || 'N/A'
              ])
            ]
          }
        }
      ],
      styles: {
        header: { fontSize: 22, bold: true },
        subheader: { fontSize: 16, bold: true },
        date: { fontSize: 10, color: '#666' }
      }
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBuffer((buffer) => {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="geographic-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': buffer.length
      });
      res.end(buffer);
    });
  } catch (error) {
    console.error('Geographic PDF export error:', error);
    res.status(500).json({ message: 'Failed to export geographic PDF', error: error.message });
  }
}

/**
 * Export Geographic Distribution to Excel
 */
async function exportGeographicExcel(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const locations = await analyticsService.calculateGeographicDistribution();

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Geographic Distribution');

    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = 'RentX - Car Rental';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFf97316' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:E2');
    sheet.getCell('A2').value = 'Geographic Distribution';
    sheet.getCell('A2').font = { size: 12, bold: true };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.addRow([]);
    const headerRow = sheet.addRow(['Location', 'Bookings', 'Cars', 'Revenue', 'Demand/Supply Ratio']);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf97316' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    locations.forEach(loc => {
      sheet.addRow([
        loc.location,
        loc.bookings,
        loc.cars,
        loc.revenue || 0,
        loc.demandSupplyRatio?.toFixed(2) || 'N/A'
      ]);
    });

    sheet.columns = [{ width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 20 }];

    const buffer = await workbook.xlsx.writeBuffer();
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="geographic-${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Length': buffer.length
    });
    res.end(buffer);
  } catch (error) {
    console.error('Geographic Excel export error:', error);
    res.status(500).json({ message: 'Failed to export geographic Excel', error: error.message });
  }
}
