import React, { useState } from 'react';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const ReviewForm = ({ bookingId, carId, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [validationError, setValidationError] = useState('');
  const { token, backendUrl } = useAppContext();

  // Character limits based on requirements 2.3
  const MIN_CHARS = 4;
  const MAX_CHARS = 2000;

  // Validate review text
  const validateReviewText = (text) => {
    const trimmedText = text.trim();
    
    if (trimmedText.length === 0) {
      return 'Review text cannot be empty';
    }
    
    if (trimmedText.length < MIN_CHARS) {
      return `Review must be at least ${MIN_CHARS} characters (currently ${trimmedText.length})`;
    }
    
    if (text.length > MAX_CHARS) {
      return `Review cannot exceed ${MAX_CHARS} characters`;
    }
    
    // Check for whitespace-only content (requirement 2.4)
    if (!/\S/.test(text)) {
      return 'Review cannot contain only whitespace';
    }
    
    return '';
  };

  const handleReviewTextChange = (e) => {
    const newText = e.target.value;
    setReviewText(newText);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate before submission
    const error = validateReviewText(reviewText);
    if (error) {
      setValidationError(error);
      toast.error(error);
      return;
    }

    setLoading(true);
    setValidationError('');

    try {
      const response = await axios.post(
        `${backendUrl}/reviews/create`,
        { 
          bookingId, 
          carId,
          rating, 
          reviewText: reviewText.trim() 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Check if the response was successful
      if (response.data.success) {
        toast.success('Review submitted successfully!');
        
        // Reset form
        setRating(5);
        setReviewText('');
        
        if (onSuccess) onSuccess();
      } else {
        // Backend returned success: false
        const errorMessage = response.data.message || 'Failed to submit review';
        toast.error(errorMessage);
        setValidationError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to submit review';
      toast.error(errorMessage);
      setValidationError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const trimmedLength = reviewText.trim().length;
  const isValid = trimmedLength >= MIN_CHARS && reviewText.length <= MAX_CHARS;
  const charCountColor = 
    reviewText.length > MAX_CHARS ? 'text-red-600' :
    trimmedLength < MIN_CHARS ? 'text-yellow-600' :
    'text-green-600';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg shadow-md border border-gray-200">
      {/* Rating Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1 items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="text-4xl focus:outline-none transition-all transform hover:scale-110"
              aria-label={`Rate ${star} stars`}
            >
              {star <= (hoveredStar || rating) ? (
                <span className="text-yellow-400">★</span>
              ) : (
                <span className="text-gray-300">☆</span>
              )}
            </button>
          ))}
          <span className="ml-3 text-sm font-medium text-gray-600">
            {rating} {rating === 1 ? 'star' : 'stars'}
          </span>
        </div>
      </div>

      {/* Review Text Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reviewText}
          onChange={handleReviewTextChange}
          maxLength={MAX_CHARS}
          rows={6}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            validationError 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
          }`}
          placeholder="Share your experience with this car... (minimum 4 characters)"
        />
        
        {/* Character Counter */}
        <div className="flex justify-between items-center mt-2">
          <p className={`text-sm font-medium ${charCountColor}`}>
            {trimmedLength < MIN_CHARS && (
              <span>{MIN_CHARS - trimmedLength} more characters needed</span>
            )}
            {trimmedLength >= MIN_CHARS && reviewText.length <= MAX_CHARS && (
              <span>✓ Valid length</span>
            )}
            {reviewText.length > MAX_CHARS && (
              <span>Exceeds maximum length</span>
            )}
          </p>
          <p className={`text-sm ${charCountColor}`}>
            {reviewText.length}/{MAX_CHARS} characters
          </p>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {validationError}
            </p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !isValid}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Submitting Review...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Submit Review</span>
          </>
        )}
      </button>

      {/* Help Text */}
      <p className="text-xs text-gray-500 text-center">
        Your review will help other users make informed decisions
      </p>
    </form>
  );
};

export default ReviewForm;
