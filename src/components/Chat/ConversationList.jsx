import React from 'react';
import { useChatContext } from '../../context/ChatContext';
import { formatDistanceToNow } from 'date-fns';

const ConversationList = () => {
  const { conversations, activeConversation, openConversation, loading } = useChatContext();

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-center">No conversations yet</p>
        <p className="text-sm text-center mt-2">Start chatting by contacting a car owner</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {conversations.map((conversation) => {
        const otherParticipant = conversation.participants?.find(
          p => p._id !== conversation.currentUserId
        ) || conversation.participants?.[0];
        
        const isActive = activeConversation?._id === conversation._id;
        const unreadCount = conversation.unreadCount?.[conversation.currentUserId] || 0;

        return (
          <div
            key={conversation._id}
            onClick={() => openConversation(conversation)}
            className={`flex items-center p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
              isActive ? 'bg-blue-50 border-l-4 border-l-primary' : ''
            }`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0 mr-3 relative">
              {otherParticipant?.profileImage || otherParticipant?.image ? (
                <img
                  src={otherParticipant.profileImage || otherParticipant.image}
                  alt={otherParticipant.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                  {otherParticipant?.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              {/* Admin Badge */}
              {otherParticipant?.role === 'admin' && (
                <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold border-2 border-white">
                  A
                </div>
              )}
            </div>

            {/* Conversation Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {otherParticipant?.name || 'Unknown User'}
                  </h3>
                  {otherParticipant?.role === 'admin' && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      Admin
                    </span>
                  )}
                </div>
                {conversation.lastMessage?.timestamp && (
                  <span className="text-xs text-gray-500 ml-2">
                    {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), { addSuffix: true })}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 truncate">
                  {conversation.lastMessage?.content || 'No messages yet'}
                </p>
                {unreadCount > 0 && (
                  <span className="ml-2 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;
