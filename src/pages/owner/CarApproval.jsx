import React, { useEffect, useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import Title from '../../components/owner/Title'
import toast from 'react-hot-toast'
import { assets } from '../../assets/assets'

const CarApproval = () => {
  const { axios, isAdmin } = useAppContext()
  const [pendingCars, setPendingCars] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCar, setSelectedCar] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const fetchPendingCars = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/owner/pending-cars')
      if (data.success) {
        setPendingCars(data.cars)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch pending cars')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (carId) => {
    try {
      const { data } = await axios.post('/owner/approve-reject-car', {
        carId,
        action: 'approve'
      })
      
      if (data.success) {
        toast.success(data.message)
        fetchPendingCars() // Refresh the list
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to approve car')
    }
  }

  const handleReject = async () => {
    if (!selectedCar || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    try {
      const { data } = await axios.post('/owner/approve-reject-car', {
        carId: selectedCar._id,
        action: 'reject',
        rejectionReason
      })
      
      if (data.success) {
        toast.success(data.message)
        setShowRejectModal(false)
        setSelectedCar(null)
        setRejectionReason('')
        fetchPendingCars() // Refresh the list
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to reject car')
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchPendingCars()
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className='px-4 pt-10 md:px-10 flex-1'>
        <div className='text-center py-20'>
          <h2 className='text-2xl font-semibold text-gray-600'>Access Denied</h2>
          <p className='text-gray-500 mt-2'>This page is only accessible to administrators.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='px-4 pt-10 md:px-10 flex-1'>
      <Title 
        title='Car Approval Management' 
        subTitle='Review and approve user-submitted vehicles for the platform' 
      />

      {loading ? (
        <div className='flex justify-center items-center py-20'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
        </div>
      ) : pendingCars.length === 0 ? (
        <div className='text-center py-20'>
          <img src={assets.carIconColored} alt="No cars" className='h-16 w-16 mx-auto mb-4 opacity-50' />
          <h3 className='text-xl font-semibold text-gray-600'>No Pending Approvals</h3>
          <p className='text-gray-500 mt-2'>All user-submitted cars have been reviewed.</p>
        </div>
      ) : (
        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8'>
          {pendingCars.map((car) => (
            <div key={car._id} className='border border-borderColor rounded-lg overflow-hidden hover:shadow-lg transition-shadow'>
              <img 
                src={car.image} 
                alt={`${car.brand} ${car.model}`}
                className='w-full h-48 object-cover'
              />
              <div className='p-4'>
                <h3 className='text-lg font-semibold'>{car.brand} {car.model}</h3>
                <p className='text-gray-600 text-sm mb-2'>{car.year} • {car.category}</p>
                
                <div className='space-y-1 text-sm text-gray-600 mb-4'>
                  <p><strong>Owner:</strong> {car.owner?.name} ({car.owner?.email})</p>
                  <p><strong>Location:</strong> {car.location}</p>
                  <p><strong>Price:</strong> ₹{car.pricePerDay}/day</p>
                  <p><strong>Seating:</strong> {car.seating_capacity} people</p>
                  <p><strong>Fuel:</strong> {car.fuel_type}</p>
                  <p><strong>Transmission:</strong> {car.transmission}</p>
                </div>

                <div className='bg-gray-50 p-3 rounded-md mb-4'>
                  <p className='text-sm text-gray-700'>
                    <strong>Description:</strong> {car.description}
                  </p>
                </div>

                <div className='flex gap-2'>
                  <button
                    onClick={() => handleApprove(car._id)}
                    className='flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors'
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCar(car)
                      setShowRejectModal(true)
                    }}
                    className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors'
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-6 rounded-lg max-w-md w-full mx-4'>
            <h3 className='text-lg font-semibold mb-4'>Reject Car Submission</h3>
            <p className='text-gray-600 mb-4'>
              Please provide a reason for rejecting this car submission:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder='Enter rejection reason...'
              className='w-full p-3 border border-gray-300 rounded-md resize-none h-24 mb-4'
              required
            />
            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setSelectedCar(null)
                  setRejectionReason('')
                }}
                className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className='flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'
              >
                Reject Car
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CarApproval