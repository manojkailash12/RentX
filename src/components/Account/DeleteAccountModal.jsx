import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const DeleteAccountModal = ({ onClose, onSuccess }) => {
  const { axios, user } = useAppContext();
  const [step, setStep] = useState(1); // 1: Password, 2: OTP
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is employee
  const isEmployee = user?.role === 'employee';

  const handleRequestDeletion = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/user/request-deletion', {
        password,
        reason
      });

      if (response.data.success) {
        toast.success('Verification OTP sent to your email');
        setStep(2);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request deletion');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/user/verify-deletion-otp', { otp });

      if (response.data.success) {
        toast.success('Account deletion scheduled');
        onSuccess();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-red-900 mb-4">Delete Account</h2>

        {isEmployee ? (
          <div>
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800 text-sm">
                ⚠️ As an employee, you cannot delete your account directly. Please contact your administrator for account deletion requests.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleRequestDeletion}>
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-sm">
                ⚠️ This action cannot be undone. Your account will be deleted in 3 days.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg outline-red-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Reason (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg outline-red-500"
                rows={3}
                placeholder="Help us improve by telling us why..."
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
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <p className="mb-4 text-gray-700">
              Enter the OTP sent to your email to confirm account deletion.
            </p>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg outline-red-500"
                maxLength={6}
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Confirm Deletion'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DeleteAccountModal;
