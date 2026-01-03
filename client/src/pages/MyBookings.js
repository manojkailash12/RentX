import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import './MyBookings.css';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [downloadingReceipt, setDownloadingReceipt] = useState(null);
  const [resendingReceipt, setResendingReceipt] = useState(null);

  useEffect(() => {
    const fetchUserBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get('/api/bookings/my-bookings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setBookings(response.data);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        if (error.response?.status === 401) {
          toast.error('Please login to view bookings');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserBookings();
    }
  }, [user]);

  const downloadReceipt = async (bookingId) => {
    try {
      setDownloadingReceipt(bookingId);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to download receipt');
        return;
      }

      const response = await axios.get(`/api/bookings/${bookingId}/download-receipt`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'receipt.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt. Please try again.');
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const resendReceipt = async (bookingId) => {
    try {
      setResendingReceipt(bookingId);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to resend receipt');
        return;
      }

      await axios.post(`/api/bookings/${bookingId}/resend-receipt`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      toast.success('Receipt sent to your email successfully!');
    } catch (error) {
      console.error('Error resending receipt:', error);
      toast.error('Failed to send receipt. Please try again.');
    } finally {
      setResendingReceipt(null);
    }
  };

  const getFilteredBookings = () => {
    return bookings;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#28a745';
      case 'ongoing': return '#007bff';
      case 'completed': return '#6c757d';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="my-bookings-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your bookings...</p>
        </div>
      </div>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <div className="my-bookings-page">
      <div className="bookings-container">
        {/* Header */}
        <div className="bookings-header">
          <h1>Your Bookings</h1>
          <p>Manage your car rentals</p>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="no-bookings">
            <div className="no-bookings-icon">🚗</div>
            <h3>No bookings found</h3>
            <p>You haven't made any bookings yet. Start exploring our cars!</p>
          </div>
        ) : (
          <div className="bookings-list">
            {filteredBookings.map((booking) => (
              <div key={booking._id} className="booking-card">
                {/* Status Badge */}
                <div className="booking-status">
                  <div 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(booking.bookingStatus) }}
                  >
                    BOOKING
                  </div>
                  <div className="booking-id">
                    Booking ID: {booking.bookingId || booking._id.slice(-8)}
                  </div>
                  <button className="status-button">
                    {booking.bookingStatus?.toUpperCase() || 'CONFIRMED'}
                  </button>
                </div>

                <div className="booking-content">
                  {/* Car Image and Details */}
                  <div className="car-section">
                    <div className="car-image">
                      {booking.car?.images && booking.car.images.length > 0 ? (
                        <img 
                          src={booking.car.images[0]} 
                          alt={`${booking.car.brand} ${booking.car.name}`}
                        />
                      ) : (
                        <div className="car-placeholder">🚗</div>
                      )}
                    </div>
                    <div className="car-details">
                      <h3>{booking.car?.brand} {booking.car?.name}</h3>
                      <p className="car-model">{booking.car?.model} ({booking.car?.year})</p>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="trip-details">
                    <div className="location-section">
                      <div className="pickup-location">
                        <div className="location-label">📍 Pickup Location</div>
                        <div className="location-value">
                          {booking.pickUpLocation || booking.pickupLocation?.address || 'N/A'}
                        </div>
                        <div className="location-time">
                          {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'} • {booking.startDate ? new Date(booking.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                        </div>
                      </div>

                      <div className="dropoff-location">
                        <div className="location-label">📍 Drop-off Location</div>
                        <div className="location-value">
                          {booking.dropOffLocation || booking.dropoffLocation?.address || 'N/A'}
                        </div>
                        <div className="location-time">
                          {booking.endDate ? new Date(booking.endDate).toLocaleDateString() : 'N/A'} • {booking.endDate ? new Date(booking.endDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="amount-section">
                      <div className="total-amount">
                        <div className="amount-label">💰 Total Amount</div>
                        <div className="amount-value">₹ {(booking.totalAmount || booking.totalPrice || 0).toLocaleString()}</div>
                        <div className="payment-method">
                          Payment Method: {booking.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Online Payment'}
                        </div>
                        <div className="payment-status">
                          {(booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid') ? 'Paid' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="booking-actions">
                    <button 
                      className="action-btn send-receipt"
                      onClick={() => resendReceipt(booking._id)}
                      disabled={resendingReceipt === booking._id}
                    >
                      {resendingReceipt === booking._id ? '⏳' : '📧'} Send Receipt PDF
                    </button>
                    <button 
                      className="action-btn download-receipt"
                      onClick={() => downloadReceipt(booking._id)}
                      disabled={downloadingReceipt === booking._id}
                    >
                      {downloadingReceipt === booking._id ? '⏳' : '📄'} Download Receipt
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;