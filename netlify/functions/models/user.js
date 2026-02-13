const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    username: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    phone: {type: String, default: ''},
    password: {type: String, required: true},
    role: {type: String, enum: ["admin", "user", "employee"], default: 'user'},
    image: {type: String, default: ''},
    employeeShift: {type: String, enum: ['morning', 'afternoon']}, // Shift selected during employee registration
    isVerified: {type: Boolean, default: false},
    otp: {type: String},
    otpExpiry: {type: Date},
    presence: {
        status: {type: String, enum: ['online', 'offline'], default: 'offline'},
        lastSeen: {type: Date}
    },
    
    // Password Reset Fields
    resetPasswordOTP: {type: String},
    resetPasswordOTPExpires: {type: Date},
    resetPasswordOTPAttempts: {type: Number, default: 0},
    lastPasswordResetRequest: {type: Date},
    
    // Account Deletion Fields
    accountStatus: {
        type: String,
        enum: ['active', 'pendingDeletion', 'deleted'],
        default: 'active'
    },
    deletionRequestedAt: {type: Date},
    scheduledDeletionDate: {type: Date},
    deletionReason: {type: String},
    deletionOTP: {type: String},
    deletionOTPExpires: {type: Date},
    canCancelDeletion: {type: Boolean, default: true}
},{timestamps: true})

// Add additional indexes for better query performance
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ otp: 1, otpExpiry: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ scheduledDeletionDate: 1 });
userSchema.index({ resetPasswordOTP: 1, resetPasswordOTPExpires: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;