const { generatePdfFromHtml } = require('./simplePdfGenerator.js');
const path = require('path');
const fs = require('fs').promises;

// For CommonJS, we can use __dirname directly
const __dirname = path.dirname(__filename);

// Load logo as base64 - moved to async function
let logoBase64 = '';

const loadLogo = async () => {
  if (logoBase64) return logoBase64;
  
  try {
    const logoPath = path.join(__dirname, '../assets/driveo-logo.png');
    const logoBuffer = await fs.readFile(logoPath);
    logoBase64 = logoBuffer.toString('base64');
  } catch (error) {
    console.warn('Logo not found, using text only');
    logoBase64 = '';
  }
  return logoBase64;
};

/**
 * Enhanced PDF Generation Service - SINGLE PAGE OPTIMIZED
 * Compact design that fits everything on one A4 page
 */

/**
 * Generate booking receipt PDF - SINGLE PAGE VERSION
 */
const generateFastBookingPDF = async (bookingDetails, vehicleDetails, userDetails) => {
  try {
    console.log("Starting single-page PDF generation...");
    const startTime = Date.now();

    // Load logo if needed
    await loadLogo();

    const pickupDate = new Date(bookingDetails.pickupDate);
    const dropOffDate = new Date(bookingDetails.dropOffDate || bookingDetails.returnDate);
    const bookingDate = new Date(bookingDetails.createdAt);

    // Generate compact HTML
    const htmlContent = generateCompactHTML(bookingDetails, vehicleDetails, userDetails, pickupDate, dropOffDate, bookingDate);

    // Generate PDF using Chrome headless
    console.log('Generating PDF with Chrome headless...');
    const pdfBuffer = await generatePdfFromHtml(htmlContent);

    const endTime = Date.now();
    const generationTime = endTime - startTime;
    console.log(`Single-page PDF generated successfully in ${generationTime}ms`);

    return {
      success: true,
      buffer: pdfBuffer,
      generationTime: generationTime,
      size: pdfBuffer.length
    };
  } catch (error) {
    console.error('Single-page PDF generation failed:', error);
    throw new Error(`Single-page PDF generation failed: ${error.message}`);
  }
};

/**
 * Generate compact HTML that fits on a single page
 */
