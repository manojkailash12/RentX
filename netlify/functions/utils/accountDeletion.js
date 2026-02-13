const User = require('../models/user');
const Booking = require('../models/booking');
const Session = require('../models/session');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const Review = require('../models/review');
const LoyaltyProgram = require('../models/loyaltyProgram');
const Car = require('../models/car');
const { sendEmail } = require('./emailService');
const { generateInvoicePDF } = require('./pdfGenerator');

/**
 * Process account deletion for users whose grace period has expired
 * This should be run as a scheduled job (e.g., every minute via Netlify scheduled function)
 * 
 * IMPORTANT: This function performs HARD DELETE - users are completely removed from the database.
 * The 'deleted' status should NEVER be set by the system. Users transition from 'pendingDeletion' 
 * directly to complete removal.
 * 
 * Flow:
 * 1. Find users with accountStatus 'pendingDeletion' whose scheduledDeletionDate has passed
 * 2. Process each through deleteUserAccount() which performs complete cleanup + hard delete
 * 3. Find any users with accountStatus 'deleted' (legacy cleanup only)
 * 4. Hard delete legacy 'deleted' users directly
 * 
 * @returns {Object} { success: boolean, deletedCount: number }
 */
async function processScheduledDeletions() {
    try {
        const now = new Date();
        
        // Find users scheduled for deletion whose grace period has expired
        const usersToDelete = await User.find({
            accountStatus: 'pendingDeletion',
            scheduledDeletionDate: { $lte: now }
        });

        console.log(`Found ${usersToDelete.length} users with expired grace period`);

        for (const user of usersToDelete) {
            try {
                await deleteUserAccount(user._id);
                console.log(`✅ Successfully deleted account for user: ${user.email}`);
            } catch (error) {
                console.error(`❌ Failed to delete account for user ${user.email}:`, error);
            }
        }

        // LEGACY CLEANUP: Clean up users already marked as 'deleted'
        // NOTE: The 'deleted' status should never be set by the system.
        // This cleanup exists only for historical data and should find zero users in normal operation.
        const alreadyDeletedUsers = await User.find({
            accountStatus: 'deleted'
        });

        console.log(`Found ${alreadyDeletedUsers.length} users already marked as deleted`);

        for (const user of alreadyDeletedUsers) {
            try {
                await User.findByIdAndDelete(user._id);
                console.log(`✅ Cleaned up deleted user: ${user.email}`);
            } catch (error) {
                console.error(`❌ Failed to clean up user ${user.email}:`, error);
            }
        }

        return {
            success: true,
            deletedCount: usersToDelete.length + alreadyDeletedUsers.length
        };
    } catch (error) {
        console.error('Error processing scheduled deletions:', error);
        throw error;
    }
}

/**
 * Delete user account and all associated data
 * 
 * CRITICAL: This function performs HARD DELETE using User.findByIdAndDelete().
 * The user record is COMPLETELY REMOVED from the database - no 'deleted' status is set.
 * 
 * Deletion Process (atomic):
 * 1. handleUserBookings() - Send invoices for completed bookings, cancel pending bookings
 * 2. deleteUserData() - Remove all related data (sessions, messages, reviews, loyalty, bookings, cars)
 * 3. sendDeletionConfirmationEmail() - Notify user (failure doesn't block deletion)
 * 4. User.findByIdAndDelete() - HARD DELETE the user record
 * 
 * @param {String} userId - User ID to delete
 * @returns {Object} { success: boolean }
 */
async function deleteUserAccount(userId) {
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        // Step 1: Handle bookings
        await handleUserBookings(user);

        // Step 2: Delete user data
        await deleteUserData(userId);

        // Step 3: Send final confirmation email
        await sendDeletionConfirmationEmail(user);

        // Step 4: HARD DELETE - Completely remove user from database
        // NOTE: This is a HARD DELETE, not a soft delete. The user record is permanently removed.
        // No accountStatus is set to 'deleted' - the record simply ceases to exist.
        await User.findByIdAndDelete(userId);
        
        console.log(`✅ User account completely deleted: ${user.email}`);

        return { success: true };
    } catch (error) {
        console.error('Error deleting user account:', error);
        throw error;
    }
}

