const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
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
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  period: {
    start: Date,
    end: Date
  },
  attendance: {
    totalDays: { type: Number, default: 0 },
    totalShifts: { type: Number, default: 0 }, // Total shifts worked (can be > days)
    presentDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    doubleShiftDays: { type: Number, default: 0 } // Days with 2 shifts
  },
  workHours: {
    expected: { type: Number, default: 0 },
    actual: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 }
  },
  salary: {
    base: { type: Number, required: true },
    type: {
      type: String,
      enum: ['hourly', 'monthly'],
      required: true
    },
    calculated: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    bonuses: { type: Number, default: 0 },
    net: { type: Number, default: 0 }
  },
  deductions: [{
    reason: String,
    amount: Number,
    date: Date
  }],
  bonuses: [{
    reason: String,
    amount: Number,
    date: Date
  }],
  status: {
    type: String,
    enum: ['draft', 'calculated', 'approved', 'paid'],
    default: 'draft'
  },
  paidOn: Date,
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank-transfer', 'cheque', 'upi'],
    default: 'bank-transfer'
  },
  notes: String,
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
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ userId: 1 });
payrollSchema.index({ status: 1 });
payrollSchema.index({ month: 1, year: 1 });

const Payroll = mongoose.models.Payroll || mongoose.model('Payroll', payrollSchema);

module.exports = Payroll;
