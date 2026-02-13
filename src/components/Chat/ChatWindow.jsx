import React, { useState, useEffect, useRef } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useAppContext } from '../../context/AppContext';
import { format } from 'date-fns';

const ChatWindow = () => {
  const { activeConversation, messages, sendMessage, sending } = useChatContext();
  const { user } = useAppContext();
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when conversation changes
  useEffect(() => {
    if (activeConversation) {
      inputRef.current?.focus();
    }
  }, [activeConversation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || sending || !activeConversation) return;

    const content = messageInput.trim();
    setMessageInput('');

    await sendMessage(activeConversation._id, content);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50">
        <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-lg">Select a conversation to start chatting</p>
      </div>
    );
  }

  const otherParticipant = activeConversation.participants?.find(
    p => p._id !== user?._id
  ) || activeConversation.participants?.[0];

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center">
        <div className="relative">
          {otherParticipant?.profileImage || otherParticipant?.image ? (
            <img
              src={otherParticipant.profileImage || otherParticipant.image}
              alt={otherParticipant.name}
              className="w-10 h-10 rounded-full object-cover mr-3"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold mr-3">
              {otherParticipant?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          {/* Admin Badge on Avatar */}
          {otherParticipant?.role === 'admin' && (
            <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold border-2 border-white">
              A
            </div>
          )}
        </div>
        <div className="ml-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">
              {otherParticipant?.name || 'Unknown User'}
            </h2>
            {otherParticipant?.role === 'admin' && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                Admin
              </span>
            )}
          </div>
          {otherParticipant?.role === 'admin' && (
            <p className="text-xs text-gray-500">Support Team</p>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              // Handle both populated and non-populated senderId
              const messageSenderId = typeof message.senderId === 'object' 
                ? message.senderId?._id 
                : message.senderId;
              const isOwnMessage = messageSenderId === user?._id;
              
              return (
                <div
                  key={message._id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-white'
                          : 'bg-white text-gray-900 border'
                      }`}
                    >
                      <p className="break-words whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className={`flex items-center mt-1 text-xs text-gray-500 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <span>
                        {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                      </span>
                      {isOwnMessage && message.status && (
                        <span className="ml-2">
                          {message.status === 'read' && '✓✓'}
                          {message.status === 'sent' && '✓'}
                          {message.status === 'pending' && '○'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows="1"
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={sending}
            />
            <div className="text-xs text-gray-500 mt-1">
              {messageInput.length}/5000 characters
            </div>
          </div>
          <button
            type="submit"
            disabled={!messageInput.trim() || sending}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              !messageInput.trim() || sending
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dull'
            }`}
          >
            {sending ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
