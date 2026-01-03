import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import './Auth.css';

const Register = () => {
  const [selectedRole, setSelectedRole] = useState('user');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long!');
      return false;
    }

    if (formData.phone.length < 10) {
      toast.error('Please enter a valid phone number!');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const { confirmPassword, ...submitData } = formData;
      const dataToSubmit = {
        ...submitData,
        role: selectedRole
      };
      
      // Use the new serverless function endpoint
      const response = await axios.post('/.netlify/functions/auth/register', dataToSubmit);
      
      toast.success('Registration successful! Please check your email for OTP verification. 📧');
      
      // Navigate to OTP verification with user ID
      navigate('/verify-otp', { 
        state: { 
          userId: response.data.userId,
          email: formData.email,
          name: formData.name
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card fade-in">
          <div className="auth-header">
            <h1>🎉 Join RentX Today!</h1>
            <p>Create your account and start exploring South India</p>
          </div>

          {/* Role Selection Above Form */}
          <div className="role-selection">
            <h3>Choose Account Type</h3>
            <div className="role-options">
              <div 
                className={`role-option ${selectedRole === 'user' ? 'active' : ''}`}
                onClick={() => handleRoleSelect('user')}
              >
                <div className="role-icon">👤</div>
                <div className="role-info">
                  <h4>User</h4>
                  <p>Book cars and explore</p>
                </div>
              </div>
              <div 
                className={`role-option ${selectedRole === 'admin' ? 'active' : ''}`}
                onClick={() => handleRoleSelect('admin')}
              >
                <div className="role-icon">🏢</div>
                <div className="role-info">
                  <h4>Admin</h4>
                  <p>Manage cars and bookings</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  👤 Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  📧 Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  📱 Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="form-control"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  🔒 Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="form-control"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a password"
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  🔒 Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="form-control"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
                />
              </div>

              <div className="form-group">
                {/* Empty space for alignment */}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Creating Account...
                </>
              ) : (
                '🚀 Create Account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here 🔑
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;