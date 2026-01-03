import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const closeDropdowns = () => {
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🚗</span>
          <span className="brand-text">RentX</span>
        </Link>

        <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="navbar-item" onClick={() => setIsMenuOpen(false)}>
            Home
          </Link>

          <Link to="/cars" className="navbar-item" onClick={() => setIsMenuOpen(false)}>
            Cars
          </Link>

          {user && (
            <>
              <Link to="/add-vehicle" className="navbar-item" onClick={() => setIsMenuOpen(false)}>
                Add Vehicle
              </Link>
              <Link to="/my-bookings" className="navbar-item" onClick={() => setIsMenuOpen(false)}>
                My Bookings
              </Link>
            </>
          )}

          {user ? (
            <>
              <Link 
                to={user.role === 'admin' ? '/admin' : '/dashboard'} 
                className="navbar-item"
                onClick={closeDropdowns}
              >
                Dashboard
              </Link>
              
              <div className="navbar-profile-dropdown">
                <button 
                  className="profile-dropdown-btn"
                  onClick={toggleProfileDropdown}
                >
                  👋 {user.name} ▼
                </button>
                
                {isProfileDropdownOpen && (
                  <div className="profile-dropdown-menu">
                    <Link 
                      to="/profile" 
                      className="dropdown-item"
                      onClick={closeDropdowns}
                    >
                      👤 Profile
                    </Link>
                    
                    <Link 
                      to="/my-bookings" 
                      className="dropdown-item"
                      onClick={closeDropdowns}
                    >
                      📋 My Bookings
                    </Link>
                    
                    <button 
                      className="dropdown-item logout-btn" 
                      onClick={handleLogout}
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="navbar-auth">
              <Link 
                to="/login" 
                className="btn btn-secondary btn-sm"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="btn btn-primary btn-sm"
                onClick={() => setIsMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          )}
        </div>

        <button className="navbar-toggle" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;