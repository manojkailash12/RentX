const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  otp: { type: String },
  otpExpires: { type: Date },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

let User;
try {
  User = mongoose.model('User');
} catch {
  User = mongoose.model('User', userSchema);
}

// MongoDB connection
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
    });
    
    cachedDb = connection;
    console.log('✅ MongoDB Connected');
    return connection;
  } catch (error) {
    console.error('❌ MongoDB Error:', error.message);
    throw error;
  }
};

// Email service
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });

    console.log('✅ Email sent to:', to);
  } catch (error) {
    console.error('❌ Email error:', error.message);
  }
};

// Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// OTP Email Template
const otpEmailTemplate = (name, otp) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #2e7d32; color: white; padding: 30px; text-align: center; border-radius: 10px;">
      <h1 style="margin: 0;">🚗 RentX</h1>
      <h2 style="margin: 10px 0 0 0;">Email Verification</h2>
    </div>
    <div style="padding: 30px; background: #f9f9f9; margin: 20px 0; border-radius: 10px;">
      <h2>Hello ${name}!</h2>
      <p>Your verification code is:</p>
      <div style="background: #2e7d32; color: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; border-radius: 10px; margin: 20px 0; letter-spacing: 5px;">
        ${otp}
      </div>
      <p>This code expires in 10 minutes.</p>
      <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
    </div>
    <div style="text-align: center; color: #666; font-size: 12px;">
      <p>© 2024 RentX - South India Car Rentals</p>
    </div>
  </div>
`;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await connectDB();

    const path = event.path.replace('/.netlify/functions/auth', '');
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    // REGISTER
    if (path === '/register' && method === 'POST') {
      const { name, email, password, phone, role } = body;

      if (!name || !email || !password || !phone) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'All fields are required' })
        };
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'User already exists' })
        };
      }

      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      const user = new User({
        name,
        email,
        password,
        phone,
        role: role || 'user',
        otp,
        otpExpires,
        isVerified: false
      });

      await user.save();

      // Send OTP email
      sendEmail(
        email,
        '🔐 RentX - Email Verification Code',
        otpEmailTemplate(name, otp)
      ).catch(console.error);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Registration successful! Please check your email for OTP.',
          userId: user._id,
          email: user.email
        })
      };
    }

    // VERIFY OTP
    if (path === '/verify-otp' && method === 'POST') {
      const { email, otp } = body;

      if (!email || !otp) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Email and OTP are required' })
        };
      }

      const user = await User.findOne({ email });
      if (!user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'User not found' })
        };
      }

      if (user.isVerified) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'User already verified' })
        };
      }

      if (user.otp !== otp || user.otpExpires < new Date()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid or expired OTP' })
        };
      }

      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Email verified successfully!',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            isVerified: user.isVerified
          }
        })
      };
    }

    // LOGIN
    if (path === '/login' && method === 'POST') {
      const { email, password } = body;

      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Email and password are required' })
        };
      }

      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: 'Invalid credentials' })
        };
      }

      if (!user.isVerified) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            message: 'Please verify your email first',
            requiresVerification: true,
            email: user.email
          })
        };
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Login successful!',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            isVerified: user.isVerified
          }
        })
      };
    }

    // RESEND OTP
    if (path === '/resend-otp' && method === 'POST') {
      const { email } = body;

      const user = await User.findOne({ email });
      if (!user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'User not found' })
        };
      }

      if (user.isVerified) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'User already verified' })
        };
      }

      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();

      sendEmail(
        email,
        '🔐 RentX - New Verification Code',
        otpEmailTemplate(user.name, otp)
      ).catch(console.error);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'New OTP sent successfully!' })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Auth function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Server error',
        error: error.message 
      })
    };
  }
};