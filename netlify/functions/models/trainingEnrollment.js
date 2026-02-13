const mongoose = require('mongoose');

const trainingEnrollmentSchema = new mongoose.Schema({
  trainingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Training',
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['enrolled', 'in-progress', 'completed', 'failed', 'dropped'],
    default: 'enrolled'
  },
  attendance: [{
    sessionDate: Date,
    present: Boolean,
    remarks: String
  }],
  assessment: {
    score: Number,
    maxScore: Number,
    passed: Boolean,
    attemptDate: Date,
    feedback: String
  },
  certification: {
    issued: {
      type: Boolean,
      default: false
    },
    certificateNumber: String,
    issuedDate: Date,
    expiryDate: Date,
    certificateUrl: String
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    submittedAt: Date
  },
  completedAt: Date
});

trainingEnrollmentSchema.index({ trainingId: 1, employeeId: 1 }, { unique: true });

const TrainingEnrollment = mongoose.models.TrainingEnrollment || mongoose.model('TrainingEnrollment', trainingEnrollmentSchema);

module.exports = TrainingEnrollment;
