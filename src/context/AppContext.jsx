import { useContext, createContext, useState, useEffect } from "react";
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";

// Set API base URL for Netlify Functions
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                    (import.meta.env.DEV ? 'http://localhost:8888/.netlify/functions/api' : '/.netlify/functions/api');

// Configure axios defaults for better performance
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 0; // No timeout - let requests complete
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor for better error handling
axios.interceptors.request.use(
  (config) => {
    // Add loading indicator or other request preprocessing
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only show user-facing errors for profile updates and critical operations
    if (error.config?.url?.includes('/user/profile') || error.config?.url?.includes('/user/profile-image')) {
      // Let the component handle profile update errors
      return Promise.reject(error);
    }
    
    // Silent error handling for background operations
    if (process.env.NODE_ENV === 'development') {
      if (error.response?.status === 404) {
        console.warn('API endpoint not found:', error.config?.url);
      } else if (error.code === 'ECONNABORTED') {
        console.warn('Request timeout:', error.config?.url);
      }
    }
    
    return Promise.reject(error);
  }
);

export const AppContext = createContext();

export const AppProvider = ({ children }) => {

    const navigate = useNavigate();
    const currency = 'Rs.';

    const [token, setToken] = useState(localStorage.getItem('token'))
    const [user, setUser] = useState(null)
    const [isOwner, setIsOwner] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isEmployee, setIsEmployee] = useState(false)
    const [showLogin, setShowLogin] = useState(false)
    const [loginMode, setLoginMode] = useState('login') // 'login' or 'register'
    const [pickupDate, setPickupDate] = useState('')
    const [returnDate, setReturnDate] = useState('')
    const [cars, setCars] = useState([])
    const [loading, setLoading] = useState(false)

    // function to check if user is logged in
    const fetchUser = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/user/data')
            if (data.success) {
                setUser(data.user)
                // Any logged-in user can access enterprise features (owner panel)
                setIsOwner(true) // Allow all users to access enterprise features
                setIsAdmin(data.user.role === 'admin')
                setIsEmployee(data.user.role === 'employee')
                // Store user data in localStorage for persistence
                localStorage.setItem('userData', JSON.stringify(data.user));
            } else {
                // Only clear token if it's an authentication error
                if (data.message && (data.message.includes('authenticated') || data.message.includes('authorized'))) {
                    console.warn('Authentication failed, logging out user');
                    localStorage.removeItem('token');
                    localStorage.removeItem('userData');
                    setToken(null);
                    setUser(null);
                    setIsOwner(false);
                    setIsAdmin(false);
                    setIsEmployee(false);
                    delete axios.defaults.headers.common['Authorization'];
                } else {
                    // For other errors, try to restore from localStorage
                    const storedUser = localStorage.getItem('userData');
                    if (storedUser && !user) {
                        try {
                            const userData = JSON.parse(storedUser);
                            setUser(userData);
                            setIsOwner(true);
                            setIsAdmin(userData.role === 'admin');
                            setIsEmployee(userData.role === 'employee');
                        } catch (e) {
                            console.error('Error parsing stored user data:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('fetchUser error:', error);
            
            // Only clear token if it's a 401 Unauthorized error (invalid/expired token)
            if (error.response && error.response.status === 401) {
                console.warn('401 Unauthorized, logging out user');
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                setToken(null);
                setUser(null);
                setIsOwner(false);
                setIsAdmin(false);
                setIsEmployee(false);
                delete axios.defaults.headers.common['Authorization'];
            } else {
                // For network errors, timeouts, or 500 errors, keep user logged in
                // Try to restore user from localStorage if available
                const storedUser = localStorage.getItem('userData');
                if (storedUser && !user) {
                    try {
                        const userData = JSON.parse(storedUser);
                        console.log('Restoring user from localStorage due to network error');
                        setUser(userData);
                        setIsOwner(true);
                        setIsAdmin(userData.role === 'admin');
                        setIsEmployee(userData.role === 'employee');
                    } catch (e) {
                        console.error('Error parsing stored user data:', e);
                    }
                }
            }
        } finally {
            setLoading(false);
        }
    }

    // function to fetch all cars from the server
    const fetchCars = async () => {
        try {
            console.log('🚗 Fetching cars from API...');
            const { data } = await axios.get('/user/cars')
            console.log('📦 Cars API response:', data);
            if (data.success) {
                console.log(`✅ Loaded ${data.cars.length} cars`);
                setCars(data.cars)
            } else {
                console.log('⚠️ API returned success: false');
                setCars([])
            }
        } catch (error) {
            console.error('❌ Error fetching cars:', error);
            // Don't show error toast on initial load, but set empty array to prevent undefined errors
            setCars([])
        }
    }

    // function to log out the user - deletes session from MongoDB
    const logout = async () => {
        try {
            // Call logout API to delete session from MongoDB
            await axios.post('/user/logout');
        } catch (error) {
            console.error('Logout API error:', error);
            // Continue with local logout even if API fails
        } finally {
            // Clear local data
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            setToken(null)
            setUser(null)
            setIsOwner(false)
            setIsAdmin(false)
            setIsEmployee(false)
            delete axios.defaults.headers.common['Authorization']
            toast.success("You have been logged out")
            navigate('/');
        }
    }

    // Function to download file (PDF/Excel)
    const downloadFile = async (url, filename) => {
        try {
            const response = await axios.get(url, {
                responseType: 'blob',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Check if response is actually a blob (not an error JSON)
            if (response.data.type === 'application/json') {
                // Response is JSON error, not a file
                const text = await response.data.text();
                const errorData = JSON.parse(text);
                throw new Error(errorData.message || 'Failed to generate file');
            }
            
            // Create blob link to download
            const blob = new Blob([response.data], { 
                type: response.headers['content-type'] 
            });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            window.URL.revokeObjectURL(link.href);
            
            toast.success(`${filename} downloaded successfully!`);
        } catch (error) {
            console.error('Download error:', error);
            toast.error(error.message || 'Failed to download file');
        }
    };

    // Function to get proper image URL
    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        
        // If it's already a full URL (Cloudinary), return as is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        
        // If it starts with res.cloudinary.com, add https://
        if (imagePath.startsWith('res.cloudinary.com')) {
            return `https://${imagePath}`;
        }
        
        // If it starts with /.netlify, it's already a full path for Netlify Functions
        if (imagePath.startsWith('/.netlify')) {
            return imagePath;
        }
        
        // If it starts with /uploads, prepend the API base URL for local dev
        if (imagePath.startsWith('/uploads')) {
            // In local dev with Netlify Dev, uploads are served through the function
            return `/.netlify/functions/api${imagePath}`;
        }
        
        // Otherwise, construct the full URL
        return `${API_BASE_URL}${imagePath}`;
    };

    // useEffect to retrieve the token from localstorage and restore user data
    useEffect(() => {
        const storedToken = localStorage.getItem('token')
        const storedUser = localStorage.getItem('userData')
        
        // Restore user data from localStorage if available (immediate load)
        if (storedUser && storedToken) {
            try {
                const userData = JSON.parse(storedUser);
                setUser(userData);
                setIsOwner(true); // Allow all users to access enterprise features
                setIsAdmin(userData.role === 'admin');
                setIsEmployee(userData.role === 'employee');
                setToken(storedToken);
                // Set axios header immediately
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            } catch (e) {
                console.error('Error parsing stored user data:', e);
                localStorage.removeItem('userData');
            }
        } else if (storedToken) {
            setToken(storedToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        
        // Fetch cars immediately if we have a token
        if (storedToken) {
            fetchCars();
        }
    }, [])

    // useEffect to fetch user data when token changes
    useEffect(() => {
        if (token) {
            // Set axios header whenever token changes
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Only fetch if we don't have user data already
            if (!user) {
                fetchUser();
            }
        }
    }, [token])

    const value = {
        navigate, 
        currency, 
        axios, 
        backendUrl: API_BASE_URL, // Add backendUrl for components that need it
        user, 
        userData: user, // Add userData alias for compatibility
        setUser, 
        token, 
        setToken, 
        isOwner, 
        setIsOwner, 
        isAdmin, 
        setIsAdmin,
        isEmployee,
        setIsEmployee,
        fetchUser, 
        showLogin, 
        setShowLogin,
        loginMode,
        setLoginMode,
        logout, 
        fetchCars, 
        cars, 
        setCars, 
        pickupDate, 
        setPickupDate, 
        returnDate, 
        setReturnDate,
        loading,
        setLoading,
        downloadFile,
        getImageUrl
    }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export const useAppContext = () => {
    return useContext(AppContext)
}