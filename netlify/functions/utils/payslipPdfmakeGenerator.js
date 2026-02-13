const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

/**
 * Generate payslip PDF using pdfmake (Netlify-compatible)
 * Styled with orange colors (#FF6B35) similar to RentX branding
 */
const generatePayslipPDF = async (payrollData, employeeData, userData) => {
  const orangeColor = '#FF6B35';
  const darkGray = '#333333';
  const lightGray = '#666666';
  
  const formatCurrency = (amount) => `Rs.${(amount || 0).toLocaleString('en-IN')}`;
  
  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const docDefinition = {
    pageSize: { width: 595.28, height: 'auto' },
    pageMargins: [30, 20, 30, 20],
    content: [
      // Header
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: 'RentX', fontSize: 22, bold: true, color: 'white', margin: [0, 0, 0, 3] },
                { text: 'Payslip', fontSize: 12, color: 'white' },
                { text: `${getMonthName(payrollData.month)} ${payrollData.year}`, fontSize: 10, color: 'white', margin: [0, 3, 0, 0] }
              ],
              fillColor: orangeColor,
              border: [false, false, false, false],
              margin: [10, 10, 10, 10]
            }
          ]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 12]
      },
      
      // Employee Details
      {
        text: 'Employee Details',
        fontSize: 12,
        bold: true,
        color: orangeColor,
        margin: [0, 0, 0, 6]
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: orangeColor }],
        margin: [0, 0, 0, 6]
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Employee ID:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: employeeData.employeeId, fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Employee Name:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: userData.name, fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Email:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: userData.email, fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Phone:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: userData.phone || 'N/A', fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Shift:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: employeeData.shift.charAt(0).toUpperCase() + employeeData.shift.slice(1), fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Salary Type:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: payrollData.salary.type.charAt(0).toUpperCase() + payrollData.salary.type.slice(1), fontSize: 10, border: [false, false, false, false] }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 12]
      },
      
      // Attendance Summary
      {
        text: 'Attendance Summary',
        fontSize: 12,
        bold: true,
        color: orangeColor,
        margin: [0, 0, 0, 6]
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: orangeColor }],
        margin: [0, 0, 0, 6]
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Total Days Worked:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: payrollData.attendance.totalDays.toString(), fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Total Shifts:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: payrollData.attendance.totalShifts.toString(), fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Present Days:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: payrollData.attendance.presentDays.toString(), fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Half Days:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: payrollData.attendance.halfDays.toString(), fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Late Days:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: payrollData.attendance.lateDays.toString(), fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Double Shift Days:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: payrollData.attendance.doubleShiftDays.toString(), fontSize: 10, border: [false, false, false, false] }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 12]
      },
      
      // Work Hours
      {
        text: 'Work Hours',
        fontSize: 12,
        bold: true,
        color: orangeColor,
        margin: [0, 0, 0, 6]
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: orangeColor }],
        margin: [0, 0, 0, 6]
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Expected Hours:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: payrollData.workHours.expected.toFixed(2), fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Actual Hours:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: payrollData.workHours.actual.toFixed(2), fontSize: 10, border: [false, false, false, false] }
            ],
            [
              { text: 'Overtime Hours:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: payrollData.workHours.overtime.toFixed(2), fontSize: 10, border: [false, false, false, false] }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 12]
      },
      
      // Salary Breakdown
      {
        text: 'Salary Breakdown',
        fontSize: 12,
        bold: true,
        color: orangeColor,
        margin: [0, 0, 0, 6]
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: orangeColor }],
        margin: [0, 0, 0, 6]
      },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'Base Salary:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: formatCurrency(payrollData.salary.base), fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ],
            [
              { text: 'Calculated Salary:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: formatCurrency(payrollData.salary.calculated), fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ],
            [
              { text: 'Overtime Pay:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: formatCurrency(payrollData.salary.overtime), fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ],
            ...(payrollData.salary.bonuses > 0 ? [[
              { text: 'Bonuses:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: formatCurrency(payrollData.salary.bonuses), fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ]] : []),
            ...(payrollData.salary.deductions > 0 ? [[
              { text: 'Deductions:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: `-${formatCurrency(payrollData.salary.deductions)}`, fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ]] : []),
            [
              { text: 'Insurance:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: 'Free', fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10]
      },
      
      // Net Salary
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                {
                  columns: [
                    { text: 'Net Salary:', fontSize: 13, bold: true, color: orangeColor, width: '*' },
                    { text: formatCurrency(payrollData.salary.net), fontSize: 15, bold: true, color: orangeColor, alignment: 'right', width: 'auto' }
                  ]
                }
              ],
              fillColor: '#FFF4ED',
              border: [false, false, false, false],
              margin: [10, 8, 10, 8]
            }
          ]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 12]
      },
      
      // Payment Status
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Payment Status:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { 
                text: payrollData.status.toUpperCase(), 
                fontSize: 10, 
                bold: true, 
                color: payrollData.status === 'paid' ? '#10B981' : orangeColor,
                border: [false, false, false, false] 
              }
            ],
            ...(payrollData.paidOn ? [[
              { text: 'Paid On:', fontSize: 10, bold: true, border: [false, false, false, false] },
              { text: new Date(payrollData.paidOn).toLocaleDateString('en-IN'), fontSize: 10, border: [false, false, false, false] }
            ]] : [])
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15]
      },
      
      // Footer
      {
        stack: [
          { 
            text: [
              { text: 'This is a computer-generated payslip and does not require a signature.', bold: true }
            ],
            fontSize: 8, 
            color: darkGray, 
            alignment: 'center',
            margin: [0, 0, 0, 5]
          },
          { 
            text: [
              { text: 'For queries, contact: ', bold: true, color: darkGray },
              { text: 'rentxcars.spprt@gmail.com', bold: true, color: '#0066CC' }
            ],
            fontSize: 8, 
            alignment: 'center'
          }
        ]
      }
    ],
    defaultStyle: {
      font: 'Roboto'
    }
  };

  return new Promise((resolve, reject) => {
    try {
      console.log('🔄 Creating payslip PDF with pdfmake...');
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      
      pdfDocGenerator.getBuffer((buffer) => {
        console.log('✅ Payslip PDF created successfully, size:', buffer.length, 'bytes');
        resolve(buffer);
      });
    } catch (error) {
      console.error('❌ Payslip PDF generation error:', error);
      reject(error);
    }
  });
};

module.exports = { generatePayslipPDF };
