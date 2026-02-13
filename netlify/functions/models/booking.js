const mongoose = require("mongoose");
const { getNextSequence } = require("./counter.js");
const { ObjectId } = mongoose.Schema.Types;

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true }, // Remove index: false - unique creates index automatically
    invoiceNumber: { type: String, unique: true }, // Remove index: false - unique creates index automatically
    carId: { type: ObjectId, ref: "Car", required: true },
    userId: { type: ObjectId, ref: "User", required: true },
    ownerId: { type: ObjectId, ref: "User", required: true },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    pickupLocation: { type: String, required: true },
    pickupCity: { type: String, required: true },
    dropLocation: { type: String, required: true },
    dropCity: { type: String, required: true },
    distance: { type: Number, required: true }, // in kilometers
    totalDays: { type: Number, required: true },
    pricingType: { 
      type: String, 
      enum: ["daily", "per_km"], 
      default: "daily" 
    },
    pricePerDay: { type: Number, required: true },
    pricePerKm: { type: Number, default: 15 }, // Fixed price per km
    totalAmount: { type: Number, required: true },
    ownerEarnings: { type: Number, required: true }, // Amount owner gets
    platformEarnings: { type: Number, default: 0 }, // Platform commission
    commissionRate: { type: Number, default: 60 }, // Platform commission percentage (60% to platform, 40% to owner)
    paymentMethod: { 
      type: String, 
      enum: ["cash", "online"], 
      required: true 
    },
    paymentStatus: {
      type: String,
      enum: ["pay_at_dropoff", "paid", "failed"],
      default: "pay_at_dropoff"
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    // Legacy field for backward compatibility
    price: { type: Number },
    // Legacy fields for backward compatibility
    car: { type: ObjectId, ref: "Car" },
    user: { type: ObjectId, ref: "User" },
    owner: { type: ObjectId, ref: "User" },
    // Car replacement fields
    isCarReplaced: { type: Boolean, default: false },
    originalCarId: { type: ObjectId, ref: "Car" },
    replacementReason: { type: String },
    replacedAt: { type: Date },
    // Insurance fields
    insurance: {
      selected: { type: Boolean, default: false },
      type: { 
        type: String, 
        enum: ["basic", "comprehensive", "premium"],
        default: null
      },
      cost: { type: Number, default: 0 },
      coverage: { type: Number, default: 0 }, // Coverage amount
      provider: { type: String, default: "RentX Insurance" }
    },
    // GPS Tracking fields
    gpsTracking: {
      enabled: { type: Boolean, default: false },
      deviceId: { type: String },
      currentLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
        lastUpdated: { type: Date }
      },
      trackingHistory: [{
        latitude: { type: Number },
        longitude: { type: Number },
        timestamp: { type: Date },
        speed: { type: Number }, // km/h
        address: { type: String }
      }],
      startLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
        timestamp: { type: Date }
      },
      endLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
        timestamp: { type: Date }
      },
      totalDistanceTraveled: { type: Number, default: 0 } // in km
    },
  },
  { timestamps: true }
);

// Add indexes for better query performance
bookingSchema.index({ carId: 1, pickupDate: 1, returnDate: 1 }); // For availability checks
bookingSchema.index({ userId: 1, createdAt: -1 }); // For user bookings
bookingSchema.index({ ownerId: 1, createdAt: -1 }); // For owner bookings
bookingSchema.index({ status: 1 }); // For status-based queries
bookingSchema.index({ paymentStatus: 1 }); // For payment queries
bookingSchema.index({ createdAt: -1 }); // For recent bookings
// Note: bookingId and invoiceNumber indexes are automatically created by unique: true

// Pre-save middleware to generate booking ID and invoice number
bookingSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const bookingSequence = await getNextSequence('booking');
      const invoiceSequence = await getNextSequence('invoice');
      
      this.bookingId = `BID${bookingSequence.toString().padStart(3, '0')}`;
      this.invoiceNumber = `INV${invoiceSequence.toString().padStart(3, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

module.exports = Booking;
