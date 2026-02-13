const mongoose = require("mongoose");
const {ObjectId} = mongoose.Schema.Types;

const carSchema = new mongoose.Schema({
    owner: {type: ObjectId, ref: "User", required: true},
    brand: {type: String, required: true},
    model: {type: String, required: true},
    registration_number: {
        type: String, 
        required: true,
        trim: true,
        minlength: [3, 'Registration number must be at least 3 characters'],
        maxlength: [20, 'Registration number cannot exceed 20 characters']
    },
    name: {type: String, required: true}, // Car display name
    image: {type: String, required: true},
    year: {type: Number, required: true},
    category: {type: String, required: true},
    seating_capacity: {type: Number, required: true},
    fuel_type: {type: String, required: true},
    transmission: {type: String, required: true},
    pricePerDay: {type: Number, required: true},
    location: {type: String, required: true},
    description: {type: String, required: true},
    isAvailable: {type: Boolean, default: true},
    isApproved: {type: Boolean, default: true}, // Auto-approve all cars (changed from false)
    approvedBy: {type: ObjectId, ref: "User"}, // Admin who approved
    approvedAt: {type: Date},
    rejectionReason: {type: String}, // Reason if rejected
    commissionRate: {type: Number, default: 60}, // Platform commission percentage (60% to platform, 40% to owner)
    ownerType: {type: String, enum: ['admin', 'user', 'employee'], required: true}, // Who owns the car
    addedBy: {type: ObjectId, ref: "User"}, // Employee who added the car (for admin cars)
    // Rating cache fields
    averageRating: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: { 
        type: Number, 
        default: 0,
        min: 0
    },
    lastRatingUpdate: { 
        type: Date 
    }
},{timestamps: true})

// Add indexes for better query performance
carSchema.index({ isAvailable: 1, isApproved: 1 }); // For getCars query
carSchema.index({ owner: 1 }); // For owner queries
carSchema.index({ category: 1 }); // For category filtering
carSchema.index({ location: 1 }); // For location-based searches
carSchema.index({ pricePerDay: 1 }); // For price sorting
carSchema.index({ createdAt: -1 }); // For recent cars
carSchema.index({ averageRating: -1 }); // Sort by rating

const Car = mongoose.models.Car || mongoose.model('Car', carSchema)

module.exports = Car;