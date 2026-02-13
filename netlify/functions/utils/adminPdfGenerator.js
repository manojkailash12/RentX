const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

/**
 * Generate Earnings Report PDF using pdfmake
 * Works reliably in serverless environments
 */
const generateEarningsReportPDF = async (year, monthlyData, totalYearlyEarnings, totalYearlyBookings) => {
  // Build table rows
  const tableBody = [
    // Header row
    [
      { text: 'Month', style: 'tableHeader' },
      { text: 'Total Earnings', style: 'tableHeader', alignment: 'right' },
      { text: 'Cash Earnings', style: 'tableHeader', alignment: 'right' },
      { text: 'Online Earnings', style: 'tableHeader', alignment: 'right' },
      { text: 'Bookings', style: 'tableHeader', alignment: 'center' }
    ]
  ];

  // Data rows
  monthlyData.forEach(month => {
    tableBody.push([
      { text: month.monthName, style: 'tableCell' },
      { text: `Rs.${month.totalEarnings.toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right' },
      { text: `Rs.${month.cashEarnings.toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right' },
      { text: `Rs.${month.onlineEarnings.toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right' },
      { text: month.bookings.toString(), style: 'tableCell', alignment: 'center' }
    ]);
  });

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      // Title
      {
        text: 'RentX - Car Rental',
        style: 'title',
        alignment: 'center',
        color: '#f97316'
      },
      {
        text: 'Earnings Report',
        style: 'subtitle',
        alignment: 'center',
        margin: [0, 5, 0, 5]
      },
      {
        text: `Year: ${year}`,
        style: 'year',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      
      // Table
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: tableBody
        },
        layout: {
          fillColor: function (rowIndex) {
            return rowIndex === 0 ? '#f97316' : (rowIndex % 2 === 0 ? '#fff7ed' : null);
          },
          hLineWidth: function (i, node) {
            return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
          },
          vLineWidth: function () {
            return 0;
          },
          hLineColor: function (i) {
            return i === 1 ? '#f97316' : '#fed7aa';
          }
        }
      },
      
      // Summary box
      {
        margin: [0, 30, 0, 0],
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: 'Yearly Summary', style: 'summaryTitle', alignment: 'center' },
                { text: `Total Earnings: Rs.${totalYearlyEarnings.toLocaleString('en-IN')}`, style: 'summaryText', alignment: 'center', margin: [0, 10, 0, 5] },
                { text: `Total Bookings: ${totalYearlyBookings}`, style: 'summaryText', alignment: 'center' }
              ],
              fillColor: '#fff7ed',
              margin: [15, 15, 15, 15]
            }
          ]]
        },
        layout: {
          hLineWidth: function () { return 2; },
          vLineWidth: function () { return 2; },
          hLineColor: function () { return '#fed7aa'; },
          vLineColor: function () { return '#fed7aa'; }
        }
      }
    ],
    styles: {
      title: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 5]
      },
      subtitle: {
        fontSize: 16,
        color: '#6b7280'
      },
      year: {
        fontSize: 14,
        color: '#6b7280'
      },
      tableHeader: {
        bold: true,
        fontSize: 11,
        color: 'white',
        fillColor: '#f97316',
        margin: [5, 5, 5, 5]
      },
      tableCell: {
        fontSize: 10,
        margin: [5, 5, 5, 5]
      },
      summaryTitle: {
        fontSize: 16,
        bold: true,
        color: '#f97316'
      },
      summaryText: {
        fontSize: 14,
        color: '#374151'
      }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.getBuffer((buffer) => {
        resolve(buffer);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Cars Report PDF using pdfmake
 */
const generateCarsReportPDF = async (cars) => {
  // Build table rows
  const tableBody = [
    // Header row
    [
      { text: '#', style: 'tableHeader', alignment: 'center' },
      { text: 'Car', style: 'tableHeader' },
      { text: 'Year', style: 'tableHeader', alignment: 'center' },
      { text: 'Category', style: 'tableHeader' },
      { text: 'Price', style: 'tableHeader', alignment: 'right' },
      { text: 'Seats', style: 'tableHeader', alignment: 'center' },
      { text: 'Location', style: 'tableHeader' },
      { text: 'Status', style: 'tableHeader', alignment: 'center' },
      { text: 'Owner', style: 'tableHeader' }
    ]
  ];

  // Data rows
  cars.forEach((car, index) => {
    tableBody.push([
      { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
      { text: `${car.brand} ${car.model}`, style: 'tableCell' },
      { text: car.year.toString(), style: 'tableCell', alignment: 'center' },
      { text: car.category, style: 'tableCell' },
      { text: `Rs.${car.pricePerDay}/day`, style: 'tableCell', alignment: 'right' },
      { text: car.seating_capacity.toString(), style: 'tableCell', alignment: 'center' },
      { text: car.location, style: 'tableCell', fontSize: 8 },
      { text: car.isApproved ? 'Approved' : 'Pending', style: 'tableCell', alignment: 'center', color: car.isApproved ? '#059669' : '#d97706' },
      { text: car.owner?.name || 'N/A', style: 'tableCell', fontSize: 8 }
    ]);
  });

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 60, 30, 60],
    content: [
      // Title
      {
        text: 'RentX - Car Rental',
        style: 'title',
        alignment: 'center',
        color: '#f97316'
      },
      {
        text: 'Cars Report',
        style: 'subtitle',
        alignment: 'center',
        margin: [0, 5, 0, 5]
      },
      {
        text: `Generated: ${new Date().toLocaleString()}`,
        style: 'date',
        alignment: 'center',
        margin: [0, 0, 0, 15]
      },
      
      // Summary box
      {
        margin: [0, 0, 0, 15],
        table: {
          widths: ['*'],
          body: [[
            {
              columns: [
                { text: `Total Cars: ${cars.length}`, style: 'summaryItem' },
                { text: `Available: ${cars.filter(c => c.isAvailable).length}`, style: 'summaryItem' },
                { text: `Approved: ${cars.filter(c => c.isApproved).length}`, style: 'summaryItem' },
                { text: `Pending: ${cars.filter(c => !c.isApproved).length}`, style: 'summaryItem' }
              ],
              fillColor: '#fff7ed',
              margin: [10, 10, 10, 10]
            }
          ]]
        },
        layout: {
          hLineWidth: function () { return 2; },
          vLineWidth: function () { return 2; },
          hLineColor: function () { return '#fed7aa'; },
          vLineColor: function () { return '#fed7aa'; }
        }
      },
      
      // Table
      {
        table: {
          headerRows: 1,
          widths: [25, '*', 40, 60, 60, 35, 80, 50, 70],
          body: tableBody
        },
        layout: {
          fillColor: function (rowIndex) {
            return rowIndex === 0 ? '#f97316' : (rowIndex % 2 === 0 ? '#fff7ed' : null);
          },
          hLineWidth: function (i, node) {
            return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
          },
          vLineWidth: function () {
            return 0;
          },
          hLineColor: function (i) {
            return i === 1 ? '#f97316' : '#fed7aa';
          }
        }
      }
    ],
    styles: {
      title: {
        fontSize: 22,
        bold: true
      },
      subtitle: {
        fontSize: 14,
        color: '#6b7280'
      },
      date: {
        fontSize: 10,
        color: '#6b7280'
      },
      summaryItem: {
        fontSize: 11,
        color: '#374151',
        bold: true
      },
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: 'white',
        fillColor: '#f97316',
        margin: [3, 3, 3, 3]
      },
      tableCell: {
        fontSize: 8,
        margin: [3, 3, 3, 3]
      }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.getBuffer((buffer) => {
        resolve(buffer);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Bookings Report PDF using pdfmake
 */
const generateBookingsReportPDF = async (bookings) => {
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  // Build table rows
  const tableBody = [
    // Header row
    [
      { text: '#', style: 'tableHeader', alignment: 'center' },
      { text: 'Booking ID', style: 'tableHeader' },
      { text: 'Customer', style: 'tableHeader' },
      { text: 'Car', style: 'tableHeader' },
      { text: 'Pickup', style: 'tableHeader' },
      { text: 'Return', style: 'tableHeader' },
      { text: 'Amount', style: 'tableHeader', alignment: 'right' },
      { text: 'Status', style: 'tableHeader', alignment: 'center' }
    ]
  ];

  // Data rows
  bookings.forEach((booking, index) => {
    const car = booking.carId;
    const user = booking.userId;
    
    tableBody.push([
      { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
      { text: booking.bookingId || `#${index + 1}`, style: 'tableCell', fontSize: 7 },
      { text: user?.name || 'N/A', style: 'tableCell' },
      { text: car ? `${car.brand} ${car.model}` : 'N/A', style: 'tableCell' },
      { text: new Date(booking.pickupDate).toLocaleDateString(), style: 'tableCell', fontSize: 8 },
      { text: new Date(booking.returnDate).toLocaleDateString(), style: 'tableCell', fontSize: 8 },
      { text: `Rs.${(booking.totalAmount || 0).toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right' },
      { text: booking.status, style: 'tableCell', alignment: 'center', fontSize: 8 }
    ]);
  });

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 60, 30, 60],
    content: [
      // Title
      {
        text: 'RentX - Car Rental',
        style: 'title',
        alignment: 'center',
        color: '#f97316'
      },
      {
        text: 'Bookings Report',
        style: 'subtitle',
        alignment: 'center',
        margin: [0, 5, 0, 5]
      },
      {
        text: `Generated: ${new Date().toLocaleString()}`,
        style: 'date',
        alignment: 'center',
        margin: [0, 0, 0, 15]
      },
      
      // Summary box
      {
        margin: [0, 0, 0, 15],
        table: {
          widths: ['*'],
          body: [[
            {
              columns: [
                { text: `Total Bookings: ${bookings.length}`, style: 'summaryItem', width: '*' },
                { text: `Total Revenue: Rs.${totalRevenue.toLocaleString('en-IN')}`, style: 'summaryItem', width: '*' },
                { text: `Confirmed: ${confirmedCount}`, style: 'summaryItem', width: 'auto' },
                { text: `Completed: ${completedCount}`, style: 'summaryItem', width: 'auto' },
                { text: `Pending: ${pendingCount}`, style: 'summaryItem', width: 'auto' }
              ],
              fillColor: '#fff7ed',
              margin: [10, 10, 10, 10]
            }
          ]]
        },
        layout: {
          hLineWidth: function () { return 2; },
          vLineWidth: function () { return 2; },
          hLineColor: function () { return '#fed7aa'; },
          vLineColor: function () { return '#fed7aa'; }
        }
      },
      
      // Table
      {
        table: {
          headerRows: 1,
          widths: [25, 70, '*', '*', 60, 60, 70, 50],
          body: tableBody
        },
        layout: {
          fillColor: function (rowIndex) {
            return rowIndex === 0 ? '#f97316' : (rowIndex % 2 === 0 ? '#fff7ed' : null);
          },
          hLineWidth: function (i, node) {
            return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
          },
          vLineWidth: function () {
            return 0;
          },
          hLineColor: function (i) {
            return i === 1 ? '#f97316' : '#fed7aa';
          }
        }
      }
    ],
    styles: {
      title: {
        fontSize: 22,
        bold: true
      },
      subtitle: {
        fontSize: 14,
        color: '#6b7280'
      },
      date: {
        fontSize: 10,
        color: '#6b7280'
      },
      summaryItem: {
        fontSize: 10,
        color: '#374151',
        bold: true
      },
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: 'white',
        fillColor: '#f97316',
        margin: [3, 3, 3, 3]
      },
      tableCell: {
        fontSize: 8,
        margin: [3, 3, 3, 3]
      }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.getBuffer((buffer) => {
        resolve(buffer);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateEarningsReportPDF,
  generateCarsReportPDF,
  generateBookingsReportPDF
};
