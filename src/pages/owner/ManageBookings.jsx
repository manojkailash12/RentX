import React, { useEffect, useState } from 'react'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast';
import { assets } from '../../assets/assets';

const ManageBookings = () => {

  const { currency, axios, isAdmin, downloadFile } = useAppContext();

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const fetchOwnerBookings = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/bookings/owner')
      data.success ? setBookings(data.bookings) : toast.error(data.message)
    } catch (error) {
      toast.error(error.message || 'Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }

  const changeBookingStatus = async (bookingId, status) => {
    try {
      const { data } = await axios.post('/bookings/change-status', { bookingId, status })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  const updatePaymentStatus = async (bookingId, paymentStatus) => {
    try {
      const { data } = await axios.post('/bookings/update-payment-status', { bookingId, paymentStatus })
      if (data.success) {
        toast.success('Payment status updated')
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update payment status')
    }
  }

  const downloadInvoice = async (bookingId) => {
    try {
      await downloadFile(`/bookings/invoice/${bookingId}`, `invoice-${bookingId}.pdf`);
    } catch (error) {
      toast.error('Failed to download invoice')
    }
  }

  const getCarData = (booking) => {
    return booking.carId || booking.car
  }

  const getUserData = (booking) => {
    return booking.userId || booking.user
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
        return { text: 'Paid', color: 'text-green-700', bg: 'bg-green-100' }
      }
      return { text: 'Pay at Drop-Off', color: 'text-orange-700', bg: 'bg-orange-100' }
    }
    
    // For online payments
    if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'completed') {
      return { text: 'Paid', color: 'text-green-700', bg: 'bg-green-100' }
    } else if (booking.paymentStatus === 'failed') {
      return { text: 'Payment Failed', color: 'text-red-700', bg: 'bg-red-100' }
    }
    return { text: 'Pay at Drop-Off', color: 'text-orange-700', bg: 'bg-orange-100' }
  }

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    return booking.status === filter
  })

  const getTitle = () => {
    if (isAdmin) return 'Manage All Bookings';
    return 'Manage My Car Bookings';
  }

  const getSubtitle = () => {
    if (isAdmin) return 'Track all platform bookings, manage statuses, and download invoices.';
    return 'Track bookings for your cars, approve or cancel requests, and manage booking statuses.';
  }

  // Export function
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      await downloadFile('/admin/bookings/export/excel', `bookings-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerBookings();
  }, [])

  if (loading) {
    return (
      <div className='h-full flex flex-col p-4 md:p-6 bg-gray-50'>
        <div className='flex-1 flex justify-center items-center'>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">Loading bookings...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='h-full flex flex-col p-4 md:p-6 bg-gray-50 overflow-auto'>
      <div className="flex justify-between items-start mb-4">
        <Title title={getTitle()} subTitle={getSubtitle()} />
        {/* Export button for admin */}
        {isAdmin && (
          <button 
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {exportLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              '📊'
            )}
            Excel
          </button>
        )}
      </div>

      {/* Filter buttons */}
      <div className='flex gap-2 mb-4 flex-wrap'>
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === status 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} 
            ({status === 'all' ? bookings.length : bookings.filter(b => b.status === status).length})
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {filteredBookings.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-gray-200'>
            <img src={assets.listIconColored} alt="No bookings" className='h-16 w-16 mb-4 opacity-50' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No Bookings Found</h3>
            <p className='text-gray-500 text-center'>
              {filter === 'all' ? 'No bookings have been made yet.' : `No ${filter} bookings found.`}
            </p>
          </div>
        ) : (
          <div className='bg-white rounded-lg border border-gray-200 overflow-hidden mb-6'>
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse text-left text-sm text-gray-600'>
                <thead className='text-gray-500 bg-gray-50'>
                  <tr>
                    <th className='p-3 font-medium'>Booking Details</th>
                    <th className='p-3 font-medium max-md:hidden'>Customer</th>
                    <th className='p-3 font-medium max-md:hidden'>Journey</th>
                    <th className='p-3 font-medium'>Amount</th>
                    <th className='p-3 font-medium max-md:hidden'>Payment</th>
                    <th className='p-3 font-medium'>Status</th>
                    <th className='p-3 font-medium'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking, index) => {
                    const car = getCarData(booking)
                    const user = getUserData(booking)
                    const days = calculateDays(booking.pickupDate, booking.returnDate)
                    
                    return (
                      <tr key={booking._id} className='border-t border-gray-200 text-gray-500 hover:bg-gray-50'>
                        <td className='p-3'>
                          <div className='flex items-center gap-3'>
                            {car ? (
                              <>
                                <img
                                  src={car.image || assets.car_image1}
                                  alt={`${car.brand} ${car.model}`}
                                  className='h-12 w-12 aspect-square rounded-md object-cover'
                                  onError={(e) => {
                                    e.target.src = assets.car_image1;
                                  }}
                                />
                                <div>
                                  <p className='font-medium'>{car.brand} {car.model}</p>
                                  <p className='text-xs text-gray-400'>
                                    {booking.bookingId || `#${index + 1}`}
                                  </p>
                                  <p className='text-xs text-gray-400'>
                                    {new Date(booking.pickupDate).toLocaleDateString('en-IN')} - {new Date(booking.returnDate).toLocaleDateString('en-IN')} ({days} days)
                                  </p>
                                </div>
                              </>
                            ) : (
                              <p className='text-red-500 italic'>Car info not available</p>
                            )}
                          </div>
                        </td>

                        <td className='p-3 max-md:hidden'>
                          {user ? (
                            <div>
                              <p className='font-medium'>{user.name}</p>
                              <p className='text-xs text-gray-400'>{user.email}</p>
                            </div>
                          ) : (
                            <p className='text-red-500 italic'>User info not available</p>
                          )}
                        </td>

                        <td className='p-3 max-md:hidden'>
                          <div>
                            <p className='text-xs text-gray-500'>From: {booking.pickupLocation || car?.location || 'N/A'}</p>
                            <p className='text-xs text-gray-500'>To: {booking.dropLocation || car?.location || 'N/A'}</p>
                            {booking.distance && (
                              <p className='text-xs text-gray-400'>{booking.distance} km</p>
                            )}
                          </div>
                        </td>

                        <td className='p-3'>
                          <div>
                            <p className='font-medium'>₹{(booking.totalAmount || booking.price || 0).toLocaleString('en-IN')}</p>
                            {booking.ownerEarnings && (
                              <p className='text-xs text-green-600'>
                                Your earnings: ₹{booking.ownerEarnings.toLocaleString('en-IN')}
                              </p>
                            )}
                            {booking.commissionRate > 0 && (
                              <p className='text-xs text-blue-600'>
                                Commission: {booking.commissionRate}%
                              </p>
                            )}
                          </div>
                        </td>

                        <td className='p-3 max-md:hidden'>
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                            Cash on Delivery
                          </span>
                          <p className={`text-xs mt-1 font-medium ${getPaymentStatusDisplay(booking).color}`}>
                            {getPaymentStatusDisplay(booking).text}
                          </p>
                        </td>

                        <td className='p-3'>
                          {booking.status === 'pending' ? (
                            <select
                              onChange={(e) => changeBookingStatus(booking._id, e.target.value)}
                              value={booking.status}
                              className='px-2 py-1.5 text-gray-500 border border-gray-300 rounded-md outline-none text-xs'
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirm</option>
                              <option value="cancelled">Cancel</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {booking.status}
                            </span>
                          )}
                        </td>

                        <td className='p-3'>
                          <div className='flex gap-2 flex-wrap'>
                            <button
                              onClick={() => downloadInvoice(booking._id)}
                              className='px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors'
                              title='Download Invoice'
                            >
                              📄 PDF
                            </button>
                            
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => changeBookingStatus(booking._id, 'completed')}
                                className='px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors'
                                title='Mark as Completed'
                              >
                                ✓ Complete
                              </button>
                            )}

                            {booking.paymentMethod === 'cash' && booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'completed' && (
                              <button
                                onClick={() => updatePaymentStatus(booking._id, 'paid')}
                                className='px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200 transition-colors'
                                title='Mark Payment as Received'
                              >
                                💰 Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary stats */}
        {bookings.length > 0 && (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='bg-blue-50 p-4 rounded-lg'>
              <h4 className='font-medium text-blue-800'>Total Bookings</h4>
              <p className='text-2xl font-bold text-blue-600'>{bookings.length}</p>
            </div>
            <div className='bg-green-50 p-4 rounded-lg'>
              <h4 className='font-medium text-green-800'>Confirmed</h4>
              <p className='text-2xl font-bold text-green-600'>
                {bookings.filter(b => b.status === 'confirmed').length}
              </p>
            </div>
            <div className='bg-yellow-50 p-4 rounded-lg'>
              <h4 className='font-medium text-yellow-800'>Pending</h4>
              <p className='text-2xl font-bold text-yellow-600'>
                {bookings.filter(b => b.status === 'pending').length}
              </p>
            </div>
            <div className='bg-purple-50 p-4 rounded-lg'>
              <h4 className='font-medium text-purple-800'>Total Revenue</h4>
              <p className='text-2xl font-bold text-purple-600'>
                ₹{bookings
                  .filter(b => ['confirmed', 'completed'].includes(b.status))
                  .reduce((sum, b) => sum + (b.ownerEarnings || b.totalAmount || b.price || 0), 0)
                  .toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageBookings