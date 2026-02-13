import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import DeleteAccountModal from '../components/Account/DeleteAccountModal';
import DeletionCountdown from '../components/Account/DeletionCountdown';
import ChangePassword from '../components/Account/ChangePassword';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';

const AccountSettings = () => {
  const { axios, user, logout } = useAppContext();
  const navigate = useNavigate();
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletionStatus();
    
    // Check deletion status every 10 seconds if account is pending deletion
    const interval = setInterval(() => {
      if (deletionStatus?.pendingDeletion) {
        checkIfAccountDeleted();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [deletionStatus]);

  const fetchDeletionStatus = async () => {
    try {
      const response = await axios.get('/user/deletion-status');
      if (response.data.success) {
        setDeletionStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching deletion status:', error);
      // If 401 or account not found, account might be deleted
      if (error.response?.status === 401 || error.response?.status === 404) {
        handleAccountDeleted();
      }
    } finally {
      setLoading(false);
    }
  };

  const checkIfAccountDeleted = async () => {
    try {
      const response = await axios.get('/user/deletion-status');
      if (response.data.success && !response.data.pendingDeletion) {
        // Account no longer pending, might be deleted
        const userCheck = await axios.get('/user/data');
        if (!userCheck.data.success) {
          handleAccountDeleted();
        }
      }
    } catch (error) {
      // If we get 401 or 404, account is deleted
      if (error.response?.status === 401 || error.response?.status === 404) {
        handleAccountDeleted();
      }
    }
  };

  const handleAccountDeleted = () => {
    toast.success('Your account has been deleted', {
      duration: 3000,
    });
    
    // Logout and redirect to home
    setTimeout(() => {
      logout();
      navigate('/');
    }, 1000);
  };

  const handleCancelDeletion = async () => {
    try {
      const response = await axios.post('/user/cancel-deletion');
      if (response.data.success) {
        toast.success('Account deletion cancelled');
        fetchDeletionStatus();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel deletion');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <BackButton />
      </div>
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      {/* Deletion Warning */}
      {deletionStatus?.pendingDeletion && (
        <DeletionCountdown
          scheduledDate={deletionStatus.scheduledDeletionDate}
          minutesRemaining={deletionStatus.minutesRemaining}
          secondsRemaining={deletionStatus.secondsRemaining}
          onCancel={handleCancelDeletion}
          canCancel={deletionStatus.canCancel}
        />
      )}

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Personal Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Name</label>
            <p className="text-gray-900">{user?.name}</p>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Email</label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Phone</label>
            <p className="text-gray-900">{user?.phone || 'Not provided'}</p>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Password & Security</h2>
        <p className="text-gray-600 mb-4">
          Keep your account secure by regularly updating your password.
        </p>
        <button
          onClick={() => setShowChangePassword(true)}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
        >
          Change Password
        </button>
      </div>

      {/* Danger Zone */}
      {!deletionStatus?.pendingDeletion && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-4">Danger Zone</h2>
          <p className="text-red-700 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Delete Account
          </button>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => {
            setShowDeleteModal(false);
            fetchDeletionStatus();
          }}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
          }}
        />
      )}
    </div>
  );
};

export default AccountSettings;
