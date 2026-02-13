const mongoose = require("mongoose");
const Attendance = require("../models/attendance");
const Employee = require("../models/employee");
const User = require("../models/user");

// @desc Employee Self Check-in
// @route POST /api/employee-attendance/checkin
// @access Private (Employee)
const employeeCheckIn = async (req, res) => {
  const { userId, attendanceMethod, location, ipAddress } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Get employee details
    let employee = await Employee.findOne({ userId }).populate('userId');
    
    // If employee record doesn't exist, try to create one automatically
    if (!employee) {
      console.log(`Employee record not found for userId: ${userId}, attempting to create...`);
      
      // Verify user exists and has employee role
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          message: "User not found",
          userId: userId
        });
      }
      
      if (user.role !== 'employee') {
        return res.status(403).json({ 
          message: "User is not an employee. Only employees can check in.",
          userRole: user.role
        });
      }
      
      // Auto-create employee record with default values
      try {
        // Get the next employee ID
        const Counter = require('../models/counter.js');
        let counter = await Counter.findOne({ name: 'employeeId' });
        if (!counter) {
          counter = await Counter.create({ name: 'employeeId', value: 1000 });
        }
        
        const employeeId = `EMP${String(counter.value).padStart(4, '0')}`;
        await Counter.findOneAndUpdate(
          { name: 'employeeId' },
          { $inc: { value: 1 } }
        );
        
        employee = await Employee.create({
          userId: userId,
          employeeId: employeeId,
          department: 'General',
          position: 'Staff',
          shift: 'morning',
          shiftTiming: {
            start: '09:00',
            end: '14:00'
          },
          salary: 0,
          status: 'active',
          joiningDate: new Date()
        });
        
        employee = await Employee.findById(employee._id).populate('userId');
        console.log(`✅ Auto-created employee record: ${employeeId} for user ${user.name}`);
      } catch (createError) {
        console.error('Error auto-creating employee record:', createError);
        return res.status(500).json({ 
          message: "Failed to create employee record. Please contact administrator.",
          error: createError.message
        });
      }
    }

    if (employee.status !== 'active') {
      return res.status(403).json({ message: "Employee account is not active" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    // Determine which shift they're checking in for based on current time
    const currentHour = now.getHours();
    let currentShift = employee.shift; // Default to their assigned shift
    
    // Auto-detect shift based on time
    if (currentHour >= 9 && currentHour < 14) {
      currentShift = 'morning';
    } else if (currentHour >= 15 && currentHour < 20) {
      currentShift = 'afternoon';
    }

    // Check if attendance already exists for today AND this shift
    const existingAttendance = await Attendance.findOne({
      employeeId: employee._id,
      date: today,
      shift: currentShift
    });

    if (existingAttendance && existingAttendance.checkIn?.time) {
      return res.status(409).json({ 
        message: `Already checked in for ${currentShift} shift today`,
        attendance: existingAttendance
      });
    }

    // Get shift timing for the current shift
    const SHIFTS = {
      morning: { start: '09:00', end: '14:00' },
      afternoon: { start: '15:00', end: '20:00' }
    };
    
    const shiftTiming = SHIFTS[currentShift];
    const shiftStart = shiftTiming.start;
    const shiftEnd = shiftTiming.end;
    const [startHour, startMinute] = shiftStart.split(':').map(Number);
    const [endHour, endMinute] = shiftEnd.split(':').map(Number);
    
    const workStartTime = new Date(now);
    workStartTime.setHours(startHour, startMinute, 0, 0);
    
    const workEndTime = new Date(now);
    workEndTime.setHours(endHour, endMinute, 0, 0);
    
    // Prevent check-in after shift end time
    if (now > workEndTime) {
      return res.status(400).json({ 
        message: `Cannot check in after shift end time (${shiftEnd}). Your shift has already ended.`,
        shiftTiming: employee.shiftTiming
      });
    }
    
    let status = 'present';
    let isLate = false;
    let lateBy = 0;

    if (now > workStartTime) {
      const lateThreshold = new Date(workStartTime);
      lateThreshold.setMinutes(lateThreshold.getMinutes() + 15); // 15 minutes grace period
      
      if (now > lateThreshold) {
        status = 'late';
        isLate = true;
        lateBy = Math.floor((now - workStartTime) / (1000 * 60)); // minutes late
      }
    }

    const attendanceData = {
      employeeId: employee._id,
      userId: employee.userId._id,
      date: today,
      shift: currentShift, // Use detected shift
      expectedShiftTiming: shiftTiming,
      checkIn: {
        time: now,
        method: attendanceMethod || 'manual',
        location: location || null,
        ipAddress: ipAddress || null
      },
      status,
      lateArrival: {
        isLate,
        lateBy,
        compensated: false
      }
    };

    let attendance;
    if (existingAttendance) {
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        attendanceData,
        { new: true }
      ).populate('userId', 'name email');
    } else {
      attendance = await Attendance.create(attendanceData);
      attendance = await Attendance.findById(attendance._id).populate('userId', 'name email');
    }

    res.status(201).json({
      message: `Successfully checked in at ${now.toLocaleTimeString()}`,
      attendance,
      status,
      isLate,
      lateBy
    });
  } catch (error) {
    console.error('Error in employee check-in:', error);
    res.status(500).json({ message: "Error marking attendance", error: error.message });
  }
};

