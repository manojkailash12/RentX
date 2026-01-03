import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Booking = () => {
  const { carId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState({
    startDate: '',
    endDate: '',
    pickupLocation: {
      address: '',
      city: '',
      district: '',
      state: ''
    },
    dropoffLocation: {
      address: '',
      city: '',
      district: '',
      state: ''
    },
    paymentMethod: 'cash',
    driverRequired: false,
    specialRequests: '',
    pricingType: 'perDay', // 'perDay' or 'perKm'
    estimatedDistance: 0
  });

  const fetchCarDetails = useCallback(async () => {
    try {
      const response = await axios.get(`/api/cars/${carId}`);
      setCar(response.data);
    } catch (error) {
      console.error('Fetch car error:', error);
      toast.error('Failed to load car details');
      navigate('/cars');
    } finally {
      setLoading(false);
    }
  }, [carId, navigate]);

  useEffect(() => {
    fetchCarDetails();
  }, [fetchCarDetails]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setBookingData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setBookingData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const calculateTotalAmount = () => {
    if (!car || !bookingData.startDate || !bookingData.endDate) return 0;

    const startDate = new Date(bookingData.startDate);
    const endDate = new Date(bookingData.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (bookingData.pricingType === 'perDay') {
      return car.pricePerDay * totalDays;
    } else {
      return car.pricePerKm * bookingData.estimatedDistance;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to make a booking');
      navigate('/login');
      return;
    }

    if (!bookingData.startDate || !bookingData.endDate) {
      toast.error('Please select booking dates');
      return;
    }

    if (bookingData.pricingType === 'perKm' && bookingData.estimatedDistance <= 0) {
      toast.error('Please enter estimated distance for per-km pricing');
      return;
    }

    setLoading(true);

    try {
      const totalAmount = calculateTotalAmount();
      
      const bookingPayload = {
        carId,
        ...bookingData,
        totalAmount
      };

      await axios.post('/api/bookings', bookingPayload);
      
      toast.success('Booking created successfully! 🎉');
      navigate('/dashboard');
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Loading car details...</h2>
      </div>
    );
  }

  if (!car) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Car not found</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '10px 15px', 
      maxWidth: '900px', 
      margin: '0 auto', 
      minHeight: '100vh',
      zoom: '1.0',
      transform: 'scale(1.0)',
      transformOrigin: 'top center'
    }}>
      {/* Compact Header */}
      <div style={{ marginBottom: '12px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', fontWeight: '700' }}>📅 Book Your Car</h1>
        <div style={{ 
          background: 'white', 
          padding: '14px', 
          borderRadius: '10px', 
          boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
          display: 'inline-block'
        }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '600' }}>{car.name} - {car.brand} {car.model}</h3>
          <p style={{ margin: '0', fontSize: '0.9rem', color: '#555' }}>📍 {car.location?.city}, {car.location?.state} | 💰 ₹{car.pricePerDay}/day | ₹{car.pricePerKm}/km</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ 
        background: 'white', 
        padding: '22px', 
        borderRadius: '14px', 
        boxShadow: '0 5px 15px rgba(0,0,0,0.12)',
        fontSize: '14px'
      }}>
        {/* Pricing Type & Dates in one row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px', marginBottom: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: '600', color: '#333' }}>💰 Pricing Type</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="radio"
                  name="pricingType"
                  value="perDay"
                  checked={bookingData.pricingType === 'perDay'}
                  onChange={handleChange}
                />
                <span>Per Day (₹{car.pricePerDay})</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="radio"
                  name="pricingType"
                  value="perKm"
                  checked={bookingData.pricingType === 'perKm'}
                  onChange={handleChange}
                />
                <span>Per KM (₹{car.pricePerKm})</span>
              </label>
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.9rem', color: '#333' }}>Start Date *</label>
            <input
              type="date"
              name="startDate"
              value={bookingData.startDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.9rem', color: '#333' }}>End Date *</label>
            <input
              type="date"
              name="endDate"
              value={bookingData.endDate}
              onChange={handleChange}
              min={bookingData.startDate || new Date().toISOString().split('T')[0]}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Distance Input for Per-KM pricing */}
        {bookingData.pricingType === 'perKm' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.9rem', color: '#333' }}>Estimated Distance (KM) *</label>
            <input
              type="number"
              name="estimatedDistance"
              value={bookingData.estimatedDistance}
              onChange={handleChange}
              min="1"
              required
              placeholder="Enter distance"
              style={{ width: '220px', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
            />
          </div>
        )}

        {/* Locations in one row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', marginBottom: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: '600', color: '#333' }}>📍 Pickup Location</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                name="pickupLocation.city"
                value={bookingData.pickupLocation.city}
                onChange={handleChange}
                placeholder="City"
                required
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
              />
              <input
                type="text"
                name="pickupLocation.state"
                value={bookingData.pickupLocation.state}
                onChange={handleChange}
                placeholder="State"
                required
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
            <input
              type="text"
              name="pickupLocation.address"
              value={bookingData.pickupLocation.address}
              onChange={handleChange}
              placeholder="Full Address"
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: '600', color: '#333' }}>📍 Drop-off Location</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                name="dropoffLocation.city"
                value={bookingData.dropoffLocation.city}
                onChange={handleChange}
                placeholder="City"
                required
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
              />
              <input
                type="text"
                name="dropoffLocation.state"
                value={bookingData.dropoffLocation.state}
                onChange={handleChange}
                placeholder="State"
                required
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
            <input
              type="text"
              name="dropoffLocation.address"
              value={bookingData.dropoffLocation.address}
              onChange={handleChange}
              placeholder="Full Address"
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Payment, Options & Special Requests in one row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '22px', marginBottom: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: '600', color: '#333' }}>💳 Payment Method</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={bookingData.paymentMethod === 'cash'}
                  onChange={handleChange}
                />
                <span>Cash on Delivery</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={bookingData.paymentMethod === 'online'}
                  onChange={handleChange}
                />
                <span>Online Payment</span>
              </label>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: '600', color: '#333' }}>⚙️ Options</h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                name="driverRequired"
                checked={bookingData.driverRequired}
                onChange={handleChange}
              />
              <span>Driver Required (+₹500/day)</span>
            </label>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.9rem', color: '#333' }}>Special Requests</label>
            <textarea
              name="specialRequests"
              value={bookingData.specialRequests}
              onChange={handleChange}
              placeholder="Any special requirements..."
              rows="2"
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', resize: 'vertical', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Total Amount & Submit Button in one row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', alignItems: 'end' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
            padding: '16px', 
            borderRadius: '10px', 
            border: '2px solid #3498db',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#2c3e50', fontSize: '1rem', fontWeight: '600' }}>💰 Total Amount</h4>
            <p style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#3498db', margin: 0 }}>
              ₹{calculateTotalAmount().toLocaleString()}
            </p>
            {bookingData.driverRequired && (
              <p style={{ fontSize: '0.75rem', color: '#7f8c8d', margin: '4px 0 0 0' }}>
                + Driver charges will be added
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '16px 24px',
              background: loading ? '#bdc3c7' : 'linear-gradient(135deg, #3498db, #2980b9)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)'
            }}
          >
            {loading ? 'Creating Booking...' : '🚗 Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Booking;