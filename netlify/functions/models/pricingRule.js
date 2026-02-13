const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['seasonal', 'demand', 'location', 'duration', 'category'],
    required: true
  },
  conditions: {
    season: {
      type: String,
      enum: ['summer', 'winter', 'monsoon', 'spring']
    },
    demandLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'peak']
    },
    location: String,
    minDuration: Number,
    maxDuration: Number,
    category: String,
    dayOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    dateRange: {
      start: Date,
      end: Date
    }
  },
  adjustment: {
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    value: {
      type: Number,
      required: true
    }
  },
  priority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PricingRule = mongoose.models.PricingRule || mongoose.model('PricingRule', pricingRuleSchema);

module.exports = PricingRule;
