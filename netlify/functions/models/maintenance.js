const mongoose = require('mongoose');

const maintenanceAlertSchema = new mongoose.Schema({
  carId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  alertType: {
    type: String,
    enum: ['oil_change', 'tire_rotation', 'brake_inspection', 'battery_check', 'engine_diagnostic', 'general_service'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  predictedDate: {
    type: Date,
    required: true
  },
  mileage: {
    type: Number,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'scheduled', 'completed', 'dismissed'],
    default: 'pending'
  },
  completedAt: Date,
  notes: String
}, { timestamps: true });

module.exports = mongoose.model('MaintenanceAlert', maintenanceAlertSchema);
