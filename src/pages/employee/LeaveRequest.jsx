import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/BackButton';

const LeaveRequest = () => {
  const { backendUrl, token, userData } = useAppContext();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    leaveType: '',
    customLeaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    substitute: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [showCustomLeaveType, setShowCustomLeaveType] = useState(false);

  const leaveTypes = [
    'Sick Leave',
    'Casual Leave',
    'Conference Leave',
    'Maternity Leave',
    'Paternity Leave',
    'Emergency Leave',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'leaveType') {
      setShowCustomLeaveType(value === 'Other');
      if (value !== 'Other') {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          customLeaveType: ''
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userData?.employeeId) {
      toast.error('Employee session expired. Please login again.');
      return;
    }

    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason || !formData.substitute) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.leaveType === 'Other' && !formData.customLeaveType.trim()) {
      toast.error('Please specify the leave type');
      return;
    }

    // Validate dates
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (startDate >= endDate) {
      toast.error('End date must be after start date');
      return;
    }

    if (formData.reason.length > 500) {
      toast.error('Reason must be less than 500 characters');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Submitting leave request...');

    try {
      const submitData = {
        ...formData,
        leaveType: formData.leaveType === 'Other' ? formData.customLeaveType.trim() : formData.leaveType,
        employeeId: userData.employeeId
      };

      const { data } = await axios.post(`${backendUrl}/leave/submit`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.dismiss(loadingToast);
      
      if (data.success) {
        toast.success('Leave request submitted successfully!');
        
        // Reset form
        setFormData({
          leaveType: '',
          customLeaveType: '',
          startDate: '',
          endDate: '',
          reason: '',
          substitute: ''
        });
        setShowCustomLeaveType(false);
        
        // Navigate back to dashboard after 1.5 seconds
        setTimeout(() => navigate('/employee/dashboard'), 1500);
      } else {
        toast.error(data.message || 'Failed to submit leave request');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error submitting leave request:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit leave request. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Submit Leave Request</h1>
        <p className="text-gray-600 mt-1">Request time off and specify a substitute</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Leave Type */}
          <div>
            <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-2">
              Leave Type *
            </label>
            <select
              id="leaveType"
              name="leaveType"
              value={formData.leaveType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Custom Leave Type */}
          {showCustomLeaveType && (
            <div>
              <label htmlFor="customLeaveType" className="block text-sm font-medium text-gray-700 mb-2">
                Specify Leave Type *
              </label>
              <input
                type="text"
                id="customLeaveType"
                name="customLeaveType"
                value={formData.customLeaveType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Enter leave type"
                required
              />
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Substitute */}
          <div>
            <label htmlFor="substitute" className="block text-sm font-medium text-gray-700 mb-2">
              Substitute Employee *
            </label>
            <input
              type="text"
              id="substitute"
              name="substitute"
              value={formData.substitute}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Name of substitute employee"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Leave *
            </label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary resize-none"
              placeholder="Please provide a detailed reason for your leave request..."
              maxLength={500}
              required
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {formData.reason.length}/500 characters
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/employee/dashboard')}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dull focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequest;
