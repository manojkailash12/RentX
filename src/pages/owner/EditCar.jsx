import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';
import toast from 'react-hot-toast';
import Title from '../../components/owner/Title';

const EditCar = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { axios, isOwner, isAdmin } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [fetchingCar, setFetchingCar] = useState(true);
  const [carData, setCarData] = useState({
    brand: '',
    model: '',
    year: '',
    category: '',
    seating_capacity: '',
    fuel_type: '',
    transmission: '',
    pricePerDay: '',
    location: '',
    description: '',
    isAvailable: true
  });
  const [currentImage, setCurrentImage] = useState('');
  const [newImage, setNewImage] = useState(null);

  const categories = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Wagon', 'Pickup', 'Van'];
  const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
  const transmissions = ['Manual', 'Automatic', 'Semi-Automatic'];

  // Fetch car data
  const fetchCarData = async () => {
    try {
      setFetchingCar(true);
      const { data } = await axios.get(`/owner/car/${id}`);
      if (data.success) {
        const car = data.car;
        setCarData({
          brand: car.brand,
          model: car.model,
          year: car.year,
          category: car.category,
          seating_capacity: car.seating_capacity,
          fuel_type: car.fuel_type,
          transmission: car.transmission,
          pricePerDay: car.pricePerDay,
          location: car.location,
          description: car.description,
          isAvailable: car.isAvailable
        });
        setCurrentImage(car.image);
      } else {
        toast.error(data.message);
        navigate('/owner/manage-cars');
      }
    } catch (error) {
      toast.error('Failed to fetch car details');
      navigate('/owner/manage-cars');
    } finally {
      setFetchingCar(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCarData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      setNewImage(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!carData.brand || !carData.model || !carData.year || !carData.pricePerDay) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (carData.year < 1900 || carData.year > new Date().getFullYear() + 1) {
      toast.error('Please enter a valid year');
      return;
    }

    if (carData.pricePerDay < 1) {
      toast.error('Price per day must be greater than 0');
      return;
    }

    if (carData.description.length < 10) {
      toast.error('Description must be at least 10 characters long');
      return;
    }

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('carData', JSON.stringify(carData));
      
      if (newImage) {
        formData.append('image', newImage);
      }

      const { data } = await axios.put(`/owner/car/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (data.success) {
        toast.success('Car updated successfully!');
        navigate('/owner/manage-cars');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update car');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner || isAdmin) {
      fetchCarData();
    } else {
      navigate('/');
    }
  }, [isOwner, isAdmin, id]);

  if (fetchingCar) {
    return (
      <div className='px-4 pt-10 md:px-10 w-full'>
        <div className='flex justify-center items-center py-20'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='px-4 pt-10 md:px-10 w-full'>
      <Title title="Edit Car" subTitle="Update your car details and information" />
      
      <div className='max-w-4xl mx-auto'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Current Image */}
          {currentImage && (
            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Current Image</label>
              <img 
                src={currentImage} 
                alt="Current car" 
                className='w-full max-w-md h-48 object-cover rounded-lg border'
              />
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Update Image (Optional)
            </label>
            <div className='flex items-center gap-4'>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className='block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dull'
              />
              {newImage && (
                <span className='text-sm text-green-600'>✓ New image selected</span>
              )}
            </div>
          </div>

          {/* Car Details Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Brand */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Brand *
              </label>
              <input
                type="text"
                name="brand"
                value={carData.brand}
                onChange={handleInputChange}
                required
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder="e.g., Toyota, Honda, BMW"
              />
            </div>

            {/* Model */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Model *
              </label>
              <input
                type="text"
                name="model"
                value={carData.model}
                onChange={handleInputChange}
                required
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder="e.g., Camry, Civic, X5"
              />
            </div>

            {/* Year */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Year *
              </label>
              <input
                type="number"
                name="year"
                value={carData.year}
                onChange={handleInputChange}
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
              />
            </div>

            {/* Category */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Category *
              </label>
              <select
                name="category"
                value={carData.category}
                onChange={handleInputChange}
                required
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Seating Capacity */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Seating Capacity *
              </label>
              <select
                name="seating_capacity"
                value={carData.seating_capacity}
                onChange={handleInputChange}
                required
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
              >
                <option value="">Select Seats</option>
                {[2, 4, 5, 6, 7, 8, 9].map(seats => (
                  <option key={seats} value={seats}>{seats} Seats</option>
                ))}
              </select>
            </div>

            {/* Fuel Type */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Fuel Type *
              </label>
              <select
                name="fuel_type"
                value={carData.fuel_type}
                onChange={handleInputChange}
                required
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
              >
                <option value="">Select Fuel Type</option>
                {fuelTypes.map(fuel => (
                  <option key={fuel} value={fuel}>{fuel}</option>
                ))}
              </select>
            </div>

            {/* Transmission */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Transmission *
              </label>
              <select
                name="transmission"
                value={carData.transmission}
                onChange={handleInputChange}
                required
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
              >
                <option value="">Select Transmission</option>
                {transmissions.map(trans => (
                  <option key={trans} value={trans}>{trans}</option>
                ))}
              </select>
            </div>

            {/* Price Per Day */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Price Per Day (₹) *
              </label>
              <input
                type="number"
                name="pricePerDay"
                value={carData.pricePerDay}
                onChange={handleInputChange}
                required
                min="1"
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder="e.g., 1500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Location *
            </label>
            <input
              type="text"
              name="location"
              value={carData.location}
              onChange={handleInputChange}
              required
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
              placeholder="e.g., Mumbai, Delhi, Bangalore"
            />
          </div>

          {/* Description */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Description *
            </label>
            <textarea
              name="description"
              value={carData.description}
              onChange={handleInputChange}
              required
              rows="4"
              minLength="10"
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
              placeholder="Describe your car's features, condition, and any special notes..."
            />
            <p className='text-sm text-gray-500 mt-1'>
              {carData.description.length}/10 characters minimum
            </p>
          </div>

          {/* Availability */}
          <div className='flex items-center gap-3'>
            <input
              type="checkbox"
              name="isAvailable"
              id="isAvailable"
              checked={carData.isAvailable}
              onChange={handleInputChange}
              className='h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded'
            />
            <label htmlFor="isAvailable" className='text-sm font-medium text-gray-700'>
              Car is available for booking
            </label>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-4 pt-6'>
            <button
              type="submit"
              disabled={loading}
              className='flex-1 bg-primary text-white py-3 px-6 rounded-md hover:bg-primary-dull transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? 'Updating...' : 'Update Car'}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/owner/manage-cars')}
              className='flex-1 bg-gray-500 text-white py-3 px-6 rounded-md hover:bg-gray-600 transition-colors'
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCar;