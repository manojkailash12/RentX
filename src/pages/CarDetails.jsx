import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assets, dummyCarData } from "../assets/assets";
import Loader from "../components/Loader";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";
import { motion } from 'motion/react'

const CarDetails = () => {
  const { id } = useParams();
  const { cars, axios, user, isAdmin } = useAppContext()
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
        paymentMethod
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
    
    if (pricingType === 'per_km') {
      // Per kilometer pricing - calculate round trip (up + down)
      const roundTripDistance = distance * 2; // Double the distance for round trip
      return Math.round(roundTripDistance * pricePerKm);
    } else {
      // Daily pricing
      const days = calculateDays();
      return Math.round(car.pricePerDay * days);
    }
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

  return car ? (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32 mt-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-4 text-gray-500 cursor-pointer text-sm"
      >
        <img src={assets.arrow_icon} alt="" className="rotate-180 opacity-65 h-4" />
        Back to all cars
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
            src={car.image}
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
                  Listed by User • Commission: {car.commissionRate || 40}%
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
              <h1 className="text-lg font-medium mb-2">Description</h1>
              <p className="text-gray-500 text-sm">{car.description}</p>
            </div>

            {/* feature */}
            <div>
              <h1 className="text-lg font-medium mb-2">Features</h1>
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
              <h2 className="text-2xl text-gray-800 font-semibold mb-2">Vehicle Details</h2>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                Admin View
              </span>
            </div>

            <hr className="border-borderColor my-6" />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Pricing</h3>
                <p className="text-2xl text-gray-800 font-semibold">
                  Rs. {car.pricePerDay.toLocaleString('en-IN')} 
                  <span className="text-base text-gray-400 font-normal"> per day</span>
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Status</h3>
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    car.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {car.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    car.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {car.isApproved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Owner Type</h3>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  car.ownerType === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {car.ownerType === 'admin' ? 'Platform Car' : 'User Listed'}
                </span>
              </div>

              {car.ownerType === 'user' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Commission Rate</h3>
                  <p className="text-lg font-medium text-blue-600">{car.commissionRate || 40}%</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Location</h3>
                <p className="text-gray-700">{car.location}</p>
              </div>

              {car.rejectionReason && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-red-700 mb-1">Rejection Reason</h3>
                  <p className="text-sm text-red-600">{car.rejectionReason}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Car ID</h3>
                <p className="text-xs text-gray-500 font-mono">{car._id}</p>
              </div>
            </div>

            <hr className="border-borderColor my-6" />

            <div className="space-y-2">
              <button
                onClick={() => navigate(`/owner/edit-car/${car._id}`)}
                className="w-full bg-primary hover:bg-primary-dull transition-all py-3 font-medium text-white rounded-xl"
              >
                Edit Car Details
              </button>
              <button
                onClick={() => navigate('/owner/manage-cars')}
                className="w-full bg-gray-100 hover:bg-gray-200 transition-all py-3 font-medium text-gray-700 rounded-xl"
              >
                Back to Manage Cars
              </button>
            </div>

            <p className="text-center text-xs text-gray-500">
              🔒 Admin view - Booking functionality disabled
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
                  Rs. {car.pricePerDay.toLocaleString('en-IN')} 
                  <span className="text-sm text-gray-400 font-normal"> per day</span>
                </>
              ) : (
                <>
                  Rs. {pricePerKm} 
                  <span className="text-sm text-gray-400 font-normal"> per km</span>
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
                Daily Rental
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
              <label htmlFor="pickup-location" className="text-xs">Pickup Location</label>
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
              <label htmlFor="pickup-city" className="text-xs">Pickup City</label>
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
              <label htmlFor="drop-location" className="text-xs">Drop-off Location</label>
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
              <label htmlFor="drop-city" className="text-xs">Drop-off City</label>
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
              <label htmlFor="pickup-date" className="text-xs">Pickup Date</label>
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
              <label htmlFor="pickup-time" className="text-xs">Pickup Time</label>
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
              <label htmlFor="return-date" className="text-xs">Return Date</label>
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
              <label htmlFor="return-time" className="text-xs">Return Time</label>
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
                  <span>Checking availability...</span>
                </div>
              ) : availabilityStatus?.available ? (
                <div className="flex items-center gap-2 text-green-700">
                  <span>✅</span>
                  <span className="font-medium">Available for selected dates!</span>
                </div>
              ) : availabilityStatus?.success === false ? (
                <div className="text-red-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span>❌</span>
                    <span className="font-medium">Not available</span>
                  </div>
                  <p className="text-xs">{availabilityStatus.message}</p>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="payment-method" className="text-xs">Payment Method</label>
            <div className="border border-borderColor px-2 py-1.5 rounded-lg bg-gray-50 text-sm">
              <span className="text-gray-700">Cash on Delivery</span>
              <p className="text-xs text-gray-500 mt-0.5">Pay when you receive the car</p>
            </div>
            <input type="hidden" value="cash" />
          </div>

          {pickupLocation && pickupCity && dropLocation && dropCity && (
            <div className="bg-blue-50 p-2 rounded-lg text-xs">
              <div className="flex justify-between">
                <span>One-way Distance:</span>
                <span>
                  {calculatingDistance ? (
                    <span className="text-blue-600">Calculating...</span>
                  ) : distance > 0 ? (
                    <span className="font-medium">{distance} km</span>
                  ) : (
                    <span className="text-gray-400">Enter locations</span>
                  )}
                </span>
              </div>
              {distance > 0 && pricingType === 'per_km' && (
                <div className="flex justify-between mt-0.5">
                  <span>Round Trip:</span>
                  <span className="font-medium text-green-600">{distance * 2} km</span>
                </div>
              )}
            </div>
          )}

          {((pickupDate && returnDate && pickupTime && returnTime && pricingType === 'daily') || 
            (pickupLocation && pickupCity && dropLocation && dropCity && distance > 0 && pricingType === 'per_km')) && (
            <div className="bg-gray-50 p-2 rounded-lg text-xs">
              {pricingType === 'daily' ? (
                <>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{formatDuration(calculateDays())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price per day:</span>
                    <span>Rs. {car.pricePerDay.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Round Trip:</span>
                    <span className="font-medium">{distance * 2} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price per km:</span>
                    <span>Rs. {pricePerKm}</span>
                  </div>
                </>
              )}
              <hr className="my-1" />
              <div className="flex justify-between font-semibold text-sm">
                <span>Total Amount:</span>
                <span>Rs. {getTotalAmount().toLocaleString('en-IN')}</span>
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
            {loading ? 'Booking...' : 
             checkingAvailability ? 'Checking...' :
             !user ? 'Login to Book' : 
             user.role === 'admin' ? 'Admins Cannot Book' : 
             (availabilityStatus && !availabilityStatus.available) ? 'Not Available' :
             'Book Now'}
          </button>

          {user?.role === 'admin' ? (
            <p className="text-center text-xs text-orange-600">
              🔒 Admin accounts are for platform management only
            </p>
          ) : (
            <p className="text-center text-xs text-green-600">
              💰 Pay cash on delivery - No advance payment required
            </p>
          )}
        </motion.form>
        )}
      </div>
    </div>
  ) : (
    <Loader />
  );
};

export default CarDetails;
