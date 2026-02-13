const mongoose = require('mongoose');

const biometricDeviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  deviceName: {
    type: String,
    required: true
  },
  deviceType: {
    type: String,
    enum: ['fingerprint', 'face', 'iris', 'palm'],
    default: 'fingerprint'
  },
  location: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  lastSync: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const BiometricDevice = mongoose.models.BiometricDevice || mongoose.model('BiometricDevice', biometricDeviceSchema);

module.exports = BiometricDevice;
