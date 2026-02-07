const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
// pdfmake v0.2.x: vfs_fonts exports pdfMake.vfs structure
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

/**
 * Generate booking invoice PDF using pdfmake
 * Optimized to fit on ONE page with icons
 * Works on both local and Netlify without external dependencies
 */
const generateBookingInvoicePDF = async (bookingDetails) => {
  const pickupDate = new Date(bookingDetails.pickupDate);
  const dropOffDate = new Date(bookingDetails.returnDate || bookingDetails.dropOffDate);
  const bookingDate = new Date(bookingDetails.createdAt);
  
  const isPerkm = bookingDetails.pricingType === 'per_km';
  
  // Format currency
  const formatCurrency = (amount) => `Rs.${(amount || 0).toLocaleString('en-IN')}`;
  
  // Calculate duration
  const diffTime = Math.abs(dropOffDate - pickupDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  
  // Status colors
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': return { bg: '#dcfce7', text: '#166534' };
      case 'pending': return { bg: '#fef3c7', text: '#92400e' };
      case 'completed': return { bg: '#dbeafe', text: '#1e40af' };
      case 'cancelled': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };
  
  const statusColors = getStatusColor(bookingDetails.status);
  
  // Safe string helper
  const safeString = (val) => String(val || 'N/A');
  
  // PDF document definition - OPTIMIZED FOR ONE PAGE
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [20, 12, 20, 12],
    content: [
      // Header - Compact
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: 'RentX', fontSize: 18, bold: true, color: 'white', alignment: 'center', margin: [0, 0, 0, 2] },
                { text: 'Booking Receipt', fontSize: 11, bold: true, color: 'white', alignment: 'center', margin: [0, 0, 0, 1] },
                { 
                  text: `${bookingDate.toLocaleDateString('en-IN')} ${bookingDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, 
                  fontSize: 8, 
                  color: 'white', 
                  alignment: 'center'
                }
              ],
              fillColor: '#059669',
              border: [false, false, false, false],
              margin: [6, 6, 6, 6]
            }
          ]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 5]
      },
      
      // Booking Information Card - Compact
      {
        stack: [
          { 
            columns: [
              { 
                canvas: [
                  { type: 'rect', x: 0, y: 0, w: 16, h: 16, r: 2, color: '#059669' }
                ],
                width: 20
              },
              { 
                text: 'Booking Information', 
                fontSize: 11, 
                bold: true, 
                color: '#111827',
                width: '*',
                margin: [0, 2, 0, 0]
              }
            ],
            margin: [0, 0, 0, 3] 
          },
          {
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 80, y2: 0, lineWidth: 2, lineColor: '#059669' }],
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  { text: 'Booking ID', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { 
                    text: safeString(bookingDetails.bookingId), 
                    fontSize: 9, 
                    bold: true, 
                    color: '#92400e',
                    background: '#fef3c7',
                    alignment: 'right',
                    border: [false, false, false, true],
                    borderColor: ['', '', '', '#f9fafb']
                  }
                ],
                ...(bookingDetails.invoiceNumber ? [[
                  { text: 'Invoice Number', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: safeString(bookingDetails.invoiceNumber), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ]] : []),
                [
                  { text: 'Travel Type', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { 
                    text: isPerkm ? 'INTERSTATE' : 'DAILY', 
                    fontSize: 8, 
                    bold: true, 
                    color: isPerkm ? '#92400e' : '#1e40af',
                    background: isPerkm ? '#fef3c7' : '#dbeafe',
                    alignment: 'right',
                    border: [false, false, false, true],
                    borderColor: ['', '', '', '#f9fafb']
                  }
                ],
                [
                  { text: 'Status', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, false] },
                  { 
                    text: (bookingDetails.status || 'booked').toUpperCase(), 
                    fontSize: 8, 
                    bold: true, 
                    color: statusColors.text,
                    background: statusColors.bg,
                    alignment: 'right',
                    border: [false, false, false, false]
                  }
                ]
              ]
            },
            layout: {
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 2,
              paddingBottom: () => 2
            }
          }
        ],
        margin: [0, 0, 0, 5]
      },
      
      // Customer Details Card - Compact
      {
        stack: [
          { 
            columns: [
              { 
                canvas: [
                  { type: 'rect', x: 0, y: 0, w: 16, h: 16, r: 2, color: '#3b82f6' }
                ],
                width: 20
              },
              { 
                text: 'Customer Details', 
                fontSize: 11, 
                bold: true, 
                color: '#111827',
                width: '*',
                margin: [0, 2, 0, 0]
              }
            ],
            margin: [0, 0, 0, 3] 
          },
          {
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 80, y2: 0, lineWidth: 2, lineColor: '#059669' }],
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  { text: 'Name', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: safeString(bookingDetails.userName), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Email', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: safeString(bookingDetails.userEmail), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Phone', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, false] },
                  { text: safeString(bookingDetails.userPhone), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, false] }
                ]
              ]
            },
            layout: {
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 2,
              paddingBottom: () => 2
            }
          }
        ],
        margin: [0, 0, 0, 5]
      },
      
      // Vehicle Details Card - Compact
      {
        stack: [
          { 
            columns: [
              { 
                canvas: [
                  { type: 'rect', x: 0, y: 0, w: 16, h: 16, r: 2, color: '#f59e0b' }
                ],
                width: 20
              },
              { 
                text: 'Vehicle Details', 
                fontSize: 11, 
                bold: true, 
                color: '#111827',
                width: '*',
                margin: [0, 2, 0, 0]
              }
            ],
            margin: [0, 0, 0, 3] 
          },
          {
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 80, y2: 0, lineWidth: 2, lineColor: '#059669' }],
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  { text: 'Vehicle', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: `${safeString(bookingDetails.carBrand)} ${safeString(bookingDetails.carModel || bookingDetails.carName)}`, fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Registration', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: safeString(bookingDetails.carRegistration), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Type', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, false] },
                  { text: safeString(bookingDetails.carType), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, false] }
                ]
              ]
            },
            layout: {
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 2,
              paddingBottom: () => 2
            }
          }
        ],
        margin: [0, 0, 0, 5]
      },
      
      // Trip Details Card - Compact
      {
        stack: [
          { 
            columns: [
              { 
                canvas: [
                  { type: 'rect', x: 0, y: 0, w: 16, h: 16, r: 2, color: '#8b5cf6' }
                ],
                width: 20
              },
              { 
                text: 'Trip Details', 
                fontSize: 11, 
                bold: true, 
                color: '#111827',
                width: '*',
                margin: [0, 2, 0, 0]
              }
            ],
            margin: [0, 0, 0, 3] 
          },
          {
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 80, y2: 0, lineWidth: 2, lineColor: '#059669' }],
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  { text: 'Pickup Location', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: safeString(bookingDetails.pickupLocation), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Pickup City', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: safeString(bookingDetails.pickupCity), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Pickup Date & Time', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: `${pickupDate.toLocaleDateString('en-IN')} ${pickupDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Drop-off Location', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: safeString(bookingDetails.dropLocation), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Drop-off City', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: safeString(bookingDetails.dropCity), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Drop-off Date & Time', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: `${dropOffDate.toLocaleDateString('en-IN')} ${dropOffDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Duration', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, bookingDetails.distance ? true : false], borderColor: ['', '', '', '#f9fafb'] },
                  { text: `${diffDays} day(s)`, fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, bookingDetails.distance ? true : false], borderColor: ['', '', '', '#f9fafb'] }
                ],
                ...(bookingDetails.distance ? [[
                  { text: 'Distance', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, false] },
                  { text: `${bookingDetails.distance} km`, fontSize: 8, bold: true, color: '#1e40af', background: '#dbeafe', alignment: 'right', border: [false, false, false, false] }
                ]] : [])
              ]
            },
            layout: {
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 2,
              paddingBottom: () => 2
            }
          }
        ],
        margin: [0, 0, 0, 5]
      },
      
      // Payment Details Card - Compact
      {
        stack: [
          { 
            columns: [
              { 
                canvas: [
                  { type: 'rect', x: 0, y: 0, w: 16, h: 16, r: 2, color: '#10b981' }
                ],
                width: 20
              },
              { 
                text: 'Payment Details', 
                fontSize: 11, 
                bold: true, 
                color: '#111827',
                width: '*',
                margin: [0, 2, 0, 0]
              }
            ],
            margin: [0, 0, 0, 3] 
          },
          {
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 80, y2: 0, lineWidth: 2, lineColor: '#059669' }],
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: ['*', '*'],
              body: [
                ...(isPerkm ? [
                  [
                    { text: 'Base Price', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                    { text: formatCurrency(bookingDetails.basePrice || (bookingDetails.totalAmount - (bookingDetails.interstateAllowance || 0))), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                  ],
                  [
                    { text: 'Interstate Allowance', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                    { text: formatCurrency(bookingDetails.interstateAllowance || 400), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                  ]
                ] : [
                  [
                    { text: 'Base Price', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                    { text: formatCurrency(bookingDetails.pricePerDay), fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                  ]
                ]),
                [
                  { text: 'Payment Method', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] },
                  { text: 'Online Payment', fontSize: 9, bold: true, color: '#111827', alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#f9fafb'] }
                ],
                [
                  { text: 'Payment Status', fontSize: 9, bold: true, color: '#6b7280', border: [false, false, false, false] },
                  { 
                    text: bookingDetails.paymentStatus === 'paid' || bookingDetails.paymentStatus === 'completed' ? 'Paid' : 'Pay at Drop-Off', 
                    fontSize: 9, 
                    bold: true, 
                    color: bookingDetails.paymentStatus === 'paid' || bookingDetails.paymentStatus === 'completed' ? '#059669' : '#d97706', 
                    alignment: 'right', 
                    border: [false, false, false, false] 
                  }
                ]
              ]
            },
            layout: {
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 2,
              paddingBottom: () => 2
            }
          },
          // Payment Summary Box - Compact
          {
            table: {
              widths: ['*'],
              body: [[
                {
                  stack: [
                    {
                      columns: [
                        { text: 'Total Amount:', fontSize: 13, bold: true, color: '#059669', width: '*' },
                        { text: formatCurrency(bookingDetails.totalAmount || bookingDetails.totalPrice || bookingDetails.price), fontSize: 15, bold: true, color: '#059669', alignment: 'right', width: 'auto' }
                      ],
                      margin: [0, 0, 0, 4]
                    },
                    {
                      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#bbf7d0' }],
                      margin: [0, 0, 0, 4]
                    },
                    { text: 'Payment completed', fontSize: 8, bold: true, color: '#6b7280', alignment: 'center', italics: true }
                  ],
                  fillColor: '#f0fdf4',
                  border: [true, true, true, true],
                  borderColor: ['#bbf7d0', '#bbf7d0', '#bbf7d0', '#bbf7d0'],
                  margin: [6, 6, 6, 6]
                }
              ]]
            },
            layout: 'noBorders',
            margin: [0, 4, 0, 0]
          }
        ],
        margin: [0, 0, 0, 5]
      },
      
      // Footer - Compact
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: 'Important: Please carry valid driving license and government ID proof at pickup.', fontSize: 8, bold: true, color: '#6b7280', alignment: 'center', margin: [0, 0, 0, 2] },
                { text: 'For support: rentxcars.spprt@gmail.com | Thank you for choosing RentX!', fontSize: 7, bold: true, color: '#9ca3af', alignment: 'center' }
              ],
              fillColor: '#f9fafb',
              border: [false, true, false, false],
              borderColor: ['', '#e5e7eb', '', ''],
              margin: [6, 6, 6, 6]
            }
          ]]
        },
        layout: 'noBorders'
      }
    ],
    defaultStyle: {
      font: 'Roboto'
    }
  };
  
  // Generate PDF using getBuffer for reliable buffer handling
  return new Promise((resolve, reject) => {
    try {
      console.log('🔄 Creating PDF document with pdfmake...');
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      
      // Use getBuffer method (pdfmake v0.2.x API)
      // Note: getBuffer only takes a success callback, errors are thrown
      pdfDocGenerator.getBuffer((buffer) => {
        console.log('✅ PDF created successfully, size:', buffer.length, 'bytes');
        resolve(buffer);
      });
      
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      reject(error);
    }
  });
};

module.exports = { generateBookingInvoicePDF };
