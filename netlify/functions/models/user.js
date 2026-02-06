const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    username: {type: String, required: true, unique: true}, // Remove index: false - unique creates index automatically
    email: {type: String, required: true, unique: true}, // Remove index: false - unique creates index automatically
    phone: {type: String, default: ''},
    password: {type: String, required: true},
    role: {type: String, enum: ["admin", "user"], default: 'user'},
    image: {type: String, default: ''},
    isVerified: {type: Boolean, default: false},
    otp: {type: String},
    otpExpiry: {type: Date},
},{timestamps: true})

// Add additional indexes for better query performance (avoiding duplicates with unique fields)
userSchema.index({ role: 1 }); // For role-based queries
userSchema.index({ isVerified: 1 }); // For verified user queries
userSchema.index({ otp: 1, otpExpiry: 1 }); // For OTP verification

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;