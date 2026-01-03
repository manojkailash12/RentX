import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios for Netlify Functions
axios.defaults.baseURL = '/.netlify/functions';

console.log('🌐 API configured for Netlify Functions');

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  // API methods
  const api = {
    // Auth
    register: (data) => axios.post('/auth/register', data),
    verifyOTP: (data) => axios.post('/auth/verify-otp', data),
    login: (data) => axios.post('/auth/login', data),
    resendOTP: (data) => axios.post('/auth/resend-otp', data),
    
    // Cars
    getCars: (params) => axios.get('/cars', { params }),
    getCar: (id) => axios.get(`/cars/${id}`),
    addCar: (data) => axios.post('/cars', data),
    
    // Bookings
    createBooking: (data) => axios.post('/bookings', data),
    getUserBookings: (userId) => axios.get('/bookings/user', { params: { userId } }),
    getBooking: (id) => axios.get(`/bookings/${id}`),
    getAllBookings: () => axios.get('/bookings/all'),
    
    // PDF & Excel
    downloadPDF: (bookingId) => window.open(`/.netlify/functions/generate-pdf/${bookingId}`, '_blank'),
    downloadExcel: (type, params) => {
      const queryString = new URLSearchParams(params).toString();
      window.open(`/.netlify/functions/generate-excel?type=${type}&${queryString}`, '_blank');
    }
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading,
    api
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};