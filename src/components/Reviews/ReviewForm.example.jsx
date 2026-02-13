/**
 * ReviewForm Component - Usage Examples
 * 
 * This file demonstrates how to integrate the ReviewForm component
 * into different parts of the application.
 */

import React, { useState } from 'react';
import ReviewForm from './ReviewForm';
import toast from 'react-hot-toast';

// ============================================================================
// Example 1: Basic Usage in Car Details Page
// ============================================================================

export const CarDetailsExample = () => {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviews, setReviews] = useState([]);
  
  // Assume these come from props or context
  const carId = '507f1f77bcf86cd799439011';
  const userBooking = {
    _id: '507f1f77bcf86cd799439012',
    status: 'completed',
    hasReview: false
  };

  const handleReviewSuccess = () => {
    // Refresh the reviews list
    fetchReviews();
    // Hide the form
    setShowReviewForm(false);
  };

  const fetchReviews = async () => {
    // Fetch updated reviews from API
    // setReviews(data);
  };

  return (
    <div className="car-details-page">
      {/* Car details content */}
      
      {/* Show review button if user has completed booking without review */}
      {userBooking && userBooking.status === 'completed' && !userBooking.hasReview && (
        <div className="my-6">
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showReviewForm ? 'Cancel Review' : 'Write a Review'}
          </button>
        </div>
      )}

      {/* Review form */}
      {showReviewForm && (
        <div className="my-6">
          <h3 className="text-xl font-semibold mb-4">Share Your Experience</h3>
          <ReviewForm
            bookingId={userBooking._id}
            carId={carId}
            onSuccess={handleReviewSuccess}
          />
        </div>
      )}

      {/* Reviews list */}
      <div className="reviews-section">
        {/* Display existing reviews */}
      </div>
    </div>
  );
};

// ============================================================================
// Example 2: Usage in My Bookings Page
// ============================================================================

export const MyBookingsExample = () => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  const bookings = [
    {
      _id: '507f1f77bcf86cd799439012',
      carId: '507f1f77bcf86cd799439011',
      carName: 'Toyota Camry 2023',
      status: 'completed',
      hasReview: false,
      completedAt: '2024-01-15'
    },
    // ... more bookings
  ];

  const handleReviewSuccess = () => {
    // Update booking to mark as reviewed
    setSelectedBooking(null);
    // Refresh bookings list
  };

  return (
    <div className="my-bookings-page">
      <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
      
      {bookings.map((booking) => (
        <div key={booking._id} className="booking-card p-4 border rounded-lg mb-4">
          <h3 className="font-semibold">{booking.carName}</h3>
          <p className="text-sm text-gray-600">Status: {booking.status}</p>
          
          {/* Show review button for completed bookings without review */}
          {booking.status === 'completed' && !booking.hasReview && (
            <button
              onClick={() => setSelectedBooking(booking)}
              className="mt-3 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
            >
              Leave a Review
            </button>
          )}
          
          {booking.hasReview && (
            <p className="mt-3 text-sm text-green-600">✓ Review submitted</p>
          )}
        </div>
      ))}

      {/* Review modal/form */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                Review: {selectedBooking.carName}
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <ReviewForm
              bookingId={selectedBooking._id}
              carId={selectedBooking.carId}
              onSuccess={handleReviewSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 3: Usage with Custom Styling
// ============================================================================

export const CustomStyledExample = () => {
  const carId = '507f1f77bcf86cd799439011';
  const bookingId = '507f1f77bcf86cd799439012';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-center mb-2">
          How was your experience?
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Your feedback helps other renters make informed decisions
        </p>
        
        <ReviewForm
          bookingId={bookingId}
          carId={carId}
          onSuccess={() => {
            console.log('Review submitted successfully!');
            // Navigate to reviews page or show thank you message
          }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Example 4: Usage with Error Handling
// ============================================================================

export const ErrorHandlingExample = () => {
  const [error, setError] = useState(null);
  const carId = '507f1f77bcf86cd799439011';
  const bookingId = '507f1f77bcf86cd799439012';

  const handleSuccess = () => {
    setError(null);
    // Show success message
    toast.success('Thank you for your review!');
  };

  return (
    <div className="review-form-container">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      <ReviewForm
        bookingId={bookingId}
        carId={carId}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

// ============================================================================
// Example 5: Conditional Rendering Based on User Status
// ============================================================================

export const ConditionalRenderingExample = () => {
  const user = {
    id: '507f1f77bcf86cd799439013',
    role: 'user',
    hasCompletedBooking: true
  };
  
  const booking = {
    _id: '507f1f77bcf86cd799439012',
    carId: '507f1f77bcf86cd799439011',
    status: 'completed',
    hasReview: false
  };

  // Only show review form if:
  // 1. User is logged in
  // 2. User has completed the booking
  // 3. Booking doesn't already have a review
  const canReview = user && 
                    booking.status === 'completed' && 
                    !booking.hasReview;

  if (!canReview) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600">
          {!user && 'Please log in to leave a review'}
          {user && booking.status !== 'completed' && 'Complete your booking to leave a review'}
          {user && booking.hasReview && 'You have already reviewed this booking'}
        </p>
      </div>
    );
  }

  return (
    <ReviewForm
      bookingId={booking._id}
      carId={booking.carId}
      onSuccess={() => {
        // Update booking status
        booking.hasReview = true;
      }}
    />
  );
};

// ============================================================================
// Integration Notes
// ============================================================================

/**
 * INTEGRATION CHECKLIST:
 * 
 * 1. Import the component:
 *    import ReviewForm from '../components/Reviews/ReviewForm';
 * 
 * 2. Ensure AppContext is available:
 *    - token (for authentication)
 *    - backendUrl (for API calls)
 * 
 * 3. Required props:
 *    - bookingId: MongoDB ObjectId of the booking
 *    - carId: MongoDB ObjectId of the car
 *    - onSuccess: Callback function (optional)
 * 
 * 4. API Endpoint:
 *    - POST /reviews/create
 *    - Headers: Authorization: Bearer {token}
 *    - Body: { bookingId, carId, rating, reviewText }
 * 
 * 5. Dependencies:
 *    - react-hot-toast (for notifications)
 *    - axios (for API calls)
 *    - AppContext (for auth and config)
 * 
 * 6. Validation Rules:
 *    - Rating: 1-5 stars (required)
 *    - Review text: 10-2000 characters (required)
 *    - No whitespace-only submissions
 *    - Trimmed text sent to API
 * 
 * 7. User Experience:
 *    - Real-time character counter
 *    - Visual validation feedback
 *    - Loading state during submission
 *    - Success/error toast notifications
 *    - Form reset after successful submission
 */
