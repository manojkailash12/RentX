import React from 'react'
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const Login = () => {

    const {setShowLogin, loginMode, axios, setToken, navigate} = useAppContext()

    const [state, setState] = React.useState(loginMode || "login");
    const [name, setName] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [loginIdentifier, setLoginIdentifier] = React.useState(""); // For login with email/username/name
    const [password, setPassword] = React.useState("");
    const [role, setRole] = React.useState("user");
    const [otp, setOtp] = React.useState("");
    const [showOtpVerification, setShowOtpVerification] = React.useState(false);
    const [roles, setRoles] = React.useState([
        {
            value: 'user',
            label: 'User',
            description: 'Customer who can book cars and optionally list personal vehicles for rent'
        },
        {
            value: 'admin',
            label: 'Admin',
            description: 'Platform owner with access to car management, analytics, and user approval'
        }
    ]);
    const [loading, setLoading] = React.useState(false);
    const [otpLoading, setOtpLoading] = React.useState(false);
    const [resendLoading, setResendLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    // Reset form fields when component mounts with different mode (but preserve OTP state)
    React.useEffect(() => {
        if (!showOtpVerification) {
            setName("");
            setUsername("");
            setEmail("");
            setLoginIdentifier("");
            setPassword("");
            setRole("user");
            setOtp("");
        }
    }, [showOtpVerification]); // Depend on OTP verification state

    // Fetch available roles on component mount (only if not in OTP verification mode)
    React.useEffect(() => {
        if (!showOtpVerification) {
            const fetchRoles = async () => {
                try {
                    const {data} = await axios.get('/user/roles');
                    if(data.success && data.roles && data.roles.length > 0) {
                        setRoles(data.roles);
                    }
                } catch (error) {
                    console.error('Error fetching roles:', error);
                    // Keep the default roles if API fails
                }
            };
            fetchRoles();
        }
    }, [axios, showOtpVerification]);

    const onSubmitHandler = async (event)=> {
        try {
            event.preventDefault();
            setLoading(true);
            setError(""); // Clear previous errors

            if (state === "register") {
                console.log('📝 Registering user:', { name, username, email, role });
                // Registration - send OTP
                const {data} = await axios.post('/user/register', {name, username, email, password, role});
                
                console.log('📥 Registration response:', data);
                
                if(data.success) {
                    console.log('✅ Registration successful, showing OTP verification');
                    toast.success(data.message);
                    // Show OTP verification form
                    setShowOtpVerification(true);
                } else {
                    console.log('❌ Registration failed:', data.message);
                    setError(data.message);
                    // If email already exists, show login option
                    if (data.message.includes('already registered')) {
                        toast.error(data.message);
                        // Optionally switch to login mode
                        setTimeout(() => {
                            setState('login');
                            setShowOtpVerification(false);
                        }, 2000);
                    }
                }
            } else {
                console.log('🔐 Logging in user:', { identifier: loginIdentifier, role });
                // Login - can use email, username, or name
                const {data} = await axios.post('/user/login', {identifier: loginIdentifier, password, role});
                
                console.log('📥 Login response:', data);
                
                if(data.success) {
                    console.log('✅ Login successful');
                    // Set token in localStorage first
                    localStorage.setItem('token', data.token);
                    // Store user data if available
                    if (data.user) {
                        console.log('👤 Storing user data:', data.user);
                        localStorage.setItem('userData', JSON.stringify(data.user));
                    }
                    // Set axios header immediately
                    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                    // Set token in context (this will trigger fetchUser in AppContext)
                    setToken(data.token);
                    
                    toast.success(data.message || 'Login successful!');
                    setShowLogin(false);
                    
                    // Navigate after a brief delay to ensure state is updated
                    setTimeout(() => {
                        console.log('🏠 Navigating to home...');
                        navigate('/');
                    }, 100);
                } else {
                    console.log('❌ Login failed:', data.message);
                    setError(data.message);
                    if(data.needsVerification) {
                        console.log('⚠️ User needs verification, showing OTP form');
                        setShowOtpVerification(true);
                        setEmail(data.email); // Set email for OTP verification
                    }
                }
            }
        } catch (error) {
            console.error('❌ Submit error:', error);
            console.error('Error response:', error.response?.data);
            const errorMessage = error.response?.data?.message || error.message || 'Something went wrong';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    const onOtpSubmitHandler = async (event) => {
        try {
            event.preventDefault();
            setOtpLoading(true);
            
            console.log('📤 Sending OTP verification request:', { email, otp });

            const {data} = await axios.post('/user/verify-otp', {email, otp});
            
            console.log('📥 OTP verification response:', data);
            
            if(data.success) {
                console.log('✅ OTP verification successful');
                toast.success(data.message);
                
                // Check if session was created successfully
                if (data.token) {
                    console.log('🔑 Session token received, logging in...');
                    // Set token in localStorage first
                    localStorage.setItem('token', data.token);
                    // Set token in context (this will trigger fetchUser in AppContext)
                    setToken(data.token);
                    // Store user data immediately
                    if (data.user) {
                        console.log('👤 Storing user data:', data.user);
                        localStorage.setItem('userData', JSON.stringify(data.user));
                    }
                    // Set axios header immediately
                    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                    // Close login modal
                    setShowLogin(false);
                    // Navigate to home
                    console.log('🏠 Navigating to home...');
                    navigate('/');
                } else if (data.requiresLogin) {
                    console.log('⚠️ Account created, redirecting to login');
                    // Account created but session failed - redirect to login
                    toast.success('Account created! Please login to continue.');
                    setShowOtpVerification(false);
                    setState('login');
                } else {
                    console.log('⚠️ Unexpected response format');
                    // Unexpected response
                    setShowOtpVerification(false);
                    setState('login');
                }
            } else {
                console.log('❌ OTP verification failed:', data.message);
                toast.error(data.message);
                setError(data.message);
                
                // If account already active, switch to login
                if (data.message.includes('already active')) {
                    setTimeout(() => {
                        setShowOtpVerification(false);
                        setState('login');
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('❌ OTP verification error:', error);
            console.error('Error response:', error.response?.data);
            const errorMessage = error.response?.data?.message || error.message || 'OTP verification failed';
            toast.error(errorMessage);
            setError(errorMessage);
        } finally {
            setOtpLoading(false);
        }
    }

    const resendOtp = async () => {
        try {
            setResendLoading(true);
            const {data} = await axios.post('/user/resend-otp', {email});
            
            if(data.success) {
                toast.success(data.message);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Failed to resend OTP');
        } finally {
            setResendLoading(false);
        }
    }

    const goToHome = () => {
        setShowLogin(false);
        navigate('/');
    }

    if (showOtpVerification) {
        return (
            <div onClick={() => setShowLogin(false)} className='fixed top-0 bottom-0 left-0 right-0 z-100 flex items-center text-sm text-gray-600 overflow-hidden' style={{
                background: 'linear-gradient(180deg, #60a5fa 0%, #93c5fd 50%, #fbbf24 100%)'
            }}>
                {/* Animated clouds */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-32 h-16 bg-white/40 rounded-full animate-float" style={{animationDelay: '0s'}}></div>
                    <div className="absolute top-32 right-20 w-40 h-20 bg-white/30 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
                    <div className="absolute top-16 right-1/3 w-36 h-18 bg-white/35 rounded-full animate-float" style={{animationDelay: '4s'}}></div>
                </div>

                {/* Mountains at bottom */}
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                    <svg viewBox="0 0 1200 300" className="w-full h-auto">
                        <path d="M0,300 L0,200 L200,100 L400,200 L600,80 L800,180 L1000,120 L1200,200 L1200,300 Z" fill="#6b7280" opacity="0.7"/>
                        <path d="M0,300 L0,220 L150,140 L350,220 L550,120 L750,200 L950,160 L1200,220 L1200,300 Z" fill="#4b5563" opacity="0.8"/>
                        <path d="M0,300 L0,240 L100,180 L300,240 L500,160 L700,220 L900,190 L1200,240 L1200,300 Z" fill="#374151" opacity="0.9"/>
                    </svg>
                    {/* Green grass/trees at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end justify-around">
                        <div className="w-8 h-12 bg-green-700 rounded-t-full"></div>
                        <div className="w-6 h-16 bg-green-600 rounded-t-full"></div>
                        <div className="w-10 h-14 bg-green-700 rounded-t-full"></div>
                        <div className="w-8 h-12 bg-green-600 rounded-t-full"></div>
                    </div>
                </div>

                <form onSubmit={onOtpSubmitHandler} onClick={(e)=>e.stopPropagation()} className="relative flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-[352px] rounded-lg shadow-2xl border border-gray-200 bg-white z-10">
                    {/* Header with close button */}
                    <button 
                        type="button"
                        onClick={() => setShowLogin(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <p className="text-2xl font-medium m-auto text-center">
                        <span className="text-green-600">Email</span> Verification
                    </p>
                    <p className="text-center text-gray-600 text-sm">
                        We've sent a 6-digit OTP to <strong>{email}</strong>
                    </p>
                    <div className="w-full">
                        <p>Enter OTP</p>
                        <input 
                            onChange={(e) => setOtp(e.target.value)} 
                            value={otp} 
                            placeholder="Enter 6-digit OTP" 
                            className="border border-gray-200 rounded w-full p-2 mt-1 outline-green-500 text-center text-lg tracking-widest" 
                            type="text" 
                            maxLength="6"
                            required 
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-2 w-full">
                        <button 
                            type="button"
                            onClick={resendOtp}
                            disabled={resendLoading}
                            className="border border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-all w-full py-2 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {resendLoading ? 'Sending...' : 'Resend OTP'}
                        </button>
                        <button 
                            type="submit"
                            disabled={otpLoading || otp.length !== 6}
                            className="bg-green-600 hover:bg-green-700 transition-all text-white w-full py-2 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {otpLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </div>
                    <button 
                        type="button"
                        onClick={() => setShowOtpVerification(false)}
                        className="text-gray-500 text-sm mx-auto hover:text-gray-700 transition-colors"
                    >
                        Back to {state}
                    </button>
                </form>

                <style jsx>{`
                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-20px); }
                    }
                    .animate-float {
                        animation: float 6s ease-in-out infinite;
                    }
                `}</style>
            </div>
        )
    }

    return (
        <div onClick={() => setShowLogin(false)} className='fixed top-0 bottom-0 left-0 right-0 z-100 flex items-center text-sm text-gray-600 overflow-hidden' style={{
            background: 'linear-gradient(180deg, #60a5fa 0%, #93c5fd 50%, #fbbf24 100%)'
        }}>
            {/* Animated clouds */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-32 h-16 bg-white/40 rounded-full animate-float" style={{animationDelay: '0s'}}></div>
                <div className="absolute top-32 right-20 w-40 h-20 bg-white/30 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
                <div className="absolute top-16 right-1/3 w-36 h-18 bg-white/35 rounded-full animate-float" style={{animationDelay: '4s'}}></div>
            </div>

            {/* Mountains at bottom */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                <svg viewBox="0 0 1200 300" className="w-full h-auto">
                    <path d="M0,300 L0,200 L200,100 L400,200 L600,80 L800,180 L1000,120 L1200,200 L1200,300 Z" fill="#6b7280" opacity="0.7"/>
                    <path d="M0,300 L0,220 L150,140 L350,220 L550,120 L750,200 L950,160 L1200,220 L1200,300 Z" fill="#4b5563" opacity="0.8"/>
                    <path d="M0,300 L0,240 L100,180 L300,240 L500,160 L700,220 L900,190 L1200,240 L1200,300 Z" fill="#374151" opacity="0.9"/>
                </svg>
                {/* Green grass/trees at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end justify-around">
                    <div className="w-8 h-12 bg-green-700 rounded-t-full"></div>
                    <div className="w-6 h-16 bg-green-600 rounded-t-full"></div>
                    <div className="w-10 h-14 bg-green-700 rounded-t-full"></div>
                    <div className="w-8 h-12 bg-green-600 rounded-t-full"></div>
                </div>
            </div>

            <form onSubmit={onSubmitHandler} onClick={(e)=>e.stopPropagation()} className="relative flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-[400px] rounded-lg shadow-2xl border border-gray-200 bg-white z-10">
                {/* Header with close button */}
                <button 
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <p className="text-2xl font-medium m-auto">
                    <span className="text-green-600">{state === "login" ? "Sign In" : "Sign Up"}</span>
                </p>
                
                {/* Role Selection */}
                <div className="w-full">
                    <p className="mb-1 font-medium">Select Role *</p>
                    <select 
                        onChange={(e) => setRole(e.target.value)} 
                        value={role} 
                        className="border border-gray-200 rounded w-full p-2 mt-1 outline-green-500 bg-white transition-colors focus:border-green-500"
                        required
                    >
                        {roles.map((roleOption) => (
                            <option key={roleOption.value} value={roleOption.value}>
                                {roleOption.label}
                            </option>
                        ))}
                    </select>
                    {/* Role Description */}
                    {roles.find(r => r.value === role) && (
                        <div className="mt-2 p-2 bg-green-50 rounded-md">
                            <p className="text-xs text-green-700">
                                <strong>{roles.find(r => r.value === role)?.label}:</strong> {roles.find(r => r.value === role)?.description}
                            </p>
                        </div>
                    )}
                </div>

                {state === "register" && (
                    <>
                        <div className="w-full">
                            <p>Full Name *</p>
                            <input 
                                onChange={(e) => setName(e.target.value)} 
                                value={name} 
                                placeholder="Enter your full name" 
                                className="border border-gray-200 rounded w-full p-2 mt-1 outline-green-500 transition-colors focus:border-green-500" 
                                type="text" 
                                required 
                                autoFocus
                            />
                        </div>
                        <div className="w-full">
                            <p>Username *</p>
                            <input 
                                onChange={(e) => setUsername(e.target.value)} 
                                value={username} 
                                placeholder="Enter a unique username" 
                                className="border border-gray-200 rounded w-full p-2 mt-1 outline-green-500 transition-colors focus:border-green-500" 
                                type="text" 
                                required 
                            />
                        </div>
                        <div className="w-full">
                            <p>Email *</p>
                            <input 
                                onChange={(e) => setEmail(e.target.value)} 
                                value={email} 
                                placeholder="Enter your email" 
                                className="border border-gray-200 rounded w-full p-2 mt-1 outline-green-500 transition-colors focus:border-green-500" 
                                type="email" 
                                required 
                            />
                        </div>
                    </>
                )}
                
                {state === "login" && (
                    <div className="w-full">
                        <p>Email / Username / Name *</p>
                        <input 
                            onChange={(e) => setLoginIdentifier(e.target.value)} 
                            value={loginIdentifier} 
                            placeholder="Enter your email, username, or name" 
                            className="border border-gray-200 rounded w-full p-2 mt-1 outline-green-500 transition-colors focus:border-green-500" 
                            type="text" 
                            required 
                            autoFocus
                        />
                    </div>
                )}
                <div className="w-full ">
                    <p>Password *</p>
                    <input 
                        onChange={(e) => setPassword(e.target.value)} 
                        value={password} 
                        placeholder="Enter password" 
                        className="border border-gray-200 rounded w-full p-2 mt-1 outline-green-500 transition-colors focus:border-green-500" 
                        type="password" 
                        minLength="8"
                        required 
                    />
                </div>

                {state === "register" ? (
                    <p className="text-sm">
                        Already have account? <span onClick={() => setState("login")} className="text-green-600 cursor-pointer underline hover:text-green-700 transition-colors">click here</span>
                    </p>
                ) : (
                    <p className="text-sm">
                        Don't have an account? <span onClick={() => setState("register")} className="text-green-600 cursor-pointer underline hover:text-green-700 transition-colors">Sign Up</span>
                    </p>
                )}
                <p className="text-xs text-center text-blue-600 cursor-pointer hover:underline">Forgot Password?</p>
                <button 
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 transition-all text-white w-full py-2 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            {state === "register" ? "Sending OTP..." : "Logging in..."}
                        </span>
                    ) : (
                        state === "register" ? "Send OTP" : "Sign In"
                    )}
                </button>
                
                {/* Error message display */}
                {error && (
                    <div className="w-full p-3 bg-red-50 border border-red-200 rounded-md text-center">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}
            </form>
        </div>
    )
}

export default Login