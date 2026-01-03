const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  pickupLocation: {
    address: String,
    city: String,
    district: String,
    state: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  dropoffLocation: {
    address: String,
    city: String,
    district: String,
    state: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  totalDays: {
    type: Number,
    required: true
  },
  totalDistance: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'online'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: function() {
      // If payment method is cash, mark as paid immediately
      return this.paymentMethod === 'cash' ? 'paid' : 'pending';
    }
  },
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled'],
    default: 'confirmed'
  },
  driverRequired: {
    type: Boolean,
    default: false
  },
  specialRequests: String,
  invoiceNumber: {
    type: String,
    unique: true
  },
  bookingId: {
    type: String,
    unique: true
  },
  // Commission tracking
  commissionGenerated: {
    type: Boolean,
    default: false
  },
  commissionAmount: {
    type: Number,
    default: 200
  },
  // Pricing details
  pricingType: {
    type: String,
    enum: ['perDay', 'perKm'],
    default: 'perDay'
  },
  estimatedDistance: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate invoice number and booking ID before saving
bookingSchema.pre('save', async function(next) {
  // Generate invoice number
  if (!this.invoiceNumber) {
    try {
      // Find the latest booking to get the next invoice number
      const latestBooking = await this.constructor.findOne(
        { invoiceNumber: { $regex: /^INV\d+$/ } },
        { invoiceNumber: 1 }
      ).sort({ invoiceNumber: -1 });

      let nextNumber = 1;
      if (latestBooking && latestBooking.invoiceNumber) {
        const currentNumber = parseInt(latestBooking.invoiceNumber.replace('INV', ''));
        nextNumber = currentNumber + 1;
      }

      // Format with leading zeros (INV001, INV002, etc.)
      this.invoiceNumber = 'INV' + nextNumber.toString().padStart(3, '0');
    } catch (error) {
      // Fallback to timestamp-based invoice number if there's an error
      this.invoiceNumber = 'INV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
    }
  }

  // Generate booking ID
  if (!this.bookingId) {
    try {
      // Find the latest booking to get the next booking ID number
      const latestBooking = await this.constructor.findOne(
        { bookingId: { $regex: /^BID\d+$/ } },
        { bookingId: 1 }
      ).sort({ bookingId: -1 });

      let nextNumber = 1;
      if (latestBooking && latestBooking.bookingId) {
        const currentNumber = parseInt(latestBooking.bookingId.replace('BID', ''));
        nextNumber = currentNumber + 1;
      }

      // Format: BID001, BID002, ..., BID2000, etc.
      this.bookingId = 'BID' + nextNumber.toString().padStart(3, '0');
    } catch (error) {
      // Fallback to timestamp-based booking ID if there's an error
      this.bookingId = 'BID-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
    }
  }
  
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);