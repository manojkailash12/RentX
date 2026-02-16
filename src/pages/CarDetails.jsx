import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assets, dummyCarData } from "../assets/assets";
import Loader from "../components/Loader";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import ReviewList from "../components/Reviews/ReviewList";
import ReviewForm from "../components/Reviews/ReviewForm";
import OwnerResponseForm from "../components/Reviews/OwnerResponseForm";
import ContactOwnerButton from "../components/ContactOwnerButton";
import InsuranceSelector from "../components/Insurance/InsuranceSelector";

const CarDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { cars, axios, user, isAdmin, currencyLocale, getImageUrl } = useAppContext()
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [dropCity, setDropCity] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('10:00');
  const [pricingType, setPricingType] = useState('daily'); // 'daily' or 'per_km'
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState(0);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [userCompletedBookings, setUserCompletedBookings] = useState([]);
  const [unreviewedBookings, setUnreviewedBookings] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewsKey, setReviewsKey] = useState(0);
  const [selectedInsurance, setSelectedInsurance] = useState(null);
  const currency = import.meta.env.VITE_CURRENCY
  const pricePerKm = 15; // Fixed price per km for all vehicles

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to book a car');
      return;
    }

    // Prevent admin from booking cars
    if (user.role === 'admin') {
      toast.error('Admins cannot book cars. Please use a regular user account.');
      return;
    }

    if (!pickupLocation || !pickupCity || !dropLocation || !dropCity) {
      toast.error('Please enter pickup and drop locations with cities');
      return;
    }

    if (!pickupDate || !returnDate || !pickupTime || !returnTime) {
      toast.error('Please select pickup and return dates and times');
      return;
    }

    // Combine date and time for validation
    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
    const returnDateTime = new Date(`${returnDate}T${returnTime}`);
    const now = new Date();

    if (pickupDateTime < now) {
      toast.error('Pickup date and time cannot be in the past');
      return;
    }

    if (returnDateTime <= pickupDateTime) {
      toast.error('Return date and time must be after pickup date and time');
      return;
    }

    // Check minimum booking duration (at least 1 hour)
    const diffHours = (returnDateTime - pickupDateTime) / (1000 * 60 * 60);
    if (diffHours < 1) {
      toast.error('Minimum booking duration is 1 hour');
      return;
    }

    try {
      setLoading(true);
      
      // First check availability for the selected dates
      const availabilityResponse = await axios.post('/bookings/check-car-availability', {
        carId: id,
        pickupDate: pickupDateTime.toISOString(),
        returnDate: returnDateTime.toISOString()
      });

      if (!availabilityResponse.data.success || !availabilityResponse.data.available) {
        toast.error('Car is not available for the selected dates and times. Please choose different dates.');
        return;
      }

      const { data } = await axios.post('/bookings/create', {
        carId: id,
        pickupDate: pickupDateTime.toISOString(),
        returnDate: returnDateTime.toISOString(),
        pickupLocation,
        pickupCity,
        dropLocation,
        dropCity,
        pricingType,
        paymentMethod,
        insurance: selectedInsurance
      })
      
      if (data.success) {
        toast.success(data.message);
        navigate('/my-bookings');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  }

  const checkCarAvailability = async () => {
    if (pickupDate && returnDate && pickupTime && returnTime && id) {
      try {
        setCheckingAvailability(true);
        const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
        const returnDateTime = new Date(`${returnDate}T${returnTime}`);
        
        const response = await axios.post('/bookings/check-car-availability', {
          carId: id,
          pickupDate: pickupDateTime.toISOString(),
          returnDate: returnDateTime.toISOString()
        });
        
        setAvailabilityStatus(response.data);
      } catch (error) {
        console.error('Availability check error:', error);
        setAvailabilityStatus({ 
          success: false, 
          available: false, 
          message: 'Unable to check availability' 
        });
      } finally {
        setCheckingAvailability(false);
      }
    } else {
      setAvailabilityStatus(null);
    }
  };

  // Check availability when dates or times change
  useEffect(() => {
    const timer = setTimeout(() => {
      checkCarAvailability();
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [pickupDate, pickupTime, returnDate, returnTime, id]);

  const calculateDistance = async () => {
    if (pickupLocation && pickupCity && dropLocation && dropCity && 
        (pickupLocation !== dropLocation || pickupCity !== dropCity)) {
      try {
        setCalculatingDistance(true);
        const fullPickupLocation = `${pickupLocation}, ${pickupCity}`;
        const fullDropLocation = `${dropLocation}, ${dropCity}`;
        
        const { data } = await axios.post('/bookings/calculate-distance', {
          pickupLocation: fullPickupLocation,
          dropLocation: fullDropLocation
        });
        
        if (data.success) {
          setDistance(data.distance);
        } else {
          console.error('Distance calculation failed:', data.message);
          setDistance(0);
        }
      } catch (error) {
        console.error('Distance calculation error:', error);
        setDistance(0);
      } finally {
        setCalculatingDistance(false);
      }
    } else {
      setDistance(0);
    }
  };

  // Calculate distance when locations change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateDistance();
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timer);
  }, [pickupLocation, pickupCity, dropLocation, dropCity]);

  const calculateDays = () => {
    if (pickupDate && returnDate && pickupTime && returnTime) {
      const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
      const returnDateTime = new Date(`${returnDate}T${returnTime}`);
      
      // Calculate the difference in milliseconds
      const diffTime = returnDateTime.getTime() - pickupDateTime.getTime();
      
      // Convert to days (including fractional days based on hours)
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      // Return at least 0.04 days (1 hour minimum) and round to 2 decimal places
      return Math.max(0.04, Math.round(diffDays * 100) / 100);
    }
    return 1;
  }

  const getTotalAmount = () => {
    if (!car) return 0;
    
    let baseAmount = 0;
    if (pricingType === 'per_km') {
      // Per kilometer pricing - calculate round trip (up + down)
      const roundTripDistance = distance * 2; // Double the distance for round trip
      baseAmount = Math.round(roundTripDistance * pricePerKm);
    } else {
      // Daily pricing
      const days = calculateDays();
      baseAmount = Math.round(car.pricePerDay * days);
    }
    
    // Add insurance cost if selected
    if (selectedInsurance && selectedInsurance.cost) {
      baseAmount += selectedInsurance.cost;
    }
    
    return baseAmount;
  }

  const formatDuration = (days) => {
    const totalHours = days * 24;
    
    if (totalHours < 24) {
      return `${Math.round(totalHours)} hours`;
    } else if (days === 1) {
      return '1 day';
    } else if (days % 1 === 0) {
      return `${days} days`;
    } else {
      const wholeDays = Math.floor(days);
      const remainingHours = Math.round((days - wholeDays) * 24);
      if (wholeDays === 0) {
        return `${remainingHours} hours`;
      } else if (remainingHours === 0) {
        return `${wholeDays} days`;
      } else {
        return `${wholeDays} days ${remainingHours} hours`;
      }
    }
  }

  useEffect(() => {
    setCar(cars.find(car => car._id === id));
  }, [cars, id]);

  // Check if user has completed bookings for this car
  useEffect(() => {
    const checkUserBookings = async () => {
      if (user && id && !isAdmin) {
        try {
          // Fetch user's bookings
          const bookingsResponse = await axios.get('/bookings/my-bookings', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const completedBookings = bookingsResponse.data.bookings?.filter(
            booking => booking.carId === id && booking.status === 'completed'
          ) || [];
          setUserCompletedBookings(completedBookings);

          // Fetch user's reviews to filter out already reviewed bookings
          const reviewsResponse = await axios.get('/reviews/user', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const userReviews = reviewsResponse.data.reviews || [];
          const reviewedBookingIds = new Set(
            userReviews.map(review => review.bookingId?._id || review.bookingId)
          );

          // Filter out bookings that already have reviews
          const unreviewed = completedBookings.filter(
            booking => !reviewedBookingIds.has(booking._id)
          );
          setUnreviewedBookings(unreviewed);
        } catch (error) {
          console.error('Error checking bookings:', error);
        }
      }
    };
    checkUserBookings();
  }, [user, id, isAdmin, reviewsKey]); // Add reviewsKey to refresh after review submission

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setReviewsKey(prev => prev + 1); // Force ReviewList to reload
    toast.success('Thank you for your review!');
  };

  const renderStars = (rating) => {
    return (
      <div className="flex text-yellow-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="text-xl">
            {star <= Math.round(rating) ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  return car ? (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32 mt-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-4 text-gray-500 cursor-pointer text-sm"
      >
        <img src={assets.arrow_icon} alt="" className="rotate-180 opacity-65 h-4" />
        {t('carDetails.backToAll')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* left: Car Image and details */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2">
          <motion.img
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            src={getImageUrl(car.image) || assets.car_image1}
            alt=""
            className="w-full h-auto max-h-80 object-contain rounded-xl mb-4 shadow-md bg-gray-50"
          />
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold">
                {car.brand} {car.model}
              </h1>
              <p className="text-gray-500 text-base">
                {car.category} • {car.year}
              </p>
              {car.ownerType === 'user' && (
                <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mt-1">
                  Listed by User • Commission: {car.commissionRate || 60}%
                </p>
              )}
            </div>
            <hr className="border-borderColor my-3" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  icon: assets.users_icon,
                  text: `${car.seating_capacity} Seats`,
                },
                { icon: assets.fuel_icon, text: car.fuel_type },
                { icon: assets.car_icon, text: car.transmission },
                { icon: assets.location_icon, text: car.location },
              ].map(({ icon, text }) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  key={text}
                  className="flex flex-col items-center bg-light p-3 rounded-lg text-sm"
                >
                  <img src={icon} alt="" className="h-4 mb-1" />
                  {text}
                </motion.div>
              ))}
            </div>
            {/* description */}
            <div>
              <h1 className="text-lg font-medium mb-2">{t('carDetails.description')}</h1>
              <p className="text-gray-500 text-sm">{car.description}</p>
            </div>

            {/* feature */}
            <div>
              <h1 className="text-lg font-medium mb-2">{t('carDetails.features')}</h1>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {
                  ["360 Camera", "Bluetooth", "GPS", "Heated Seats", "Rear View Mirror"].map((item) => (
                    <li key={item} className="flex items-center text-gray-500 text-sm">
                      <img src={assets.check_icon} className="h-3 mr-2" alt="" />
                      {item}
                    </li>
                  ))
                }
              </ul>
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Booking form or Admin View */}
        {isAdmin ? (
          // Admin View - Read-only car information
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="shadow-lg h-max sticky top-18 rounded-xl p-6 space-y-6 text-gray-500"
          >
            <div className="text-center">
              <h2 className="text-2xl text-gray-800 font-semibold mb-2">{t('carDetails.vehicleDetails')}</h2>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                {t('carDetails.adminView')}
              </span>
            </div>

            <hr className="border-borderColor my-6" />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">{t('carDetails.pricing')}</h3>
                <p className="text-2xl text-gray-800 font-semibold">
                  Rs. {car.pricePerDay.toLocaleString(currencyLocale)} 
                  <span className="text-base text-gray-400 font-normal"> {t('carDetails.perDay')}</span>
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">{t('carDetails.status')}</h3>
                <div className="flex gap-2 flex-wrap">
                  {car.isCurrentlyBooked ? (
                    <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
                      Currently Booked
                    </span>
                  ) : car.isAvailable ? (
                    <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                      {t('carDetails.available')}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                      {t('carDetails.unavailable')}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    car.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {car.isApproved ? t('carDetails.approved') : t('carDetails.pendingApproval')}
                  </span>
                </div>
                {car.isCurrentlyBooked && car.bookedUntil && (
                  <p className="text-xs text-gray-500 mt-1">
                    Available after: {new Date(car.bookedUntil).toLocaleDateString()} {new Date(car.bookedUntil).toLocaleTimeString()}
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">{t('carDetails.ownerType')}</h3>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  car.ownerType === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {car.ownerType === 'admin' ? t('carDetails.platformCar') : t('carDetails.userListed')}
                </span>
              </div>

              {car.ownerType === 'user' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">{t('carDetails.commissionRate')}</h3>
                  <p className="text-lg font-medium text-blue-600">{car.commissionRate || 60}%</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">{t('carDetails.location')}</h3>
                <p className="text-gray-700">{car.location}</p>
              </div>

              {car.rejectionReason && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-red-700 mb-1">{t('carDetails.rejectionReason')}</h3>
                  <p className="text-sm text-red-600">{car.rejectionReason}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">{t('carDetails.carId')}</h3>
                <p className="text-xs text-gray-500 font-mono">{car._id}</p>
              </div>
            </div>

            <hr className="border-borderColor my-6" />

            <div className="space-y-2">
              <button
                onClick={() => navigate(`/owner/edit-car/${car._id}`)}
                className="w-full bg-primary hover:bg-primary-dull transition-all py-3 font-medium text-white rounded-xl"
              >
                {t('carDetails.editCarDetails')}
              </button>
              <button
                onClick={() => navigate('/owner/manage-cars')}
                className="w-full bg-gray-100 hover:bg-gray-200 transition-all py-3 font-medium text-gray-700 rounded-xl"
              >
                {t('carDetails.backToManage')}
              </button>
            </div>

            <p className="text-center text-xs text-gray-500">
              🔒 {t('carDetails.adminViewNote')}
            </p>
          </motion.div>
        ) : (
          // Regular User View - Booking form
          <motion.form
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          onSubmit={handleSubmit} 
          className="shadow-lg h-max sticky top-18 rounded-xl p-4 space-y-3 text-gray-500"
        >
          <div className="text-center">
            <p className="text-xl text-gray-800 font-semibold">
              {pricingType === 'daily' ? (
                <>
                  Rs. {car.pricePerDay.toLocaleString(currencyLocale)} 
                  <span className="text-sm text-gray-400 font-normal"> {t('carDetails.perDay')}</span>
                </>
              ) : (
                <>
                  Rs. {pricePerKm} 
                  <span className="text-sm text-gray-400 font-normal"> {t('carDetails.perKm')}</span>
                </>
              )}
            </p>
            
            {/* Pricing Type Selector */}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPricingType('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pricingType === 'daily' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('carDetails.dailyRental')}
              </button>
              <button
                type="button"
                onClick={() => setPricingType('per_km')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pricingType === 'per_km' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Per KM
              </button>
            </div>
          </div>

          <hr className="border-borderColor my-3" />

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="pickup-location" className="text-xs">{t('carDetails.pickupLocation')}</label>
              <input 
                value={pickupLocation} 
                onChange={(e) => setPickupLocation(e.target.value)} 
                type="text" 
                className="border border-borderColor px-2 py-1.5 rounded-lg text-sm" 
                required 
                id="pickup-location"
                placeholder="Location"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="pickup-city" className="text-xs">{t('carDetails.pickupCity')}</label>
              <input 
                value={pickupCity} 
                onChange={(e) => setPickupCity(e.target.value)} 
                type="text" 
                className="border border-borderColor px-2 py-1.5 rounded-lg text-sm" 
                required 
                id="pickup-city"
                placeholder="City"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="drop-location" className="text-xs">{t('carDetails.dropoffLocation')}</label>
              <input 
                value={dropLocation} 
                onChange={(e) => setDropLocation(e.target.value)} 
                type="text" 
                className="border border-borderColor px-2 py-1.5 rounded-lg text-sm" 
                required 
                id="drop-location"
                placeholder="Location"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="drop-city" className="text-xs">{t('carDetails.dropoffCity')}</label>
              <input 
                value={dropCity} 
                onChange={(e) => setDropCity(e.target.value)} 
                type="text" 
                className="border border-borderColor px-2 py-1.5 rounded-lg text-sm" 
                required 
                id="drop-city"
                placeholder="City"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="pickup-date" className="text-xs">{t('carDetails.pickupDate')}</label>
              <input 
                value={pickupDate} 
                onChange={(e) => setPickupDate(e.target.value)} 
                type="date" 
                className="border border-borderColor px-2 py-1.5 rounded-lg text-sm" 
                required 
                id="pickup-date" 
                min={new Date().toISOString().split('T')[0]} 
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="pickup-time" className="text-xs">{t('carDetails.pickupTime')}</label>
              <input 
                value={pickupTime} 
                onChange={(e) => setPickupTime(e.target.value)} 
                type="time" 
                className="border border-borderColor px-2 py-1.5 rounded-lg text-sm" 
                required 
                id="pickup-time"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="return-date" className="text-xs">{t('carDetails.returnDate')}</label>
              <input 
                value={returnDate} 
                onChange={(e) => setReturnDate(e.target.value)} 
                type="date" 
                className="border border-borderColor px-2 py-1.5 rounded-lg text-sm" 
                required 
                id="return-date"
                min={pickupDate || new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="return-time" className="text-xs">{t('carDetails.returnTime')}</label>
              <input 
                value={returnTime} 
                onChange={(e) => setReturnTime(e.target.value)} 
                type="time" 
                className="border border-borderColor px-2 py-1.5 rounded-lg text-sm" 
                required 
                id="return-time"
              />
            </div>
          </div>

          {/* Availability Status */}
          {pickupDate && returnDate && pickupTime && returnTime && (
            <div className={`p-2 rounded-lg text-xs ${
              checkingAvailability ? 'bg-gray-50' :
              availabilityStatus?.available ? 'bg-green-50 border border-green-200' :
              availabilityStatus?.success === false ? 'bg-red-50 border border-red-200' :
              'bg-gray-50'
            }`}>
              {checkingAvailability ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  <span>{t('carDetails.checkingAvailability')}</span>
                </div>
              ) : availabilityStatus?.available ? (
                <div className="flex items-center gap-2 text-green-700">
                  <span>✅</span>
                  <span className="font-medium">{t('carDetails.availableForDates')}</span>
                </div>
              ) : availabilityStatus?.success === false ? (
                <div className="text-red-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span>❌</span>
                    <span className="font-medium">{t('carDetails.notAvailableForDates')}</span>
                  </div>
                  <p className="text-xs">{availabilityStatus.message}</p>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="payment-method" className="text-xs">{t('carDetails.paymentMethod')}</label>
            <div className="border border-borderColor px-2 py-1.5 rounded-lg bg-gray-50 text-sm">
              <span className="text-gray-700">{t('carDetails.cashOnDelivery')}</span>
              <p className="text-xs text-gray-500 mt-0.5">{t('carDetails.payWhenReceive')}</p>
            </div>
            <input type="hidden" value="cash" />
          </div>

          {pickupLocation && pickupCity && dropLocation && dropCity && (
            <div className="bg-blue-50 p-2 rounded-lg text-xs">
              <div className="flex justify-between">
                <span>{t('carDetails.oneWayDistance')}</span>
                <span>
                  {calculatingDistance ? (
                    <span className="text-blue-600">{t('carDetails.calculating')}</span>
                  ) : distance > 0 ? (
                    <span className="font-medium">{distance} km</span>
                  ) : (
                    <span className="text-gray-400">{t('carDetails.enterLocations')}</span>
                  )}
                </span>
              </div>
              {distance > 0 && pricingType === 'per_km' && (
                <div className="flex justify-between mt-0.5">
                  <span>{t('carDetails.roundTrip')}</span>
                  <span className="font-medium text-green-600">{distance * 2} km</span>
                </div>
              )}
            </div>
          )}

          {pickupDate && returnDate && pickupTime && returnTime && (
            <InsuranceSelector
              totalDays={calculateDays()}
              onInsuranceSelect={setSelectedInsurance}
              selectedInsurance={selectedInsurance}
            />
          )}

          {((pickupDate && returnDate && pickupTime && returnTime && pricingType === 'daily') || 
            (pickupLocation && pickupCity && dropLocation && dropCity && distance > 0 && pricingType === 'per_km')) && (
            <div className="bg-gray-50 p-2 rounded-lg text-xs">
              {pricingType === 'daily' ? (
                <>
                  <div className="flex justify-between">
                    <span>{t('carDetails.duration')}</span>
                    <span>{formatDuration(calculateDays())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('carDetails.pricePerDay')}</span>
                    <span>Rs. {car.pricePerDay.toLocaleString(currencyLocale)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>{t('carDetails.roundTrip')}</span>
                    <span className="font-medium">{distance * 2} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('carDetails.pricePerKm')}</span>
                    <span>Rs. {pricePerKm}</span>
                  </div>
                </>
              )}
              <hr className="my-1" />
              <div className="flex justify-between font-semibold text-sm">
                <span>{t('carDetails.totalAmount')}</span>
                <span>Rs. {getTotalAmount().toLocaleString(currencyLocale)}</span>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={
              loading || 
              !user || 
              user.role === 'admin' || 
              (availabilityStatus && !availabilityStatus.available) ||
              checkingAvailability
            }
            className="w-full bg-primary hover:bg-primary-dull transition-all py-2 font-medium text-white rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? t('carDetails.booking') : 
             checkingAvailability ? t('carDetails.checking') :
             !user ? t('carDetails.loginToBook') : 
             user.role === 'admin' ? t('carDetails.adminsCannotBook') : 
             (availabilityStatus && !availabilityStatus.available) ? t('carDetails.notAvailable') :
             t('carDetails.bookNow')}
          </button>

          {user?.role === 'admin' ? (
            <p className="text-center text-xs text-orange-600">
              🔒 {t('carDetails.adminManagement')}
            </p>
          ) : (
            <p className="text-center text-xs text-green-600">
              💰 {t('carDetails.noAdvancePayment')}
            </p>
          )}

          {/* Contact Owner Button */}
          {user && user.role !== 'admin' && car.userId && (
            <div className="mt-3 pt-3 border-t border-borderColor">
              <ContactOwnerButton 
                ownerId={car.userId} 
                ownerName={car.ownerName || 'Owner'}
                carId={car._id}
              />
            </div>
          )}
        </motion.form>
        )}
      </div>

      {/* Reviews Section */}
      <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="mt-12"
    >
      {/* Average Rating Display */}
      {car.averageRating > 0 && (
        <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-800">{car.averageRating.toFixed(1)}</div>
              {renderStars(car.averageRating)}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-800">Overall Rating</p>
              <p className="text-sm text-gray-600">
                Based on {car.totalReviews || 0} {car.totalReviews === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Review Form for Users with Completed Bookings */}
      {user && !isAdmin && unreviewedBookings.length > 0 && (
        <div className="mb-8">
          {!showReviewForm ? (
            <button
              onClick={() => setShowReviewForm(true)}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-all font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Write a Review {unreviewedBookings.length > 1 && `(${unreviewedBookings.length} bookings)`}
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Write Your Review</h3>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ReviewForm
                bookingId={unreviewedBookings[0]._id}
                carId={id}
                onSuccess={handleReviewSuccess}
              />
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Customer Reviews</h2>
        <ReviewList key={reviewsKey} carId={id} />
      </div>
    </motion.div>
    </div>
  ) : (
    <Loader />
  );
};

export default CarDetails;
