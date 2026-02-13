import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const ReviewModeration = () => {
  const [reviews, setReviews] = useState([]);
  const [deletedReviews, setDeletedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [likingReviewId, setLikingReviewId] = useState(null);
  const { token, backendUrl, isAdmin, isEmployee, user } = useAppContext();

  useEffect(() => {
    if (isEmployee) {
      loadReviews();
    }
  }, [isEmployee, showDeleted]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      if (showDeleted) {
        // Load deleted reviews
        const response = await axios.get(`${backendUrl}/reviews/deleted`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDeletedReviews(response.data.reviews || []);
      } else {
        // Load all active reviews
        const response = await axios.get(`${backendUrl}/reviews/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReviews(response.data.reviews || []);
      }
    } catch (error) {
      console.error('Load reviews error:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // deleteReview functionality
  const handleDeleteClick = (review) => {
    setSelectedReview(review);
    setShowDeleteModal(true);
    setDeleteReason('');
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReview) return;

    try {
      setDeletingReviewId(selectedReview._id);
      await axios.delete(`${backendUrl}/reviews/${selectedReview._id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: deleteReason.trim() || undefined }
      });

      toast.success('Review deleted successfully');
      setShowDeleteModal(false);
      setSelectedReview(null);
      setDeleteReason('');
      loadReviews(); // Reload reviews
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete review';
      toast.error(errorMessage);
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSelectedReview(null);
    setDeleteReason('');
  };

  // Like/Unlike review
  const handleLikeReview = async (reviewId) => {
    try {
      setLikingReviewId(reviewId);
      const response = await axios.post(`${backendUrl}/reviews/${reviewId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Update the review in the list
        const updateReviews = (reviewsList) => reviewsList.map(review => {
          if (review._id === reviewId) {
            // Create updated likedBy array based on isLiked response
            const updatedLikedBy = response.data.isLiked 
              ? [...(review.likedBy || []), { _id: user._id }]
              : (review.likedBy || []).filter(likedUser => {
                  const likedUserId = typeof likedUser === 'object' ? likedUser._id : likedUser;
                  return likedUserId.toString() !== user._id.toString();
                });
            
            return {
              ...review,
              likes: response.data.likes,
              likedBy: updatedLikedBy
            };
          }
          return review;
        });

        if (showDeleted) {
          setDeletedReviews(updateReviews(deletedReviews));
        } else {
          setReviews(updateReviews(reviews));
        }

        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('Like review error:', error);
      toast.error('Failed to like review');
    } finally {
      setLikingReviewId(null);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex text-yellow-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= rating ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  if (!isEmployee) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">Access Denied: Employee privileges required</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const displayReviews = showDeleted ? deletedReviews : reviews;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Review Moderation</h1>
        <p className="text-gray-600">Manage and moderate user reviews</p>
      </div>

      {/* Toggle View */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setShowDeleted(false)}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            !showDeleted
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Active Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setShowDeleted(true)}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            showDeleted
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Deleted Reviews ({deletedReviews.length})
        </button>
      </div>

      {/* Reviews List */}
      {displayReviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-lg">
            {showDeleted ? 'No deleted reviews' : 'No reviews to moderate'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayReviews.map((review) => (
            <div
              key={review._id}
              className={`bg-white border rounded-lg p-6 shadow-sm ${
                showDeleted ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* User Avatar */}
                <img
                  src={review.user?.profileImage || '/default-avatar.png'}
                  alt={review.user?.name || 'User'}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => { e.target.src = '/default-avatar.png'; }}
                />

                <div className="flex-1">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {review.user?.name || 'Anonymous'}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Delete Button (only for active reviews) */}
                    {!showDeleted && (
                      <button
                        onClick={() => handleDeleteClick(review)}
                        disabled={deletingReviewId === review._id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {deletingReviewId === review._id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Car Information */}
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Car:</span>{' '}
                      {review.car?.brand} {review.car?.model} ({review.car?.year})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Review ID: {review._id}
                    </p>
                  </div>

                  {/* Review Text */}
                  <p className="text-gray-700 leading-relaxed mb-3">
                    {review.reviewText || review.comment}
                  </p>

                  {/* Like Button and Count */}
                  <div className="flex items-center gap-4 mb-3">
                    <button
                      onClick={() => handleLikeReview(review._id)}
                      disabled={likingReviewId === review._id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        review.likedBy?.some(likedUser => {
                          const likedUserId = typeof likedUser === 'object' ? likedUser._id : likedUser;
                          return likedUserId?.toString() === user?._id?.toString();
                        })
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <svg className="w-5 h-5" fill={review.likedBy?.some(likedUser => {
                        const likedUserId = typeof likedUser === 'object' ? likedUser._id : likedUser;
                        return likedUserId?.toString() === user?._id?.toString();
                      }) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      <span className="font-medium">{review.likes || 0}</span>
                      {likingReviewId === review._id && (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </button>
                  </div>

                  {/* Owner Response */}
                  {review.ownerResponse && review.ownerResponse.text && (
                    <div className="ml-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg mb-3">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Owner Response</p>
                      <p className="text-sm text-gray-700">{review.ownerResponse.text}</p>
                    </div>
                  )}

                  {/* Audit Information (for deleted reviews) */}
                  {showDeleted && review.isDeleted && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                      <h5 className="text-sm font-semibold text-red-900 mb-2">Deletion Information</h5>
                      <div className="space-y-1 text-sm text-red-800">
                        <p>
                          <span className="font-medium">Deleted by:</span>{' '}
                          {review.deletedBy?.name || 'Unknown Admin'}
                        </p>
                        <p>
                          <span className="font-medium">Deleted at:</span>{' '}
                          {new Date(review.deletedAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {review.deletionReason && (
                          <p>
                            <span className="font-medium">Reason:</span>{' '}
                            {review.deletionReason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Delete Review</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Review by:</span> {selectedReview.user?.name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                "{selectedReview.reviewText?.substring(0, 100)}..."
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for deletion (optional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., Inappropriate content, spam, violation of terms..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingReviewId === selectedReview._id}
                className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingReviewId === selectedReview._id ? 'Deleting...' : 'Delete Review'}
              </button>
              <button
                onClick={handleDeleteCancel}
                disabled={deletingReviewId === selectedReview._id}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewModeration;
