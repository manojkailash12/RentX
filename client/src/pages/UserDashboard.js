import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const UserDashboard = () => {
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
          console.log('No token found');
          setLoading(false);
          return;
        }

        console.log('Fetching bookings for user:', user);
        console.log('Using token:', token ? 'Token exists' : 'No token');

        const response = await axios.get('/api/bookings/my-bookings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Fetched bookings:', response.data);
        setBookings(response.data);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        if (error.response?.status === 401) {
          toast.error('Please login to view bookings');
        }
        // Don't show error toast for empty bookings
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
      
      // Get the token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to download receipt');
        return;
      }

      console.log('Downloading receipt for booking:', bookingId);
      console.log('Using token:', token ? 'Token exists' : 'No token');

      const response = await axios.get(`/api/bookings/${bookingId}/download-receipt`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
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
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        toast.error('Please login to download receipt');
      } else if (error.response?.status === 403) {
        toast.error('You can only download receipts for your own bookings');
      } else if (error.response?.status === 404) {
        toast.error('Receipt not found');
      } else {
        toast.error('Failed to download receipt. Please try again.');
      }
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const resendReceipt = async (bookingId) => {
    try {
      setResendingReceipt(bookingId);
      
      // Get the token from localStorage
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
      if (error.response?.status === 401) {
        toast.error('Please login to resend receipt');
      } else if (error.response?.status === 404) {
        toast.error('Booking not found');
      } else {
        toast.error('Failed to send receipt. Please try again.');
      }
    } finally {
      setResendingReceipt(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Loading your dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>👋 Welcome back, {user?.name}!</h1>
        <p style={{ color: '#7f8c8d', fontSize: '1.1rem' }}>
          Manage your bookings and explore amazing cars across South India
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '40px' 
      }}>
        <Link 
          to="/cars"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '30px',
            borderRadius: '15px',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)',
            transition: 'transform 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚗</div>
          <h3 style={{ margin: '0 0 10px 0' }}>Browse Cars</h3>
          <p style={{ margin: 0, opacity: 0.9 }}>Find your perfect ride</p>
        </Link>

        <Link 
          to="/add-vehicle"
          style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '30px',
            borderRadius: '15px',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(240, 147, 251, 0.3)',
            transition: 'transform 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>➕</div>
          <h3 style={{ margin: '0 0 10px 0' }}>Add Vehicle</h3>
          <p style={{ margin: 0, opacity: 0.9 }}>List your car & earn</p>
        </Link>

        <Link 
          to="/profile"
          style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            padding: '30px',
            borderRadius: '15px',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(79, 172, 254, 0.3)',
            transition: 'transform 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>👤</div>
          <h3 style={{ margin: '0 0 10px 0' }}>My Profile</h3>
          <p style={{ margin: 0, opacity: 0.9 }}>Update your details</p>
        </Link>
      </div>

      {/* Bookings Section */}
      <div style={{ 
        background: 'white', 
        borderRadius: '15px', 
        padding: '30px', 
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>📋 My Bookings</h2>
          <Link 
            to="/cars"
            style={{
              background: '#007bff',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            Book New Car
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚗</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>No bookings yet</h3>
            <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>
              Start your South India adventure by booking your first car!
            </p>
            <Link 
              to="/cars"
              style={{
                background: '#007bff',
                color: 'white',
                padding: '15px 30px',
                borderRadius: '25px',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Browse Available Cars
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Booking ID</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Vehicle</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Dates</th>
                  <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: '15px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Amount</th>
                  <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '15px', fontWeight: '500' }}>
                      {booking.bookingId || booking.invoiceNumber || booking._id.slice(-8)}
                    </td>
                    <td style={{ padding: '15px' }}>
                      {booking.car?.name || `${booking.car?.brand || ''} ${booking.car?.model || ''}`.trim() || 'Unknown Vehicle'}
                    </td>
                    <td style={{ padding: '15px' }}>
                      {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'} - {booking.endDate ? new Date(booking.endDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{ 
                        background: booking.bookingStatus === 'completed' ? '#27ae60' : 
                                   booking.bookingStatus === 'ongoing' ? '#3498db' :
                                   booking.bookingStatus === 'confirmed' ? '#f39c12' :
                                   booking.bookingStatus === 'cancelled' ? '#e74c3c' : '#95a5a6',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '15px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {booking.bookingStatus}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>
                      ₹{(booking.totalAmount || booking.totalPrice || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => downloadReceipt(booking._id)}
                          disabled={downloadingReceipt === booking._id}
                          style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            cursor: downloadingReceipt === booking._id ? 'not-allowed' : 'pointer',
                            opacity: downloadingReceipt === booking._id ? 0.6 : 1,
                            minWidth: '80px'
                          }}
                        >
                          {downloadingReceipt === booking._id ? '⏳' : '📄'} Download
                        </button>
                        <button 
                          onClick={() => resendReceipt(booking._id)}
                          disabled={resendingReceipt === booking._id}
                          style={{
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            cursor: resendingReceipt === booking._id ? 'not-allowed' : 'pointer',
                            opacity: resendingReceipt === booking._id ? 0.6 : 1,
                            minWidth: '70px'
                          }}
                        >
                          {resendingReceipt === booking._id ? '⏳' : '📧'} Resend
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;