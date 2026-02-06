// User Controller - Updated with MongoDB session management
const User = require("../models/user.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Car = require("../models/car.js");
const { generateOTP, sendOTPEmail } = require("../utils/emailService.js");
const { createSession, deleteSession, deleteAllUserSessions } = require("../utils/sessionManager.js");

// generate jwt token
const generateToken = (userId) => {
  const payload = { userId };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// register user - step 1: send OTP
const registerUser = async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    console.log('📝 Registration request:', { name, username, email, role });

    if (!name || !username || !email || !password || !role || password.length < 8) {
      return res.json({ success: false, message: "Fill all the fields including role selection and password must be at least 8 characters" });
    }

    // Validate role
    if (!['admin', 'user'].includes(role)) {
      return res.json({ success: false, message: "Please select a valid role (Admin or User)" });
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
        savedUser = await userExists.save();
        console.log('✅ User updated successfully, ID:', savedUser._id);
      } else {
        console.log('➕ Creating new user in database...');
        savedUser = new User({ 
          name, 
          username,
          email, 
          password: hashedPassword, 
          role,
          otp, 
          otpExpiry,
          isVerified: false 
        });
        
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
    const emailResult = await sendOTPEmail(email, otp, name, role);
    
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

    // Validate role
    if (!['admin', 'user'].includes(role)) {
      return res.json({ success: false, message: "Please select a valid role (Admin or User)" });
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

    // Here you would typically upload to a cloud service like ImageKit
    // For now, we'll just store the filename
    const imageUrl = `/uploads/users/${req.file.filename}`;

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
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// get all cars for the frontend
const getCars = async (req, res) => {
  try {
    console.log("🔍 Fetching cars from database...");
    
    const query = {
      isAvailable: true,
      isApproved: true
    };
    
    console.log("📋 Query:", JSON.stringify(query));
    
    const cars = await Car.find(query).populate('owner', 'name email role');
    
    console.log(`✅ Found ${cars.length} available and approved cars`);
    
    if (cars.length > 0) {
      console.log('🚗 Sample car:', {
        id: cars[0]._id,
        brand: cars[0].brand,
        model: cars[0].model,
        image: cars[0].image,
        isAvailable: cars[0].isAvailable,
        isApproved: cars[0].isApproved
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
      cars,
      count: cars.length
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

module.exports = {
  registerUser,
  verifyOTP,
  resendOTP,
  loginUser,
  logoutUser,
  logoutAllDevices,
  getUserData,
  updateProfile,
  updateProfileImage,
  getCars,
  getRoles
};