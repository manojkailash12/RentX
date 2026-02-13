const PDFDocument = require('pdfkit');

/**
 * Generate payslip PDF using PDFKit
 * Styled with orange colors (#FF6B35) similar to EDUTRACK branding
 */
const generatePayslipPDF = async (payrollData, employeeData, userData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 40
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const orangeColor = '#FF6B35';
      const darkGray = '#333333';
      const lightGray = '#666666';
      
      // Helper to format currency
      const formatCurrency = (amount) => `Rs.${(amount || 0).toLocaleString('en-IN')}`;
      
      // Helper to get month name
      const getMonthName = (month) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1];
      };
      
      // Header with orange background
      doc.rect(0, 0, 595, 80).fill(orangeColor);
      
      doc.fillColor('white')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('RentX', 40, 25);
      
      doc.fontSize(14)
         .font('Helvetica')
         .text('Payslip', 40, 55);
      
      // Payslip period
      doc.fontSize(12)
         .text(`${getMonthName(payrollData.month)} ${payrollData.year}`, 450, 35, { align: 'right', width: 105 });
      
      // Reset to black for body
      doc.fillColor(darkGray);
      
      // Employee Details Section
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(orangeColor)
         .text('Employee Details', 40, 110);
      
      doc.moveTo(40, 130).lineTo(555, 130).strokeColor(orangeColor).lineWidth(2).stroke();
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(darkGray);
      
      let yPos = 145;
      
      // Employee info in two columns
      doc.text('Employee ID:', 40, yPos);
      doc.text(employeeData.employeeId, 150, yPos);
      doc.text('Employee Name:', 320, yPos);
      doc.text(userData.name, 430, yPos);
      
      yPos += 20;
      doc.text('Email:', 40, yPos);
      doc.text(userData.email, 150, yPos, { width: 150 });
      doc.text('Phone:', 320, yPos);
      doc.text(userData.phone || 'N/A', 430, yPos);
      
      yPos += 20;
      doc.text('Shift:', 40, yPos);
      doc.text(employeeData.shift.charAt(0).toUpperCase() + employeeData.shift.slice(1), 150, yPos);
      doc.text('Salary Type:', 320, yPos);
      doc.text(payrollData.salary.type.charAt(0).toUpperCase() + payrollData.salary.type.slice(1), 430, yPos);
      
      // Attendance Summary Section
      yPos += 40;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(orangeColor)
         .text('Attendance Summary', 40, yPos);
      
      yPos += 20;
      doc.moveTo(40, yPos).lineTo(555, yPos).strokeColor(orangeColor).lineWidth(2).stroke();
      
      yPos += 15;
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(darkGray);
      
      // Attendance details in grid
      doc.text('Total Days Worked:', 40, yPos);
      doc.text(payrollData.attendance.totalDays.toString(), 180, yPos);
      doc.text('Total Shifts:', 320, yPos);
      doc.text(payrollData.attendance.totalShifts.toString(), 430, yPos);
      
      yPos += 20;
      doc.text('Present Days:', 40, yPos);
      doc.text(payrollData.attendance.presentDays.toString(), 180, yPos);
      doc.text('Half Days:', 320, yPos);
      doc.text(payrollData.attendance.halfDays.toString(), 430, yPos);
      
      yPos += 20;
      doc.text('Late Days:', 40, yPos);
      doc.text(payrollData.attendance.lateDays.toString(), 180, yPos);
      doc.text('Double Shift Days:', 320, yPos);
      doc.text(payrollData.attendance.doubleShiftDays.toString(), 430, yPos);
      
      // Work Hours Section
      yPos += 40;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(orangeColor)
         .text('Work Hours', 40, yPos);
      
      yPos += 20;
      doc.moveTo(40, yPos).lineTo(555, yPos).strokeColor(orangeColor).lineWidth(2).stroke();
      
      yPos += 15;
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(darkGray);
      
      doc.text('Expected Hours:', 40, yPos);
      doc.text(payrollData.workHours.expected.toFixed(2), 180, yPos);
      doc.text('Actual Hours:', 320, yPos);
      doc.text(payrollData.workHours.actual.toFixed(2), 430, yPos);
      
      yPos += 20;
      doc.text('Overtime Hours:', 40, yPos);
      doc.text(payrollData.workHours.overtime.toFixed(2), 180, yPos);
      
      // Salary Breakdown Section
      yPos += 40;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(orangeColor)
         .text('Salary Breakdown', 40, yPos);
      
      yPos += 20;
      doc.moveTo(40, yPos).lineTo(555, yPos).strokeColor(orangeColor).lineWidth(2).stroke();
      
      yPos += 15;
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(darkGray);
      
      // Earnings
      doc.text('Base Salary:', 40, yPos);
      doc.text(formatCurrency(payrollData.salary.base), 450, yPos, { align: 'right', width: 105 });
      
      yPos += 20;
      doc.text('Calculated Salary:', 40, yPos);
      doc.text(formatCurrency(payrollData.salary.calculated), 450, yPos, { align: 'right', width: 105 });
      
      yPos += 20;
      doc.text('Overtime Pay:', 40, yPos);
      doc.text(formatCurrency(payrollData.salary.overtime), 450, yPos, { align: 'right', width: 105 });
      
      if (payrollData.salary.bonuses > 0) {
        yPos += 20;
        doc.text('Bonuses:', 40, yPos);
        doc.text(formatCurrency(payrollData.salary.bonuses), 450, yPos, { align: 'right', width: 105 });
      }
      
      // Deductions
      if (payrollData.salary.deductions > 0) {
        yPos += 20;
        doc.text('Deductions:', 40, yPos);
        doc.text(`-${formatCurrency(payrollData.salary.deductions)}`, 450, yPos, { align: 'right', width: 105 });
      }
      
      // Insurance (always show as Free)
      yPos += 20;
      doc.text('Insurance:', 40, yPos);
      doc.text('Free', 450, yPos, { align: 'right', width: 105 });
      
      // Net Salary with orange background
      yPos += 30;
      doc.rect(40, yPos - 5, 515, 30).fill('#FFF4ED');
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(orangeColor)
         .text('Net Salary:', 40, yPos);
      
      doc.fontSize(16)
         .text(formatCurrency(payrollData.salary.net), 450, yPos, { align: 'right', width: 105 });
      
      // Payment Status
      yPos += 50;
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(darkGray);
      
      doc.text('Payment Status:', 40, yPos);
      doc.fillColor(payrollData.status === 'paid' ? '#10B981' : orangeColor)
         .text(payrollData.status.toUpperCase(), 150, yPos);
      
      if (payrollData.paidOn) {
        doc.fillColor(darkGray);
        doc.text('Paid On:', 320, yPos);
        doc.text(new Date(payrollData.paidOn).toLocaleDateString('en-IN'), 430, yPos);
      }
      
      // Footer
      yPos += 50;
      doc.fontSize(8)
         .fillColor(lightGray)
         .text('This is a computer-generated payslip and does not require a signature.', 40, yPos, { align: 'center', width: 515 });
      
      yPos += 15;
      doc.text('For queries, contact: rentxcars.spprt@gmail.com', 40, yPos, { align: 'center', width: 515 });
      
      doc.end();
    } catch (error) {
      console.error('❌ Payslip PDF generation error:', error);
      reject(error);
    }
  });
};

module.exports = { generatePayslipPDF };
