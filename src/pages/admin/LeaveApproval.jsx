import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import BackButton from '../../components/BackButton';

const LeaveApproval = () => {
  const { axios, token, userData } = useAppContext();
  
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // all, pending, approved, rejected
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/leave/all');
      
      if (data.success) {
        setLeaveRequests(data.leaves || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (leaveId, status) => {
    if (!comments.trim() && status === 'Rejected') {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      const { data } = await axios.post(
        `/leave/${leaveId}/review`,
        {
          action: status === 'Approved' ? 'approve' : 'reject',
          rejectionReason: comments.trim()
        }
      );

      if (data.success) {
        toast.success(`Leave request ${status.toLowerCase()} successfully`);
        setSelectedLeave(null);
        setComments('');
        fetchLeaveRequests();
      } else {
        toast.error(data.message || 'Failed to update leave status');
      }
    } catch (error) {
      console.error('Error updating leave status:', error);
      toast.error(error.response?.data?.message || 'Failed to update leave status');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status?.toLowerCase() === filter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Leave Approval</h1>
        <p className="text-gray-600 mt-1">Review and approve employee leave requests</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({leaveRequests.filter(r => r.status?.toLowerCase() === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({leaveRequests.filter(r => r.status?.toLowerCase() === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected ({leaveRequests.filter(r => r.status?.toLowerCase() === 'rejected').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({leaveRequests.length})
          </button>
        </div>
      </div>

      {/* Leave Requests List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredRequests.length > 0 ? (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{request.employeeName || 'Employee'}</h3>
                  <p className="text-sm text-gray-500">
                    Employee ID: {request.employeeId} | Department: {request.department || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Submitted on {formatDate(request.submittedAt || request.createdAt)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                  {request.status || 'Pending'}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Leave Type</p>
                    <p className="font-medium">{request.leaveType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-medium">{formatDate(request.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">End Date</p>
                    <p className="font-medium">{formatDate(request.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium">{calculateDays(request.startDate, request.endDate)} day(s)</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Substitute</p>
                <p className="font-medium">{request.substitute}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Reason</p>
                <p className="text-gray-800">{request.reason}</p>
              </div>

              {request.status?.toLowerCase() === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedLeave(request)}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLeave(request);
                      setComments('');
                    }}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}

              {request.comments && (
                <div className="mt-4 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                  <p className="text-sm text-gray-600 mb-1">Admin Comments</p>
                  <p className="text-gray-800">{request.comments}</p>
                  {request.reviewedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Reviewed on {formatDate(request.reviewedAt)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">
            {filter === 'all' 
              ? 'No leave requests found' 
              : `No ${filter} leave requests`}
          </p>
        </div>
      )}

      {/* Approval/Rejection Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {selectedLeave.status === 'pending' ? 'Review Leave Request' : 'Leave Details'}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">Employee</p>
              <p className="font-medium">{selectedLeave.employeeName || 'Employee'}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Leave Type</p>
              <p className="font-medium">{selectedLeave.leaveType}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-medium">
                {formatDate(selectedLeave.startDate)} - {formatDate(selectedLeave.endDate)}
                ({calculateDays(selectedLeave.startDate, selectedLeave.endDate)} days)
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments {selectedLeave.status === 'pending' && '(Optional for approval, required for rejection)'}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary resize-none"
                placeholder="Add your comments here..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedLeave(null);
                  setComments('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveReject(selectedLeave._id, 'Approved')}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => handleApproveReject(selectedLeave._id, 'Rejected')}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApproval;
