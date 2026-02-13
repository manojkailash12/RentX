const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:8888',
      'http://localhost:8888',
      'http://127.0.0.1:8888',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected for WebSocket server');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Import models
const Message = require('./netlify/functions/models/message.js');
const Conversation = require('./netlify/functions/models/conversation.js');

// Middleware to authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.userId}`);
  
  // Store user's socket
  connectedUsers.set(socket.userId, socket.id);

  // Join user to their personal room
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  // Join conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`💬 User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`👋 User ${socket.userId} left conversation ${conversationId}`);
  });

  // Handle new message
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, content } = data;
      
      // Create message in database
      const message = await Message.create({
        conversationId,
        sender: socket.userId,
        content,
        timestamp: new Date()
      });

      // Populate sender info
      await message.populate('sender', 'name email profileImage');

      // Update conversation's last message
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        lastMessageAt: new Date()
      });

      // Get conversation to find participants
      const conversation = await Conversation.findById(conversationId);
      
      // Emit to all participants in the conversation
      io.to(`conversation:${conversationId}`).emit('new_message', message);
      
      // Also emit to each participant's personal room (for notifications)
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== socket.userId) {
          io.to(`user:${participantId}`).emit('new_message', message);
        }
      });

      console.log(`📨 Message sent in conversation ${conversationId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle mark as read
  socket.on('mark_read', async (data) => {
    try {
      const { conversationId } = data;
      
      // Update messages as read
      await Message.updateMany(
        {
          conversationId,
          sender: { $ne: socket.userId },
          read: false
        },
        { read: true }
      );

      // Emit to conversation participants
      io.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        userId: socket.userId
      });

      console.log(`👁️ Messages marked as read in conversation ${conversationId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { conversationId, isTyping } = data;
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      isTyping
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
    connectedUsers.delete(socket.userId);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connectedUsers: connectedUsers.size,
    timestamp: new Date()
  });
});

const PORT = process.env.SOCKET_PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
  console.log(`📡 Accepting connections from: ${process.env.FRONTEND_URL || 'http://localhost:8888'}`);
});
