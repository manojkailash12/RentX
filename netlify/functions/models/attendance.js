const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'night'],
    required: true
  },
  expectedShiftTiming: {
    start: String, // "09:00"
    end: String    // "17:00"
  },
  checkIn: {
    time: Date,
    method: {
      type: String,
      enum: ['manual', 'faceId'],
      default: 'manual'
    },
    location: String,
    ipAddress: String
  },
  checkOut: {
    time: Date,
    method: {
      type: String,
      enum: ['manual', 'faceId'],
      default: 'manual'
    },
    location: String,
    ipAddress: String
  },
  status: {
    type: String,
    enum: ['present', 'half-day', 'absent', 'late', 'on-leave'],
    default: 'present'
  },
  workDuration: {
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 }
  },
  lateArrival: {
    isLate: { type: Boolean, default: false },
    lateBy: { type: Number, default: 0 }, // minutes
    compensated: { type: Boolean, default: false },
    compensationEndTime: Date
  },
  earlyLeave: {
    isEarly: { type: Boolean, default: false },
    earlyBy: { type: Number, default: 0 }, // minutes
    reason: String
  },
  overtime: {
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 }
  },
  notes: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
attendanceSchema.index({ employeeId: 1, date: 1, shift: 1 }, { unique: true });
attendanceSchema.index({ userId: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
