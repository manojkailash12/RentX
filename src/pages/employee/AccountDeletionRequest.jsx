import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import BackButton from '../../components/BackButton';

const AccountDeletionRequest = () => {
  const { axios, user } = useAppContext();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);
  const [fetchingRequest, setFetchingRequest] = useState(true);

  const fetchExistingRequest = async () => {
    try {
      setFetchingRequest(true);
      const { data } = await axios.get('/employee/my-deletion-request');
      if (data.success && data.request) {
        setExistingRequest(data.request);
      }
    } catch (error) {
      console.error('Failed to fetch deletion request:', error);
    } finally {
      setFetchingRequest(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'employee') {
      fetchExistingRequest();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for account deletion');
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post('/employee/request-account-deletion', {
        reason: reason.trim()
      });

      if (data.success) {
        toast.success(data.message);
        setReason('');
        fetchExistingRequest();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit deletion request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!window.confirm('Are you sure you want to cancel your account deletion request?')) {
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post('/employee/cancel-deletion-request');

      if (data.success) {
        toast.success(data.message);
        setExistingRequest(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to cancel deletion request');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'employee') {
    return (
      <div className='min-h-screen bg-gray-50 px-4 pt-10'>
        <div className='max-w-2xl mx-auto text-center py-20'>
          <h2 className='text-2xl font-semibold text-gray-600'>Access Denied</h2>
          <p className='text-gray-500 mt-2'>This page is only accessible to employees.</p>
        </div>
      </div>
    );
  }

  if (fetchingRequest) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 px-4 pt-10'>
      <div className='max-w-2xl mx-auto'>
        <BackButton />
        
        <div className='bg-white rounded-lg shadow-md p-6 mt-6'>
          <h1 className='text-2xl font-bold text-gray-800 mb-2'>Account Deletion Request</h1>
          <p className='text-gray-600 mb-6'>
            Submit a request to delete your employee account. Admin will review and process your request.
          </p>

          {existingRequest ? (
            <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6'>
              <div className='flex items-start gap-3 mb-4'>
                <span className='text-2xl'>⏳</span>
                <div className='flex-1'>
                  <h3 className='text-lg font-semibold text-yellow-800 mb-2'>
                    Pending Deletion Request
                  </h3>
                  <p className='text-yellow-700 mb-3'>
                    Your account deletion request is pending admin review.
                  </p>
                  <div className='bg-white rounded p-3 mb-4'>
                    <p className='text-sm text-gray-600 mb-1'><strong>Reason:</strong></p>
                    <p className='text-gray-800'>{existingRequest.reason}</p>
                  </div>
                  <p className='text-sm text-gray-600'>
                    <strong>Submitted:</strong> {new Date(existingRequest.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleCancelRequest}
                disabled={loading}
                className='w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {loading ? 'Cancelling...' : 'Cancel Deletion Request'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className='mb-6'>
                <label className='block text-gray-700 font-medium mb-2'>
                  Reason for Account Deletion <span className='text-red-500'>*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder='Please explain why you want to delete your account...'
                  className='w-full p-3 border border-gray-300 rounded-md resize-none h-32 focus:outline-none focus:ring-2 focus:ring-primary'
                  required
                />
              </div>

              <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
                <h4 className='font-semibold text-red-800 mb-2'>⚠️ Important Notice</h4>
                <ul className='text-sm text-red-700 space-y-1 list-disc list-inside'>
                  <li>This action cannot be undone once approved by admin</li>
                  <li>All your data will be permanently deleted</li>
                  <li>You will lose access to your account immediately after approval</li>
                  <li>Admin will review your request before processing</li>
                </ul>
              </div>

              <button
                type='submit'
                disabled={loading || !reason.trim()}
                className='w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {loading ? 'Submitting...' : 'Submit Deletion Request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountDeletionRequest;
