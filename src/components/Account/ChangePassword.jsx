import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import ForgotPassword from '../Auth/ForgotPassword';
import toast from 'react-hot-toast';

const ChangePassword = ({ onClose, onSuccess }) => {
  const { axios, logout } = useAppContext();
  const [method, setMethod] = useState('current'); // 'current' or 'otp'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleChangeWithCurrent = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/user/change-password', {
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        toast.success('Password changed successfully. Logging out...');
        onSuccess && onSuccess();
        onClose();
        
        // Logout user after successful password change
        setTimeout(() => {
          logout();
        }, 1500); // Small delay to show the success message
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onClose={() => {
          setShowForgotPassword(false);
          onClose();
        }}
        onSuccess={() => {
          toast.success('Password reset successful. Logging out...');
          onSuccess && onSuccess();
          onClose();
          
          // Logout user after successful password reset via OTP
          setTimeout(() => {
            logout();
          }, 1500); // Small delay to show the success message
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Change Password</h2>

        {/* Method Selection */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMethod('current')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                method === 'current'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Use Current Password
            </button>
            <button
              type="button"
              onClick={() => setMethod('otp')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                method === 'otp'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Use Email OTP
            </button>
          </div>
        </div>

        {method === 'current' ? (
          <form onSubmit={handleChangeWithCurrent}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg outline-green-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg outline-green-500"
                minLength={4}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg outline-green-500"
                minLength={4}
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-gray-700 mb-4">
              You will receive an OTP via email to reset your password.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Continue with OTP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
