const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['sedan', 'suv', 'hatchback', 'luxury', 'economy'],
    required: true
  },
  seats: {
    type: Number,
    required: true
  },
  transmission: {
    type: String,
    enum: ['manual', 'automatic'],
    required: true
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'electric', 'hybrid'],
    required: true
  },
  pricePerDay: {
    type: Number,
    required: true
  },
  pricePerKm: {
    type: Number,
    required: true
  },
  images: [{
    type: String
  }],
  features: [{
    type: String
  }],
  location: {
    city: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  availability: {
    type: Boolean,
    default: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  insuranceDetails: {
    provider: String,
    policyNumber: String,
    expiryDate: Date
  },
  // Vehicle Documents
  documents: {
    rcBook: {
      type: String, // URL to RC book image
      required: false // Made optional, will be handled in route validation
    },
    registrationCertificate: {
      type: String, // URL to registration certificate
      required: false // Made optional, will be handled in route validation
    },
    insuranceCertificate: {
      type: String, // URL to insurance certificate
    },
    pollutionCertificate: {
      type: String // URL to pollution certificate
    }
  },
  // Vehicle Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: String,
  // Commission tracking
  commissionRate: {
    type: Number,
    default: 200 // Rs 200 per booking
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalBookings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Car', carSchema);