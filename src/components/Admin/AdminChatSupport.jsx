import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminChatSupport = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888/.netlify/functions/api';

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${backendUrl}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${backendUrl}/chat/conversations/${conversationId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${backendUrl}/chat/messages/send`,
        {
          conversationId: selectedConversation._id,
          content: newMessage
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setMessages([...messages, data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleDeleteUserAccount = async () => {
    if (!userToDelete) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${backendUrl}/admin/delete-user`,
        {
          userId: userToDelete._id,
          reason: 'Requested via chat support'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success('User account deleted successfully. Confirmation email sent.');
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        
        // Send confirmation message in chat
        await axios.post(
          `${backendUrl}/chat/messages/send`,
          {
            conversationId: selectedConversation._id,
            content: 'Your account has been deleted as requested. You will receive a confirmation email shortly.'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        fetchMessages(selectedConversation._id);
      } else {
        toast.error(data.message || 'Failed to delete user account');
      }
    } catch (error) {
      console.error('Error deleting user account:', error);
      toast.error('Failed to delete user account');
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (conversation) => {
    const currentUserId = localStorage.getItem('userId');
    return conversation.participants?.find(p => p._id !== currentUserId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Chat Support</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-4 max-h-[600px] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Conversations</h2>
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No conversations yet</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const otherUser = getOtherParticipant(conv);
                const unreadCount = conv.unreadCount?.[localStorage.getItem('userId')] || 0;
                
                return (
                  <div
                    key={conv._id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedConversation?._id === conv._id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{otherUser?.name || 'User'}</p>
                        <p className="text-sm text-gray-600 truncate">
                          {conv.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-1">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md flex flex-col" style={{ height: '600px' }}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="border-b p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {getOtherParticipant(selectedConversation)?.name || 'User'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {getOtherParticipant(selectedConversation)?.email || ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUserToDelete(getOtherParticipant(selectedConversation));
                    setShowDeleteConfirm(true);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Delete User Account
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isCurrentUser = msg.senderId?._id === localStorage.getItem('userId');
                  
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isCurrentUser
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">
                          {msg.senderId?.name || 'Unknown'}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Account Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the account for <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
              <br /><br />
              This action will:
              <ul className="list-disc ml-6 mt-2">
                <li>Permanently delete all user data</li>
                <li>Remove all bookings and conversations</li>
                <li>Send a confirmation email to the user</li>
              </ul>
              <br />
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUserAccount}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChatSupport;
