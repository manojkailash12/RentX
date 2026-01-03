const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const multer = require('multer');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🔐 RentX - Email Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 20px;">
        <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
          <div style="background: #2e7d32; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🔐 Email Verification</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">RentX</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #2c3e50;">Welcome to RentX, ${name}!</h2>
            
            <p style="color: #34495e; line-height: 1.6;">
              Thank you for joining RentX! We're excited to have you on board. To complete your registration and secure your account, please verify your email address using the code below.
            </p>
            
            <div style="background: #f8f9fa; border-radius: 15px; padding: 30px; margin: 25px 0; text-align: center; border: 3px solid #2e7d32;">
              <h3 style="color: #2c3e50; margin-top: 0; margin-bottom: 15px;">Your Verification Code</h3>
              <div style="background: #2e7d32; color: white; padding: 20px; border-radius: 10px; display: inline-block; min-width: 200px;">
                <h1 style="margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 5px;">${otp}</h1>
              </div>
              <p style="margin: 15px 0 0 0; color: #7f8c8d; font-size: 14px;">
                <strong>⏰ This code expires in 10 minutes</strong>
              </p>
            </div>
            
            <div style="background: #e8f5e8; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #27ae60; margin-top: 0;">🚗 What's Next?</h3>
              <p style="margin: 5px 0; color: #2c3e50;">✅ Enter this code in the verification page</p>
              <p style="margin: 5px 0; color: #2c3e50;">✅ Complete your profile setup</p>
              <p style="margin: 5px 0; color: #2c3e50;">✅ Start exploring our premium car fleet</p>
            </div>
            
            <div style="background: #fff3cd; border-radius: 10px; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>🔒 Security Note:</strong> If you didn't create an account with RentX, please ignore this email. Your security is our priority.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #2e7d32; color: white; padding: 15px 30px; border-radius: 25px; display: inline-block;">
                <strong>🎉 Welcome to the RentX Family! 🎉</strong>
              </div>
            </div>
          </div>
          
          <div style="background: #34495e; color: white; padding: 20px; text-align: center;">
            <p style="margin: 5px 0;">🚗 Drive Your Dreams with RentX 🚗</p>
            <p style="margin: 5px 0;">📧 support@rentx.com | 🌐 www.rentx.com</p>
            <p style="margin: 5px 0; font-size: 12px; opacity: 0.8;">This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = new User({
      name,
      email,
      password,
      phone,
      role: role || 'user',
      address,
      otp,
      otpExpires
    });

    await user.save();

    // Send OTP email
    await sendOTPEmail(email, otp, name);

    res.status(201).json({
      message: 'User registered successfully. Please check your email for OTP verification.',
      userId: user._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Verify user
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp, user.name);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error while resending OTP' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Update profile
router.put('/profile', auth, upload.single('profileImage'), async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.userId;

    const updateData = { name, phone };
    
    if (req.file) {
      updateData.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires');

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

module.exports = router;