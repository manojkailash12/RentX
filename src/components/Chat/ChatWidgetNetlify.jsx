import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const ChatWidgetNetlify = ({ conversationId, recipientId, bookingId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const { token, backendUrl, user } = useAppContext();

  // Initialize conversation
  useEffect(() => {
    if (isOpen && recipientId && !conversationId) {
      initializeConversation();
    }
  }, [isOpen, recipientId]);

  // Poll for new messages when chat is open
  useEffect(() => {
    if (isOpen && conversationId) {
      loadMessages();
      
      // Poll every 5 seconds for new messages (reduced from 3)
      pollingIntervalRef.current = setInterval(() => {
        loadMessages(true); // Silent reload
      }, 5000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [isOpen, conversationId]);

  const initializeConversation = async () => {
    try {
      const response = await axios.post(
        `${backendUrl}/chat/conversation`,
        {
          participantId: recipientId,
          ...(bookingId && { bookingId })
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setConversation(response.data.conversation);
    } catch (error) {
      console.error('Initialize conversation error:', error);
      toast.error('Failed to start conversation');
    }
  };

  const loadMessages = async (silent = false) => {
    try {
      const convId = conversationId || conversation?._id;
      if (!convId) return;

      const response = await axios.get(
        `${backendUrl}/chat/messages/${convId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessages(response.data.messages);
      if (!silent) {
        scrollToBottom();
      }
    } catch (error) {
      if (!silent) {
        console.error('Load messages error:', error);
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    const convId = conversationId || conversation?._id;
    if (!convId) {
      toast.error('Conversation not initialized');
      return;
    }

    setLoading(true);
    const tempMessage = {
      _id: Date.now(),
      content: newMessage,
      sender: { _id: user._id, name: user.name },
      createdAt: new Date(),
      isTemp: true
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      const response = await axios.post(
        `${backendUrl}/chat/send`,
        {
          conversationId: convId,
          content: newMessage,
          type: 'text'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Replace temp message with real one
      setMessages(prev => 
        prev.map(msg => msg._id === tempMessage._id ? response.data.message : msg)
      );
      scrollToBottom();
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      // Remove temp message on error
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary-dull transition-colors z-50"
        aria-label="Open chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="bg-primary text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Chat</h3>
          <p className="text-xs text-white/80">Messages update every 3 seconds</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 p-1 rounded transition-colors"
          aria-label="Close chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender._id === user?._id;
            return (
              <div
                key={msg._id || index}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    isOwn
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  } ${msg.isTemp ? 'opacity-70' : ''}`}
                >
                  {!isOwn && (
                    <p className="text-xs font-semibold mb-1 opacity-70">
                      {msg.sender.name}
                    </p>
                  )}
                  <p className="text-sm break-words">{msg.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-xs opacity-70">
                      {new Date(msg.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {msg.isTemp && (
                      <span className="text-xs">⏳</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dull transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWidgetNetlify;
