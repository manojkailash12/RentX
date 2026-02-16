import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const ReviewsManagement = () => {
  const { axios, currencyLocale } = useAppContext();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [likedReviews, setLikedReviews] = useState({});

  useEffect(() => {
    fetchAllReviews();
  }, []);

  const fetchAllReviews = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/reviews/all');
      if (data.success) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeReview = (reviewId) => {
    setLikedReviews(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
    toast.success(likedReviews[reviewId] ? 'Unliked review' : 'Liked review!');
  };

  const handleShareToSocial = (review, platform) => {
    const carName = `${review.carId?.brand} ${review.carId?.model}`;
    const rating = '⭐'.repeat(review.rating);
    const text = `${rating}\n"${review.reviewText}"\n- ${review.userId?.name}\n\nRent amazing cars at RentX!`;
    
    let shareUrl = '';
    const encodedText = encodeURIComponent(text);
    const siteUrl = encodeURIComponent(window.location.origin);

    switch(platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${siteUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${siteUrl}&quote=${encodedText}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${siteUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${siteUrl}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
    toast.success(`Sharing to ${platform}!`);
  };

  const copyReviewLink = (review) => {
    const reviewText = `⭐ ${review.rating}/5 - "${review.reviewText}" - ${review.userId?.name}`;
    navigator.clipboard.writeText(reviewText);
    toast.success('Review copied to clipboard!');
  };

  if (loading) {
    return (
      <div className='flex justify-center items-center py-20'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-2xl font-bold text-gray-800'>Reviews Management</h2>
        <div className='text-sm text-gray-600'>
          Total Reviews: <span className='font-semibold text-primary'>{reviews.length}</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className='text-center py-20'>
          <p className='text-gray-500'>No reviews yet</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-6'>
          {reviews.map((review) => (
            <div key={review._id} className='bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow'>
              {/* Review Header */}
              <div className='flex items-start justify-between mb-4'>
                <div className='flex items-start gap-4 flex-1'>
                  <div className='w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg'>
                    {review.userId?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className='flex-1'>
                    <h3 className='font-semibold text-gray-800'>{review.userId?.name || 'Anonymous'}</h3>
                    <p className='text-sm text-gray-500'>{review.userId?.email}</p>
                    <p className='text-xs text-gray-400 mt-1'>
                      {new Date(review.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Like Button */}
                <button
                  onClick={() => handleLikeReview(review._id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    likedReviews[review._id]
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill={likedReviews[review._id] ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {likedReviews[review._id] ? 'Liked' : 'Like'}
                </button>
              </div>

              {/* Car Info */}
              <div className='bg-blue-50 p-3 rounded-lg mb-4'>
                <p className='text-sm text-gray-600'>Car Reviewed:</p>
                <p className='font-semibold text-gray-800'>
                  {review.carId?.brand} {review.carId?.model} ({review.carId?.year})
                </p>
              </div>

              {/* Rating */}
              <div className='flex items-center gap-2 mb-3'>
                <div className='flex gap-1'>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className='text-2xl'>
                      {star <= review.rating ? (
                        <span className="text-yellow-400">★</span>
                      ) : (
                        <span className="text-gray-300">☆</span>
                      )}
                    </span>
                  ))}
                </div>
                <span className='text-sm font-medium text-gray-600'>
                  {review.rating} out of 5
                </span>
              </div>

              {/* Review Text */}
              <div className='bg-gray-50 p-4 rounded-lg mb-4'>
                <p className='text-gray-800 whitespace-pre-wrap'>{review.reviewText}</p>
              </div>

              {/* Share Buttons */}
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='text-sm font-medium text-gray-600 mr-2'>Share to:</span>
                
                <button
                  onClick={() => handleShareToSocial(review, 'twitter')}
                  className='flex items-center gap-2 px-3 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm'
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  Twitter
                </button>

                <button
                  onClick={() => handleShareToSocial(review, 'facebook')}
                  className='flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm'
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>

                <button
                  onClick={() => handleShareToSocial(review, 'whatsapp')}
                  className='flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm'
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </button>

                <button
                  onClick={() => handleShareToSocial(review, 'linkedin')}
                  className='flex items-center gap-2 px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm'
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </button>

                <button
                  onClick={() => copyReviewLink(review)}
                  className='flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm'
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>

              {/* Owner Response if exists */}
              {review.ownerResponse && review.ownerResponse.text && (
                <div className='mt-4 pt-4 border-t border-gray-200'>
                  <div className='flex items-start gap-3'>
                    <div className='w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0'>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-2'>
                        <span className='font-semibold text-gray-800'>Owner Response</span>
                        <span className='text-xs text-gray-500'>
                          {new Date(review.ownerResponse.respondedAt).toLocaleDateString(currencyLocale)}
                        </span>
                      </div>
                      <p className='text-gray-700 bg-blue-50 p-3 rounded-lg'>{review.ownerResponse.text}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsManagement;
