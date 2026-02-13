const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

/**
 * Generate Analytics Report PDF using pdfmake
 */
const generateAnalyticsPDF = async (analyticsData) => {
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
        text: 'Analytics Report',
        style: 'subtitle',
        alignment: 'center',
        margin: [0, 5, 0, 5]
      },
      {
        text: `Generated: ${new Date().toLocaleString()}`,
        style: 'date',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      
      // Overview Section
      {
        text: 'Overview',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10]
      },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'Total Revenue', style: 'tableCell' },
              { text: `Rs.${(analyticsData.totalRevenue || 0).toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right', bold: true }
            ],
            [
              { text: 'Total Bookings', style: 'tableCell' },
              { text: (analyticsData.totalBookings || 0).toString(), style: 'tableCell', alignment: 'right', bold: true }
            ],
            [
              { text: 'Total Users', style: 'tableCell' },
              { text: (analyticsData.totalUsers || 0).toString(), style: 'tableCell', alignment: 'right', bold: true }
            ],
            [
              { text: 'Total Cars', style: 'tableCell' },
              { text: (analyticsData.totalCars || 0).toString(), style: 'tableCell', alignment: 'right', bold: true }
            ],
            [
              { text: 'Platform Earnings', style: 'tableCell' },
              { text: `Rs.${(analyticsData.platformEarnings || 0).toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right', bold: true }
            ],
            [
              { text: 'Cash Earnings', style: 'tableCell' },
              { text: `Rs.${(analyticsData.cashEarnings || 0).toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right', bold: true }
            ],
            [
              { text: 'Online Earnings', style: 'tableCell' },
              { text: `Rs.${(analyticsData.onlineEarnings || 0).toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right', bold: true }
            ]
          ]
        },
        layout: {
          fillColor: function (rowIndex) {
            return rowIndex % 2 === 0 ? '#fff7ed' : null;
          },
          hLineWidth: function (i, node) {
            return 0.5;
          },
          vLineWidth: function () {
            return 0;
          },
          hLineColor: function () {
            return '#fed7aa';
          }
        },
        margin: [0, 0, 0, 20]
      },
      
      // Booking Status Section
      {
        text: 'Booking Status Distribution',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10],
        pageBreak: 'before'
      },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'Status', style: 'tableHeader' },
              { text: 'Count', style: 'tableHeader', alignment: 'center' }
            ],
            ...Object.entries(analyticsData.bookingStatus || {}).map(([status, count]) => [
              { text: status.charAt(0).toUpperCase() + status.slice(1), style: 'tableCell' },
              { text: count.toString(), style: 'tableCell', alignment: 'center' }
            ])
          ]
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
        },
        margin: [0, 0, 0, 20]
      },
      
      // Top Cars Section
      {
        text: 'Top Performing Cars',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10]
      },
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Car', style: 'tableHeader' },
              { text: 'Bookings', style: 'tableHeader', alignment: 'center' },
              { text: 'Revenue', style: 'tableHeader', alignment: 'right' },
              { text: 'Rating', style: 'tableHeader', alignment: 'center' }
            ],
            ...(analyticsData.topCars || []).slice(0, 10).map(car => [
              { text: `${car.brand} ${car.model} (${car.year})`, style: 'tableCell', fontSize: 8 },
              { text: car.bookingCount.toString(), style: 'tableCell', alignment: 'center' },
              { text: `Rs.${(car.totalRevenue || 0).toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right', fontSize: 8 },
              { text: car.averageRating ? car.averageRating.toFixed(1) : 'N/A', style: 'tableCell', alignment: 'center' }
            ])
          ]
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
        },
        margin: [0, 0, 0, 20]
      },
      
      // Top Owners Section
      {
        text: 'Top Performing Owners',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10],
        pageBreak: 'before'
      },
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Owner', style: 'tableHeader' },
              { text: 'Cars', style: 'tableHeader', alignment: 'center' },
              { text: 'Bookings', style: 'tableHeader', alignment: 'center' },
              { text: 'Earnings', style: 'tableHeader', alignment: 'right' }
            ],
            ...(analyticsData.topOwners || []).slice(0, 10).map(owner => [
              { text: owner.owner?.name || 'N/A', style: 'tableCell', fontSize: 8 },
              { text: `${owner.totalCars} (${owner.approvedCars})`, style: 'tableCell', alignment: 'center', fontSize: 8 },
              { text: owner.totalBookings.toString(), style: 'tableCell', alignment: 'center' },
              { text: `Rs.${(owner.totalEarnings || 0).toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right', fontSize: 8 }
            ])
          ]
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
        },
        margin: [0, 0, 0, 20]
      },
      
      // Geographic Distribution Section
      {
        text: 'Geographic Distribution',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10]
      },
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Location', style: 'tableHeader' },
              { text: 'Bookings', style: 'tableHeader', alignment: 'center' },
              { text: 'Cars', style: 'tableHeader', alignment: 'center' },
              { text: 'Revenue', style: 'tableHeader', alignment: 'right' }
            ],
            ...(analyticsData.locations || []).slice(0, 15).map(loc => [
              { text: loc.location, style: 'tableCell' },
              { text: loc.bookings.toString(), style: 'tableCell', alignment: 'center' },
              { text: loc.cars.toString(), style: 'tableCell', alignment: 'center' },
              { text: `Rs.${(loc.revenue || 0).toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right', fontSize: 8 }
            ])
          ]
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
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 5]
      },
      subtitle: {
        fontSize: 16,
        color: '#6b7280'
      },
      date: {
        fontSize: 10,
        color: '#6b7280'
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        color: '#f97316'
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: 'white',
        fillColor: '#f97316',
        margin: [5, 5, 5, 5]
      },
      tableCell: {
        fontSize: 9,
        margin: [5, 5, 5, 5]
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

module.exports = { generateAnalyticsPDF };
