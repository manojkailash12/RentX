import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';

const ReviewList = ({ carId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingDistribution, setRatingDistribution] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const { backendUrl } = useAppContext();
  const reviewsPerPage = 5;
  const pagination = true; // Pagination enabled

  useEffect(() => {
    loadReviews();
  }, [carId, currentPage]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/reviews/car/${carId}?page=${currentPage}&limit=${reviewsPerPage}`);
      console.log('Reviews response:', response.data); // Debug log
      setReviews(response.data.reviews || []);
      setRatingDistribution(response.data.ratingDistribution || {});
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalReviews(response.data.pagination?.totalReviews || 0);
    } catch (error) {
      console.error('Load reviews error:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        <p className="text-gray-500 text-lg font-medium">No reviews yet</p>
        <p className="text-gray-400 text-sm mt-2">Be the first to review this car!</p>
      </div>
    );
  }

  const totalReviewsCount = Object.values(ratingDistribution).reduce((a, b) => a + b, 0);
  const avgRating = totalReviewsCount > 0
    ? Object.entries(ratingDistribution).reduce((sum, [rating, count]) => sum + (rating * count), 0) / totalReviewsCount
    : 0;

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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top of reviews section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-6 mb-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-800">{avgRating.toFixed(1)}</div>
            <div className="flex text-yellow-400 text-2xl mt-2 justify-center">
              {renderStars(Math.round(avgRating))}
            </div>
            <div className="text-sm text-gray-600 mt-2 font-medium">
              {totalReviewsCount} {totalReviewsCount === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating] || 0;
              const percentage = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-8 text-gray-700">{rating}★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-800">Customer Reviews</h3>
        {reviews.map((review) => (
          <div key={review._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <img
                src={review.user?.profileImage || '/default-avatar.png'}
                alt={review.user?.name || 'User'}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => { e.target.src = '/default-avatar.png'; }}
              />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-lg">{review.user?.name || 'Anonymous'}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500 ml-2">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{review.reviewText || review.comment}</p>
                
                {/* Likes Display */}
                {review.likes > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span className="font-medium">{review.likes} {review.likes === 1 ? 'like' : 'likes'}</span>
                  </div>
                )}
                
                {/* Owner Response */}
                {review.ownerResponse && review.ownerResponse.text && (
                  <div className="mt-4 ml-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-semibold text-blue-900">Owner Response</p>
                      <span className="text-xs text-blue-600">
                        {new Date(review.ownerResponse.respondedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{review.ownerResponse.text}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex gap-2">
            {[...Array(totalPages)].map((_, index) => {
              const pageNum = index + 1;
              // Show first page, last page, current page, and pages around current
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              } else if (
                pageNum === currentPage - 2 ||
                pageNum === currentPage + 2
              ) {
                return <span key={pageNum} className="px-2 py-2 text-gray-400">...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
