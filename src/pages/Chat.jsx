import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useChatContext } from '../context/ChatContext';
import ConversationList from '../components/Chat/ConversationList';
import ChatWindow from '../components/Chat/ChatWindow';
import toast from 'react-hot-toast';

const Chat = () => {
  const { token, setShowLogin, axios, user } = useAppContext();
  const { getOrCreateConversation } = useChatContext();
  const navigate = useNavigate();
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    if (!token) {
      setShowLogin(true);
      navigate('/');
    }
  }, [token, navigate, setShowLogin]);

  const handleContactAdmin = async () => {
    setLoadingAdmin(true);
    try {
      // Get admin users using the correct endpoint
      const response = await axios.get('/admin/get-admins');
      
      if (response.data.success && response.data.admins && response.data.admins.length > 0) {
        // Get first admin user
        const adminUser = response.data.admins[0];
        
        // Create conversation with admin
        await getOrCreateConversation(adminUser._id);
        toast.success(`Started conversation with ${adminUser.name}`);
      } else {
        toast.error('No admin users available at the moment');
      }
    } catch (error) {
      console.error('Error contacting admin:', error);
      toast.error('Failed to contact admin. Please try again.');
    } finally {
      setLoadingAdmin(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="grid grid-cols-12 h-full">
          {/* Conversations List */}
          <div className="col-span-12 md:col-span-4 border-r h-full flex flex-col">
            <div className="bg-gray-100 px-6 py-4 border-b flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              {/* Only show Contact Admin button for non-admin users */}
              {user && user.role !== 'admin' && (
                <button
                  onClick={handleContactAdmin}
                  disabled={loadingAdmin}
                  className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Contact Admin/Support"
                >
                  {loadingAdmin ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span>Contact Admin</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationList />
            </div>
          </div>

          {/* Chat Window */}
          <div className="col-span-12 md:col-span-8 h-full">
            <ChatWindow />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
