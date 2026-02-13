import React, { useState, useRef, useEffect } from "react";
import { assets, menuLinks } from "../assets/assets";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useChatContext } from "../context/ChatContext";
import toast from "react-hot-toast";
import {motion} from 'motion/react';
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const { t } = useTranslation();
  const {setShowLogin, setLoginMode, user, logout, isOwner, isAdmin, isEmployee, axios, setIsOwner} = useAppContext();
  const { totalUnreadCount } = useChatContext();

    const location = useLocation()
    const [open, setOpen] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate()

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

    // Get menu links based on user role
    const getMenuLinks = () => {
      if (isAdmin || isEmployee) {
        // Admin and Employee see Home and Cars only (no My Bookings)
        return [
          { name: "Home", path: "/" },
          { name: "Cars", path: "/cars" }
        ];
      }
      // Regular users see all menu links
      return menuLinks;
    };

    const changeRole = async ()=> {
       try {
        const { data }= await axios.post('/owner/change-role')
        if(data.success){
          setIsOwner(true)
          toast.success(data.message)
        } else {
          toast.error(data.message)
        }
       } catch (error) {
        toast.error(error.message)
       }
    }

    const getDashboardText = () => {
      if (isAdmin) return 'Admin Dashboard';
      if (isOwner) return 'Dashboard';
      return 'Enterprise';
    }

    const getDashboardPath = () => {
      if (isAdmin) return '/owner'; // Admin uses same dashboard with enhanced features
      if (isOwner) return '/owner';
      return '/owner'; // Users can access enterprise features
    }

    const dropdownItems = [
        { 
            label: 'Earnings', 
            icon: '💰', 
            action: () => navigate('/owner/dashboard'),
            description: 'View your earnings'
        },
        // Hide "My Bookings" for admin and employee roles
        ...(!isAdmin && !isEmployee ? [
            { 
                label: 'Bookings', 
                icon: '📋', 
                action: () => navigate('/my-bookings'),
                description: 'View your bookings'
            }
        ] : []),
        { 
            label: 'Cars', 
            icon: '🚗', 
            action: () => navigate('/owner/manage-cars'),
            description: 'Manage your cars'
        },
        ...(isEmployee ? [
            {
                label: 'Dashboard',
                icon: '👔',
                action: () => navigate('/owner/dashboard'),
                description: 'View your dashboard'
            }
        ] : []),
        { 
            label: 'View Profile', 
            icon: '👤', 
            action: () => navigate('/profile'),
            description: 'Edit your profile'
        },
        { 
            label: 'Logout', 
            icon: '🚪', 
            action: () => logout(),
            description: 'Sign out of your account',
            isDanger: true
        }
    ];

  return (
    <motion.div
     initial={{y: -20, opacity: 0}}
     animate={{y:0, opacity:1}}
     transition={{duration: 0.5}}
     className={`flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 text-gray-600 border-b border-borderColor relative transition-all ${location.pathname === "/" && "bg-light"}`}>
      <Link to='/'>
        <motion.img whileHover={{scale: 1.05}} src={assets.logo} alt="logo" className="h-8" />
      </Link>

      <div className={`max-sm:fixed max-sm:h-screen max-sm:w-full max-sm:top-16 max-sm:border-t border-borderColor right-0 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 max-sm:p-4 transition-all duration-300 z-50 ${location.pathname === "/" ? "bg-light" : "bg-white"} ${open ? "max-sm:translate-x-0" : "max-sm:translate-x-full"}`}>
        {getMenuLinks().map((link, index)=> (
            <Link key={index} to={link.path}>
                {link.name}
            </Link>
        ))}

        <div className="flex max-sm:flex-col items-start sm:items-center gap-6">
            <LanguageSwitcher />
            
            {user && (
              <Link to="/chat" className="relative">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                    </span>
                  )}
                </button>
              </Link>
            )}
            
            {user && (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  isAdmin ? 'bg-red-100 text-red-700' : 
                  isEmployee ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {isAdmin ? 'Admin' : isEmployee ? 'Employee' : 'User'}
                </span>
              </div>
            )}
            
            {user && (
              <button 
                onClick={() => navigate(getDashboardPath())} 
                className="cursor-pointer hover:text-primary transition-colors"
              >
                {getDashboardText()}
              </button>
            )}

            {user && (
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
                {t('nav.logout')}
              </button>
            )}
            
            {user && (
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
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
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
                                    item.isDanger ? 'border-t border-gray-100 mt-1 text-red-600' : ''
                                }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${
                                        item.isDanger ? 'text-red-600' : 'text-gray-700'
                                    }`}>
                                        {item.label}
                                    </p>
                                    <p className="text-xs text-gray-500">{item.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
              </div>
            )}
            
            {!user && (
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setLoginMode('register');
                    setShowLogin(true);
                  }} 
                  className="cursor-pointer px-6 py-2 border border-primary text-primary hover:bg-primary hover:text-white transition-all rounded-lg"
                >
                  {t('nav.register')}
                </button>
                <button 
                  onClick={() => {
                    setLoginMode('login');
                    setShowLogin(true);
                  }} 
                  className="cursor-pointer px-8 py-2 bg-primary hover:bg-primary-dull transition-all text-white rounded-lg"
                >
                  {t('nav.login')}
                </button>
              </div>
            )}
        </div>
      </div>

        <button className="sm:hidden cursor-pointer" aria-label="Menu" onClick={()=> setOpen(!open)}>
            <img src={open ? assets.close_icon : assets.menu_icon} alt="menu" />
        </button>


    </motion.div>
  );
};

export default Navbar;
