// User Controller - Updated with MongoDB session management
const User = require("../models/user.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Car = require("../models/car.js");
const Booking = require("../models/booking.js");
const { generateOTP, sendOTPEmail } = require("../utils/emailService.js");
const { createSession, deleteSession, deleteAllUserSessions } = require("../utils/sessionManager.js");

// generate jwt token
const generateToken = (userId) => {
  const payload = { userId };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Generate email verification token
const generateEmailVerificationToken = (userId, email) => {
  const payload = { userId, email, type: 'email_verification' };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// register user - step 1: send OTP
const registerUser = async (req, res) => {
  try {
    const { name, username, email, password, role, shift } = req.body;

    console.log('📝 Registration request:', { name, username, email, role, shift });

    if (!name || !username || !email || !password || !role || password.length < 4) {
      return res.json({ success: false, message: "Fill all the fields including role selection and password must be at least 4 characters" });
    }

    // Validate role - now includes employee
    if (!['admin', 'user', 'employee'].includes(role)) {
      return res.json({ success: false, message: "Please select a valid role (Admin, User, or Employee)" });
    }
    
    // Validate shift for employee role
    if (role === 'employee') {
      if (!shift || !['morning', 'afternoon'].includes(shift)) {
        return res.json({ success: false, message: "Please select a valid shift (Morning or Afternoon) for employee registration" });
      }
    }

    console.log('🔍 Checking if user exists...');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('📊 Connection state:', mongoose.connection.readyState); // 1 = connected
    
    // Check if user exists with email or username
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    console.log('User exists:', userExists ? 'YES' : 'NO');
    if (userExists) {
      console.log('Existing user:', { id: userExists._id, email: userExists.email, isVerified: userExists.isVerified });
    }

    // If user exists and is verified, reject registration
    if (userExists && userExists.isVerified) {
      console.log('❌ User already verified');
      if (userExists.email === email) {
        return res.json({ success: false, message: "Email already registered. Please login instead." });
      }
      if (userExists.username === username) {
        return res.json({ success: false, message: "Username is already taken" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    console.log('🔢 Generated OTP:', otp);

    let savedUser;

    try {
      // Update existing unverified user OR create new user
      if (userExists && !userExists.isVerified) {
        console.log('♻️ Updating existing unverified user...');
        userExists.name = name;
        userExists.username = username;
        userExists.password = hashedPassword;
        userExists.role = role;
        userExists.otp = otp;
        userExists.otpExpiry = otpExpiry;
        // Store shift in user metadata if employee
        if (role === 'employee' && shift) {
          userExists.employeeShift = shift;
        }
        savedUser = await userExists.save();
        console.log('✅ User updated successfully, ID:', savedUser._id);
      } else {
        console.log('➕ Creating new user in database...');
        const userData = { 
          name, 
          username,
          email, 
          password: hashedPassword, 
          role,
          otp, 
          otpExpiry,
          isVerified: false 
        };
        
        // Store shift in user metadata if employee
        if (role === 'employee' && shift) {
          userData.employeeShift = shift;
        }
        
        savedUser = new User(userData);
        
        // Save with error handling
        await savedUser.save();
        console.log('✅ User created successfully with ID:', savedUser._id);
      }
    } catch (saveError) {
      console.error('❌ Error saving user:', saveError);
      if (saveError.code === 11000) {
        // Duplicate key error
        const field = Object.keys(saveError.keyPattern)[0];
        return res.json({ 
          success: false, 
          message: `${field === 'email' ? 'Email' : 'Username'} already exists. Please ${field === 'email' ? 'login' : 'choose a different username'}.` 
        });
      }
      throw saveError;
    }

    // Double-check user was saved with a fresh query
    await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay for DB sync
    const verifyUser = await User.findOne({ email }).lean();
    console.log('🔍 Verification - User in DB:', verifyUser ? 'YES' : 'NO');
    if (verifyUser) {
      console.log('✅ User data confirmed:', { 
        id: verifyUser._id, 
        email: verifyUser.email, 
        hasOTP: !!verifyUser.otp,
        otpValue: verifyUser.otp 
      });
    } else {
      console.error('❌ CRITICAL: User not found after save!');
      console.error('Attempted to save:', { email, name, username, role });
      return res.json({ success: false, message: "Failed to create user account. Please try again." });
    }

    // Send OTP email
    console.log('📧 Sending OTP email...');
    
    // Generate email verification link
    const verificationToken = generateEmailVerificationToken(savedUser._id.toString(), email);
    const frontendUrl = process.env.FRONTEND_URL || process.env.URL || 'http://localhost:5173';
    
    // Include verification link for all URLs (including local IP addresses)
    const verificationLink = `${frontendUrl}/.netlify/functions/api/user/verify-email?token=${verificationToken}`;
    
    const emailResult = await sendOTPEmail(email, otp, name, role, verificationLink);
    
    if (!emailResult.success) {
      console.log('❌ Failed to send OTP email');
      return res.json({ success: false, message: "Failed to send OTP email" });
    }

    console.log('✅ Registration complete, OTP sent');

    res.json({ 
      success: true, 
      message: `OTP sent to your email for ${role} account verification. Please verify to complete registration.`,
      email: email,
      role: role
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.json({ success: false, message: error.message });
  }
};

// verify OTP and complete registration
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('🔐 Verifying OTP for:', email);
    console.log('📊 Database:', mongoose.connection.name);
    console.log('📊 Connection state:', mongoose.connection.readyState);

    if (!email || !otp) {
      return res.json({ success: false, message: "Email and OTP are required" });
    }

    // Wait a moment for any pending DB operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Case-insensitive email search
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

    console.log('🔍 User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('✅ User details:', { 
        id: user._id,
        email: user.email, 
        isVerified: user.isVerified, 
        hasOTP: !!user.otp,
        storedOTP: user.otp,
        providedOTP: otp
      });
    } else {
      console.error('❌ User not found in database');
      // Try to find ANY user to debug
      const allUsers = await User.find({}).limit(5).lean();
      console.log('📋 Sample users in DB:', allUsers.map(u => ({ email: u.email, isVerified: u.isVerified })));
    }

    if (!user) {
      console.log('❌ User not found - Registration may have failed');
      return res.json({ success: false, message: "No registration found for this email. Please register first." });
    }

    if (user.isVerified) {
      console.log('⚠️ User already verified');
      return res.json({ success: false, message: "User is already verified" });
    }

    console.log('Comparing OTP:', { provided: otp, stored: user.otp });

    if (user.otp !== otp) {
      console.log('❌ Invalid OTP');
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (new Date() > user.otpExpiry) {
      console.log('❌ OTP expired');
      return res.json({ success: false, message: "OTP has expired" });
    }

    console.log('✅ OTP valid, verifying user...');

    // Verify user
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    console.log('✅ User verified successfully');

    // If user is employee, create employee record automatically
    if (user.role === 'employee' && user.employeeShift) {
      console.log('👔 Creating employee record for:', user.email);
      
      try {
        const Employee = require('../models/employee');
        const { getNextSequence } = require('../models/counter');
        
        // Check if employee record already exists
        const existingEmployee = await Employee.findOne({ userId: user._id });
        
        if (!existingEmployee) {
          // Generate employee ID
          const empNumber = await getNextSequence('employee');
          const employeeId = `EMP${String(empNumber).padStart(4, '0')}`;
          
          // Get shift timing
          const SHIFTS = {
            morning: { start: '09:00', end: '14:00' },
            afternoon: { start: '15:00', end: '20:00' }
          };
          
          const shiftTiming = SHIFTS[user.employeeShift];
          
          // Create employee record without salary - all employees have equal access
          await Employee.create({
            userId: user._id,
            employeeId,
            shift: user.employeeShift,
            shiftTiming: {
              start: shiftTiming.start,
              end: shiftTiming.end
            },
            salary: {
              type: 'hourly',
              amount: 0 // Admin will set this later
            }
          });
          
          console.log('✅ Employee record created:', employeeId);
        } else {
          console.log('ℹ️ Employee record already exists');
        }
      } catch (empError) {
        console.error('❌ Error creating employee record:', empError);
        // Don't fail the verification if employee record creation fails
      }
    }

    // Create MongoDB session
    console.log('🔑 Creating session...');
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    const sessionToken = await createSession(user._id.toString(), userAgent, ipAddress);
    
    console.log('✅ Session created');

    res.json({ 
      success: true, 
      message: "Email verified successfully! Account created.",
      token: sessionToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.json({ success: false, message: error.message });
  }
};

// resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res.json({ success: false, message: "User is already verified" });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email with role information
    const emailResult = await sendOTPEmail(email, otp, user.name, user.role);
    
    if (!emailResult.success) {
      return res.json({ success: false, message: "Failed to send OTP email" });
    }

    res.json({ 
      success: true, 
      message: `OTP resent to your email for ${user.role} account verification` 
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// login user
const loginUser = async (req, res) => {
  try {
    const { identifier, password, role } = req.body;
    
    if (!identifier || !password || !role) {
      return res.json({ success: false, message: "Email/Username/Name, password, and role selection are required" });
    }

    // Validate role - now includes employee
    if (!['admin', 'user', 'employee'].includes(role)) {
      return res.json({ success: false, message: "Please select a valid role (Admin, User, or Employee)" });
    }

    // Find user by email, username, or name
    const user = await User.findOne({ 
      $or: [
        { email: identifier },
        { username: identifier },
        { name: identifier }
      ]
    });
    
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (!user.isVerified) {
      return res.json({ 
        success: false, 
        message: "Please verify your email first",
        needsVerification: true,
        email: user.email
      });
    }

    // Check if the role matches
    if (user.role !== role) {
      return res.json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    // Create session in MongoDB instead of JWT
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
      const sessionToken = await createSession(user._id.toString(), userAgent, ipAddress);
      
      const welcomeMessage = user.role === 'admin' 
        ? "Welcome back, Admin! You have access to platform management and analytics."
        : "Welcome back! You can book cars and manage your enterprise listings.";

      res.json({ 
        success: true, 
        token: sessionToken, // This is now a MongoDB session token, not JWT
        message: welcomeMessage,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (sessionError) {
      console.error('Session creation error:', sessionError);
      res.json({ 
        success: false, 
        message: "Login successful but session creation failed. Please try again."
      });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// get user data using token (JWT)
const getUserData = async (req, res) => {
  try {
    const { user } = req;
    res.json({ success: true, user });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// update user profile
const updateProfile = async (req, res) => {
  try {
    const { _id } = req.user;
    const { name, username, phone } = req.body;

    if (!name || !username) {
      return res.json({ success: false, message: "Name and username are required" });
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({ 
      username, 
      _id: { $ne: _id } // Exclude current user
    });

    if (existingUser) {
      return res.json({ success: false, message: "Username is already taken" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { name, username, phone: phone || '' },
      { new: true, select: '-password -otp -otpExpiry' }
    );

    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// update profile image
const updateProfileImage = async (req, res) => {
  try {
    const { _id } = req.user;
    
    if (!req.file) {
      return res.json({ success: false, message: "No image file provided" });
    }

    // Check if using Cloudinary or local storage
    const { isCloudinaryConfigured } = require('../middleware/multerCloudinary');
    let imageUrl;
    
    if (isCloudinaryConfigured() && req.file.path) {
      // Cloudinary URL
      imageUrl = req.file.path;
      console.log('✅ Image uploaded to Cloudinary:', imageUrl);
    } else if (req.file.filename) {
      // Local storage
      imageUrl = `/uploads/users/${req.file.filename}`;
      console.log('✅ Image saved locally:', imageUrl);
    } else {
      return res.json({ success: false, message: "Failed to process image" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { image: imageUrl },
      { new: true, select: '-password -otp -otpExpiry' }
    );

    res.json({ 
      success: true, 
      message: "Profile image updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.log('❌ Update profile image error:', error.message);
    res.json({ success: false, message: error.message });
  }
};

// get all cars for the frontend
const getCars = async (req, res) => {
  try {
    console.log("🔍 Fetching cars from database...");
    
    // Only filter by isApproved, not isAvailable
    // We want to show all approved cars, even if they're currently booked
    const query = {
      isApproved: true
    };
    
    console.log("📋 Query:", JSON.stringify(query));
    
    const cars = await Car.find(query).populate('owner', 'name email role');
    
    console.log(`✅ Found ${cars.length} approved cars`);
    
    // Check for active bookings for each car
    const currentDate = new Date();
    const carsWithBookingStatus = await Promise.all(
      cars.map(async (car) => {
        // Find active bookings for this car (confirmed bookings that overlap with current time)
        const activeBooking = await Booking.findOne({
          carId: car._id,
          status: 'confirmed',
          pickupDate: { $lte: currentDate },
          returnDate: { $gte: currentDate }
        });
        
        // Convert to plain object and add booking status
        const carObj = car.toObject();
        
        // If there's an active booking, mark as temporarily unavailable
        if (activeBooking) {
          carObj.isCurrentlyBooked = true;
          carObj.bookedUntil = activeBooking.returnDate;
          carObj.isAvailable = false; // Override availability for display
        } else {
          carObj.isCurrentlyBooked = false;
          carObj.bookedUntil = null;
          // Keep the original isAvailable value from the car document
        }
        
        return carObj;
      })
    );
    
    if (carsWithBookingStatus.length > 0) {
      console.log('🚗 Sample car:', {
        id: carsWithBookingStatus[0]._id,
        brand: carsWithBookingStatus[0].brand,
        model: carsWithBookingStatus[0].model,
        isAvailable: carsWithBookingStatus[0].isAvailable,
        isCurrentlyBooked: carsWithBookingStatus[0].isCurrentlyBooked,
        bookedUntil: carsWithBookingStatus[0].bookedUntil
      });
    } else {
      // Debug: check all cars
      const allCars = await Car.find({});
      console.log(`⚠️ Total cars in DB: ${allCars.length}`);
      if (allCars.length > 0) {
        console.log('⚠️ First car status:', {
          isAvailable: allCars[0].isAvailable,
          isApproved: allCars[0].isApproved
        });
      }
    }
    
    res.json({
      success: true, 
      cars: carsWithBookingStatus,
      count: carsWithBookingStatus.length
    });
  } catch (error) {
    console.error("❌ Error in getCars:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch cars",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};

// get available roles for registration/login
const getRoles = async (req, res) => {
  try {
    console.log("Fetching available roles...");
    
    const roles = [
      {
        value: 'admin',
        label: 'Admin',
        description: 'Platform owner with access to car management, analytics, and user approval'
      },
      {
        value: 'user',
        label: 'User',
        description: 'Customer who can book cars and optionally list personal vehicles for rent'
      },
      {
        value: 'employee',
        label: 'Employee',
        description: 'Staff member with access to car approvals, reviews, support tickets, and user management'
      }
    ];
    
    console.log("Roles fetched successfully");
    
    res.json({ 
      success: true, 
      roles,
      count: roles.length
    });
  } catch (error) {
    console.error("Error in getRoles:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch roles",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};

// Logout user - delete session from MongoDB
const logoutUser = async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.split(' ')[1];
    
    if (!sessionToken) {
      return res.json({ success: false, message: "No session token provided" });
    }

    await deleteSession(sessionToken);
    
    res.json({ 
      success: true, 
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Error in logout:", error);
    res.json({ success: false, message: error.message });
  }
};

// Logout from all devices - delete all user sessions
const logoutAllDevices = async (req, res) => {
  try {
    const { _id } = req.user;
    
    await deleteAllUserSessions(_id.toString());
    
    res.json({ 
      success: true, 
      message: "Logged out from all devices successfully"
    });
  } catch (error) {
    console.error("Error in logout all devices:", error);
    res.json({ success: false, message: error.message });
  }
};

// ==================== PASSWORD RESET FUNCTIONS ====================

/**
 * Request password reset - Send OTP to email
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ success: false, message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists or not (security)
      return res.json({ 
        success: true, 
        message: 'If the email exists, you will receive a password reset OTP' 
      });
    }

    // Check rate limiting (1 request per 5 minutes)
    if (user.lastPasswordResetRequest) {
      const timeSinceLastRequest = Date.now() - user.lastPasswordResetRequest.getTime();
      if (timeSinceLastRequest < 5 * 60 * 1000) {
        const waitTime = Math.ceil((5 * 60 * 1000 - timeSinceLastRequest) / 1000 / 60);
        return res.json({ 
          success: false, 
          message: `Please wait ${waitTime} minute(s) before requesting another OTP` 
        });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to user
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpiry;
    user.resetPasswordOTPAttempts = 0;
    user.lastPasswordResetRequest = new Date();
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp, 'Password Reset');

    res.json({ 
      success: true, 
      message: 'Password reset OTP sent to your email' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process password reset request' 
    });
  }
};

/**
 * Reset password with OTP verification
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.json({ 
        success: false, 
        message: 'Email, OTP, and new password are required' 
      });
    }

    if (newPassword.length < 4) {
      return res.json({ 
        success: false, 
        message: 'Password must be at least 4 characters long' 
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({ success: false, message: 'Invalid email or OTP' });
    }

    // Check if OTP exists
    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
      return res.json({ 
        success: false, 
        message: 'No password reset request found. Please request a new OTP' 
      });
    }

    // Check OTP expiry
    if (new Date() > user.resetPasswordOTPExpires) {
      return res.json({ 
        success: false, 
        message: 'OTP has expired. Please request a new one' 
      });
    }

    // Check attempts
    if (user.resetPasswordOTPAttempts >= 3) {
      return res.json({ 
        success: false, 
        message: 'Too many failed attempts. Please request a new OTP' 
      });
    }

    // Verify OTP
    if (user.resetPasswordOTP !== otp) {
      user.resetPasswordOTPAttempts += 1;
      await user.save();
      return res.json({ 
        success: false, 
        message: `Invalid OTP. ${3 - user.resetPasswordOTPAttempts} attempts remaining` 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset fields
    user.password = hashedPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    user.resetPasswordOTPAttempts = 0;
    await user.save();

    // Delete all sessions (force re-login)
    await deleteAllUserSessions(user._id);

    res.json({ 
      success: true, 
      message: 'Password reset successful. Please login with your new password' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password' 
    });
  }
};

/**
 * Change password using current password (for logged-in users)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 4) {
      return res.json({ 
        success: false, 
        message: 'New password must be at least 4 characters long' 
      });
    }

    if (currentPassword === newPassword) {
      return res.json({ 
        success: false, 
        message: 'New password must be different from current password' 
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Optionally delete all other sessions (keep current session)
    // await deleteAllUserSessions(user._id);

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change password' 
    });
  }
};

// ==================== ACCOUNT DELETION FUNCTIONS ====================

/**
 * Request account deletion - Verify password and send OTP
 * For employees, requires admin approval
 */
const requestAccountDeletion = async (req, res) => {
  try {
    const { password, reason } = req.body;
    const userId = req.user._id;

    if (!password) {
      return res.json({ success: false, message: 'Password is required' });
    }

    // Get user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user is employee - employees cannot delete their accounts
    if (user.role === 'employee') {
      return res.json({ 
        success: false, 
        message: 'Employees cannot delete their accounts. Please contact admin for account deletion requests.' 
      });
    }

    // Check if already pending deletion
    if (user.accountStatus === 'pendingDeletion') {
      return res.json({ 
        success: false, 
        message: 'Account deletion already pending',
        scheduledDate: user.scheduledDeletionDate
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.json({ success: false, message: 'Invalid password' });
    }

    // Generate OTP for deletion confirmation
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP
    user.deletionOTP = otp;
    user.deletionOTPExpires = otpExpiry;
    user.deletionReason = reason || 'No reason provided';
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp, 'Account Deletion Confirmation');

    res.json({ 
      success: true, 
      message: 'Verification OTP sent to your email' 
    });
  } catch (error) {
    console.error('Request account deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process deletion request' 
    });
  }
};

/**
 * Verify deletion OTP and schedule account deletion
 */
const verifyDeletionOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user._id;

    if (!otp) {
      return res.json({ success: false, message: 'OTP is required' });
    }

    // Get user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if OTP exists
    if (!user.deletionOTP || !user.deletionOTPExpires) {
      return res.json({ 
        success: false, 
        message: 'No deletion request found. Please start the deletion process again' 
      });
    }

    // Check OTP expiry
    if (new Date() > user.deletionOTPExpires) {
      return res.json({ 
        success: false, 
        message: 'OTP has expired. Please request deletion again' 
      });
    }

    // Verify OTP
    if (user.deletionOTP !== otp) {
      return res.json({ success: false, message: 'Invalid OTP' });
    }

    // Schedule deletion (5 minutes from now)
    const scheduledDate = new Date(Date.now() + 5 * 60 * 1000);

    // Update user status
    user.accountStatus = 'pendingDeletion';
    user.deletionRequestedAt = new Date();
    user.scheduledDeletionDate = scheduledDate;
    user.canCancelDeletion = true;
    user.deletionOTP = null;
    user.deletionOTPExpires = null;
    await user.save();

    // Send confirmation email
    const { sendEmail } = require('../utils/emailService');
    await sendEmail({
      to: user.email,
      subject: 'Account Deletion Scheduled - RentX',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Account Deletion Scheduled</h2>
          <p>Dear ${user.name},</p>
          <p>Your account deletion has been scheduled for:</p>
          <p style="font-size: 18px; font-weight: bold; color: #e74c3c;">
            ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}
          </p>
          <p><strong>You have 5 minutes to cancel this request.</strong></p>
          <p>To cancel: Login to your account and go to Settings → Account</p>
          <p><strong>What will happen:</strong></p>
          <ul>
            <li>All completed booking invoices will be sent to your email</li>
            <li>Pending bookings will be cancelled</li>
            <li>Your account and all data will be permanently deleted</li>
          </ul>
          <p>If you didn't request this, please login immediately and cancel the deletion.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </div>
      `
    });

    res.json({ 
      success: true, 
      message: 'Account deletion scheduled successfully',
      scheduledDate: scheduledDate,
      minutesRemaining: 5,
      secondsRemaining: 300
    });
  } catch (error) {
    console.error('Verify deletion OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP' 
    });
  }
};

/**
 * Cancel account deletion (within grace period)
 */
const cancelAccountDeletion = async (req, res) => {
  try {
    const userId = req.user._id;

    const { cancelDeletionRequest } = require('../utils/accountDeletion');
    await cancelDeletionRequest(userId);

    res.json({ 
      success: true, 
      message: 'Account deletion cancelled successfully' 
    });
  } catch (error) {
    console.error('Cancel account deletion error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to cancel deletion' 
    });
  }
};

/**
 * Get account deletion status
 */
const getDeletionStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('accountStatus deletionRequestedAt scheduledDeletionDate canCancelDeletion');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.accountStatus !== 'pendingDeletion') {
      return res.json({ 
        success: true, 
        status: 'active',
        pendingDeletion: false
      });
    }

    // Calculate minutes remaining (since grace period is 5 minutes)
    const now = new Date();
    const scheduledDate = new Date(user.scheduledDeletionDate);
    const minutesRemaining = Math.ceil((scheduledDate - now) / (1000 * 60));
    const secondsRemaining = Math.ceil((scheduledDate - now) / 1000);

    res.json({ 
      success: true, 
      status: 'pendingDeletion',
      pendingDeletion: true,
      deletionRequestedAt: user.deletionRequestedAt,
      scheduledDeletionDate: user.scheduledDeletionDate,
      minutesRemaining: Math.max(0, minutesRemaining),
      secondsRemaining: Math.max(0, secondsRemaining),
      canCancel: user.canCancelDeletion && now < scheduledDate
    });
  } catch (error) {
    console.error('Get deletion status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get deletion status' 
    });
  }
};

// Verify email via link (alternative to OTP)
const verifyEmailViaLink = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || process.env.URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/?verification=failed&message=Token missing`);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || process.env.URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/?verification=failed&message=Invalid or expired link`);
    }

    if (decoded.type !== 'email_verification') {
      const frontendUrl = process.env.FRONTEND_URL || process.env.URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/?verification=failed&message=Invalid token`);
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      const frontendUrl = process.env.FRONTEND_URL || process.env.URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/?verification=failed&message=User not found`);
    }

    if (user.isVerified) {
      const frontendUrl = process.env.FRONTEND_URL || process.env.URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/?verification=already&message=Already verified`);
    }

    // Verify user
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Create session
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    const sessionToken = await createSession(user._id.toString(), userAgent, ipAddress);

    // Send welcome email
    const { sendWelcomeEmail } = require('../utils/emailService');
    await sendWelcomeEmail(user.email, user.name, user.role);

    // Redirect to frontend with success and token
    const frontendUrl = process.env.FRONTEND_URL || process.env.URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?verification=success&token=${sessionToken}&name=${encodeURIComponent(user.name)}&role=${user.role}`);
  } catch (error) {
    console.error('Email verification via link error:', error);
    const frontendUrl = process.env.FRONTEND_URL || process.env.URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?verification=failed&message=${encodeURIComponent(error.message)}`);
  }
};

module.exports = {
  registerUser,
  verifyOTP,
  verifyEmailViaLink,
  resendOTP,
  loginUser,
  logoutUser,
  logoutAllDevices,
  getUserData,
  updateProfile,
  updateProfileImage,
  getCars,
  getRoles,
  // Password Reset
  forgotPassword,
  resetPassword,
  changePassword,
  // Account Deletion
  requestAccountDeletion,
  verifyDeletionOTP,
  cancelAccountDeletion,
  getDeletionStatus
};