const generateCompactHTML = (booking, vehicle, user, pickupDate, dropOffDate, bookingDate) => {
  // Calculate duration in days
  const diffTime = Math.abs(dropOffDate - pickupDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  
  // Determine pricing type and badges
  const isPerkm = booking.pricingType === 'per_km';
  
  // Format currency
  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;
  
  // Safe string truncation helper
  const safeSubstring = (str, length) => {
    if (!str) return 'N/A';
    return String(str).substring(0, length);
  };
  
  // Status colors matching UI
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'pending': return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'completed': return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
      case 'cancelled': return { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' };
      default: return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
    }
  };

  const statusColors = getStatusColor(booking.status);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Receipt - ${booking.bookingId || booking._id}</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 10px; 
      line-height: 1.2; 
      color: #374151;
      background-color: #ffffff;
      padding: 0;
      font-weight: bold;
    }
    
    .container {
      max-width: 100%;
      margin: 0 auto;
      background: white;
      height: 100vh;
      overflow: hidden;
    }
    
    /* Compact Header */
    .header { 
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      padding: 16px 20px;
      text-align: center;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .logo {
      width: 28px;
      height: 28px;
      background: white;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #059669;
      font-size: 14px;
    }
    
    .company-name {
      font-size: 22px;
      font-weight: 700;
    }
    
    .receipt-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .generated-date {
      font-size: 10px;
      opacity: 0.8;
    }
    
    /* Compact Content */
    .content {
      padding: 12px 20px;
      flex: 1;
    }
    
    /* Single Column Layout - Vertical Flow */
    .single-column {
      display: block;
      margin-bottom: 4px;
    }
    
    .column {
      width: 100%;
      margin-bottom: 2px;
    }
    
    /* Ultra Compact Cards */
    .card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    
    .card-title {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid #059669;
      display: inline-block;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 4px 0;
      border-bottom: 1px solid #f9fafb;
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      font-weight: 700;
      color: #6b7280;
      flex: 1;
      font-size: 11px;
    }
    
    .info-value {
      font-weight: 700;
      color: #111827;
      text-align: right;
      flex: 1;
      word-break: break-word;
      font-size: 11px;
    }
    
    /* Ultra Compact Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    
    .badge-perkm {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    
    .badge-daily {
      background-color: #dbeafe;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }
    
    .badge-status {
      background-color: ${statusColors.bg};
      color: ${statusColors.text};
      border: 1px solid ${statusColors.border};
    }
    
    /* Compact Payment summary */
    .payment-summary {
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 12px;
      margin-top: 8px;
    }
    
    .payment-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 11px;
      font-weight: bold;
    }
    
    .payment-total {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: 700;
      color: #059669;
      padding-top: 8px;
      border-top: 2px solid #bbf7d0;
      margin-top: 8px;
    }
    
    .payment-note {
      font-size: 10px;
      color: #6b7280;
      text-align: center;
      margin-top: 4px;
      font-style: italic;
      font-weight: bold;
    }
    
    /* Compact Footer */
    .footer {
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 12px;
      text-align: center;
      margin-top: auto;
    }
    
    .footer-note {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 4px;
      font-weight: bold;
    }
    
    .footer-contact {
      font-size: 9px;
      color: #9ca3af;
      font-weight: bold;
    }
    
    /* Print optimizations for single page */
    @media print {
      .container { 
        box-shadow: none; 
        height: auto;
        max-height: 100vh;
      }
      .card { 
        break-inside: avoid;
        page-break-inside: avoid;
      }
      body {
        font-size: 9px;
      }
    }
    
    @page {
      size: A4;
      margin: 8mm;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Compact Header -->
    <div class="header">
      <div class="logo-section">
        <div class="logo">🚗</div>
        <div class="company-name">RentX</div>
      </div>
      <div class="receipt-title">Booking Receipt</div>
      <div class="generated-date">
        ${bookingDate.toLocaleDateString('en-IN')} ${bookingDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>

    <div class="content">
      <!-- Single Column Layout - Vertical Flow -->
      <div class="single-column">
        <!-- Booking Information -->
        <div class="card">
          <div class="card-title">📋 Booking Information</div>
          <div class="info-row">
            <span class="info-label">Booking ID</span>
            <span class="info-value">
              <span class="badge badge-perkm">${safeSubstring(booking.bookingId || booking._id, 8)}</span>
            </span>
          </div>
          ${booking.invoiceNumber ? `
          <div class="info-row">
            <span class="info-label">Invoice Number</span>
            <span class="info-value">${booking.invoiceNumber}</span>
          </div>` : ''}
          <div class="info-row">
            <span class="info-label">Travel Type</span>
            <span class="info-value">
              <span class="badge ${isPerkm ? 'badge-perkm' : 'badge-daily'}">
                ${isPerkm ? 'INTERSTATE' : 'DAILY'}
              </span>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value">
              <span class="badge badge-status">${booking.status || 'booked'}</span>
            </span>
          </div>
        </div>

        <!-- Customer Details -->
        <div class="card">
          <div class="card-title">👤 Customer Details</div>
          <div class="info-row">
            <span class="info-label">Name</span>
            <span class="info-value">${user.name || user.username || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email</span>
            <span class="info-value">${user.email}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone</span>
            <span class="info-value">${user.phone || user.phoneNumber || 'N/A'}</span>
          </div>
        </div>

        <!-- Vehicle Details -->
        <div class="card">
          <div class="card-title">🚗 Vehicle Details</div>
          <div class="info-row">
            <span class="info-label">Vehicle</span>
            <span class="info-value">${vehicle.company || vehicle.brand} ${vehicle.name || vehicle.model}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Registration</span>
            <span class="info-value">${vehicle.registeration_number || vehicle.registration || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Type</span>
            <span class="info-value">${vehicle.car_type || vehicle.category || 'sedan'}</span>
          </div>
        </div>

        <!-- Trip Details -->
        <div class="card">
          <div class="card-title">🗺️ Trip Details</div>
          <div class="info-row">
            <span class="info-label">Pickup Location</span>
            <span class="info-value">${booking.pickupLocation || booking.pickUpLocation}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Pickup City</span>
            <span class="info-value">${booking.pickupCity || booking.pickUpCity || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Pickup Date & Time</span>
            <span class="info-value">${pickupDate.toLocaleDateString('en-IN')} ${pickupDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).replace(/am|pm/gi, match => match.toUpperCase())}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Drop-off Location</span>
            <span class="info-value">${booking.dropLocation || booking.dropOffLocation}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Drop-off City</span>
            <span class="info-value">${booking.dropCity || booking.dropOffCity || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Drop-off Date & Time</span>
            <span class="info-value">${dropOffDate.toLocaleDateString('en-IN')} ${dropOffDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).replace(/am|pm/gi, match => match.toUpperCase())}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Duration</span>
            <span class="info-value">${diffDays} day(s)</span>
          </div>
          ${booking.distance ? `
          <div class="info-row">
            <span class="info-label">Distance</span>
            <span class="info-value">
              <span class="badge badge-daily">${booking.distance} km</span>
            </span>
          </div>` : ''}
        </div>

        <!-- Payment Details -->
        <div class="card">
          <div class="card-title">💳 Payment Details</div>
          ${isPerkm ? `
          <div class="info-row">
            <span class="info-label">Base Price</span>
            <span class="info-value">${formatCurrency(booking.basePrice || (booking.totalAmount - (booking.interstateAllowance || 0)))}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Interstate Allowance</span>
            <span class="info-value">${formatCurrency(booking.interstateAllowance || 400)}</span>
          </div>` : `
          <div class="info-row">
            <span class="info-label">Base Price</span>
            <span class="info-value">${formatCurrency(vehicle.pricePerDay || booking.pricePerDay)}</span>
          </div>`}
          <div class="info-row">
            <span class="info-label">Payment Method</span>
            <span class="info-value">Online Payment</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Status</span>
            <span class="info-value" style="color: ${booking.paymentStatus === 'paid' || booking.paymentStatus === 'completed' ? '#059669' : '#d97706'}; font-weight: 600;">
              ${booking.paymentStatus === 'paid' || booking.paymentStatus === 'completed' ? 'Paid' : 
                (booking.paymentMethod === 'cash_on_delivery' || booking.paymentMethod === 'cash' ? 
                  'Pay at Drop-Off' : 'Pay at Drop-Off')
              }
            </span>
          </div>
          
          <div class="payment-summary">
            <div class="payment-total">
              <span>Total Amount:</span>
              <span>${formatCurrency(booking.totalAmount || booking.totalPrice || booking.price)}</span>
            </div>
            <div class="payment-note">
              Payment completed
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ultra Compact Footer -->
    <div class="footer">
      <div class="footer-note">
        <strong>📋 Important: Please carry valid driving license and government ID proof at pickup.</strong>
      </div>
      <div class="footer-contact">
        <strong>For support: rentxcars.spprt@gmail.com | Thank you for choosing RentX!</strong>
      </div>
    </div>
  </div>
</body>
</html>`;
};

// Backward compatibility export - handles old function signature
const generateBookingInvoice = async (bookingDetails) => {
  // Extract vehicle and user details from booking details for backward compatibility
  const vehicleDetails = {
    company: bookingDetails.carBrand || 'N/A',
    brand: bookingDetails.carBrand || 'N/A', 
    name: bookingDetails.carModel || bookingDetails.carName || 'N/A',
    model: bookingDetails.carModel || bookingDetails.carName || 'N/A',
    registeration_number: bookingDetails.carRegistration || 'N/A',
    registration: bookingDetails.carRegistration || 'N/A',
    car_type: bookingDetails.carType || 'N/A',
    category: bookingDetails.carType || 'N/A',
    year: bookingDetails.carYear || 'N/A',
    pricePerDay: bookingDetails.pricePerDay || 0
  };

  const userDetails = {
    name: bookingDetails.userName || 'N/A',
    username: bookingDetails.userName || 'N/A',
    email: bookingDetails.userEmail || 'N/A',
    phone: bookingDetails.userPhone || 'N/A',
    phoneNumber: bookingDetails.userPhone || 'N/A'
  };

  // Call the new function with extracted details
  const result = await generateFastBookingPDF(bookingDetails, vehicleDetails, userDetails);
  return result.buffer;
};

module.exports = { generateFastBookingPDF, generateBookingInvoice };