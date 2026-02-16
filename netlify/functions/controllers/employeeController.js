const Employee = require('../models/employee');
const Attendance = require('../models/attendance');
const Payroll = require('../models/payroll');
const User = require('../models/user');
const { getNextSequence } = require('../models/counter');

// Shift timings configuration
const SHIFTS = {
  morning: { start: '09:00', end: '14:00', hours: 5 },
  afternoon: { start: '15:00', end: '20:00', hours: 5 }
};

// Helper: Parse time string to minutes
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper: Calculate time difference in minutes
const getTimeDifference = (start, end) => {
  const diff = end - start;
  return Math.floor(diff / (1000 * 60)); // Convert to minutes
};

// Helper: Format minutes to HH:MM
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// Create Employee
exports.createEmployee = async (req, res) => {
  try {
    const { userId, shift, salaryType, salaryAmount } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user has employee role
    if (user.role !== 'employee') {
      return res.status(400).json({
        success: false,
        message: 'User must have employee role'
      });
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ userId });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee record already exists for this user'
      });
    }

    // Generate employee ID
    const empNumber = await getNextSequence('employee');
    const employeeId = `EMP${String(empNumber).padStart(4, '0')}`;

    // Use shift from request OR from user's registration
    const employeeShift = shift || user.employeeShift || 'morning';
    
    // Get shift timing
    const shiftTiming = SHIFTS[employeeShift];
    if (!shiftTiming) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shift'
      });
    }

    // Create employee record - all employees have equal access
    const employeeData = {
      userId,
      employeeId,
      shift: employeeShift,
      shiftTiming: {
        start: shiftTiming.start,
        end: shiftTiming.end
      }
    };
    
    // Add salary if provided
    if (salaryAmount) {
      employeeData.salary = {
        type: salaryType || 'hourly',
        amount: salaryAmount
      };
    }

    const employee = await Employee.create(employeeData);

    res.status(201).json({
      success: true,
      message: salaryAmount 
        ? 'Employee record created successfully with salary information'
        : 'Employee record created successfully. Salary can be added later.',
      employee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const { status, shift, department } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (shift) filter.shift = shift;
    if (department) filter.department = department;

    const employees = await Employee.find(filter)
      .populate('userId', 'name email phone image')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      employees,
      count: employees.length
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single employee
exports.getEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findOne({ employeeId })
      .populate('userId', 'name email phone image');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      employee
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const updates = req.body;

    // If shift is being updated, update shift timing too
    if (updates.shift && SHIFTS[updates.shift]) {
      updates.shiftTiming = {
        start: SHIFTS[updates.shift].start,
        end: SHIFTS[updates.shift].end
      };
    }

    updates.updatedAt = new Date();

    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      updates,
      { new: true }
    ).populate('userId', 'name email phone image');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clock In
exports.clockIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const { method = 'manual', location, ipAddress } = req.body;

    // Check if today is Sunday (0 = Sunday)
    const currentDate = new Date();
    if (currentDate.getDay() === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sunday is a holiday. Clock-in is not allowed on Sundays.'
      });
    }

    // Get employee record
    const employee = await Employee.findOne({ userId, status: 'active' });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found or inactive'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    
    // Determine which shift based on current time (NOT employee's assigned shift)
    // Employees can work ANY shift regardless of their assigned shift
    // Morning: 9:00-14:00, Afternoon: 15:00-20:00
    let currentShift;
    if (currentHour >= 9 && currentHour < 14) {
      currentShift = 'morning';
    } else if (currentHour >= 15 && currentHour < 20) {
      currentShift = 'afternoon';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Clock-in is only allowed during shift hours (9:00-14:00 for morning, 15:00-20:00 for afternoon)'
      });
    }

    // Check if already clocked in for THIS SPECIFIC SHIFT today
    const existingAttendance = await Attendance.findOne({
      employeeId: employee._id,
      date: today,
      shift: currentShift
    });

    if (existingAttendance && existingAttendance.clockIn) {
      return res.status(400).json({
        success: false,
        message: `Already clocked in for ${currentShift} shift today`,
        attendance: existingAttendance
      });
    }

    const clockInTime = new Date();
    const shiftTiming = SHIFTS[currentShift];
    const shiftStart = shiftTiming.start;
    const expectedStartMinutes = timeToMinutes(shiftStart);
    const actualStartMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
    
    // Calculate if late
    const isLate = actualStartMinutes > expectedStartMinutes;
    const lateBy = isLate ? actualStartMinutes - expectedStartMinutes : 0;

    // Calculate compensation end time if late
    let compensationEndTime = null;
    if (isLate) {
      const shiftEnd = shiftTiming.end;
      const shiftEndMinutes = timeToMinutes(shiftEnd);
      const compensatedEndMinutes = shiftEndMinutes + lateBy;
      
      compensationEndTime = new Date(clockInTime);
      compensationEndTime.setHours(0, 0, 0, 0);
      compensationEndTime.setMinutes(compensatedEndMinutes);
    }

    const attendance = await Attendance.create({
      employeeId: employee._id,
      userId,
      date: today,
      shift: currentShift,
      expectedShiftTiming: shiftTiming,
      clockIn: {
        time: clockInTime,
        method,
        location,
        ipAddress
      },
      lateArrival: {
        isLate,
        lateBy,
        compensated: false,
        compensationEndTime
      },
      status: isLate ? 'late' : 'present'
    });

    res.json({
      success: true,
      message: isLate 
        ? `Clocked in for ${currentShift} shift ${lateBy} minutes late. Please work until ${minutesToTime(timeToMinutes(shiftTiming.end) + lateBy)}`
        : `Clocked in successfully for ${currentShift} shift`,
      attendance,
      isLate,
      lateBy,
      compensationEndTime,
      shift: currentShift
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clock Out
exports.clockOut = async (req, res) => {
  try {
    const userId = req.user._id;
    const { method = 'manual', location, ipAddress } = req.body;

    // Check if today is Sunday (0 = Sunday)
    const currentDate = new Date();
    if (currentDate.getDay() === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sunday is a holiday. Clock-out is not allowed on Sundays.'
      });
    }

    const employee = await Employee.findOne({ userId, status: 'active' });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    
    // Determine which shift based on current time
    let currentShift;
    if (currentHour >= 9 && currentHour < 15) {
      currentShift = 'morning';
    } else if (currentHour >= 15 && currentHour <= 23) {
      currentShift = 'afternoon';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Clock-out time is outside shift hours'
      });
    }

    // Find attendance for THIS SPECIFIC SHIFT
    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      date: today,
      shift: currentShift
    });

    if (!attendance || !attendance.clockIn) {
      return res.status(400).json({
        success: false,
        message: `No clock-in record found for ${currentShift} shift today`
      });
    }

    if (attendance.clockOut) {
      return res.status(400).json({
        success: false,
        message: `Already clocked out for ${currentShift} shift today`
      });
    }

    const clockOutTime = new Date();
    const workDurationMinutes = getTimeDifference(attendance.clockIn.time, clockOutTime);
    const workHours = Math.floor(workDurationMinutes / 60);
    const workMinutes = workDurationMinutes % 60;

    // Expected shift duration (5 hours = 300 minutes)
    const expectedDuration = 300;
    
    // Determine status based on work duration
    let status = 'present';
    let isEarly = false;
    let earlyBy = 0;

    if (workDurationMinutes < 150) { // Less than 2.5 hours (half of 5 hour shift)
      status = 'half-day';
    } else if (workDurationMinutes < expectedDuration) {
      isEarly = true;
      earlyBy = expectedDuration - workDurationMinutes;
      
      // If late arrival was compensated, check if they worked the compensation
      if (attendance.lateArrival.isLate && attendance.lateArrival.compensationEndTime) {
        if (clockOutTime < attendance.lateArrival.compensationEndTime) {
          status = 'half-day';
        }
      }
    }

    // Calculate overtime
    let overtimeMinutes = 0;
    if (workDurationMinutes > expectedDuration) {
      overtimeMinutes = workDurationMinutes - expectedDuration;
    }

    attendance.clockOut = {
      time: clockOutTime,
      method,
      location,
      ipAddress
    };
    attendance.workDuration = {
      hours: workHours,
      minutes: workMinutes
    };
    attendance.status = status;
    attendance.earlyLeave = {
      isEarly,
      earlyBy
    };
    attendance.overtime = {
      hours: Math.floor(overtimeMinutes / 60),
      minutes: overtimeMinutes % 60
    };
    attendance.lateArrival.compensated = attendance.lateArrival.isLate && workDurationMinutes >= (expectedDuration + attendance.lateArrival.lateBy);
    attendance.updatedAt = new Date();

    await attendance.save();

    res.json({
      success: true,
      message: `Clocked out successfully from ${attendance.shift} shift`,
      attendance,
      workDuration: `${workHours}h ${workMinutes}m`,
      status,
      shift: attendance.shift
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance records
exports.getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, status } = req.query;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    const filter = {};
    
    if (employeeId && isAdmin) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        filter.employeeId = employee._id;
      }
    } else if (!isAdmin) {
      filter.userId = userId;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (status) filter.status = status;

    const attendance = await Attendance.find(filter)
      .populate('employeeId')
      .populate('userId', 'name email')
      .sort({ date: -1 });

    res.json({
      success: true,
      attendance,
      count: attendance.length
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate and generate payroll
exports.generatePayroll = async (req, res) => {
  try {
    const { employeeId, month, year, sendEmail = false } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, month, and year are required'
      });
    }

    // Try to find by MongoDB _id first, then employeeId (EMP0001), then userId (MongoDB ObjectId)
    let employee = await Employee.findById(employeeId).where('status').equals('active');
    
    // If not found by _id, try finding by employeeId field
    if (!employee) {
      employee = await Employee.findOne({ employeeId, status: 'active' });
    }
    
    // If not found by employeeId, try finding by userId
    if (!employee) {
      employee = await Employee.findOne({ userId: employeeId, status: 'active' });
    }
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found. Please create employee record first.'
      });
    }

    // Check if payroll already exists (allow regeneration to update)
    const existingPayroll = await Payroll.findOne({
      employeeId: employee._id,
      month,
      year
    });

    // Allow regeneration - we'll update the existing payroll instead of blocking

    // Get attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendanceRecords = await Attendance.find({
      employeeId: employee._id,
      date: { $gte: startDate, $lte: endDate }
    });

    // Group attendance by date to detect double shifts
    const attendanceByDate = {};
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = [];
      }
      attendanceByDate[dateKey].push(record);
    });

    // Calculate attendance stats
    const stats = {
      totalDays: Object.keys(attendanceByDate).length, // Unique days worked
      totalShifts: attendanceRecords.length, // Total shifts (can be > days if double shifts)
      presentDays: 0,
      halfDays: 0,
      absentDays: 0,
      lateDays: 0,
      doubleShiftDays: 0, // Days with 2 shifts
      totalWorkMinutes: 0,
      overtimeMinutes: 0
    };

    // Process each day
    Object.values(attendanceByDate).forEach(dayRecords => {
      if (dayRecords.length === 2) {
        stats.doubleShiftDays++;
      }
      
      dayRecords.forEach(record => {
        if (record.status === 'present') stats.presentDays++;
        if (record.status === 'half-day') stats.halfDays++;
        if (record.status === 'absent') stats.absentDays++;
        if (record.lateArrival.isLate) stats.lateDays++;
        
        stats.totalWorkMinutes += (record.workDuration.hours * 60 + record.workDuration.minutes);
        
        // Cap overtime at 1 hour (60 minutes) per shift
        const shiftOvertimeMinutes = record.overtime.hours * 60 + record.overtime.minutes;
        const cappedOvertimeMinutes = Math.min(shiftOvertimeMinutes, 60);
        stats.overtimeMinutes += cappedOvertimeMinutes;
      });
    });

    const totalWorkHours = stats.totalWorkMinutes / 60;
    const overtimeHours = stats.overtimeMinutes / 60;

    // Calculate salary based on actual hours worked
    let calculatedSalary = 0;
    let overtimePay = 0;

    // Get shift hours for calculation (5 hours per shift)
    const shiftHours = SHIFTS[employee.shift]?.hours || 5;

    if (employee.salary.type === 'hourly') {
      // For hourly: pay for actual hours worked (excluding overtime)
      const regularHours = totalWorkHours - overtimeHours;
      calculatedSalary = regularHours * employee.salary.amount;
      overtimePay = overtimeHours * employee.salary.amount * 1.5; // 1.5x for overtime
    } else {
      // Monthly salary - calculate based on actual hours worked
      const daysInMonth = endDate.getDate();
      const hourlyRate = employee.salary.amount / (daysInMonth * shiftHours); // Hourly rate from monthly salary
      
      // Pay for actual hours worked (excluding overtime)
      const regularHours = totalWorkHours - overtimeHours;
      calculatedSalary = regularHours * hourlyRate;
      
      // Overtime at 1.5x hourly rate
      overtimePay = overtimeHours * hourlyRate * 1.5;
    }

    const netSalary = calculatedSalary + overtimePay;

    // Create or update payroll
    const payrollData = {
      employeeId: employee._id,
      userId: employee.userId,
      month,
      year,
      period: { start: startDate, end: endDate },
      attendance: {
        totalDays: stats.totalDays,
        totalShifts: stats.totalShifts,
        presentDays: stats.presentDays,
        halfDays: stats.halfDays,
        absentDays: stats.absentDays,
        lateDays: stats.lateDays,
        doubleShiftDays: stats.doubleShiftDays
      },
      workHours: {
        expected: totalWorkHours, // Show actual hours worked as expected
        actual: totalWorkHours,
        overtime: overtimeHours
      },
      salary: {
        base: employee.salary.amount,
        type: employee.salary.type,
        calculated: calculatedSalary,
        overtime: overtimePay,
        deductions: 0,
        bonuses: 0,
        net: netSalary
      },
      status: 'calculated',
      updatedAt: new Date()
    };

    let payroll;
    let isRegeneration = false;
    if (existingPayroll) {
      isRegeneration = true;
      payroll = await Payroll.findByIdAndUpdate(
        existingPayroll._id,
        payrollData,
        { new: true }
      );
    } else {
      payroll = await Payroll.create(payrollData);
    }

    // Send email if requested
    if (sendEmail) {
      try {
        const populatedEmployee = await Employee.findById(employee._id).populate('userId', 'name email phone');
        const user = populatedEmployee.userId;
        
        if (user && user.email) {
          const { generatePayslipPDF } = require('../utils/payslipPdfmakeGenerator');
          const { sendPayslipEmail } = require('../utils/emailService');
          
          const pdfBuffer = await generatePayslipPDF(payroll, populatedEmployee, user);
          await sendPayslipEmail(user.email, payroll, populatedEmployee, user, pdfBuffer);
          
          return res.json({
            success: true,
            message: isRegeneration ? 'Payroll regenerated and emailed successfully' : 'Payroll generated and emailed successfully',
            payroll,
            isRegeneration
          });
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        return res.json({
          success: true,
          message: isRegeneration ? 'Payroll regenerated successfully, but email failed to send' : 'Payroll generated successfully, but email failed to send',
          payroll,
          isRegeneration
        });
      }
    }

    res.json({
      success: true,
      message: isRegeneration ? 'Payroll regenerated successfully' : 'Payroll generated successfully',
      payroll,
      isRegeneration
    });
  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get payroll records
exports.getPayroll = async (req, res) => {
  try {
    const { employeeId, month, year, status } = req.query;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    const filter = {};
    
    // If not admin, only show their own payroll
    if (!isAdmin) {
      const employee = await Employee.findOne({ userId });
      if (!employee) {
        // Employee record doesn't exist yet, return empty array
        return res.json({
          success: true,
          payroll: [],
          count: 0,
          message: 'No employee record found. Please contact admin to set up your employee profile.'
        });
      }
      filter.employeeId = employee._id;
    } else {
      // Admin can filter by specific employee
      if (employeeId) {
        const employee = await Employee.findOne({ employeeId });
        if (employee) {
          filter.employeeId = employee._id;
        }
      }
    }

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const payroll = await Payroll.find(filter)
      .populate({
        path: 'employeeId',
        populate: { path: 'userId', select: 'name email' }
      })
      .sort({ year: -1, month: -1 });

    res.json({
      success: true,
      payroll,
      count: payroll.length
    });
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve and pay salary
exports.paySalary = async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { paymentMethod, notes } = req.body;
    const adminId = req.user._id;

    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Salary already paid'
      });
    }

    payroll.status = 'paid';
    payroll.paidOn = new Date();
    payroll.paidBy = adminId;
    payroll.paymentMethod = paymentMethod || 'bank-transfer';
    if (notes) payroll.notes = notes;
    payroll.updatedAt = new Date();

    await payroll.save();

    res.json({
      success: true,
      message: 'Salary paid successfully',
      payroll
    });
  } catch (error) {
    console.error('Pay salary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;


// Export users to PDF (Employee access)
exports.exportUsersPDF = async (req, res) => {
  try {
    const users = await User.find({ accountStatus: 'active' }).select('name email phone role isVerified createdAt');
    
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ 
      margin: 50,
      bufferPages: true,
      autoFirstPage: true,
      size: 'A4',
      layout: 'landscape'
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=users-${new Date().toISOString().split('T')[0]}.pdf`);
    
    doc.pipe(res);
    
    // Title
    doc.fontSize(20).text('RentX - Users Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Table headers - wider columns for landscape
    const tableTop = 150;
    const col1 = 50;
    const col2 = 180;
    const col3 = 380;
    const col4 = 520;
    const col5 = 620;
    const col6 = 720;
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Name', col1, tableTop);
    doc.text('Email', col2, tableTop);
    doc.text('Phone', col3, tableTop);
    doc.text('Role', col4, tableTop);
    doc.text('Status', col5, tableTop);
    doc.text('Joined', col6, tableTop);
    
    // Draw line
    doc.moveTo(col1, tableTop + 15).lineTo(790, tableTop + 15).stroke();
    
    // Table data
    doc.fontSize(9).font('Helvetica');
    let y = tableTop + 25;
    
    users.forEach((user) => {
      if (y > 500) {
        doc.addPage();
        y = 50;
      }
      
      doc.text(user.name || 'N/A', col1, y, { width: 120, ellipsis: true });
      doc.text(user.email || 'N/A', col2, y, { width: 190, ellipsis: true });
      doc.text(user.phone || 'N/A', col3, y, { width: 130 });
      doc.text(user.role || 'user', col4, y, { width: 90 });
      doc.text(user.isVerified ? 'Verified' : 'Pending', col5, y, { width: 90 });
      doc.text(new Date(user.createdAt).toLocaleDateString(), col6, y, { width: 70 });
      
      y += 20;
    });
    
    // Footer
    doc.fontSize(8).text(`Total Users: ${users.length}`, 50, y + 20);
    
    doc.end();
  } catch (error) {
    console.error('Export users PDF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export users to Excel (Employee access)
exports.exportUsersExcel = async (req, res) => {
  try {
    const users = await User.find({ accountStatus: 'active' }).select('name email phone role isVerified createdAt');
    const ExcelJS = require('exceljs');
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RentX Employee';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Users Report');
    
    // Add title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'RentX - Users Report';
    worksheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFF97316' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;
    
    // Add subtitle
    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = `Generated on: ${new Date().toLocaleDateString()}`;
    worksheet.getCell('A2').font = { size: 12, color: { argb: 'FF6B7280' } };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;
    
    // Add headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF97316' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;
    
    // Set column widths - increased email width for printing
    worksheet.columns = [
      { key: 'name', width: 25 },
      { key: 'email', width: 40 },
      { key: 'phone', width: 15 },
      { key: 'role', width: 12 },
      { key: 'status', width: 12 },
      { key: 'joined', width: 15 }
    ];
    
    // Add data rows
    users.forEach(user => {
      const dataRow = worksheet.addRow([
        user.name || 'N/A',
        user.email || 'N/A',
        user.phone || 'N/A',
        user.role || 'user',
        user.isVerified ? 'Verified' : 'Pending',
        new Date(user.createdAt).toLocaleDateString()
      ]);
      
      dataRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      dataRow.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      
      // Set specific alignment for email column (left align for better readability)
      dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    });
    
    // Add summary row
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow(['Total Users:', users.length]);
    summaryRow.font = { bold: true };
    summaryRow.getCell(1).alignment = { horizontal: 'right' };
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=users-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export users Excel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get deleted users (Employee access)
exports.getDeletedUsers = async (req, res) => {
  try {
    const users = await User.find({ 
      accountStatus: { $ne: 'active' } 
    }).select('name email phone role accountStatus deletionRequestedAt deletionReason image createdAt');
    
    res.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Get deleted users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export deleted users to PDF (Employee access)
exports.exportDeletedUsersPDF = async (req, res) => {
  try {
    const users = await User.find({ 
      accountStatus: { $ne: 'active' } 
    }).select('name email phone role accountStatus deletionRequestedAt deletionReason');
    
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ 
      margin: 50,
      bufferPages: true,
      autoFirstPage: true
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=deleted-accounts-${new Date().toISOString().split('T')[0]}.pdf`);
    
    doc.pipe(res);
    
    // Title
    doc.fontSize(20).text('RentX - Deleted Accounts Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Table headers
    const tableTop = 150;
    const col1 = 50;
    const col2 = 150;
    const col3 = 280;
    const col4 = 380;
    const col5 = 450;
    
    doc.fontSize(10);
    doc.text('Name', col1, tableTop);
    doc.text('Email', col2, tableTop);
    doc.text('Phone', col3, tableTop);
    doc.text('Status', col4, tableTop);
    doc.text('Date', col5, tableTop);
    
    doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    // Table data
    doc.fontSize(9);
    let y = tableTop + 25;
    
    users.forEach((user) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      doc.text(user.name || 'N/A', col1, y, { width: 90, ellipsis: true });
      doc.text(user.email || 'N/A', col2, y, { width: 120, ellipsis: true });
      doc.text(user.phone || 'N/A', col3, y, { width: 90 });
      doc.text(user.accountStatus === 'pendingDeletion' ? 'Pending' : 'Deleted', col4, y, { width: 60 });
      doc.text(user.deletionRequestedAt ? new Date(user.deletionRequestedAt).toLocaleDateString() : 'N/A', col5, y, { width: 60 });
      
      y += 20;
    });
    
    doc.fontSize(8).text(`Total Deleted Accounts: ${users.length}`, 50, y + 20);
    
    doc.end();
  } catch (error) {
    console.error('Export deleted users PDF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export deleted users to Excel (Employee access)
exports.exportDeletedUsersExcel = async (req, res) => {
  try {
    const users = await User.find({ 
      accountStatus: { $ne: 'active' } 
    }).select('name email phone role accountStatus deletionRequestedAt deletionReason');
    
    const ExcelJS = require('exceljs');
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RentX Employee';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Deleted Accounts');
    
    // Add title
    worksheet.mergeCells('A1:G1');
    worksheet.getCell('A1').value = 'RentX - Deleted Accounts Report';
    worksheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFDC2626' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;
    
    // Add subtitle
    worksheet.mergeCells('A2:G2');
    worksheet.getCell('A2').value = `Generated on: ${new Date().toLocaleDateString()}`;
    worksheet.getCell('A2').font = { size: 12, color: { argb: 'FF6B7280' } };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;
    
    // Add headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(['Name', 'Email', 'Phone', 'Role', 'Status', 'Deletion Date', 'Reason']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;
    
    // Set column widths
    worksheet.columns = [
      { key: 'name', width: 25 },
      { key: 'email', width: 30 },
      { key: 'phone', width: 15 },
      { key: 'role', width: 12 },
      { key: 'status', width: 15 },
      { key: 'date', width: 15 },
      { key: 'reason', width: 40 }
    ];
    
    // Add data rows
    users.forEach(user => {
      const dataRow = worksheet.addRow([
        user.name || 'N/A',
        user.email || 'N/A',
        user.phone || 'N/A',
        user.role || 'user',
        user.accountStatus === 'pendingDeletion' ? 'Pending Deletion' : 'Deleted',
        user.deletionRequestedAt ? new Date(user.deletionRequestedAt).toLocaleDateString() : 'N/A',
        user.deletionReason || 'No reason provided'
      ]);
      
      dataRow.alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
    
    // Add summary row
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow(['Total Deleted Accounts:', users.length]);
    summaryRow.font = { bold: true };
    summaryRow.getCell(1).alignment = { horizontal: 'right' };
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=deleted-accounts-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export deleted users Excel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// Get users with employee role (for employee selection dropdown)
exports.getEmployeeRoleUsers = async (req, res) => {
  try {
    console.log('📋 Fetching employee role users...');
    
    // Get all employee records with populated user data
    const employees = await Employee.find({})
      .populate('userId', '_id name email phone image employeeShift isVerified accountStatus')
      .select('_id employeeId userId salaryType salaryAmount status');
    
    console.log(`✅ Found ${employees.length} employee records`);
    
    res.json({
      success: true,
      users: employees,
      count: employees.length
    });
  } catch (error) {
    console.error('❌ Get employee role users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate and email payslip
exports.generateAndEmailPayslip = async (req, res) => {
  try {
    const { payrollId } = req.params;

    // Get payroll with populated employee and user data
    const payroll = await Payroll.findById(payrollId)
      .populate({
        path: 'employeeId',
        populate: { path: 'userId', select: 'name email phone' }
      });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    const employee = payroll.employeeId;
    const user = employee.userId;

    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: 'Employee email not found'
      });
    }

    // Generate PDF
    const { generatePayslipPDF } = require('../utils/payslipPdfmakeGenerator');
    const pdfBuffer = await generatePayslipPDF(payroll, employee, user);

    // Send email with PDF attachment
    const { sendPayslipEmail } = require('../utils/emailService');
    await sendPayslipEmail(user.email, payroll, employee, user, pdfBuffer);

    res.json({
      success: true,
      message: `Payslip generated and emailed to ${user.email}`,
      payrollId: payroll._id
    });
  } catch (error) {
    console.error('❌ Generate and email payslip error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Download payslip PDF
exports.downloadPayslip = async (req, res) => {
  try {
    const { payrollId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Get payroll with populated employee and user data
    const payroll = await Payroll.findById(payrollId)
      .populate({
        path: 'employeeId',
        populate: { path: 'userId', select: 'name email phone' }
      });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    // Check if user has permission to download this payslip
    if (!isAdmin && payroll.employeeId.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only download your own payslips.'
      });
    }

    const employee = payroll.employeeId;
    const user = employee.userId;

    // Generate PDF
    const { generatePayslipPDF } = require('../utils/payslipPdfmakeGenerator');
    const pdfBuffer = await generatePayslipPDF(payroll, employee, user);

    // Set response headers for PDF download
    const getMonthName = (month) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
      return months[month - 1];
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=RentX-Payslip-${employee.employeeId}-${getMonthName(payroll.month)}-${payroll.year}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer, 'binary');
  } catch (error) {
    console.error('❌ Download payslip error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Employee Account Deletion Request Management
const EmployeeAccountDeletionRequest = require('../models/employeeAccountDeletionRequest');

const requestAccountDeletion = async (req, res) => {
  try {
    const { reason } = req.body;
    const employeeId = req.user._id;

    if (!reason || !reason.trim()) {
      return res.json({ success: false, message: 'Reason is required' });
    }

    // Check if user is employee
    if (req.user.role !== 'employee') {
      return res.json({ success: false, message: 'Only employees can request account deletion' });
    }

    // Check if there's already a pending request
    const existingRequest = await EmployeeAccountDeletionRequest.findOne({
      employeeId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.json({ 
        success: false, 
        message: 'You already have a pending account deletion request' 
      });
    }

    // Create new deletion request
    const deletionRequest = await EmployeeAccountDeletionRequest.create({
      employeeId,
      reason: reason.trim()
    });

    res.json({ 
      success: true, 
      message: 'Account deletion request submitted successfully. Admin will review your request.',
      request: deletionRequest
    });
  } catch (error) {
    console.error('Request account deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit deletion request' 
    });
  }
};

const getMyDeletionRequest = async (req, res) => {
  try {
    const employeeId = req.user._id;

    const request = await EmployeeAccountDeletionRequest.findOne({
      employeeId,
      status: 'pending'
    }).populate('reviewedBy', 'name email');

    res.json({ 
      success: true, 
      request 
    });
  } catch (error) {
    console.error('Get deletion request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch deletion request' 
    });
  }
};

const cancelMyDeletionRequest = async (req, res) => {
  try {
    const employeeId = req.user._id;

    const request = await EmployeeAccountDeletionRequest.findOne({
      employeeId,
      status: 'pending'
    });

    if (!request) {
      return res.json({ 
        success: false, 
        message: 'No pending deletion request found' 
      });
    }

    await EmployeeAccountDeletionRequest.findByIdAndDelete(request._id);

    res.json({ 
      success: true, 
      message: 'Account deletion request cancelled successfully' 
    });
  } catch (error) {
    console.error('Cancel deletion request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel deletion request' 
    });
  }
};

// Add to existing exports
exports.requestAccountDeletion = requestAccountDeletion;
exports.getMyDeletionRequest = getMyDeletionRequest;
exports.cancelMyDeletionRequest = cancelMyDeletionRequest;

