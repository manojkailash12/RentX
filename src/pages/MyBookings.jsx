import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import Title from '../components/Title'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import GPSTracker from '../components/GPS/GPSTracker';
import ReviewForm from '../components/Reviews/ReviewForm';
import BackButton from '../components/BackButton';

const MyBookings = () => {
  const { t } = useTranslation();
  const { axios, user, currency, getImageUrl } = useAppContext()

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState({})
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [cancellingBookingId, setCancellingBookingId] = useState(null)
  const [resendingInvoiceId, setResendingInvoiceId] = useState(null)
  const [resendingReviewId, setResendingReviewId] = useState(null)
  const [showGPSModal, setShowGPSModal] = useState(false)
  const [gpsBookingId, setGpsBookingId] = useState(null);
  const [existingReviews, setExistingReviews] = useState({}); // Track which bookings have reviews
  const [userReviews, setUserReviews] = useState({}); // Store actual review data

  const fetchMyBookings = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/bookings/user')
      if (data.success) {
        setBookings(data.bookings)
        // Check for existing reviews for completed bookings
        checkExistingReviews(data.bookings)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }

  const checkExistingReviews = async (bookingsList) => {
    try {
      // Get user's reviews
      const { data } = await axios.get('/reviews/user')
      if (data.success) {
        console.log('Raw reviews from API:', data.reviews)
        // Create a map of bookingId -> review exists
        const reviewMap = {}
        const reviewDataMap = {}
        data.reviews.forEach(review => {
          if (review.bookingId) {
            // Handle both populated object and string ID
            const bookingIdValue = typeof review.bookingId === 'object' 
              ? review.bookingId._id 
              : review.bookingId
            console.log('Processing review:', {
              reviewId: review._id,
              bookingIdType: typeof review.bookingId,
              bookingIdValue: bookingIdValue,
              rawBookingId: review.bookingId
            })
            if (bookingIdValue) {
              reviewMap[bookingIdValue] = true
              reviewDataMap[bookingIdValue] = review // Store the full review data
            }
          }
        })
        console.log('Final review map:', reviewMap)
        console.log('Current bookings:', bookingsList?.map(b => ({ id: b._id, bookingId: b.bookingId })))
        
        // Also map by booking's _id for easier lookup
        bookingsList?.forEach(booking => {
          if (reviewMap[booking._id]) {
            // Already mapped
          } else {
            // Check if there's a review for this booking's _id
            const matchingReview = data.reviews.find(review => {
              const reviewBookingId = typeof review.bookingId === 'object' 
                ? review.bookingId._id 
                : review.bookingId
              return reviewBookingId === booking._id
            })
            if (matchingReview) {
              reviewMap[booking._id] = true
              reviewDataMap[booking._id] = matchingReview
            }
          }
        })
        
        console.log('Updated review map after booking match:', reviewMap)
        setExistingReviews(reviewMap)
        setUserReviews(reviewDataMap)
      }
    } catch (error) {
      console.error('Error checking reviews:', error)
    }
  }

  const downloadInvoice = async (bookingId) => {
    try {
      const response = await axios.get(`/bookings/invoice/${bookingId}`, {
        responseType: 'blob'
      })
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice-${bookingId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Invoice downloaded successfully')
    } catch (error) {
      console.error('Invoice download error:', error)
      toast.error('Failed to download invoice')
    }
  }

  const cancelBooking = async (bookingId) => {
    // Show custom confirmation toast
    toast((t) => (
      <div className='flex flex-col gap-3'>
        <p className='font-medium'>Cancel this booking?</p>
        <p className='text-sm text-gray-600'>This action cannot be undone.</p>
        <div className='flex gap-2 justify-end'>
          <button
            onClick={() => {
              toast.dismiss(t.id)
            }}
            className='px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm'
          >
            No, Keep It
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id)
              
              try {
                setCancellingBookingId(bookingId)
                const { data } = await axios.post(`/bookings/cancel/${bookingId}`)
                
                if (data.success) {
                  toast.success(data.message)
                  // Refresh bookings list
                  fetchMyBookings()
                } else {
                  toast.error(data.message)
                }
              } catch (error) {
                console.error('Cancel booking error:', error)
                toast.error(error.response?.data?.message || 'Failed to cancel booking')
              } finally {
                setCancellingBookingId(null)
              }
            }}
            className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm'
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 10000,
      position: 'top-center',
    })
  }

  const resendInvoice = async (bookingId) => {
    try {
      setResendingInvoiceId(bookingId)
      const { data } = await axios.post(`/bookings/resend-invoice/${bookingId}`)
      
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Resend invoice error:', error)
      toast.error(error.response?.data?.message || 'Failed to send invoice')
    } finally {
      setResendingInvoiceId(null)
    }
  }

  const resendReviewEmail = async (bookingId) => {
    try {
      setResendingReviewId(bookingId)
      const { data } = await axios.post(`/bookings/resend-review-email/${bookingId}`)
      
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Resend review email error:', error)
      toast.error(error.response?.data?.message || 'Failed to send review email')
    } finally {
      setResendingReviewId(null)
    }
  }

  const viewBookingDetails = (booking) => {
    setSelectedBooking(booking)
  }

  const closeBookingDetails = () => {
    setSelectedBooking(null)
  }

  const handleImageError = (bookingId, imageUrl) => {
    console.error(`Failed to load car image for booking ${bookingId}:`, imageUrl)
    setImageError(prev => ({ ...prev, [bookingId]: true }))
  }

  const getCarImageSrc = (booking) => {
    const car = getCarData(booking)
    // Only show fallback if there was an error loading the image
    if (imageError[booking._id]) {
      return assets.carIconColored
    }
    // Return the actual car image URL with proper handling
    return getImageUrl(car.image) || assets.carIconColored
  }

  const getCarData = (booking) => {
    return booking.carId || booking.car
  }

  const calculateDuration = (pickupDate, returnDate) => {
    const pickup = new Date(pickupDate)
    const returnD = new Date(returnDate)
    const diffTime = Math.abs(returnD - pickup)
    
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffHours < 24) {
      // Less than 24 hours - show hours and minutes
      if (diffMinutes > 0) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
    } else if (diffDays === 1 && diffHours === 24) {
      return '1 day'
    } else {
      // More than 24 hours - show days and remaining hours
      const remainingHours = diffHours % 24
      if (remainingHours > 0) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
      }
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
    }
  }

  const calculateDays = (pickupDate, returnDate) => {
    const pickup = new Date(pickupDate)
    const returnD = new Date(returnDate)
    const diffTime = Math.abs(returnD - pickup)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays || 1
  }

  const getPaymentStatusDisplay = (booking) => {
    if (booking.paymentMethod === 'cash') {
      if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'completed') {
        return { text: 'Paid', color: 'text-green-700' }
      }
      return { text: 'Pay at Drop-Off', color: 'text-orange-600' }
    }
    
    // For online payments
    if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'completed') {
      return { text: 'Paid', color: 'text-green-700' }
    } else if (booking.paymentStatus === 'failed') {
      return { text: 'Payment Failed', color: 'text-red-600' }
    }
    return { text: 'Pay at Drop-Off', color: 'text-orange-600' }
  }

  useEffect(() => {
    user && fetchMyBookings();
  }, [user])

  if (loading) {
    return (
      <div className='px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mt-16'>
        <div className='flex justify-center items-center py-20'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className='px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mt-16 text-sm max-w-7xl'>
      <div className="mb-6">
        <BackButton />
      </div>
      <Title title={t('bookings.title')} subTitle={t('bookings.subtitle')} align='left' />

      <div>
        {bookings.length === 0 ? (
          <div className='text-center py-20'>
            <img src={assets.carIconColored} alt="No bookings" className='h-16 w-16 mx-auto mb-4 opacity-50' />
            <h3 className='text-xl font-semibold text-gray-600'>{t('bookings.noBookings')}</h3>
            <p className='text-gray-500 mt-2'>{t('bookings.noBookingsDesc')}</p>
          </div>
        ) : (
          bookings
            .filter((booking) => getCarData(booking))
            .map((booking, index) => {
              const car = getCarData(booking)
              const days = calculateDays(booking.pickupDate, booking.returnDate)
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  key={booking._id} 
                  className='grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border border-borderColor rounded-lg mt-5 first:mt-12 hover:shadow-md transition-shadow'
                >
                  {/* car image + info */}
                  <div className='md:col-span-1'>
                    <div className='rounded-md overflow-hidden mb-3'>
                      <img 
                        src={getCarImageSrc(booking)} 
                        alt={`${car.brand} ${car.model}`}
                        className='w-full h-auto aspect-video object-cover' 
                        onError={() => handleImageError(booking._id, car.image)}
                      />
                    </div>
                    <p className='text-lg font-medium mt-2'>{car.brand} {car.model}</p>
                    <p className='text-gray-500'>{car.year} • {car.category}</p>
                    {car.ownerType === 'user' && (
                      <p className='text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mt-1'>
                        User Listed
                      </p>
                    )}
                    {booking.isCarReplaced && (
                      <div className='mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg'>
                        <p className='text-xs text-yellow-800 font-semibold flex items-center gap-1'>
                          🔄 Car Replaced
                        </p>
                        <p className='text-xs text-yellow-700 mt-1'>
                          This vehicle was replaced by admin
                        </p>
                      </div>
                    )}
                  </div>

                  {/* booking info */}
                  <div className='md:col-span-2'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      {booking.bookingId && (
                        <p className='px-3 py-1.5 bg-light rounded text-sm font-medium'>
                          {booking.bookingId}
                        </p>
                      )}
                      {booking.invoiceNumber && (
                        <p className='px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-sm'>
                          {booking.invoiceNumber}
                        </p>
                      )}
                      <p className={`px-3 py-1 text-xs rounded-full ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {t(`bookings.${booking.status}`)}
                      </p>
                    </div>

                    <div className='flex items-start gap-2 mt-3'>
                      <img src={assets.calendar_icon_colored} alt="" className='w-4 h-4 mt-1' />
                      <div>
                        <p className='text-gray-500'>{t('bookings.rentalPeriod')} ({days} {t('bookings.days')})</p>
                        <p>{new Date(booking.pickupDate).toLocaleDateString('en-IN')} to {new Date(booking.returnDate).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>

                    <div className='flex items-start gap-2 mt-3'>
                      <img src={assets.location_icon_colored} alt="" className='w-4 h-4 mt-1' />
                      <div>
                        <p className='text-gray-500'>{t('bookings.journey')}</p>
                        <p>{booking.pickupLocation || car.location} → {booking.dropLocation || car.location}</p>
                        {booking.distance && (
                          <p className='text-sm text-gray-400'>{t('bookings.distance')}: {booking.distance} km</p>
                        )}
                      </div>
                    </div>

                    {booking.paymentMethod && (
                      <div className='flex items-start gap-2 mt-3'>
                        <div className='w-4 h-4 mt-1 bg-green-100 rounded-full flex items-center justify-center'>
                          <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                        </div>
                        <div>
                          <p className='text-gray-500'>{t('bookings.payment')}</p>
                          <p className='capitalize'>{t('bookings.cashOnDelivery')}</p>
                          <p className={`text-xs font-medium ${getPaymentStatusDisplay(booking).color}`}>
                            {t(`bookings.${getPaymentStatusDisplay(booking).text.toLowerCase().replace(/\s+/g, '').replace(/-/g, '')}`)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* price and actions */}
                  <div className='md:col-span-1 flex flex-col justify-between gap-4'>
                    <div className='text-sm text-gray-500 text-right'>
                      <p>{t('bookings.totalAmount')}</p>
                      <h1 className='text-2xl font-semibold text-primary'>
                        ₹{(booking.totalAmount || booking.price || 0).toLocaleString('en-IN')}
                      </h1>
                      <p className='text-xs'>{t('bookings.bookedOn')} {new Date(booking.createdAt).toLocaleDateString('en-IN')}</p>
                      {booking.pricePerDay && (
                        <p className='text-xs text-gray-400 mt-1'>
                          ₹{booking.pricePerDay.toLocaleString('en-IN')}/day × {days} {t('bookings.days')}
                        </p>
                      )}
                    </div>

                    <div className='flex flex-col gap-2'>
                      <button
                        onClick={() => downloadInvoice(booking._id)}
                        className='px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dull transition-colors text-sm flex items-center justify-center gap-2'
                      >
                        📄 {t('bookings.downloadInvoice')}
                      </button>
                      
                      <button
                        onClick={() => resendInvoice(booking._id)}
                        disabled={resendingInvoiceId === booking._id}
                        className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        {resendingInvoiceId === booking._id ? `⏳ ${t('bookings.sending')}` : `📧 ${t('bookings.resendInvoice')}`}
                      </button>

                      <button
                        onClick={() => viewBookingDetails(booking)}
                        className='px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2'
                      >
                        👁️ {t('bookings.viewDetails')}
                      </button>

                      {booking.status === 'completed' && (
                        <button
                          onClick={() => resendReviewEmail(booking._id)}
                          disabled={resendingReviewId === booking._id}
                          className='px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          {resendingReviewId === booking._id ? `⏳ ${t('bookings.sending')}` : `⭐ Resend Review Email`}
                        </button>
                      )}

                      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                        <button
                          onClick={() => cancelBooking(booking._id)}
                          disabled={cancellingBookingId === booking._id}
                          className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          {cancellingBookingId === booking._id ? `⏳ ${t('bookings.cancelling')}` : `❌ ${t('bookings.cancelBooking')}`}
                        </button>
                      )}

                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => {
                            setGpsBookingId(booking._id);
                            setShowGPSModal(true);
                          }}
                          className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2'
                        >
                          📍 GPS Tracking
                        </button>
                      )}
                      
                      {booking.status === 'pending' && (
                        <p className='text-xs text-yellow-600 text-center mt-1'>
                          {t('bookings.awaitingConfirmation')}
                        </p>
                      )}

                      {booking.status === 'cancelled' && (
                        <p className='text-xs text-red-600 text-center mt-1 font-medium'>
                          {t('bookings.bookingCancelled')}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
        )}
      </div>

      {/* Booking Details View - In-App */}
      {selectedBooking && (
        <div className='fixed inset-0 bg-white z-50 overflow-y-auto'>
          {/* Header with Back Button */}
          <div className='sticky top-0 bg-white border-b shadow-sm px-6 py-4 flex items-center gap-4 z-10'>
            <button 
              onClick={closeBookingDetails} 
              className='flex items-center gap-2 text-gray-600 hover:text-primary transition-colors'
            >
              <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
              </svg>
              <span className='font-medium'>Back</span>
            </button>
            <h2 className='text-xl font-semibold flex-1'>Booking Details</h2>
            <button 
              onClick={closeBookingDetails}
              className='text-gray-500 hover:text-gray-700 text-2xl'
            >
              &times;
            </button>
          </div>
          
          <div className='px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 py-8 space-y-6 max-w-7xl mx-auto'>
            {/* Booking Info */}
            <div className='bg-gray-50 p-6 rounded-lg border border-gray-200'>
              <h3 className='font-semibold mb-4 text-primary text-lg flex items-center gap-2'>
                <span className='w-2 h-2 bg-primary rounded-full'></span>
                Booking Information
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                <div className='flex justify-between md:block'>
                  <span className='text-gray-600'>Booking ID:</span> 
                  <span className='font-medium ml-2 md:ml-0 md:block'>{selectedBooking.bookingId}</span>
                </div>
                {selectedBooking.invoiceNumber && (
                  <div className='flex justify-between md:block'>
                    <span className='text-gray-600'>Invoice:</span> 
                    <span className='font-medium ml-2 md:ml-0 md:block'>{selectedBooking.invoiceNumber}</span>
                  </div>
                )}
                <div className='flex justify-between md:block'>
                  <span className='text-gray-600'>Status:</span> 
                  <span className={`font-medium ml-2 md:ml-0 md:block ${
                    selectedBooking.status === 'confirmed' ? 'text-green-600' : 
                    selectedBooking.status === 'pending' ? 'text-yellow-600' :
                    selectedBooking.status === 'completed' ? 'text-blue-600' :
                    'text-red-600'
                  }`}>{selectedBooking.status}</span>
                </div>
                <div className='flex justify-between md:block'>
                  <span className='text-gray-600'>Booked On:</span> 
                  <span className='font-medium ml-2 md:ml-0 md:block'>{new Date(selectedBooking.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Car Info */}
            <div className='bg-gray-50 p-6 rounded-lg border border-gray-200'>
              <h3 className='font-semibold mb-4 text-primary text-lg flex items-center gap-2'>
                <span className='w-2 h-2 bg-primary rounded-full'></span>
                Vehicle Details
              </h3>
              
              {selectedBooking.isCarReplaced && (
                <div className='mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded'>
                  <div className='flex items-start gap-2'>
                    <span className='text-2xl'>🔄</span>
                    <div className='flex-1'>
                      <h4 className='font-semibold text-yellow-800 mb-2'>Car Replacement Notice</h4>
                      <p className='text-sm text-yellow-700 mb-2'>
                        Your originally booked vehicle has been replaced with an alternative vehicle.
                      </p>
                      <div className='bg-white p-3 rounded mt-2'>
                        <p className='text-xs text-gray-600 font-semibold mb-1'>Reason for Replacement:</p>
                        <p className='text-sm text-gray-800'>{selectedBooking.replacementReason}</p>
                      </div>
                      {selectedBooking.replacedAt && (
                        <p className='text-xs text-yellow-600 mt-2'>
                          Replaced on: {new Date(selectedBooking.replacedAt).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                <div className='flex justify-between md:block'>
                  <span className='text-gray-600'>Vehicle:</span> 
                  <span className='font-medium ml-2 md:ml-0 md:block'>{getCarData(selectedBooking).brand} {getCarData(selectedBooking).model}</span>
                </div>
                <div className='flex justify-between md:block'>
                  <span className='text-gray-600'>Year:</span> 
                  <span className='font-medium ml-2 md:ml-0 md:block'>{getCarData(selectedBooking).year}</span>
                </div>
                <div className='flex justify-between md:block'>
                  <span className='text-gray-600'>Category:</span> 
                  <span className='font-medium ml-2 md:ml-0 md:block'>{getCarData(selectedBooking).category}</span>
                </div>
                <div className='flex justify-between md:block'>
                  <span className='text-gray-600'>Registration:</span> 
                  <span className='font-medium ml-2 md:ml-0 md:block'>{getCarData(selectedBooking).registration_number || 'N/A'}</span>
                </div>
              </div>
              
              {selectedBooking.isCarReplaced && selectedBooking.originalCarId && (
                <div className='mt-4 pt-4 border-t border-gray-300'>
                  <p className='text-xs text-gray-500 font-semibold mb-2'>Original Vehicle (Replaced):</p>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm bg-gray-100 p-3 rounded'>
                    <div className='flex justify-between md:block'>
                      <span className='text-gray-600'>Vehicle:</span> 
                      <span className='font-medium ml-2 md:ml-0 md:block line-through text-gray-500'>
                        {selectedBooking.originalCarId.brand} {selectedBooking.originalCarId.model}
                      </span>
                    </div>
                    <div className='flex justify-between md:block'>
                      <span className='text-gray-600'>Year:</span> 
                      <span className='font-medium ml-2 md:ml-0 md:block line-through text-gray-500'>
                        {selectedBooking.originalCarId.year}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trip Info */}
            <div className='bg-gray-50 p-6 rounded-lg border border-gray-200'>
              <h3 className='font-semibold mb-4 text-primary text-lg flex items-center gap-2'>
                <span className='w-2 h-2 bg-primary rounded-full'></span>
                Trip Details
              </h3>
              <div className='space-y-4 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Pickup:</span> 
                  <span className='font-medium text-right'>{selectedBooking.pickupLocation} ({new Date(selectedBooking.pickupDate).toLocaleString('en-IN')})</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Drop-off:</span> 
                  <span className='font-medium text-right'>{selectedBooking.dropLocation} ({new Date(selectedBooking.returnDate).toLocaleString('en-IN')})</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Duration:</span> 
                  <span className='font-medium'>{calculateDuration(selectedBooking.pickupDate, selectedBooking.returnDate)}</span>
                </div>
                {selectedBooking.distance && (
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Distance:</span> 
                    <span className='font-medium'>{selectedBooking.distance} km</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className='bg-gray-50 p-6 rounded-lg border border-gray-200'>
              <h3 className='font-semibold mb-4 text-primary text-lg flex items-center gap-2'>
                <span className='w-2 h-2 bg-primary rounded-full'></span>
                Payment Details
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                <div className='flex justify-between md:block'>
                  <span className='text-gray-600'>Total Amount:</span> 
                  <span className='font-medium text-lg text-primary ml-2 md:ml-0 md:block'>₹{(selectedBooking.totalAmount || selectedBooking.price).toLocaleString('en-IN')}</span>
                </div>
                <div className='flex justify-between md:block'>
                  <span className='text-gray-600'>Payment Method:</span> 
                  <span className='font-medium capitalize ml-2 md:ml-0 md:block'>{selectedBooking.paymentMethod || 'Cash on Delivery'}</span>
                </div>
                <div className='flex justify-between md:block'>
                  <span className='text-gray-600'>Payment Status:</span> 
                  <span className={`font-medium ml-2 md:ml-0 md:block ${getPaymentStatusDisplay(selectedBooking).color}`}>{getPaymentStatusDisplay(selectedBooking).text}</span>
                </div>
                {selectedBooking.pricePerDay && (
                  <div className='flex justify-between md:block'>
                    <span className='text-gray-600'>Price/Day:</span> 
                    <span className='font-medium ml-2 md:ml-0 md:block'>₹{selectedBooking.pricePerDay.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Review Section - Inline for completed bookings */}
            {selectedBooking.status === 'completed' && (
              <div className='bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-200'>
                {(() => {
                  const hasReview = existingReviews[selectedBooking._id];
                  console.log('Review check for booking:', {
                    bookingId: selectedBooking._id,
                    bookingIdString: selectedBooking.bookingId,
                    hasReview: hasReview,
                    existingReviews: existingReviews
                  });
                  
                  if (hasReview) {
                    // Review already submitted - show the review
                    const review = userReviews[selectedBooking._id];
                    return (
                      <div>
                        <div className='text-center py-6 border-b border-green-300'>
                          <div className='flex justify-center mb-4'>
                            <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className='text-xl font-semibold text-gray-800 mb-2'>Review Already Submitted</h3>
                          <p className='text-gray-600 mb-2'>Thank you for sharing your experience!</p>
                          <p className='text-sm text-gray-500'>You have already submitted a review for this booking.</p>
                        </div>
                        
                        {review && (
                          <div className='mt-6 bg-white p-6 rounded-lg border border-gray-200'>
                            <h4 className='font-semibold text-gray-800 mb-4 flex items-center gap-2'>
                              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              Your Review
                            </h4>
                            
                            {/* Rating Stars */}
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
                            
                            {/* Review Date */}
                            <div className='flex items-center justify-between text-sm text-gray-500'>
                              <span>Submitted on {new Date(review.createdAt).toLocaleDateString('en-IN', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}</span>
                              {review.updatedAt && review.updatedAt !== review.createdAt && (
                                <span className='text-xs'>(Edited)</span>
                              )}
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
                                        {new Date(review.ownerResponse.respondedAt).toLocaleDateString('en-IN')}
                                      </span>
                                    </div>
                                    <p className='text-gray-700 bg-blue-50 p-3 rounded-lg'>{review.ownerResponse.text}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // Show review form
                  return (
                    <>
                      <div className='flex items-center justify-between mb-4'>
                        <h3 className='font-semibold text-primary text-lg flex items-center gap-2'>
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          Rate & Review Your Experience
                        </h3>
                      </div>
                      
                      <div className='bg-white p-4 rounded-lg mb-4'>
                        <p className='text-sm text-gray-600'>Booking for:</p>
                        <p className='font-semibold text-gray-800'>
                          {getCarData(selectedBooking).brand} {getCarData(selectedBooking).model}
                        </p>
                        <p className='text-xs text-gray-500 mt-1'>
                          {new Date(selectedBooking.pickupDate).toLocaleDateString()} - {new Date(selectedBooking.returnDate).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <ReviewForm
                        bookingId={selectedBooking._id}
                        carId={getCarData(selectedBooking)._id}
                        onSuccess={async () => {
                          toast.success('Thank you for your review!');
                          // Fetch the newly created review
                          try {
                            const { data } = await axios.get('/reviews/user');
                            if (data.success) {
                              const reviewMap = {};
                              const reviewDataMap = {};
                              data.reviews.forEach(review => {
                                if (review.bookingId) {
                                  const bookingIdValue = typeof review.bookingId === 'object' 
                                    ? review.bookingId._id 
                                    : review.bookingId;
                                  if (bookingIdValue) {
                                    reviewMap[bookingIdValue] = true;
                                    reviewDataMap[bookingIdValue] = review;
                                  }
                                }
                              });
                              setExistingReviews(reviewMap);
                              setUserReviews(reviewDataMap);
                            }
                          } catch (error) {
                            console.error('Error fetching updated reviews:', error);
                          }
                          // Also refresh bookings
                          fetchMyBookings();
                        }}
                      />
                    </>
                  );
                })()}
              </div>
            )}

            {/* Action Buttons */}
            <div className='flex flex-col gap-3 sticky bottom-0 bg-white pt-4 pb-6 border-t'>
              <button 
                onClick={closeBookingDetails} 
                className='w-full px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS Tracking Modal */}
      {showGPSModal && gpsBookingId && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center'>
              <h2 className='text-xl font-semibold'>GPS Tracking</h2>
              <button
                onClick={() => {
                  setShowGPSModal(false);
                  setGpsBookingId(null);
                }}
                className='text-gray-500 hover:text-gray-700 text-2xl'
              >
                &times;
              </button>
            </div>
            <div className='p-6'>
              <GPSTracker bookingId={gpsBookingId} />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default MyBookings