/**
 * Handle user bookings before deletion
 * - Send invoices for completed bookings
 * - Cancel pending bookings
 */
async function handleUserBookings(user) {
    try {
        // Get all user bookings
        const bookings = await Booking.find({ userId: user._id })
            .populate('carId')
            .populate('ownerId');

        const completedBookings = [];
        const pendingBookings = [];

        // Categorize bookings
        for (const booking of bookings) {
            if (booking.status === 'completed') {
                completedBookings.push(booking);
            } else if (booking.status === 'pending' || booking.status === 'confirmed') {
                pendingBookings.push(booking);
            }
        }

        // Send invoices for completed bookings
        if (completedBookings.length > 0) {
            await sendCompletedBookingInvoices(user, completedBookings);
        }

        // Cancel pending bookings
        if (pendingBookings.length > 0) {
            await cancelPendingBookings(user, pendingBookings);
        }

        return {
            completedCount: completedBookings.length,
            cancelledCount: pendingBookings.length
        };
    } catch (error) {
        console.error('Error handling user bookings:', error);
        throw error;
    }
}

/**
 * Send invoices for all completed bookings
 */
async function sendCompletedBookingInvoices(user, bookings) {
    try {
        const invoices = [];

        // Generate PDFs for all completed bookings
        for (const booking of bookings) {
            try {
                const pdfBuffer = await generateInvoicePDF(booking);
                invoices.push({
                    filename: `Invoice_${booking.bookingId}.pdf`,
                    content: pdfBuffer
                });
            } catch (error) {
                console.error(`Error generating invoice for booking ${booking.bookingId}:`, error);
            }
        }

        // Send email with all invoices attached
        if (invoices.length > 0) {
            await sendEmail({
                to: user.email,
                subject: 'Your Booking Invoices - Account Deletion',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Your Booking Invoices</h2>
                        <p>Dear ${user.name},</p>
                        <p>As requested, we're sending you all invoices for your completed bookings before your account deletion.</p>
                        <p><strong>Total Completed Bookings:</strong> ${bookings.length}</p>
                        <p>All invoices are attached to this email.</p>
                        <p>Thank you for using RentX. We're sorry to see you go!</p>
                        <hr style="border: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply.</p>
                    </div>
                `,
                attachments: invoices
            });
        }

        return { success: true, count: invoices.length };
    } catch (error) {
        console.error('Error sending completed booking invoices:', error);
        throw error;
    }
}

/**
 * Cancel all pending bookings
 */
async function cancelPendingBookings(user, bookings) {
    try {
        const cancelledBookings = [];

        for (const booking of bookings) {
            try {
                // Update booking status to cancelled
                await Booking.findByIdAndUpdate(booking._id, {
                    status: 'cancelled',
                    cancellationReason: 'Account deletion by user',
                    cancelledAt: new Date()
                });

                cancelledBookings.push(booking);

                // Notify car owner
                if (booking.ownerId && booking.ownerId.email) {
                    await sendEmail({
                        to: booking.ownerId.email,
                        subject: `Booking Cancelled - ${booking.bookingId}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #333;">Booking Cancelled</h2>
                                <p>Dear ${booking.ownerId.name},</p>
                                <p>A booking for your car has been cancelled due to user account deletion.</p>
                                <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
                                <p><strong>Car:</strong> ${booking.carId?.brand} ${booking.carId?.model}</p>
                                <p><strong>Pickup Date:</strong> ${new Date(booking.pickupDate).toLocaleDateString()}</p>
                                <p><strong>Return Date:</strong> ${new Date(booking.returnDate).toLocaleDateString()}</p>
                                <p>The booking slot is now available for other customers.</p>
                            </div>
                        `
                    });
                }
            } catch (error) {
                console.error(`Error cancelling booking ${booking.bookingId}:`, error);
            }
        }

        // Send cancellation summary to user
        if (cancelledBookings.length > 0) {
            await sendEmail({
                to: user.email,
                subject: 'Bookings Cancelled - Account Deletion',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Bookings Cancelled</h2>
                        <p>Dear ${user.name},</p>
                        <p>The following bookings have been cancelled due to your account deletion:</p>
                        <ul>
                            ${cancelledBookings.map(b => `
                                <li>
                                    <strong>${b.bookingId}</strong> - ${b.carId?.brand} ${b.carId?.model}<br>
                                    ${new Date(b.pickupDate).toLocaleDateString()} to ${new Date(b.returnDate).toLocaleDateString()}
                                </li>
                            `).join('')}
                        </ul>
                        <p>If any payments were made, refunds will be processed within 7-10 business days.</p>
                    </div>
                `
            });
        }

        return { success: true, count: cancelledBookings.length };
    } catch (error) {
        console.error('Error cancelling pending bookings:', error);
        throw error;
    }
}

