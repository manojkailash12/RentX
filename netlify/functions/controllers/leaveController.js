const Leave = require('../models/leave');
const Employee = require('../models/employee');
const User = require('../models/user');

// @desc Create a new leave request
// @route POST /api/leave/request
// @access Private (Employee)
exports.createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, notes } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, end date, and reason are required'
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

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    // Calculate total days
    const timeDiff = end.getTime() - start.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    // Check for overlapping leave requests
    const overlappingLeave = await Leave.findOne({
      employeeId: employee._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlappingLeave) {
      return res.status(400).json({
        success: false,
        message: 'You already have a leave request for overlapping dates'
      });
    }

    // Create leave request
    const leave = await Leave.create({
      employeeId: employee._id,
      userId,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      notes,
      status: 'pending'
    });

    const populatedLeave = await Leave.findById(leave._id)
      .populate('userId', 'name email')
      .populate('employeeId');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      leave: populatedLeave
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get employee's own leave requests
// @route GET /api/leave/my-requests
// @access Private (Employee)
exports.getMyLeaveRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, startDate, endDate } = req.query;

    const filter = { userId };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const leaves = await Leave.find(filter)
      .populate('userId', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    // Calculate leave statistics
    const stats = {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      cancelled: leaves.filter(l => l.status === 'cancelled').length,
      totalDaysRequested: leaves.reduce((sum, l) => sum + l.totalDays, 0),
      totalDaysApproved: leaves.filter(l => l.status === 'approved').reduce((sum, l) => sum + l.totalDays, 0)
    };

    res.json({
      success: true,
      leaves,
      stats,
      count: leaves.length
    });
  } catch (error) {
    console.error('Get my leave requests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all leave requests (Admin/Manager)
// @route GET /api/leave/all
// @access Private (Admin/Employee with permissions)
exports.getAllLeaveRequests = async (req, res) => {
  try {
    const { status, leaveType, employeeId, startDate, endDate } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;
    
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        filter.employeeId = employee._id;
      }
    }

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const leaves = await Leave.find(filter)
      .populate('userId', 'name email phone')
      .populate('employeeId')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      leaves,
      count: leaves.length
    });
  } catch (error) {
    console.error('Get all leave requests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get single leave request
// @route GET /api/leave/:leaveId
// @access Private
exports.getLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;

    const leave = await Leave.findById(leaveId)
      .populate('userId', 'name email phone')
      .populate('employeeId')
      .populate('approvedBy', 'name email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check if user has permission to view this leave
    const isOwner = leave.userId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'employee';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this leave request'
      });
    }

    res.json({
      success: true,
      leave
    });
  } catch (error) {
    console.error('Get leave request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update leave request (before approval)
// @route PUT /api/leave/:leaveId
// @access Private (Employee - own requests only)
exports.updateLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { leaveType, startDate, endDate, reason, notes } = req.body;
    const userId = req.user._id;

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check ownership
    if (leave.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this leave request'
      });
    }

    // Can only update pending requests
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot update ${leave.status} leave request`
      });
    }

    // Update fields
    if (leaveType) leave.leaveType = leaveType;
    if (reason) leave.reason = reason;
    if (notes !== undefined) leave.notes = notes;

    // Update dates if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : leave.startDate;
      const end = endDate ? new Date(endDate) : leave.endDate;

      if (end < start) {
        return res.status(400).json({
          success: false,
          message: 'End date cannot be before start date'
        });
      }

      leave.startDate = start;
      leave.endDate = end;
      
      // Recalculate total days
      const timeDiff = end.getTime() - start.getTime();
      leave.totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    }

    await leave.save();

    const updatedLeave = await Leave.findById(leave._id)
      .populate('userId', 'name email')
      .populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: 'Leave request updated successfully',
      leave: updatedLeave
    });
  } catch (error) {
    console.error('Update leave request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Cancel leave request
// @route POST /api/leave/:leaveId/cancel
// @access Private (Employee - own requests only)
exports.cancelLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const userId = req.user._id;

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check ownership
    if (leave.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this leave request'
      });
    }

    // Can only cancel pending or approved requests
    if (!['pending', 'approved'].includes(leave.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel ${leave.status} leave request`
      });
    }

    leave.status = 'cancelled';
    await leave.save();

    const updatedLeave = await Leave.findById(leave._id)
      .populate('userId', 'name email')
      .populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: 'Leave request cancelled successfully',
      leave: updatedLeave
    });
  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Approve or reject leave request
// @route POST /api/leave/:leaveId/review
// @access Private (Admin/Employee with permissions)
exports.reviewLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { action, rejectionReason } = req.body;
    const adminId = req.user._id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot review ${leave.status} leave request`
      });
    }

    if (action === 'approve') {
      leave.status = 'approved';
      leave.approvedBy = adminId;
      leave.approvedAt = new Date();
    } else {
      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }
      leave.status = 'rejected';
      leave.approvedBy = adminId;
      leave.approvedAt = new Date();
      leave.rejectionReason = rejectionReason;
    }

    await leave.save();

    const updatedLeave = await Leave.findById(leave._id)
      .populate('userId', 'name email')
      .populate('employeeId')
      .populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: `Leave request ${action}d successfully`,
      leave: updatedLeave
    });
  } catch (error) {
    console.error('Review leave request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get leave balance/statistics for an employee
// @route GET /api/leave/balance
// @access Private (Employee)
exports.getLeaveBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentYear = new Date().getFullYear();

    const employee = await Employee.findOne({ userId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    // Get all approved leaves for current year
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const approvedLeaves = await Leave.find({
      employeeId: employee._id,
      status: 'approved',
      startDate: { $gte: startOfYear, $lte: endOfYear }
    });

    // Calculate leave balance by type
    const leaveBalance = {
      sick: { taken: 0, total: 10 },
      casual: { taken: 0, total: 12 },
      annual: { taken: 0, total: 15 },
      unpaid: { taken: 0, total: 0 },
      emergency: { taken: 0, total: 5 },
      maternity: { taken: 0, total: 90 },
      paternity: { taken: 0, total: 15 }
    };

    approvedLeaves.forEach(leave => {
      if (leaveBalance[leave.leaveType]) {
        leaveBalance[leave.leaveType].taken += leave.totalDays;
      }
    });

    // Calculate remaining
    Object.keys(leaveBalance).forEach(type => {
      if (leaveBalance[type].total > 0) {
        leaveBalance[type].remaining = leaveBalance[type].total - leaveBalance[type].taken;
      } else {
        leaveBalance[type].remaining = 'Unlimited';
      }
    });

    res.json({
      success: true,
      year: currentYear,
      leaveBalance,
      totalApprovedLeaves: approvedLeaves.length,
      totalDaysTaken: approvedLeaves.reduce((sum, l) => sum + l.totalDays, 0)
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
