const mongoose = require('mongoose');

const chargingStationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: String,
    city: String,
    state: String,
    zipCode: String
  },
  provider: String,
  chargerTypes: [{
    type: String,
    enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Tesla']
  }],
  powerOutput: Number,
  availablePlugs: {
    type: Number,
    default: 0
  },
  totalPlugs: {
    type: Number,
    required: true
  },
  pricing: {
    perKwh: Number,
    perMinute: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  amenities: [String],
  operatingHours: {
    open: String,
    close: String,
    is24Hours: Boolean
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'offline'],
    default: 'active'
  },
  rating: {
    type: Number,
    default: 0
  },
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: Number,
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

chargingStationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ChargingStation', chargingStationSchema);
