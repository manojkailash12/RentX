const mongoose = require('mongoose');

const biometricTemplateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  biometricType: {
    type: String,
    enum: ['fingerprint', 'face', 'iris', 'palm'],
    required: true
  },
  templateData: {
    type: String, // Base64 encoded biometric template
    required: true
  },
  quality: {
    type: Number,
    min: 0,
    max: 100
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

biometricTemplateSchema.index({ userId: 1, biometricType: 1 });

const BiometricTemplate = mongoose.models.BiometricTemplate || mongoose.model('BiometricTemplate', biometricTemplateSchema);

module.exports = BiometricTemplate;
