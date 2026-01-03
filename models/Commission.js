const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  vehicleOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  commissionAmount: {
    type: Number,
    required: true,
    default: 200
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paidDate: Date,
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'cash'],
    default: 'bank_transfer'
  },
  transactionId: String,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Commission', commissionSchema);