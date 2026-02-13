import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/BackButton';

const Attendance = () => {
  const { token, userData } = useAppContext();
  const navigate = useNavigate();
  const [todayStatus, setTodayStatus] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchTodayStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `/employee-attendance/today/${userData._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTodayStatus(data);
    } catch (error) {
      console.error('Error fetching today status:', error);
      console.error('Error details:', error.response?.data);
      
      // More specific error messages
      if (error.response?.status === 404) {
        toast.error('Employee record not found. Please contact admin.');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch attendance status');
      }
      
      // Set default state to allow check-in
      setTodayStatus({
        canCheckIn: true,
        canCheckOut: false,
        hasCheckedIn: false,
        hasCheckedOut: false,
        today: new Date(),
        attendance: null
      });
    }
  }, [token, userData._id]);

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `/employee-attendance/history/${userData._id}`,
        {
          params: { month: selectedMonth, year: selectedYear },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAttendanceHistory(data.attendance || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      setAttendanceHistory([]);
      setLoading(false);
    }
  }, [token, userData._id, selectedMonth, selectedYear]);

  useEffect(() => {
    if (userData?._id) {
      Promise.all([fetchTodayStatus(), fetchAttendanceHistory()]);
    }
  }, [userData, selectedMonth, selectedYear, fetchTodayStatus, fetchAttendanceHistory]);

  useEffect(() => {
    if (!userData?._id) return;
    const interval = setInterval(() => {
      fetchTodayStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [userData?._id, fetchTodayStatus]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const { data } = await axios.post(
        `/employee-attendance/checkin`,
        { userId: userData._id, attendanceMethod: 'manual', location: 'Office' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(data.message);
      await Promise.all([fetchTodayStatus(), fetchAttendanceHistory()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clock in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      const { data } = await axios.put(
        `/employee-attendance/checkout`,
        { userId: userData._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(data.message);
      await Promise.all([fetchTodayStatus(), fetchAttendanceHistory()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clock out');
    } finally {
      setCheckingOut(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'on-leave': return 'bg-blue-100 text-blue-800';
      case 'half-day': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4">Loading attendance data...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg">No user data found</p>
          <p className="text-gray-600">Please log in again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Staff Attendance Dashboard</h1>
        <p className="text-gray-600 mt-1">Mark your attendance and view history</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Today's Attendance</h2>
        
        {/* Shift Timing Info */}
        {todayStatus?.employee && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-blue-900">Current Shift</p>
                <p className="text-lg font-bold text-blue-700 capitalize">
                  {todayStatus.currentShift || todayStatus.employee.shift} Shift
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-blue-600">Start Time</p>
                  <p className="text-xl font-bold text-blue-900">
                    {todayStatus.employee.shiftTiming?.start || 'N/A'}
                  </p>
                </div>
                <div className="text-2xl text-blue-400">→</div>
                <div>
                  <p className="text-xs text-blue-600">End Time</p>
                  <p className="text-xl font-bold text-blue-900">
                    {todayStatus.employee.shiftTiming?.end || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Date</p>
            <p className="font-semibold">{formatDate(todayStatus?.today || new Date())}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Check In</p>
            <p className="font-semibold text-lg">
              {formatTime(todayStatus?.attendance?.checkIn?.time)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Check Out</p>
            <p className="font-semibold text-lg">
              {formatTime(todayStatus?.attendance?.checkOut?.time)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Status</p>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(todayStatus?.attendance?.status)}`}>
              {todayStatus?.attendance?.status || 'Not Marked'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {/* Show error message if API failed */}
          {!todayStatus && (
            <div className="text-red-600 font-medium text-center w-full mb-4">
              Unable to load attendance status. Please refresh the page.
            </div>
          )}
          
          {/* Always show check-in button if not checked in */}
          {(todayStatus?.canCheckIn || (!todayStatus?.hasCheckedIn && !todayStatus?.attendance?.checkIn)) && (
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {checkingIn ? 'Checking In...' : 'Check In'}
            </button>
          )}

          {todayStatus?.canCheckOut && (
            <button
              onClick={handleCheckOut}
              disabled={checkingOut}
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {checkingOut ? 'Checking Out...' : 'Check Out'}
            </button>
          )}

          {todayStatus?.hasCheckedOut && (
            <div className="text-green-600 font-medium text-lg">
              ✓ Day Complete
            </div>
          )}
        </div>
      </div>
    
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={2024 + i} value={2024 + i}>
                  {2024 + i}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Attendance History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Working Hours</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceHistory.map((record, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{formatDate(record.date)}</td>
                  <td className="px-4 py-2">{formatTime(record.checkIn?.time)}</td>
                  <td className="px-4 py-2">{formatTime(record.checkOut?.time)}</td>
                  <td className="px-4 py-2">
                    {record.workDuration?.hours || 0}h {record.workDuration?.minutes || 0}m
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {attendanceHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No attendance records found for the selected period.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
