import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AppContext } from '../../context/AppContext';

const UserChatInterface = () => {
  const { user } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('chat'); // chat, bookings, profile
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [admins, setAdmins] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [loading, setLoading] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888/.netlify/functions/api';

  useEffect(() => {
    fetchAdmins();
    fetchConversations();
    if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      const interval = setInterval(() => fetchMessages(selectedConversation._id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${backendUrl}/admin/get-admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setAdmins(data.admins);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

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

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${backendUrl}/bookings/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const startNewChat = async (adminId) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${backendUrl}/chat/conversations/create`,
        { participantId: adminId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setSelectedConversation(data.conversation);
        fetchConversations();
        toast.success('Chat started with support team');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
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

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Request deletion
      const { data } = await axios.post(
        `${backendUrl}/user/request-deletion`,
        { password: deletePassword, reason: deleteReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success('Deletion request sent. Please check your email for OTP.');
        setShowDeleteConfirm(false);
        setDeletePassword('');
        setDeleteReason('');
      } else {
        toast.error(data.message || 'Failed to request deletion');
      }
    } catch (error) {
      console.error('Error requesting deletion:', error);
      toast.error('Failed to request account deletion');
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (conversation) => {
    return conversation.participants?.find(p => p._id !== user?.id);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header with Tabs */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
            <h1 className="text-3xl font-bold text-white mb-4">RentX Support</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'chat'
                    ? 'bg-white text-orange-600'
                    : 'bg-orange-400 text-white hover:bg-orange-300'
                }`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'bookings'
                    ? 'bg-white text-orange-600'
                    : 'bg-orange-400 text-white hover:bg-orange-300'
                }`}
              >
                📋 My Bookings
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'profile'
                    ? 'bg-white text-orange-600'
                    : 'bg-orange-400 text-white hover:bg-orange-300'
                }`}
              >
                👤 Profile
              </button>
            </div>
          </div>

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              {/* Conversations List */}
              <div className="lg:col-span-1">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Messages</h2>
                  {admins.length > 0 && (
                    <button
                      onClick={() => startNewChat(admins[0]._id)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                    >
                      + New Chat
                    </button>
                  )}
                </div>
                
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-4">No conversations yet</p>
                    {admins.length > 0 && (
                      <button
                        onClick={() => startNewChat(admins[0]._id)}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Start Chat with Support
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => {
                      const otherUser = getOtherParticipant(conv);
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
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                              {otherUser?.name?.charAt(0) || 'A'}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{otherUser?.name || 'Support Team'}</p>
                              <p className="text-sm text-gray-600 truncate">
                                {conv.lastMessage?.content || 'No messages yet'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chat Window */}
              <div className="lg:col-span-2">
                {selectedConversation ? (
                  <div className="border rounded-lg flex flex-col" style={{ height: '600px' }}>
                    {/* Chat Header */}
                    <div className="border-b p-4 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          {getOtherParticipant(selectedConversation)?.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {getOtherParticipant(selectedConversation)?.name || 'Support Team'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getOtherParticipant(selectedConversation)?.role === 'admin' ? 'Admin' : 'User'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.map((msg) => {
                        const isCurrentUser = msg.senderId?._id === user?.id;
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
                  </div>
                ) : (
                  <div className="border rounded-lg flex flex-col items-center justify-center" style={{ height: '600px' }}>
                    <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-lg text-gray-500">Select a conversation to start chatting</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
              {bookings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No bookings found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bookings.map((booking) => (
                    <div key={booking._id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-orange-600">{booking.bookingId}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="font-medium text-gray-800 mb-2">
                        {booking.carId?.brand} {booking.carId?.model}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        📅 {new Date(booking.pickupDate).toLocaleDateString()} - {new Date(booking.returnDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        💰 ₹{booking.totalAmount?.toLocaleString('en-IN')}
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab('chat');
                          // Optionally send a message about this booking
                        }}
                        className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                      >
                        Contact Support
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
              
              <div className="max-w-2xl">
                {/* User Info */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">Name</label>
                      <p className="font-medium">{user?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Role</label>
                      <p className="font-medium capitalize">{user?.role}</p>
                    </div>
                  </div>
                </div>

                {/* Delete Account Section */}
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Delete Account</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Once you delete your account, there is no going back. Your data will be permanently removed.
                  </p>
                  <ul className="text-sm text-red-700 mb-4 space-y-1">
                    <li>✓ All completed booking invoices will be sent to your email</li>
                    <li>✓ Pending bookings will be automatically cancelled</li>
                    <li>✓ Your account and all data will be permanently deleted</li>
                  </ul>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Request Account Deletion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Account Deletion</h3>
            <p className="text-gray-600 mb-4">
              This action cannot be undone. Please enter your password to confirm.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Tell us why you're leaving..."
                  rows="3"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setDeleteReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserChatInterface;
