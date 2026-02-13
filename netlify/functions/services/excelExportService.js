const ExcelJS = require('exceljs');

const generateAnalyticsExcel = async (analyticsData) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RentX Admin';
  workbook.created = new Date();

  // Overview Sheet
  const overviewSheet = workbook.addWorksheet('Overview', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });
  
  // Add title
  overviewSheet.mergeCells('A1:B1');
  overviewSheet.getCell('A1').value = 'RentX - Car Rental';
  overviewSheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFF97316' } };
  overviewSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  overviewSheet.getRow(1).height = 35;
  
  // Add subtitle
  overviewSheet.mergeCells('A2:B2');
  overviewSheet.getCell('A2').value = 'Analytics Overview';
  overviewSheet.getCell('A2').font = { size: 14, bold: false, color: { argb: 'FF6B7280' } };
  overviewSheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  overviewSheet.getRow(2).height = 25;
  
  overviewSheet.columns = [
    { header: 'Metric', key: 'metric', width: 35 },
    { header: 'Value', key: 'value', width: 20 }
  ];
  
  overviewSheet.addRows([
    { metric: 'Total Revenue', value: `₹${analyticsData.totalRevenue?.toLocaleString() || 0}` },
    { metric: 'Total Bookings', value: analyticsData.totalBookings || 0 },
    { metric: 'Total Users', value: analyticsData.totalUsers || 0 },
    { metric: 'Total Cars', value: analyticsData.totalCars || 0 },
    { metric: 'Platform Earnings', value: `₹${analyticsData.platformEarnings?.toLocaleString() || 0}` },
    { metric: 'Cash Earnings', value: `₹${analyticsData.cashEarnings?.toLocaleString() || 0}` },
    { metric: 'Online Earnings', value: `₹${analyticsData.onlineEarnings?.toLocaleString() || 0}` }
  ]);
  
  // Style header
  overviewSheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  overviewSheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
  overviewSheet.getRow(3).alignment = { vertical: 'middle', horizontal: 'center' };

  // Top Cars Sheet
  if (analyticsData.topCars && analyticsData.topCars.length > 0) {
    const carsSheet = workbook.addWorksheet('Top Cars');
    
    // Add title
    carsSheet.mergeCells('A1:D1');
    carsSheet.getCell('A1').value = 'RentX - Car Rental';
    carsSheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFF97316' } };
    carsSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    carsSheet.getRow(1).height = 35;
    
    carsSheet.mergeCells('A2:D2');
    carsSheet.getCell('A2').value = 'Top Performing Cars';
    carsSheet.getCell('A2').font = { size: 14, bold: false, color: { argb: 'FF6B7280' } };
    carsSheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    carsSheet.getRow(2).height = 25;
    
    carsSheet.addRow([]);
    
    carsSheet.columns = [
      { header: 'Car', key: 'car', width: 30 },
      { header: 'Bookings', key: 'bookings', width: 15 },
      { header: 'Revenue', key: 'revenue', width: 20 },
      { header: 'Rating', key: 'rating', width: 15 }
    ];
    
    analyticsData.topCars.forEach(car => {
      carsSheet.addRow({
        car: `${car.brand} ${car.model} (${car.year})`,
        bookings: car.bookingCount,
        revenue: `₹${car.totalRevenue?.toLocaleString()}`,
        rating: car.averageRating?.toFixed(1) || 'N/A'
      });
    });
    
    carsSheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    carsSheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
  }

  // Top Owners Sheet
  if (analyticsData.topOwners && analyticsData.topOwners.length > 0) {
    const ownersSheet = workbook.addWorksheet('Top Owners');
    
    // Add title
    ownersSheet.mergeCells('A1:F1');
    ownersSheet.getCell('A1').value = 'RentX - Car Rental';
    ownersSheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFF97316' } };
    ownersSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ownersSheet.getRow(1).height = 35;
    
    ownersSheet.mergeCells('A2:F2');
    ownersSheet.getCell('A2').value = 'Top Car Owners';
    ownersSheet.getCell('A2').font = { size: 14, bold: false, color: { argb: 'FF6B7280' } };
    ownersSheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    ownersSheet.getRow(2).height = 25;
    
    ownersSheet.addRow([]);
    
    ownersSheet.columns = [
      { header: 'Owner', key: 'owner', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Cars', key: 'cars', width: 15 },
      { header: 'Bookings', key: 'bookings', width: 15 },
      { header: 'Earnings', key: 'earnings', width: 20 },
      { header: 'Commission', key: 'commission', width: 20 }
    ];
    
    analyticsData.topOwners.forEach(owner => {
      ownersSheet.addRow({
        owner: owner.owner?.name || 'N/A',
        email: owner.owner?.email || 'N/A',
        cars: `${owner.totalCars} (${owner.approvedCars} approved)`,
        bookings: owner.totalBookings,
        earnings: `₹${owner.totalEarnings?.toLocaleString()}`,
        commission: `₹${owner.platformCommission?.toLocaleString()}`
      });
    });
    
    ownersSheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ownersSheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
  }

  // Geographic Distribution Sheet
  if (analyticsData.locations && analyticsData.locations.length > 0) {
    const geoSheet = workbook.addWorksheet('Geographic Distribution');
    
    // Add title
    geoSheet.mergeCells('A1:E1');
    geoSheet.getCell('A1').value = 'RentX - Car Rental';
    geoSheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFF97316' } };
    geoSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    geoSheet.getRow(1).height = 35;
    
    geoSheet.mergeCells('A2:E2');
    geoSheet.getCell('A2').value = 'Geographic Distribution';
    geoSheet.getCell('A2').font = { size: 14, bold: false, color: { argb: 'FF6B7280' } };
    geoSheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    geoSheet.getRow(2).height = 25;
    
    geoSheet.addRow([]);
    
    geoSheet.columns = [
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Bookings', key: 'bookings', width: 15 },
      { header: 'Cars', key: 'cars', width: 15 },
      { header: 'Revenue', key: 'revenue', width: 20 },
      { header: 'Demand/Supply', key: 'ratio', width: 18 }
    ];
    
    analyticsData.locations.forEach(loc => {
      geoSheet.addRow({
        location: loc.location,
        bookings: loc.bookings,
        cars: loc.cars,
        revenue: `₹${loc.revenue?.toLocaleString()}`,
        ratio: loc.demandSupplyRatio?.toFixed(2)
      });
    });
    
    geoSheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    geoSheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = { generateAnalyticsExcel };