/**
 * Delete all user-related data
 */
async function deleteUserData(userId) {
    try {
        // Delete sessions
        await Session.deleteMany({ userId });

        // Remove user from conversations
        await Conversation.updateMany(
            { participants: userId },
            { $pull: { participants: userId } }
        );

        // Delete messages
        await Message.deleteMany({ sender: userId });

        // HARD DELETE reviews - completely remove them
        await Review.deleteMany({ userId });

        // Delete loyalty program data
        await LoyaltyProgram.deleteMany({ userId });
        
        // Delete all bookings made by this user
        await Booking.deleteMany({ userId });
        
        // Delete all bookings where user is the owner
        await Booking.deleteMany({ ownerId: userId });
        
        // Delete all cars owned by this user
        await Car.deleteMany({ ownerId: userId });

        console.log(`✅ All user data deleted for user ID: ${userId}`);

        return { success: true };
    } catch (error) {
        console.error('Error deleting user data:', error);
        throw error;
    }
}

/**
 * Send final deletion confirmation email
 */
async function sendDeletionConfirmationEmail(user) {
    try {
        await sendEmail({
            to: user.email,
            subject: 'Account Deleted - RentX',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Account Successfully Deleted</h2>
                    <p>Dear ${user.name},</p>
                    <p>Your RentX account has been permanently deleted as requested.</p>
                    <p><strong>What's been deleted:</strong></p>
                    <ul>
                        <li>Your account and profile information</li>
                        <li>Your booking history</li>
                        <li>Your conversations and messages</li>
                        <li>Your loyalty points</li>
                        <li>All personal data</li>
                    </ul>
                    <p><strong>What you received:</strong></p>
                    <ul>
                        <li>All completed booking invoices (if any)</li>
                        <li>Cancellation confirmations for pending bookings (if any)</li>
                    </ul>
                    <p>Thank you for using RentX. We're sorry to see you go!</p>
                    <p>If you change your mind, you're always welcome to create a new account.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply.</p>
                </div>
            `
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending deletion confirmation email:', error);
        // Don't throw - email failure shouldn't stop deletion
        return { success: false, error: error.message };
    }
}

/**
 * Cancel deletion request (within grace period)
 */
async function cancelDeletionRequest(userId) {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        if (user.accountStatus === 'deleted') {
            throw new Error('Account has already been deleted');
        }

        if (user.accountStatus !== 'pendingDeletion') {
            throw new Error('No pending deletion request');
        }

        if (!user.canCancelDeletion) {
            throw new Error('Deletion cannot be cancelled');
        }

        // Check if still within grace period
        if (new Date() > user.scheduledDeletionDate) {
            throw new Error('Grace period has expired - account deletion is in progress');
        }

        // Cancel deletion
        await User.findByIdAndUpdate(userId, {
            accountStatus: 'active',
            deletionRequestedAt: null,
            scheduledDeletionDate: null,
            deletionReason: null,
            deletionOTP: null,
            deletionOTPExpires: null,
            canCancelDeletion: true
        });

        // Send cancellation confirmation email
        await sendEmail({
            to: user.email,
            subject: 'Account Deletion Cancelled - RentX',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Deletion Request Cancelled</h2>
                    <p>Dear ${user.name},</p>
                    <p>Your account deletion request has been successfully cancelled.</p>
                    <p>Your account is now active and you can continue using RentX.</p>
                    <p>If you didn't cancel this request, please contact support immediately.</p>
                </div>
            `
        });

        return { success: true };
    } catch (error) {
        console.error('Error cancelling deletion request:', error);
        throw error;
    }
}

module.exports = {
    processScheduledDeletions,
    deleteUserAccount,
    handleUserBookings,
    cancelDeletionRequest
};
