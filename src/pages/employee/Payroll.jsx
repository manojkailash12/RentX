import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/BackButton';

const Payroll = () => {
  const { backendUrl, token } = useAppContext();
  const navigate = useNavigate();
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  useEffect(() => {
    fetchPayrollRecords();
  }, []);

  const fetchPayrollRecords = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/payroll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setPayrollRecords(data.payroll);
      }
    } catch (error) {
      toast.error('Failed to fetch payroll records');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const downloadPayslip = async (payrollId) => {
    try {
      const response = await axios.get(`${backendUrl}/payroll/${payrollId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip-${payrollId}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Payslip downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download payslip');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Payroll & Salary</h1>
          <p className="text-gray-600 mt-1">View your salary history and download payslips</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/employee/attendance')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📅 Attendance
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {payrollRecords.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                <p className="text-sm opacity-90">Latest Salary</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(payrollRecords[0].salary.net)}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {getMonthName(payrollRecords[0].month)} {payrollRecords[0].year}
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                <p className="text-sm opacity-90">Total Work Hours</p>
                <p className="text-3xl font-bold mt-2">
                  {payrollRecords[0].workHours.actual.toFixed(1)}h
                </p>
                {payrollRecords[0].workHours.overtime > 0 && (
                  <p className="text-xs opacity-75 mt-1">
                    Overtime: +{payrollRecords[0].workHours.overtime.toFixed(1)}h
                  </p>
                )}
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
                <p className="text-sm opacity-90">Status</p>
                <p className="text-3xl font-bold mt-2 capitalize">
                  {payrollRecords[0].status}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  Current month status
                </p>
              </div>
            </div>
          )}

          {/* Payroll Records Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">Salary History</h2>
            </div>

            {payrollRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payrollRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {getMonthName(record.month)} {record.year}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {record.workHours.actual.toFixed(1)}h
                          {record.workHours.overtime > 0 && (
                            <span className="text-xs text-green-600 ml-1">
                              (+{record.workHours.overtime.toFixed(1)}h OT)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatCurrency(record.salary.base)}
                        </td>
                        <td className="px-6 py-4 text-sm text-red-600">
                          {formatCurrency(record.salary.deductions)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-green-600">
                          {formatCurrency(record.salary.net)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            record.status === 'paid' ? 'bg-green-100 text-green-800' :
                            record.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => setSelectedPayroll(record)}
                            className="text-primary hover:text-primary-dull mr-3"
                          >
                            View
                          </button>
                          <button
                            onClick={() => downloadPayslip(record._id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-500">No payroll records found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Payroll Detail Modal */}
      {selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                Payslip - {getMonthName(selectedPayroll.month)} {selectedPayroll.year}
              </h2>
              <button
                onClick={() => setSelectedPayroll(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Work Hours Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Work Hours</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Regular Hours</p>
                    <p className="text-xl font-bold">{(selectedPayroll.workHours.actual - selectedPayroll.workHours.overtime).toFixed(1)}h</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Overtime Hours</p>
                    <p className="text-xl font-bold text-green-600">{selectedPayroll.workHours.overtime.toFixed(1)}h</p>
                  </div>
                </div>
                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Hours Worked</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedPayroll.workHours.actual.toFixed(1)}h</p>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Salary Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Base Salary</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.salary.base)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Bonuses</span>
                    <span className="font-semibold text-green-600">
                      +{formatCurrency(selectedPayroll.salary.bonuses)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Deductions</span>
                    <span className="font-semibold text-red-600">
                      -{formatCurrency(selectedPayroll.salary.deductions)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 bg-green-50 px-4 rounded-lg mt-2">
                    <span className="font-bold text-lg">Net Salary</span>
                    <span className="font-bold text-lg text-green-600">
                      {formatCurrency(selectedPayroll.salary.net)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Attendance Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Present Days</p>
                    <p className="text-xl font-bold text-green-600">
                      {selectedPayroll.attendance.present}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Absent Days</p>
                    <p className="text-xl font-bold text-red-600">
                      {selectedPayroll.attendance.absent}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Late Days</p>
                    <p className="text-xl font-bold text-yellow-600">
                      {selectedPayroll.attendance.late}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Half Days</p>
                    <p className="text-xl font-bold text-orange-600">
                      {selectedPayroll.attendance.halfDay}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => downloadPayslip(selectedPayroll._id)}
                  className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dull transition-colors"
                >
                  Download Payslip
                </button>
                <button
                  onClick={() => setSelectedPayroll(null)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
