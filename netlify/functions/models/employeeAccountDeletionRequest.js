const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const employeeAccountDeletionRequestSchema = new mongoose.Schema({
  employeeId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  }
}, { timestamps: true });

const EmployeeAccountDeletionRequest = mongoose.models.EmployeeAccountDeletionRequest || 
  mongoose.model('EmployeeAccountDeletionRequest', employeeAccountDeletionRequestSchema);

module.exports = EmployeeAccountDeletionRequest;