// @desc Employee Self Check-out
// @route PUT /api/employee-attendance/checkout
// @access Private (Employee)
const employeeCheckOut = async (req, res) => {
  const { userId, notes, ipAddress } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const employee = await Employee.findOne({ userId });
    if (!employee) {
      console.error(`Employee record not found for userId: ${userId}`);
      return res.status(404).json({ 
        message: "Employee record not found. Please contact your administrator to set up your employee profile.",
        userId: userId
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    // Determine current shift based on time
    const currentHour = now.getHours();
    let currentShift = employee.shift;
    
    if (currentHour >= 9 && currentHour < 14) {
      currentShift = 'morning';
    } else if (currentHour >= 15 && currentHour < 20) {
      currentShift = 'afternoon';
    }

    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      date: today,
      shift: currentShift
    });

    if (!attendance) {
      return res.status(404).json({ message: "No check-in record found for today" });
    }

    if (attendance.checkOut?.time) {
      return res.status(409).json({ 
        message: "Already checked out today",
        attendance
      });
    }

    // Calculate work duration
    const checkInTime = attendance.checkIn.time;
    const workDurationMs = now - checkInTime;
    const totalMinutes = Math.floor(workDurationMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Determine if it's early leave
    const shiftEnd = employee.shiftTiming.end; // "14:00"
    const [endHour, endMinute] = shiftEnd.split(':').map(Number);
    
    const expectedEndTime = new Date(now);
    expectedEndTime.setHours(endHour, endMinute, 0, 0);
    
    let isEarly = false;
    let earlyBy = 0;
    let finalStatus = attendance.status;

    if (now < expectedEndTime) {
      isEarly = true;
      earlyBy = Math.floor((expectedEndTime - now) / (1000 * 60));
      
      // If leaving more than 2 hours early, mark as half-day
      if (earlyBy > 120) {
        finalStatus = 'half-day';
      }
    }

    // Calculate overtime
    let overtimeHours = 0;
    let overtimeMinutes = 0;
    if (now > expectedEndTime) {
      const overtimeMs = now - expectedEndTime;
      const overtimeTotalMinutes = Math.floor(overtimeMs / (1000 * 60));
      overtimeHours = Math.floor(overtimeTotalMinutes / 60);
      overtimeMinutes = overtimeTotalMinutes % 60;
    }

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        checkOut: {
          time: now,
          method: 'manual',
          ipAddress: ipAddress || null
        },
        workDuration: {
          hours,
          minutes
        },
        earlyLeave: {
          isEarly,
          earlyBy,
          reason: notes || null
        },
        overtime: {
          hours: overtimeHours,
          minutes: overtimeMinutes
        },
        status: finalStatus,
        notes: notes || attendance.notes,
        updatedAt: now
      },
      { new: true }
    ).populate('userId', 'name email');

    res.json({
      message: `Successfully checked out at ${now.toLocaleTimeString()}`,
      attendance: updatedAttendance,
      workDuration: { hours, minutes },
      status: finalStatus,
      isHalfDay: finalStatus === 'half-day',
      overtime: { hours: overtimeHours, minutes: overtimeMinutes }
    });
  } catch (error) {
    console.error('Error in employee checkout:', error);
    res.status(500).json({ message: "Error checking out", error: error.message });
  }
};

