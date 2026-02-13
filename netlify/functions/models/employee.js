const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  employeeId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon'],
    required: true
  },
  shiftTiming: {
    start: { type: String, required: true }, // "09:00"
    end: { type: String, required: true }     // "14:00"
  },
  salary: {
    type: {
      type: String,
      enum: ['hourly', 'monthly'],
      default: 'hourly'
    },
    amount: { type: Number }, // Made optional - admin adds this later
    currency: { type: String, default: 'INR' }
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active'
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
// Note: userId and employeeId already have unique: true which creates indexes automatically
employeeSchema.index({ status: 1 });
employeeSchema.index({ shift: 1 });

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);

module.exports = Employee;
