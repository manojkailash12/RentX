const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  preferredCategories: [{
    type: String
  }],
  preferredFuelTypes: [{
    type: String
  }],
  preferredTransmission: [{
    type: String
  }],
  priceRange: {
    min: Number,
    max: Number
  },
  preferredSeatingCapacity: [{
    type: Number
  }],
  preferredLocations: [{
    type: String
  }],
  bookingHistory: [{
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car'
    },
    category: String,
    fuelType: String,
    transmission: String,
    pricePerDay: Number,
    bookedAt: Date
  }],
  searchHistory: [{
    category: String,
    location: String,
    priceRange: {
      min: Number,
      max: Number
    },
    searchedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const UserPreference = mongoose.models.UserPreference || mongoose.model('UserPreference', userPreferenceSchema);

module.exports = UserPreference;
