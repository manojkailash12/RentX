import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from './AppContext';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const ChatContext = createContext();

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { token, user } = useAppContext();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  const pollingIntervalRef = useRef(null);
  const messagesPollingRef = useRef(null);
  const socketRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888/.netlify/functions/api';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'; // Separate WebSocket server

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/chat/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations || []);
        
        // Calculate total unread count
        const unread = data.conversations.reduce((sum, conv) => {
          const userUnread = conv.unreadCount?.get?.(user?._id) || 
                            conv.unreadCount?.[user?._id] || 0;
          return sum + userUnread;
        }, 0);
        setTotalUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [token, user?._id, API_URL]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId) => {
    if (!token || !conversationId) return;

    try {
      const response = await fetch(
        `${API_URL}/chat/conversations/${conversationId}/messages?limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [token, API_URL]);

  // Send message
  const sendMessage = useCallback(async (conversationId, content) => {
    if (!token || !content.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/chat/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          content: content.trim()
        })
      });

      const data = await response.json();
      if (data.success) {
        // Add message to local state immediately (optimistic update)
        setMessages(prev => [...prev, data.message]);
        
        // Refresh conversations to update last message
        fetchConversations();
        
        return { success: true, message: data.message };
      } else {
        toast.error(data.message || 'Failed to send message');
        return { success: false };
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return { success: false };
    } finally {
      setSending(false);
    }
  }, [token, API_URL, fetchConversations]);

  // Create or get conversation
  const getOrCreateConversation = useCallback(async (participantId, bookingId = null) => {
    if (!token) return null;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/chat/conversations/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participantId,
          ...(bookingId && { bookingId })
        })
      });

      const data = await response.json();
      if (data.success) {
        // Refresh conversations list
        await fetchConversations();
        return data.conversation;
      } else {
        toast.error(data.message || 'Failed to create conversation');
        return null;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, fetchConversations]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId) => {
    if (!token || !conversationId) return;

    try {
      await fetch(`${API_URL}/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh conversations to update unread count
      fetchConversations();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [token, API_URL, fetchConversations]);

  // Set active conversation and fetch its messages
  const openConversation = useCallback(async (conversation) => {
    setActiveConversation(conversation);
    await fetchMessages(conversation._id);
    await markAsRead(conversation._id);
  }, [fetchMessages, markAsRead]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!token || !user) {
      // Disconnect socket when logged out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsSocketConnected(false);
      return;
    }

    // Try to connect to WebSocket server
    try {
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        setIsSocketConnected(true);
        
        // Join user's room for receiving messages
        socket.emit('join', user._id);
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        setIsSocketConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.warn('⚠️ WebSocket connection failed, using polling fallback:', error.message);
        setIsSocketConnected(false);
      });

      // Listen for new messages
      socket.on('new_message', (message) => {
        console.log('📨 New message received via WebSocket:', message);
        
        // If message is for active conversation, add it to messages
        if (activeConversation && message.conversationId === activeConversation._id) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m._id === message._id)) return prev;
            return [...prev, message];
          });
        }
        
        // Refresh conversations to update last message and unread count
        fetchConversations();
      });

      // Listen for conversation updates
      socket.on('conversation_updated', (conversation) => {
        console.log('🔄 Conversation updated via WebSocket');
        fetchConversations();
      });

      // Listen for message read events
      socket.on('messages_read', ({ conversationId, userId }) => {
        console.log('👁️ Messages marked as read via WebSocket');
        if (activeConversation && conversationId === activeConversation._id) {
          // Update messages to mark them as read
          setMessages(prev => prev.map(msg => ({
            ...msg,
            read: msg.sender !== user._id ? true : msg.read
          })));
        }
        fetchConversations();
      });

      socketRef.current = socket;

      return () => {
        if (socket) {
          socket.disconnect();
        }
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setIsSocketConnected(false);
    }
  }, [token, user, SOCKET_URL, activeConversation, fetchConversations]);

  // Start polling for conversations (fallback when WebSocket is not connected)
  // Only poll when user is likely viewing chat-related pages
  useEffect(() => {
    if (!token) {
      // Clear polling when logged out
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    // Initial fetch
    fetchConversations();

    // Only use polling if WebSocket is not connected
    // Increased interval to reduce server load
    if (!isSocketConnected) {
      console.log('🔄 Using polling fallback for conversations (30s interval)');
      pollingIntervalRef.current = setInterval(() => {
        fetchConversations();
      }, 30000); // Poll every 30 seconds (reduced from 10s)
    } else {
      // Clear polling if WebSocket is connected
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [token, fetchConversations, isSocketConnected]);

  // Poll for new messages in active conversation (fallback when WebSocket is not connected)
  useEffect(() => {
    if (!token || !activeConversation) {
      if (messagesPollingRef.current) {
        clearInterval(messagesPollingRef.current);
        messagesPollingRef.current = null;
      }
      return;
    }

    // Only use polling if WebSocket is not connected
    // Increased interval to reduce server load
    if (!isSocketConnected) {
      console.log('🔄 Using polling fallback for messages (10s interval)');
      messagesPollingRef.current = setInterval(() => {
        fetchMessages(activeConversation._id);
      }, 10000); // Poll every 10 seconds (reduced from 5s)
    } else {
      // Clear polling if WebSocket is connected
      if (messagesPollingRef.current) {
        clearInterval(messagesPollingRef.current);
        messagesPollingRef.current = null;
      }
    }

    return () => {
      if (messagesPollingRef.current) {
        clearInterval(messagesPollingRef.current);
      }
    };
  }, [token, activeConversation, fetchMessages, isSocketConnected]);

  const value = {
    conversations,
    activeConversation,
    messages,
    loading,
    sending,
    totalUnreadCount,
    isSocketConnected,
    sendMessage,
    getOrCreateConversation,
    openConversation,
    setActiveConversation,
    fetchConversations,
    markAsRead
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
