import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import BackButton from '../../components/BackButton';

const EmployeeDeletionRequests = () => {
  const { axios, isAdmin } = useAppContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/admin/employee-deletion-requests');
      if (data.success) {
        setRequests(data.requests);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch deletion requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin]);

  const handleApprove = async (request) => {
    if (!window.confirm(
      `Are you sure you want to approve the account deletion for ${request.employeeId.name}? This action cannot be undone.`
    )) {
      return;
    }

    try {
      setProcessing(true);
      const { data } = await axios.post('/admin/approve-employee-deletion', {
        requestId: request._id
      });

      if (data.success) {
        toast.success(data.message);
        fetchRequests();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to approve deletion request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      const { data } = await axios.post('/admin/reject-employee-deletion', {
        requestId: selectedRequest._id,
        rejectionReason: rejectionReason.trim()
      });

      if (data.success) {
        toast.success(data.message);
        setShowRejectModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
        fetchRequests();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to reject deletion request');
    } finally {
      setProcessing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className='min-h-screen bg-gray-50 px-4 pt-10'>
        <div className='max-w-7xl mx-auto text-center py-20'>
          <h2 className='text-2xl font-semibold text-gray-600'>Access Denied</h2>
          <p className='text-gray-500 mt-2'>This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 px-4 pt-10'>
      <div className='max-w-7xl mx-auto'>
        <BackButton />
        
        <div className='mt-6 mb-8'>
          <h1 className='text-3xl font-bold text-gray-800 mb-2'>
            Employee Account Deletion Requests
          </h1>
          <p className='text-gray-600'>
            Review and process employee account deletion requests
          </p>
        </div>

        {loading ? (
          <div className='flex justify-center items-center py-20'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
          </div>
        ) : requests.length === 0 ? (
          <div className='bg-white rounded-lg shadow-md p-12 text-center'>
            <div className='text-6xl mb-4'>📋</div>
            <h3 className='text-xl font-semibold text-gray-600 mb-2'>
              No Pending Requests
            </h3>
            <p className='text-gray-500'>
              There are no employee account deletion requests at this time.
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {requests.map((request) => (
              <div
                key={request._id}
                className='bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow'
              >
                <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-3 mb-3'>
                      <div className='h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-medium'>
                        {request.employeeId.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className='text-lg font-semibold text-gray-800'>
                          {request.employeeId.name}
                        </h3>
                        <p className='text-sm text-gray-600'>{request.employeeId.email}</p>
                      </div>
                    </div>

                    <div className='bg-gray-50 rounded-lg p-4 mb-3'>
                      <p className='text-sm font-medium text-gray-700 mb-2'>Reason:</p>
                      <p className='text-gray-800'>{request.reason}</p>
                    </div>

                    <div className='flex flex-wrap gap-4 text-sm text-gray-600'>
                      <div>
                        <span className='font-medium'>Submitted:</span>{' '}
                        {new Date(request.createdAt).toLocaleString()}
                      </div>
                      <div>
                        <span className='inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium'>
                          Pending Review
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='flex md:flex-col gap-2 md:min-w-[140px]'>
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={processing}
                      className='flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      ✓ Approve & Delete
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectModal(true);
                      }}
                      disabled={processing}
                      className='flex-1 md:flex-none bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectModal && selectedRequest && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
            <div className='bg-white rounded-lg max-w-md w-full p-6'>
              <h3 className='text-lg font-semibold mb-4'>Reject Deletion Request</h3>
              <p className='text-gray-600 mb-4'>
                Provide a reason for rejecting {selectedRequest.employeeId.name}'s account deletion request:
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder='Enter rejection reason...'
                className='w-full p-3 border border-gray-300 rounded-md resize-none h-24 mb-4 focus:outline-none focus:ring-2 focus:ring-primary'
                required
              />
              <div className='flex gap-3'>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  disabled={processing}
                  className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectionReason.trim()}
                  className='flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {processing ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDeletionRequests;
