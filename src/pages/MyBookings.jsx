import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import Title from '../components/Title'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'

const MyBookings = () => {

  const { axios, user, currency } = useAppContext()

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState({})
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [cancellingBookingId, setCancellingBookingId] = useState(null)
  const [resendingInvoiceId, setResendingInvoiceId] = useState(null)

  const fetchMyBookings = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/bookings/user')
      if (data.success) {
        setBookings(data.bookings)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch bookings')
    } finally {
      setLoading(false)
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
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return
    }

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
    // Return the actual car image URL
    return car.image || assets.carIconColored
  }

  const getCarData = (booking) => {
    return booking.carId || booking.car
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
      <Title title='My Bookings' subTitle='View and manage your car bookings with invoice downloads' align='left' />

      <div>
        {bookings.length === 0 ? (
          <div className='text-center py-20'>
            <img src={assets.carIconColored} alt="No bookings" className='h-16 w-16 mx-auto mb-4 opacity-50' />
            <h3 className='text-xl font-semibold text-gray-600'>No Bookings Found</h3>
            <p className='text-gray-500 mt-2'>You haven't made any car bookings yet.</p>
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
                        {booking.status}
                      </p>
                    </div>

                    <div className='flex items-start gap-2 mt-3'>
                      <img src={assets.calendar_icon_colored} alt="" className='w-4 h-4 mt-1' />
                      <div>
                        <p className='text-gray-500'>Rental Period ({days} days)</p>
                        <p>{new Date(booking.pickupDate).toLocaleDateString('en-IN')} to {new Date(booking.returnDate).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>

                    <div className='flex items-start gap-2 mt-3'>
                      <img src={assets.location_icon_colored} alt="" className='w-4 h-4 mt-1' />
                      <div>
                        <p className='text-gray-500'>Journey</p>
                        <p>{booking.pickupLocation || car.location} → {booking.dropLocation || car.location}</p>
                        {booking.distance && (
                          <p className='text-sm text-gray-400'>Distance: {booking.distance} km</p>
                        )}
                      </div>
                    </div>

                    {booking.paymentMethod && (
                      <div className='flex items-start gap-2 mt-3'>
                        <div className='w-4 h-4 mt-1 bg-green-100 rounded-full flex items-center justify-center'>
                          <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                        </div>
                        <div>
                          <p className='text-gray-500'>Payment</p>
                          <p className='capitalize'>Cash on Delivery</p>
                          <p className={`text-xs font-medium ${getPaymentStatusDisplay(booking).color}`}>
                            {getPaymentStatusDisplay(booking).text}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* price and actions */}
                  <div className='md:col-span-1 flex flex-col justify-between gap-4'>
                    <div className='text-sm text-gray-500 text-right'>
                      <p>Total Amount</p>
                      <h1 className='text-2xl font-semibold text-primary'>
                        ₹{(booking.totalAmount || booking.price || 0).toLocaleString('en-IN')}
                      </h1>
                      <p className='text-xs'>Booked on {new Date(booking.createdAt).toLocaleDateString('en-IN')}</p>
                      {booking.pricePerDay && (
                        <p className='text-xs text-gray-400 mt-1'>
                          ₹{booking.pricePerDay.toLocaleString('en-IN')}/day × {days} days
                        </p>
                      )}
                    </div>

                    <div className='flex flex-col gap-2'>
                      <button
                        onClick={() => downloadInvoice(booking._id)}
                        className='px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dull transition-colors text-sm flex items-center justify-center gap-2'
                      >
                        📄 Download Invoice
                      </button>
                      
                      <button
                        onClick={() => resendInvoice(booking._id)}
                        disabled={resendingInvoiceId === booking._id}
                        className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        {resendingInvoiceId === booking._id ? '⏳ Sending...' : '📧 Resend Invoice'}
                      </button>

                      <button
                        onClick={() => viewBookingDetails(booking)}
                        className='px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2'
                      >
                        👁️ View Details
                      </button>

                      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                        <button
                          onClick={() => cancelBooking(booking._id)}
                          disabled={cancellingBookingId === booking._id}
                          className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          {cancellingBookingId === booking._id ? '⏳ Cancelling...' : '❌ Cancel Booking'}
                        </button>
                      )}
                      
                      {booking.status === 'pending' && (
                        <p className='text-xs text-yellow-600 text-center mt-1'>
                          Awaiting confirmation
                        </p>
                      )}

                      {booking.status === 'cancelled' && (
                        <p className='text-xs text-red-600 text-center mt-1 font-medium'>
                          Booking Cancelled
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
          <div className='sticky top-0 bg-white border-b shadow-sm px-6 py-4 flex items-center gap-4'>
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
          
          <div className='px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 py-8 space-y-6 max-w-4xl mx-auto'>
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
                  <span className='font-medium'>{calculateDays(selectedBooking.pickupDate, selectedBooking.returnDate)} days</span>
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
    </motion.div>
  )
}

export default MyBookings