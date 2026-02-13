const Conversation = require('../models/conversation');
const Message = require('../models/message');

// Get or create conversation
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { participantId, bookingId } = req.body;
    const userId = req.user._id;

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] },
      ...(bookingId && { booking: bookingId })
    }).populate('participants', 'name profileImage image role');

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [userId, participantId],
        ...(bookingId && { booking: bookingId }),
        unreadCount: {
          [userId]: 0,
          [participantId]: 0
        }
      });

      conversation = await Conversation.populate(conversation, { path: 'participants', select: 'name profileImage image role' });
    }

    // Add currentUserId for frontend convenience
    conversation = conversation.toObject();
    conversation.currentUserId = userId.toString();

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user conversations
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let conversations;
    
    // Employee sees all conversations (support queries)
    if (userRole === 'employee') {
      conversations = await Conversation.find({})
        .populate('participants', 'name profileImage image role')
        .sort({ updatedAt: -1 });
    } else {
      // Regular users see only their conversations
      conversations = await Conversation.find({
        participants: userId
      })
        .populate('participants', 'name profileImage image role')
        .sort({ updatedAt: -1 });
    }

    // Add currentUserId to each conversation for frontend convenience
    const conversationsWithUserId = conversations.map(conv => {
      const convObj = conv.toObject();
      convObj.currentUserId = userId.toString();
      return convObj;
    });

    // Add no-cache headers to prevent stale data
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      conversations: conversationsWithUserId
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get conversation messages
exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is participant or employee
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(p => p.toString() === userId.toString());
    const isEmployee = userRole === 'employee';
    
    if (!isParticipant && !isEmployee) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const messages = await Message.find({ conversationId: conversationId })
      .populate('senderId', 'name profileImage image role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ conversationId: conversationId });

    // Mark messages as read (only if user is participant)
    if (isParticipant) {
      await Message.updateMany(
        {
          conversationId: conversationId,
          senderId: { $ne: userId },
          status: { $ne: 'read' }
        },
        {
          status: 'read',
          readAt: new Date()
        }
      );

      // Reset unread count
      conversation.unreadCount.set(userId.toString(), 0);
      await conversation.save();
    }

    // Add no-cache headers to prevent stale data
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type = 'text', fileUrl } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ success: false, message: 'Message content cannot exceed 5000 characters' });
    }

    // Verify conversation exists and user is participant or employee
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(p => p.toString() === userId.toString());
    const isEmployee = userRole === 'employee';
    
    if (!isParticipant && !isEmployee) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get recipient ID - find the other participant
    let recipientId;
    if (isParticipant) {
      // User is a participant, send to the other participant
      recipientId = conversation.participants.find(p => p.toString() !== userId.toString());
    } else if (isEmployee) {
      // Employee is not a participant, send to the first participant (the user)
      recipientId = conversation.participants[0];
    }
    
    // Ensure recipientId is valid
    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Could not determine recipient' });
    }

    // Create message
    const message = await Message.create({
      conversationId: conversationId,
      senderId: userId,
      recipientId: recipientId,
      content: content.trim(),
      status: 'sent'
    });

    // Update conversation
    conversation.lastMessage = {
      content: content.trim(),
      senderId: userId,
      timestamp: new Date()
    };
    
    // Increment unread count for recipient
    const currentCount = conversation.unreadCount.get(recipientId.toString()) || 0;
    conversation.unreadCount.set(recipientId.toString(), currentCount + 1);

    await conversation.save();

    // Populate message
    await message.populate('senderId', 'name profileImage image role');

    // Emit socket event if socket.io is available (for real-time updates)
    // Note: In serverless environment, we rely on polling fallback
    // The socket server should be running separately for real-time features
    
    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    await Message.updateMany(
      {
        conversationId: conversationId,
        senderId: { $ne: userId },
        status: { $ne: 'read' }
      },
      {
        status: 'read',
        readAt: new Date()
      }
    );

    conversation.unreadCount.set(userId.toString(), 0);
    await conversation.save();

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
