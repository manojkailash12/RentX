import React, { useState } from 'react'
import Title from '../../components/owner/Title'
import { assets } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'

const AdminAddCar = () => {
  const { axios } = useAppContext()
  const navigate = useNavigate()

  const [image, setImage] = useState(null)
  const [car, setCar] = useState({
    brand: '',
    model: '',
    registration_number: '',
    year: '',
    pricePerDay: '',
    category: '',
    transmission: '',
    fuel_type: '',
    seating_capacity: '',
    location: '',
    description: '',
  })

  const [isLoading, setIsLoading] = useState(false)

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!image) {
      toast.error('Please upload a car image');
      return;
    }

    const requiredFields = [
      { field: 'brand', label: 'Brand' },
      { field: 'model', label: 'Model' },
      { field: 'registration_number', label: 'Registration Number' },
      { field: 'year', label: 'Year' },
      { field: 'pricePerDay', label: 'Daily Price' },
      { field: 'category', label: 'Category' },
      { field: 'transmission', label: 'Transmission' },
      { field: 'fuel_type', label: 'Fuel Type' },
      { field: 'seating_capacity', label: 'Seating Capacity' },
      { field: 'location', label: 'Location' },
      { field: 'description', label: 'Description' }
    ];

    for (const { field, label } of requiredFields) {
      if (!car[field] || car[field].toString().trim() === '') {
        toast.error(`${label} is required`);
        return;
      }
    }

    if (car.registration_number.length < 3) {
      toast.error('Registration number must be at least 3 characters');
      return;
    }

    if (car.year < 1990 || car.year > new Date().getFullYear() + 1) {
      toast.error('Please enter a valid year');
      return;
    }

    if (car.pricePerDay < 100) {
      toast.error('Daily price must be at least ₹100');
      return;
    }

    if (car.description.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Adding car to platform...');

    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('carData', JSON.stringify({
        ...car,
        year: parseInt(car.year),
        pricePerDay: parseFloat(car.pricePerDay),
        seating_capacity: parseInt(car.seating_capacity)
      }));

      const { data } = await axios.post('/owner/add-car', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(data.message);
        setImage(null);
        setCar({
          brand: '', model: '', registration_number: '', year: '',
          pricePerDay: '', category: '', transmission: '', fuel_type: '',
          seating_capacity: '', location: '', description: '',
        });
        setTimeout(() => navigate('/owner/manage-cars'), 1500);
      } else {
        toast.error(data.message || 'Failed to add car');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Add car error:', error);
      
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please check your connection and try again.');
      } else if (error.response?.status === 413) {
        toast.error('Image file is too large. Please use a smaller image.');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to add car. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-sky-400 via-blue-300 to-yellow-200 overflow-y-auto relative'>
      <div className="absolute top-10 left-10 w-24 h-12 bg-white rounded-full opacity-80 animate-float"></div>
      <div className="absolute top-20 right-20 w-32 h-14 bg-white rounded-full opacity-70 animate-float-delayed"></div>
      <div className="absolute top-32 left-1/3 w-28 h-12 bg-white rounded-full opacity-75 animate-float-slow"></div>

      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <div className="relative h-48">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gray-600 clip-mountain-1"></div>
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gray-500 clip-mountain-2"></div>
          <div className="absolute bottom-0 left-0 right-0 h-36 bg-gray-400 clip-mountain-3"></div>
        </div>
        <div className="h-8 bg-green-600"></div>
        <div className="h-4 bg-green-700"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-start justify-center p-3 md:p-4 pb-72 pt-8">
        <div className="w-full max-w-6xl my-8">
          <div className="mb-4">
            <BackButton />
          </div>
          <div className="mb-2">
            <Title title="Add New Car to Platform" subTitle="Add cars to the platform inventory. Admin cars are automatically approved and available for booking." />
          </div>

          <div className="mb-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Admin - Auto Approved
            </span>
          </div>

          <form onSubmit={onSubmitHandler} className='bg-white p-4 rounded-lg shadow-lg border border-gray-200'>

          <div className='mb-3'>
            <label className="block text-xs font-medium text-gray-700 mb-1">Car Image *</label>
            <div className='flex items-center gap-3'>
              <label htmlFor="car-image" className="cursor-pointer">
                <div className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-primary transition-colors ${image ? 'border-solid border-gray-200' : ''}`}>
                  {image ? (
                    <img src={URL.createObjectURL(image)} alt="Car preview" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <img src={assets.upload_icon} alt="Upload" className="w-6 h-6 opacity-50" />
                  )}
                </div>
                <input type="file" id="car-image" accept='image/*' hidden onChange={e => setImage(e.target.files[0])} required />
              </label>
              <div>
                <p className='text-xs text-gray-700 font-medium'>Upload a clear picture of the car</p>
                <p className='text-xs text-gray-500'>JPG, PNG or WEBP (Max 5MB)</p>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mb-3'>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Brand *</label>
              <input type="text" placeholder='e.g. BMW, Mercedes, Audi...' required className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary' value={car.brand} onChange={e => setCar({ ...car, brand: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Model *</label>
              <input type="text" placeholder='e.g. X5, E-Class, A4...' required className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary' value={car.model} onChange={e => setCar({ ...car, model: e.target.value })} />
            </div>
          </div>

          <div className='mb-3'>
            <label className="block text-xs font-medium text-gray-700 mb-1">Registration Number *</label>
            <input type="text" placeholder='e.g. MH-01-AB-1234' required className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary' value={car.registration_number} onChange={e => setCar({ ...car, registration_number: e.target.value })} />
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3'>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Year *</label>
              <input type="number" placeholder='2025' required min="1990" max={new Date().getFullYear() + 1} className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary' value={car.year} onChange={e => setCar({ ...car, year: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Daily Price (₹) *</label>
              <input type="number" placeholder='1000' required min="100" className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary' value={car.pricePerDay} onChange={e => setCar({ ...car, pricePerDay: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
              <select onChange={e => setCar({ ...car, category: e.target.value })} value={car.category} className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary' required>
                <option value="">Select a category</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Van">Van</option>
                <option value="Sports">Sports</option>
                <option value="Luxury">Luxury</option>
              </select>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3'>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Transmission *</label>
              <select onChange={e => setCar({ ...car, transmission: e.target.value })} value={car.transmission} className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary' required>
                <option value="">Select transmission</option>
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
                <option value="Semi-Automatic">Semi-Automatic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fuel Type *</label>
              <select onChange={e => setCar({ ...car, fuel_type: e.target.value })} value={car.fuel_type} className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary' required>
                <option value="">Select fuel type</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
                <option value="Hybrid">Hybrid</option>
                <option value="CNG">CNG</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Seating Capacity *</label>
              <select onChange={e => setCar({ ...car, seating_capacity: e.target.value })} value={car.seating_capacity} className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary' required>
                <option value="">Select capacity</option>
                <option value="2">2 Seater</option>
                <option value="4">4 Seater</option>
                <option value="5">5 Seater</option>
                <option value="7">7 Seater</option>
                <option value="8">8 Seater</option>
              </select>
            </div>
          </div>

          <div className='mb-3'>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
            <input type="text" placeholder='Enter city or area' required className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary' value={car.location} onChange={e => setCar({ ...car, location: e.target.value })} />
          </div>

          <div className='mb-3'>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
            <textarea rows={2} placeholder='Describe car features and condition...' required className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none' value={car.description} onChange={e => setCar({ ...car, description: e.target.value })} minLength="10"></textarea>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <button type="button" onClick={() => navigate('/owner/dashboard')} className='px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors'>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className='flex items-center gap-2 px-4 py-2 text-sm bg-primary hover:bg-primary-dull text-white rounded-md font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <img src={assets.tick_icon} alt="" className="w-4 h-4" />
                  Add to Platform
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}

export default AdminAddCar
