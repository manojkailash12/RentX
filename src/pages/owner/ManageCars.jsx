import React, { useEffect, useState } from 'react'
import { assets, dummyCarData } from '../../assets/assets'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'

const ManageCars = () => {

  const { isOwner, axios, currency, currencyLocale, isAdmin, isEmployee, downloadFile, getImageUrl } = useAppContext()
  const navigate = useNavigate()

  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const fetchOwnerCars = async () => {
    try {
      setLoading(true)
      console.log('🚗 Fetching owner cars...')
      const { data } = await axios.get('/owner/cars')
      console.log('📦 Response:', data)
      
      if (data.success) {
        console.log(`✅ Loaded ${data.cars.length} cars`)
        setCars(data.cars)
      } else {
        console.error('❌ Failed to fetch cars:', data.message)
        toast.error(data.message)
      }
    } catch (error) {
      console.error('❌ Error fetching cars:', error)
      toast.error(error.message || 'Failed to fetch cars')
    } finally {
      setLoading(false)
    }
  }

  const viewCarDetails = (carId) => {
    navigate(`/car-details/${carId}`)
  }

  const editCar = (carId) => {
    navigate(`/owner/edit-car/${carId}`)
  }

  const deleteCar = async (carId) => {
    // Use toast with custom confirmation
    const confirmDelete = () => {
      return new Promise((resolve) => {
        toast((t) => (
          <div className="flex flex-col gap-3">
            <p className="font-semibold">Delete Car</p>
            <p className="text-sm">Are you sure you want to delete this car? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="flex-1 px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ), { duration: Infinity });
      });
    };

    try {
      const confirmed = await confirmDelete();
      if (!confirmed) return;

      const { data } = await axios.post('/owner/delete-car', {carId})
      if (data.success) {
        toast.success(data.message)
        fetchOwnerCars()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete car')
    }
  }

  const getStatusBadge = (car) => {
    if (!car.isApproved) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
          Pending Approval
        </span>
      )
    }
    
    if (car.rejectionReason) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
          Rejected
        </span>
      )
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${
        car.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
      }`}>
        {car.isAvailable ? "Available" : "Unavailable"}
      </span>
    )
  }

  const getTitle = () => {
    if (isAdmin) return 'Manage Platform Cars';
    return 'Manage My Cars';
  }

  const getSubtitle = () => {
    if (isAdmin) return 'View and manage all cars on the platform, including user-submitted and admin cars.';
    return 'View your listed cars, update availability, or remove them from the platform.';
  }

  // Export function
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      await downloadFile('/admin/cars/export/excel', `cars-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Cars Excel exported successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExportLoading(false);
    }
  };

  // Export PDF function
  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      await downloadFile('/admin/cars/export/pdf', `cars-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Cars PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    isOwner && fetchOwnerCars()
  }, [isOwner])

  if (loading) {
    return (
      <div className='h-full flex flex-col p-4 md:p-6 bg-gray-50'>
        <div className='flex-1 flex justify-center items-center'>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">Loading cars...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='h-full flex flex-col p-4 md:p-6 bg-gray-50 overflow-auto'>
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="flex justify-between items-start mb-4">
        <Title title={getTitle()} subTitle={getSubtitle()} />
        <div className="flex items-center gap-2">
          {/* Export buttons for admin */}
          {isAdmin && (
            <>
              <button 
                type="button"
                onClick={handleExportPDF}
                disabled={exportLoading}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {exportLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '📄'
                )}
                PDF
              </button>
              <button 
                type="button"
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
            </>
          )}
          {isEmployee ? (
            <div className="flex gap-2">
              <button 
                onClick={() => navigate('/owner/add-admin-car')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
              >
                <img src={assets.addIconColored} alt="" className="w-4 h-4 filter brightness-0 invert" />
                Add Admin Car
              </button>
              <button 
                onClick={() => navigate('/owner/add-own-car')}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 text-sm"
              >
                <img src={assets.addIconColored} alt="" className="w-4 h-4 filter brightness-0 invert" />
                Add My Car
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/owner/add-car')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 text-sm"
            >
              <img src={assets.addIconColored} alt="" className="w-4 h-4 filter brightness-0 invert" />
              Add New Car
            </button>
          )}
        </div>
      </div>

      {/* Role indicator */}
      <div className="mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {isAdmin ? 'Admin Panel' : 'User Panel'}
        </span>
        <span className="ml-3 text-gray-600 text-sm">
          {cars.length} car{cars.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {cars.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-gray-200'>
            <img src={assets.carIconColored} alt="No cars" className='h-16 w-16 mb-4 opacity-50' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No Cars Found</h3>
            <p className='text-gray-500 text-center mb-4'>
              {isAdmin ? 'No cars have been added to the platform yet.' : 'You haven\'t listed any cars yet.'}
            </p>
            {isEmployee ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate('/owner/add-admin-car')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Admin Car
                </button>
                <button 
                  onClick={() => navigate('/owner/add-own-car')}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition-colors"
                >
                  Add My Car
                </button>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/owner/add-car')}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition-colors"
              >
                Add Your First Car
              </button>
            )}
          </div>
        ) : (
          <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse text-left text-sm text-gray-600'>
                <thead className='text-gray-500 bg-gray-50'>
                  <tr>
                    <th className='p-3 font-medium'>Car</th>
                    <th className='p-3 font-medium max-md:hidden'>Category</th>
                    <th className='p-3 font-medium'>Price</th>
                    <th className='p-3 font-medium'>Status</th>
                    <th className='p-3 font-medium max-md:hidden'>Added By</th>
                    <th className='p-3 font-medium'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map((car, index) => (
                    <tr key={car._id} className='border-t border-gray-200 hover:bg-gray-50'>
                      <td className='p-3 flex items-center gap-3'>
                        <img 
                          src={getImageUrl(car.image) || assets.car_image1} 
                          alt="" 
                          className='h-12 w-12 aspect-square rounded-md object-cover'
                          onError={(e) => {
                            console.log('Image load error for:', car.image);
                            console.log('Attempted URL:', getImageUrl(car.image));
                            e.target.src = assets.car_image1;
                          }}
                        />
                        <div>
                          <p className='font-medium'>{car.brand} {car.model}</p>
                          <p className='text-xs text-gray-500'>{car.year} • {car.seating_capacity} seats • {car.transmission}</p>
                          <p className='text-xs text-gray-400'>{car.location}</p>
                        </div>
                      </td>
                      <td className='p-3 max-md:hidden'>{car.category}</td>
                      <td className='p-3'>
                        <div>
                          <p className='font-medium'>₹{car.pricePerDay?.toLocaleString(currencyLocale) || 0}/day</p>
                          {car.ownerType === 'user' && (
                            <p className='text-xs text-blue-600'>Commission: {car.commissionRate || 60}%</p>
                          )}
                        </div>
                      </td>
                      <td className='p-3'>
                        {getStatusBadge(car)}
                        {car.rejectionReason && (
                          <p className='text-xs text-red-600 mt-1' title={car.rejectionReason}>
                            Reason: {car.rejectionReason.substring(0, 30)}...
                          </p>
                        )}
                      </td>
                      <td className='p-3 max-md:hidden'>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          car.ownerType === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {car.ownerType === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className='p-3'>
                        <div className='flex items-center gap-2'>
                          <button
                            onClick={() => viewCarDetails(car._id)}
                            className='px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors'
                            title='View Car Details'
                          >
                            View Details
                          </button>

                          <button
                            onClick={() => editCar(car._id)}
                            className='p-1 hover:bg-gray-200 rounded'
                            title='Edit Car'
                          >
                            <img src={assets.edit_icon} alt="" className='w-4 h-4' />
                          </button>

                          <button
                            onClick={() => deleteCar(car._id)}
                            className='p-1 hover:bg-red-100 rounded'
                            title='Delete Car'
                          >
                            <img src={assets.delete_icon} alt="" className='w-4 h-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary for non-admin users */}
        {!isAdmin && cars.length > 0 && (
          <div className='mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='bg-green-50 p-4 rounded-lg'>
              <h4 className='font-medium text-green-800'>Approved Cars</h4>
              <p className='text-2xl font-bold text-green-600'>
                {cars.filter(car => car.isApproved).length}
              </p>
            </div>
            <div className='bg-yellow-50 p-4 rounded-lg'>
              <h4 className='font-medium text-yellow-800'>Pending Approval</h4>
              <p className='text-2xl font-bold text-yellow-600'>
                {cars.filter(car => !car.isApproved && !car.rejectionReason).length}
              </p>
            </div>
            <div className='bg-red-50 p-4 rounded-lg'>
              <h4 className='font-medium text-red-800'>Rejected</h4>
              <p className='text-2xl font-bold text-red-600'>
                {cars.filter(car => car.rejectionReason).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageCars