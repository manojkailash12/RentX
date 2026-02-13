const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Message content must be at least 1 character'],
    maxlength: [5000, 'Message content cannot exceed 5000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'read'],
    default: 'pending'
  },
  readAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, status: 1 });

module.exports = mongoose.model('Message', messageSchema);
