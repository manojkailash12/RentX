import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './OTPVerification.css';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const { userId, email, name } = location.state || {};

  useEffect(() => {
    if (!email) {
      toast.error('Invalid access. Please register again.');
      navigate('/register');
      return;
    }

    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      // Use the new serverless function endpoint
      const response = await axios.post('/.netlify/functions/auth/verify-otp', {
        email,
        otp: otpString
      });

      login(response.data.token, response.data.user);
      toast.success('Email verified successfully! Welcome to RentX! 🎉');
      
      // Redirect based on user role
      if (response.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);

    try {
      // Use the new serverless function endpoint
      await axios.post('/.netlify/functions/auth/resend-otp', { email });
      toast.success('OTP sent successfully! Please check your email. 📧');
      
      // Reset countdown
      setCountdown(60);
      setCanResend(false);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error(error.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="otp-page">
      <div className="otp-container">
        <div className="otp-card fade-in">
          <div className="otp-header">
            <div className="otp-icon">📧</div>
            <h1>Verify Your Email</h1>
            <p>
              We've sent a 6-digit verification code to<br />
              <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="otp-form">
            <div className="otp-inputs">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="otp-input"
                  autoComplete="off"
                />
              ))}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Verifying...
                </>
              ) : (
                '✅ Verify Email'
              )}
            </button>
          </form>

          <div className="otp-footer">
            <p>Didn't receive the code?</p>
            {canResend ? (
              <button 
                onClick={handleResendOtp}
                className="resend-btn"
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Sending...
                  </>
                ) : (
                  '🔄 Resend OTP'
                )}
              </button>
            ) : (
              <p className="countdown">
                Resend available in {formatTime(countdown)}
              </p>
            )}
          </div>
        </div>

        <div className="otp-info slide-in-right">
          <div className="info-content">
            <h2>🎉 Almost There, {name}!</h2>
            <p>
              You're just one step away from joining thousands of happy customers 
              who explore South India with our premium car rental service.
            </p>
            
            <div className="verification-steps">
              <div className="step completed">
                <div className="step-icon">✅</div>
                <div className="step-text">
                  <h4>Account Created</h4>
                  <p>Your account has been successfully created</p>
                </div>
              </div>
              
              <div className="step active">
                <div className="step-icon">📧</div>
                <div className="step-text">
                  <h4>Email Verification</h4>
                  <p>Verify your email to secure your account</p>
                </div>
              </div>
              
              <div className="step">
                <div className="step-icon">🚗</div>
                <div className="step-text">
                  <h4>Start Exploring</h4>
                  <p>Book your first car and start your journey</p>
                </div>
              </div>
            </div>

            <div className="security-note">
              <div className="security-icon">🛡️</div>
              <div>
                <h4>Why verify your email?</h4>
                <ul>
                  <li>Secure your account</li>
                  <li>Receive booking confirmations</li>
                  <li>Get important updates</li>
                  <li>Reset password if needed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;