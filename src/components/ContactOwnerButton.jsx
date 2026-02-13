import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '../context/ChatContext';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const ContactOwnerButton = ({ ownerId, ownerName, carId }) => {
  const navigate = useNavigate();
  const { getOrCreateConversation, openConversation } = useChatContext();
  const { token, user, setShowLogin } = useAppContext();
  const [loading, setLoading] = useState(false);

  const handleContactOwner = async () => {
    // Check if user is logged in
    if (!token) {
      toast.error('Please login to contact the owner');
      setShowLogin(true);
      return;
    }

    // Check if user is trying to contact themselves
    if (user?._id === ownerId) {
      toast.error('You cannot contact yourself');
      return;
    }

    setLoading(true);
    try {
      // Create or get existing conversation
      const conversation = await getOrCreateConversation(ownerId);
      
      if (conversation) {
        // Open the conversation
        await openConversation(conversation);
        
        // Navigate to chat page
        navigate('/chat');
        
        toast.success(`Started conversation with ${ownerName}`);
      }
    } catch (error) {
      console.error('Error contacting owner:', error);
      toast.error('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleContactOwner}
      disabled={loading}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
        loading
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-primary text-white hover:bg-primary-dull'
      }`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Loading...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Contact Owner</span>
        </>
      )}
    </button>
  );
};

export default ContactOwnerButton;
