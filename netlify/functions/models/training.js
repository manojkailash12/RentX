const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['technical', 'soft-skills', 'safety', 'compliance', 'customer-service', 'management'],
    required: true
  },
  duration: {
    hours: Number,
    minutes: Number
  },
  provider: String,
  cost: Number,
  maxParticipants: Number,
  schedule: {
    startDate: Date,
    endDate: Date,
    sessions: [{
      date: Date,
      startTime: String,
      endTime: String,
      location: String
    }]
  },
  materials: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['document', 'video', 'link', 'presentation']
    }
  }],
  certification: {
    provided: {
      type: Boolean,
      default: false
    },
    name: String,
    validityPeriod: Number, // in months
    issuingAuthority: String
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Training = mongoose.models.Training || mongoose.model('Training', trainingSchema);

module.exports = Training;
