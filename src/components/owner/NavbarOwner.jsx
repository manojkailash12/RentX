import React, { useState, useRef, useEffect } from 'react'
import { assets } from '../../assets/assets'
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const NavbarOwner = () => {

    const {user, logout, isAdmin} = useAppContext();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Get user's initials for avatar
    const getUserInitials = () => {
        if (!user?.name) return 'U';
        const names = user.name.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return names[0][0].toUpperCase();
    };

    const dropdownItems = [
        { 
            label: 'Earnings', 
            icon: '💰', 
            action: () => navigate('/owner/dashboard'),
            description: 'View your earnings'
        },
        { 
            label: 'My Bookings', 
            icon: '📋', 
            action: () => navigate('/owner/manage-bookings'),
            description: 'Manage bookings'
        },
        { 
            label: 'My Cars', 
            icon: '🚗', 
            action: () => navigate('/owner/manage-cars'),
            description: 'Manage your cars'
        },
        { 
            label: 'View Profile', 
            icon: '👤', 
            action: () => navigate('/profile'),
            description: 'Edit your profile'
        },
        { 
            label: 'Logout', 
            icon: '🚪', 
            action: () => {
                logout();
                navigate('/');
            },
            description: 'Sign out of your account',
            isDanger: true
        }
    ];

  return (
    <div className='flex items-center justify-between px-6 md:px-10 py-3 text-gray-500 border-b border-borderColor relative transition-all bg-white'>
        <div className='flex items-center gap-4'>
            <Link to='/'>
                <img src={assets.logo} alt="" className='h-7'/>
            </Link>
            
            {/* Back to Home Button */}
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
            </button>
        </div>
        
        <div className='flex items-center gap-4'>
            <div className='text-center'>
                <span className={`text-xs px-2 py-1 rounded-full ${
                    isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                    {isAdmin ? 'Admin Panel' : 'Enterprise Panel'}
                </span>
            </div>

            {/* Logout Button */}
            <button
                onClick={() => {
                    logout();
                    navigate('/');
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {/* Profile Image or Initials */}
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                        {user?.image ? (
                            <img 
                                src={user.image} 
                                alt="Profile" 
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            getUserInitials()
                        )}
                    </div>
                    <svg 
                        className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        {/* User Info Header */}
                        <div className="px-4 py-2 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {user?.email || 'No email'}
                            </p>
                        </div>

                        {/* Dropdown Items */}
                        {dropdownItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    item.action();
                                    setShowDropdown(false);
                                }}
                                className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                                    item.isDanger ? 'border-t border-gray-100 mt-1' : ''
                                }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <div>
                                    <p className={`text-sm font-medium ${item.isDanger ? 'text-red-600' : 'text-gray-700'}`}>
                                        {item.label}
                                    </p>
                                    <p className="text-xs text-gray-500">{item.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  )
}

export default NavbarOwner