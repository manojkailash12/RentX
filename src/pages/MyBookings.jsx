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

  const handleImageError = (bookingId, imageUrl) => {
    console.error(`Failed to load car image for booking ${bookingId}:`, imageUrl)
    setImageError(prev => ({ ...prev, [bookingId]: true }))
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
                        src={imageError[booking._id] ? assets.carIconColored : car.image} 
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
                        className='px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dull transition-colors text-sm'
                      >
                        📄 Download Invoice
                      </button>
                      
                      {booking.status === 'pending' && (
                        <p className='text-xs text-yellow-600 text-center'>
                          Awaiting confirmation
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
        )}
      </div>
    </motion.div>
  )
}

export default MyBookings