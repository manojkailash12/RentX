const mongoose = require('mongoose');

const smartContractSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
  },
  contractAddress: {
    type: String,
    required: true
  },
  transactionHash: String,
  blockNumber: Number,
  network: {
    type: String,
    enum: ['ethereum', 'polygon', 'binance', 'testnet'],
    default: 'polygon'
  },
  terms: {
    rentalPeriod: {
      start: Date,
      end: Date
    },
    totalAmount: Number,
    deposit: Number,
    penalties: {
      lateFee: Number,
      damageFee: Number,
      cancellationFee: Number
    },
    conditions: [String]
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled', 'disputed'],
    default: 'pending'
  },
  milestones: [{
    name: String,
    completed: Boolean,
    timestamp: Date,
    transactionHash: String
  }],
  payments: [{
    amount: Number,
    type: {
      type: String,
      enum: ['deposit', 'rental', 'penalty', 'refund']
    },
    status: String,
    transactionHash: String,
    timestamp: Date
  }],
  disputes: [{
    reason: String,
    filedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: String,
    resolution: String,
    resolvedAt: Date
  }]
}, { timestamps: true });

module.exports = mongoose.model('SmartContract', smartContractSchema);
