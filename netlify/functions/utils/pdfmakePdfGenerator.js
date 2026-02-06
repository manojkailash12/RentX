const PdfPrinter = require('pdfmake');

// Define fonts for pdfmake
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

/**
 * Generate booking invoice PDF using pdfmake
 * Works perfectly on Netlify without chrome/puppeteer
 */
const generateBookingInvoicePDF = async (bookingDetails) => {
  const pickupDate = new Date(bookingDetails.pickupDate);
  const dropOffDate = new Date(bookingDetails.returnDate || bookingDetails.dropOffDate);
  const bookingDate = new Date(bookingDetails.createdAt);
  
  const isPerkm = bookingDetails.pricingType === 'per_km';
  
  // Format currency
  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;
  
  // Status colors
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': return '#166534';
      case 'pending': return '#92400e';
      case 'completed': return '#1e40af';
      case 'cancelled': return '#dc2626';
      default: return '#374151';
    }
  };
  
  const statusColor = getStatusColor(bookingDetails.status);
  
  // Calculate duration
  const diffTime = Math.abs(dropOffDate - pickupDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  
  // PDF document definition
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      // Header
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: '🚗 RentX', style: 'header', color: '#059669' },
              { text: 'Booking Receipt', style: 'subheader', color: '#6b7280' }
            ]
          },
          {
            width: 'auto',
            stack: [
              { text: bookingDate.toLocaleDateString('en-IN'), alignment: 'right', fontSize: 10 },
              { text: bookingDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), alignment: 'right', fontSize: 9, color: '#6b7280' }
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Booking Information
      {
        text: '📋 Booking Information',
        style: 'sectionHeader'
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Booking ID', bold: true, color: '#6b7280' },
              { text: bookingDetails.bookingId || bookingDetails._id, alignment: 'right' }
            ],
            ...(bookingDetails.invoiceNumber ? [[
              { text: 'Invoice Number', bold: true, color: '#6b7280' },
              { text: bookingDetails.invoiceNumber, alignment: 'right' }
            ]] : []),
            [
              { text: 'Travel Type', bold: true, color: '#6b7280' },
              { text: isPerkm ? 'INTERSTATE' : 'DAILY', alignment: 'right', bold: true, color: isPerkm ? '#92400e' : '#1e40af' }
            ],
            [
              { text: 'Status', bold: true, color: '#6b7280' },
              { text: (bookingDetails.status || 'booked').toUpperCase(), alignment: 'right', bold: true, color: statusColor }
            ]
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 5, 0, 15]
      },
      
      // Customer Details
      {
        text: '👤 Customer Details',
        style: 'sectionHeader'
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Name', bold: true, color: '#6b7280' },
              { text: bookingDetails.userName || 'N/A', alignment: 'right' }
            ],
            [
              { text: 'Email', bold: true, color: '#6b7280' },
              { text: bookingDetails.userEmail || 'N/A', alignment: 'right' }
            ],
            [
              { text: 'Phone', bold: true, color: '#6b7280' },
              { text: bookingDetails.userPhone || 'N/A', alignment: 'right' }
            ]
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 5, 0, 15]
      },
      
      // Vehicle Details
      {
        text: '🚗 Vehicle Details',
        style: 'sectionHeader'
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Vehicle', bold: true, color: '#6b7280' },
              { text: `${bookingDetails.carBrand || ''} ${bookingDetails.carModel || bookingDetails.carName || 'N/A'}`, alignment: 'right' }
            ],
            [
              { text: 'Registration', bold: true, color: '#6b7280' },
              { text: bookingDetails.carRegistration || 'N/A', alignment: 'right' }
            ],
            [
              { text: 'Type', bold: true, color: '#6b7280' },
              { text: bookingDetails.carType || 'N/A', alignment: 'right' }
            ]
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 5, 0, 15]
      },
      
      // Trip Details
      {
        text: '🗺️ Trip Details',
        style: 'sectionHeader'
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Pickup Location', bold: true, color: '#6b7280' },
              { text: bookingDetails.pickupLocation || 'N/A', alignment: 'right' }
            ],
            [
              { text: 'Pickup City', bold: true, color: '#6b7280' },
              { text: bookingDetails.pickupCity || 'N/A', alignment: 'right' }
            ],
            [
              { text: 'Pickup Date & Time', bold: true, color: '#6b7280' },
              { text: `${pickupDate.toLocaleDateString('en-IN')} ${pickupDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, alignment: 'right' }
            ],
            [
              { text: 'Drop-off Location', bold: true, color: '#6b7280' },
              { text: bookingDetails.dropLocation || 'N/A', alignment: 'right' }
            ],
            [
              { text: 'Drop-off City', bold: true, color: '#6b7280' },
              { text: bookingDetails.dropCity || 'N/A', alignment: 'right' }
            ],
            [
              { text: 'Drop-off Date & Time', bold: true, color: '#6b7280' },
              { text: `${dropOffDate.toLocaleDateString('en-IN')} ${dropOffDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, alignment: 'right' }
            ],
            [
              { text: 'Duration', bold: true, color: '#6b7280' },
              { text: `${diffDays} day(s)`, alignment: 'right' }
            ],
            ...(bookingDetails.distance ? [[
              { text: 'Distance', bold: true, color: '#6b7280' },
              { text: `${bookingDetails.distance} km`, alignment: 'right', bold: true, color: '#1e40af' }
            ]] : [])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 5, 0, 15]
      },
      
      // Payment Details
      {
        text: '💳 Payment Details',
        style: 'sectionHeader'
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            ...(isPerkm ? [
              [
                { text: 'Base Price', bold: true, color: '#6b7280' },
                { text: formatCurrency(bookingDetails.basePrice || (bookingDetails.totalAmount - (bookingDetails.interstateAllowance || 0))), alignment: 'right' }
              ],
              [
                { text: 'Interstate Allowance', bold: true, color: '#6b7280' },
                { text: formatCurrency(bookingDetails.interstateAllowance || 400), alignment: 'right' }
              ]
            ] : [
              [
                { text: 'Base Price', bold: true, color: '#6b7280' },
                { text: formatCurrency(bookingDetails.pricePerDay), alignment: 'right' }
              ]
            ]),
            [
              { text: 'Payment Method', bold: true, color: '#6b7280' },
              { text: 'Online Payment', alignment: 'right' }
            ],
            [
              { text: 'Payment Status', bold: true, color: '#6b7280' },
              { 
                text: bookingDetails.paymentStatus === 'paid' || bookingDetails.paymentStatus === 'completed' ? 'Paid' : 'Pay at Drop-Off',
                alignment: 'right',
                bold: true,
                color: bookingDetails.paymentStatus === 'paid' || bookingDetails.paymentStatus === 'completed' ? '#059669' : '#d97706'
              }
            ]
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 5, 0, 10]
      },
      
      // Total Amount
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'Total Amount:', bold: true, fontSize: 16, color: '#059669' },
              { text: formatCurrency(bookingDetails.totalAmount || bookingDetails.totalPrice || bookingDetails.price), bold: true, fontSize: 18, color: '#059669', alignment: 'right' }
            ]
          ]
        },
        layout: 'noBorders',
        fillColor: '#f0fdf4',
        margin: [0, 0, 0, 10]
      },
      
      {
        text: 'Payment completed',
        fontSize: 10,
        color: '#6b7280',
        italics: true,
        alignment: 'center',
        margin: [0, 5, 0, 20]
      },
      
      // Footer
      {
        stack: [
          {
            text: '📋 Important: Please carry valid driving license and government ID proof at pickup.',
            fontSize: 10,
            bold: true,
            color: '#374151',
            alignment: 'center',
            margin: [0, 0, 0, 5]
          },
          {
            text: 'For support: rentxcars.spprt@gmail.com | Thank you for choosing RentX!',
            fontSize: 9,
            color: '#9ca3af',
            alignment: 'center'
          }
        ],
        margin: [0, 20, 0, 0]
      }
    ],
    styles: {
      header: {
        fontSize: 24,
        bold: true
      },
      subheader: {
        fontSize: 14
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        color: '#059669',
        margin: [0, 10, 0, 5]
      }
    },
    defaultStyle: {
      fontSize: 10
    }
  };
  
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateBookingInvoicePDF };
