import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const CustomerSupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [typing, setTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const { token, backendUrl, user } = useAppContext();

  // Quick replies for common questions
  const quickReplies = [
    { text: '📋 My Bookings', action: 'bookings' },
    { text: '🚗 Available Cars', action: 'cars' },
    { text: '💰 Payment Help', action: 'payment' },
    { text: '📞 Contact Support', action: 'contact' }
  ];

  // Initialize conversation with admin/support
  useEffect(() => {
    if (isOpen && !conversation && user) {
      initializeConversation();
    }
  }, [isOpen, user]);

  // Poll for new messages
  useEffect(() => {
    if (isOpen && conversation) {
      loadMessages();
      
      pollingIntervalRef.current = setInterval(() => {
        loadMessages(true);
      }, 3000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [isOpen, conversation]);

  const initializeConversation = async () => {
    try {
      // Get or create conversation with admin
      const response = await axios.post(
        `${backendUrl}/chat/conversations/create`,
        { participantId: 'admin' }, // Special ID for admin support
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversation(response.data.conversation);
      
      // Send welcome message if new conversation
      if (response.data.isNew) {
        setTimeout(() => {
          addBotMessage('👋 Hello! Welcome to RentX Customer Support. How can I help you today?');
        }, 500);
      }
    } catch (error) {
      console.error('Initialize conversation error:', error);
      // Fallback: work without backend
      setConversation({ _id: 'local', isLocal: true });
      addBotMessage('👋 Hello! Welcome to RentX Customer Support. How can I help you today?');
    }
  };

  const loadMessages = async (silent = false) => {
    try {
      if (!conversation || conversation.isLocal) return;

      const response = await axios.get(
        `${backendUrl}/chat/conversations/${conversation._id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newMessages = response.data.messages;
      
      // Check for unread messages
      if (!isOpen && newMessages.length > messages.length) {
        setUnreadCount(prev => prev + (newMessages.length - messages.length));
      }

      setMessages(newMessages);
      
      if (!silent) {
        scrollToBottom();
      }
    } catch (error) {
      if (!silent) {
        console.error('Load messages error:', error);
      }
    }
  };

  const addBotMessage = (content) => {
    const botMessage = {
      _id: Date.now(),
      content,
      sender: { _id: 'bot', name: 'RentX Support' },
      createdAt: new Date(),
      isBot: true
    };
    setMessages(prev => [...prev, botMessage]);
    scrollToBottom();
  };

  const handleQuickReply = (action) => {
    let response = '';
    
    switch (action) {
      case 'bookings':
        response = 'You can view all your bookings in the "My Bookings" section. Need help with a specific booking?';
        break;
      case 'cars':
        response = 'Browse our available cars on the home page. You can filter by location, price, and car type!';
        break;
      case 'payment':
        response = 'We accept both cash and online payments. For payment issues, please contact us at support@rentx.com';
        break;
      case 'contact':
        response = 'You can reach us at:\n📧 Email: support@rentx.com\n📞 Phone: +91 1234567890\n⏰ Available: 24/7';
        break;
      default:
        response = 'How else can I help you?';
    }
    
    setTimeout(() => {
      addBotMessage(response);
    }, 500);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    const tempMessage = {
      _id: Date.now(),
      content: newMessage,
      sender: { _id: user._id, name: user.name },
      createdAt: new Date(),
      isTemp: true
    };

    setMessages(prev => [...prev, tempMessage]);
    const messageContent = newMessage;
    setNewMessage('');
    scrollToBottom();

    try {
      if (conversation.isLocal) {
        // Simulate bot response for local mode
        setTimeout(() => {
          setMessages(prev => 
            prev.map(msg => msg._id === tempMessage._id ? { ...msg, isTemp: false } : msg)
          );
          
          // Auto-reply based on keywords
          setTimeout(() => {
            let autoReply = 'Thank you for your message. Our support team will get back to you shortly.';
            
            if (messageContent.toLowerCase().includes('booking')) {
              autoReply = 'For booking-related queries, please check your "My Bookings" page or contact us at support@rentx.com';
            } else if (messageContent.toLowerCase().includes('payment')) {
              autoReply = 'For payment issues, please email us at support@rentx.com with your booking ID.';
            } else if (messageContent.toLowerCase().includes('cancel')) {
              autoReply = 'You can cancel your booking from the "My Bookings" page. Cancellation is free up to 24 hours before pickup.';
            }
            
            addBotMessage(autoReply);
          }, 1000);
        }, 500);
      } else {
        const response = await axios.post(
          `${backendUrl}/chat/messages/send`,
          {
            conversationId: conversation._id,
            content: messageContent,
            type: 'text'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setMessages(prev => 
          prev.map(msg => msg._id === tempMessage._id ? response.data.message : msg)
        );
        scrollToBottom();
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  // Floating button
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 z-50 group"
        aria-label="Open customer support chat"
      >
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
        <svg className="w-7 h-7 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Need Help? Chat with us!
        </span>
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-full shadow-2xl hover:shadow-3xl transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-medium">Customer Support</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Full chat window
  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg">RentX Support</h3>
            <p className="text-xs text-white/80 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
              Online • We reply instantly
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            aria-label="Minimize chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-medium">Start a conversation</p>
            <p className="text-sm mt-1">We're here to help!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender._id === user?._id;
            const isBot = msg.isBot || msg.sender._id === 'bot';
            
            return (
              <div
                key={msg._id || index}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isOwn && (
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                      {isBot ? '🤖' : msg.sender.name?.charAt(0) || 'S'}
                    </div>
                  )}
                  <div>
                    {!isOwn && !isBot && (
                      <p className="text-xs text-gray-500 mb-1 px-1">
                        {msg.sender.name}
                      </p>
                    )}
                    <div
                      className={`p-3 rounded-2xl shadow-sm ${
                        isOwn
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                      } ${msg.isTemp ? 'opacity-70' : ''}`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
                        <span className="text-xs">
                          {new Date(msg.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {msg.isTemp && <span className="text-xs">⏳</span>}
                        {isOwn && !msg.isTemp && <span className="text-xs">✓✓</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleQuickReply(reply.action)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs hover:bg-green-50 hover:border-green-500 hover:text-green-700 transition-colors"
              >
                {reply.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Powered by RentX • We typically reply in minutes
        </p>
      </form>
    </div>
  );
};

export default CustomerSupportChat;
