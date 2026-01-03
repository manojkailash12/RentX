const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// User Schema (inline for serverless)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  address: { type: String, default: '' },
  otp: { type: String },
  otpExpires: { type: Date },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

// Password hashing
const bcrypt = require('bcryptjs');
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

const connectToDatabase = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    cachedDb = connection;
    console.log('✅ Connected to MongoDB');
    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

// Email setup
const sendOTPEmail = async (email, otp, name) => {
  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🔐 RentX - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2e7d32; color: white; padding: 30px; text-align: center; border-radius: 10px;">
            <h1>🚗 RentX</h1>
            <h2>Email Verification</h2>
          </div>
          <div style="padding: 30px; background: #f9f9f9; margin: 20px 0; border-radius: 10px;">
            <h2>Hello ${name}!</h2>
            <p>Your verification code is:</p>
            <div style="background: #2e7d32; color: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; border-radius: 10px; margin: 20px 0;">
              ${otp}
            </div>
            <p>This code expires in 10 minutes.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent to:', email);
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    // Don't throw - allow registration to continue
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    // Connect to database
    await connectToDatabase();

    const { name, email, password, phone, role } = JSON.parse(event.body);

    // Validate input
    if (!name || !email || !password || !phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'All fields are required' })
      };
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'User already exists' })
      };
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
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

    // Send OTP email (non-blocking)
    sendOTPEmail(email, otp, name).catch(console.error);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'User registered successfully! Please check your email for OTP.',
        userId: user._id,
        email: user.email
      })
    };

  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Registration failed',
        error: error.message
      })
    };
  }
};