// @desc Get Employee Attendance History
// @route GET /api/employee-attendance/history/:userId
// @access Private (Employee)
const getEmployeeAttendanceHistory = async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate, month, year } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const employee = await Employee.findOne({ userId });
    if (!employee) {
      console.error(`Employee record not found for userId: ${userId}`);
      return res.status(404).json({ 
        message: "Employee record not found. Please contact your administrator to set up your employee profile.",
        userId: userId
      });
    }

    let dateFilter = {};
    if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      dateFilter = {
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      };
    } else if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateFilter = {
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      };
    }

    const attendance = await Attendance.find({
      employeeId: employee._id,
      ...dateFilter
    })
      .populate('userId', 'name email')
      .populate('approvedBy', 'name')
      .sort({ date: -1 });

    // Calculate statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => ['present', 'late'].includes(a.status)).length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    const leaveDays = attendance.filter(a => a.status === 'on-leave').length;
    const halfDays = attendance.filter(a => a.status === 'half-day').length;

    const totalWorkingHours = attendance.reduce((sum, a) => {
      return sum + (a.workDuration?.hours || 0) + (a.workDuration?.minutes || 0) / 60;
    }, 0);

    const totalOvertimeHours = attendance.reduce((sum, a) => {
      return sum + (a.overtime?.hours || 0) + (a.overtime?.minutes || 0) / 60;
    }, 0);

    const averageWorkingHours = totalDays > 0 ? totalWorkingHours / totalDays : 0;

    res.json({
      attendance,
      statistics: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        halfDays,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        averageWorkingHours: Math.round(averageWorkingHours * 100) / 100,
        attendancePercentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ message: "Error fetching attendance history", error: error.message });
  }
};

// @desc Get Today's Attendance Status
// @route GET /api/employee-attendance/today/:userId
// @access Private (Employee)
const getTodayAttendanceStatus = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    let employee = await Employee.findOne({ userId }).populate('userId', 'name email');
    
    // If employee record doesn't exist, try to create one automatically
    if (!employee) {
      console.log(`Employee record not found for userId: ${userId}, attempting to create...`);
      
      // Verify user exists and has employee role
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          message: "User not found",
          userId: userId
        });
      }
      
      if (user.role !== 'employee') {
        return res.status(403).json({ 
          message: "User is not an employee. Only employees can access attendance.",
          userRole: user.role
        });
      }
      
      // Auto-create employee record with default values
      try {
        // Get the next employee ID
        const Counter = require('../models/counter.js');
        let counter = await Counter.findOne({ name: 'employeeId' });
        if (!counter) {
          counter = await Counter.create({ name: 'employeeId', value: 1000 });
        }
        
        const employeeId = `EMP${String(counter.value).padStart(4, '0')}`;
        await Counter.findOneAndUpdate(
          { name: 'employeeId' },
          { $inc: { value: 1 } }
        );
        
        employee = await Employee.create({
          userId: userId,
          employeeId: employeeId,
          department: 'General',
          position: 'Staff',
          shift: 'morning',
          shiftTiming: {
            start: '09:00',
            end: '14:00'
          },
          salary: 0,
          status: 'active',
          joiningDate: new Date()
        });
        
        employee = await Employee.findById(employee._id).populate('userId', 'name email');
        console.log(`✅ Auto-created employee record: ${employeeId} for user ${user.name}`);
      } catch (createError) {
        console.error('Error auto-creating employee record:', createError);
        return res.status(500).json({ 
          message: "Failed to create employee record. Please contact administrator.",
          error: createError.message
        });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    // Determine current shift based on time
    const currentHour = now.getHours();
    let currentShift = employee.shift;
    
    if (currentHour >= 9 && currentHour < 14) {
      currentShift = 'morning';
    } else if (currentHour >= 15 && currentHour < 20) {
      currentShift = 'afternoon';
    }

    // Find attendance for today and current shift
    const todayAttendance = await Attendance.findOne({
      employeeId: employee._id,
      date: today,
      shift: currentShift
    }).populate('approvedBy', 'name');

    res.json({
      employee: {
        name: employee.userId.name,
        email: employee.userId.email,
        employeeId: employee.employeeId,
        shift: employee.shift,
        shiftTiming: employee.shiftTiming
      },
      today: today,
      currentShift: currentShift,
      attendance: todayAttendance,
      hasCheckedIn: !!todayAttendance?.checkIn?.time,
      hasCheckedOut: !!todayAttendance?.checkOut?.time,
      canCheckIn: !todayAttendance?.checkIn?.time,
      canCheckOut: !!todayAttendance?.checkIn?.time && !todayAttendance?.checkOut?.time
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({ message: "Error fetching today's attendance", error: error.message });
  }
};

module.exports = {
  employeeCheckIn,
  employeeCheckOut,
  getEmployeeAttendanceHistory,
  getTodayAttendanceStatus
};
