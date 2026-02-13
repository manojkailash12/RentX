const BiometricDevice = require('../models/biometricDevice');
const BiometricTemplate = require('../models/biometricTemplate');
const Employee = require('../models/employee');
const Attendance = require('../models/attendance');

// Register biometric device
exports.registerDevice = async (req, res) => {
  try {
    const { deviceId, deviceName, deviceType, location, ipAddress } = req.body;

    const existingDevice = await BiometricDevice.findOne({ deviceId });
    if (existingDevice) {
      return res.status(400).json({
        success: false,
        message: 'Device already registered'
      });
    }

    const device = await BiometricDevice.create({
      deviceId,
      deviceName,
      deviceType,
      location,
      ipAddress,
      lastSync: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Biometric device registered successfully',
      device
    });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Enroll biometric template
exports.enrollBiometric = async (req, res) => {
  try {
    const { userId, biometricType, templateData, quality } = req.body;

    const employee = await Employee.findOne({ userId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if template already exists
    const existingTemplate = await BiometricTemplate.findOne({
      userId,
      biometricType,
      isActive: true
    });

    if (existingTemplate) {
      // Update existing template
      existingTemplate.templateData = templateData;
      existingTemplate.quality = quality;
      existingTemplate.enrolledAt = new Date();
      await existingTemplate.save();

      return res.json({
        success: true,
        message: 'Biometric template updated successfully',
        template: existingTemplate
      });
    }

    // Create new template
    const template = await BiometricTemplate.create({
      userId,
      employeeId: employee._id,
      biometricType,
      templateData,
      quality
    });

    res.status(201).json({
      success: true,
      message: 'Biometric enrolled successfully',
      template
    });
  } catch (error) {
    console.error('Enroll biometric error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify biometric and mark attendance
exports.verifyBiometric = async (req, res) => {
  try {
    const { deviceId, biometricType, templateData, action } = req.body;

    // Verify device
    const device = await BiometricDevice.findOne({ deviceId, status: 'active' });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found or inactive'
      });
    }

    // Find matching template (simplified matching - in production use proper biometric matching)
    const template = await BiometricTemplate.findOne({
      biometricType,
      isActive: true
    }).populate('userId employeeId');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Biometric not recognized'
      });
    }

    // Update last used
    template.lastUsed = new Date();
    await template.save();

    // Update device sync
    device.lastSync = new Date();
    await device.save();

    const employee = template.employeeId;
    const userId = template.userId._id;

    // Determine shift based on current time
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    let currentShift;
    
    if (currentHour >= 9 && currentHour < 14) {
      currentShift = 'morning';
    } else if (currentHour >= 15 && currentHour < 20) {
      currentShift = 'afternoon';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Biometric attendance only allowed during shift hours'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (action === 'checkin') {
      // Check if already checked in
      const existingAttendance = await Attendance.findOne({
        employeeId: employee._id,
        date: today,
        shift: currentShift
      });

      if (existingAttendance && existingAttendance.checkIn) {
        return res.status(400).json({
          success: false,
          message: 'Already checked in for this shift'
        });
      }

      // Create attendance record
      const SHIFTS = {
        morning: { start: '09:00', end: '14:00' },
        afternoon: { start: '15:00', end: '20:00' }
      };

      const shiftTiming = SHIFTS[currentShift];
      const [startHour, startMinute] = shiftTiming.start.split(':').map(Number);
      const workStartTime = new Date(currentTime);
      workStartTime.setHours(startHour, startMinute, 0, 0);

      const isLate = currentTime > workStartTime;
      const lateBy = isLate ? Math.floor((currentTime - workStartTime) / (1000 * 60)) : 0;

      const attendance = await Attendance.create({
        employeeId: employee._id,
        userId,
        date: today,
        shift: currentShift,
        expectedShiftTiming: shiftTiming,
        checkIn: {
          time: currentTime,
          method: 'biometric',
          location: device.location,
          ipAddress: device.ipAddress
        },
        lateArrival: {
          isLate,
          lateBy,
          compensated: false
        },
        status: isLate ? 'late' : 'present'
      });

      return res.json({
        success: true,
        message: `Check-in successful via ${biometricType}`,
        attendance,
        employee: {
          name: template.userId.name,
          employeeId: employee.employeeId
        }
      });
    } else if (action === 'checkout') {
      // Find today's attendance
      const attendance = await Attendance.findOne({
        employeeId: employee._id,
        date: today,
        shift: currentShift
      });

      if (!attendance || !attendance.checkIn) {
        return res.status(400).json({
          success: false,
          message: 'No check-in record found'
        });
      }

      if (attendance.checkOut) {
        return res.status(400).json({
          success: false,
          message: 'Already checked out'
        });
      }

      // Calculate work duration
      const workDurationMs = currentTime - attendance.checkIn.time;
      const totalMinutes = Math.floor(workDurationMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      attendance.checkOut = {
        time: currentTime,
        method: 'biometric',
        location: device.location,
        ipAddress: device.ipAddress
      };
      attendance.workDuration = { hours, minutes };
      attendance.updatedAt = currentTime;

      await attendance.save();

      return res.json({
        success: true,
        message: `Check-out successful via ${biometricType}`,
        attendance,
        employee: {
          name: template.userId.name,
          employeeId: employee.employeeId
        }
      });
    }

    res.status(400).json({
      success: false,
      message: 'Invalid action'
    });
  } catch (error) {
    console.error('Verify biometric error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all devices
exports.getDevices = async (req, res) => {
  try {
    const devices = await BiometricDevice.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      devices
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employee biometric templates
exports.getEmployeeTemplates = async (req, res) => {
  try {
    const { userId } = req.params;

    const templates = await BiometricTemplate.find({ userId, isActive: true })
      .populate('userId', 'name email')
      .populate('employeeId', 'employeeId');

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
