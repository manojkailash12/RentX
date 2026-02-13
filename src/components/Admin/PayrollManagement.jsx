import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';

const PayrollManagement = () => {
  const { axios, token } = useAppContext();
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [filters, setFilters] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: ''
  });
  const [generateForm, setGenerateForm] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    sendEmail: false
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchPayrolls();
  }, [filters]);

  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get('/employees/available-users');
      if (data.success) {
        setEmployees(data.users || []);
        console.log('Fetched employees:', data.users);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to fetch employees');
    }
  };

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      if (filters.status) params.append('status', filters.status);

      const { data } = await axios.get(`/payroll?${params}`);
      if (data.success) {
        setPayrolls(data.payroll);
      }
    } catch (error) {
      toast.error('Failed to fetch payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('/payroll/generate', generateForm);
      if (data.success) {
        toast.success('Payroll generated successfully');
        setShowGenerateModal(false);
        fetchPayrolls();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate payroll');
    }
  };

  const handlePaySalary = async (payrollId) => {
    if (!confirm('Confirm salary payment?')) return;
    
    try {
      const { data } = await axios.post(
        `/payroll/${payrollId}/pay`,
        { paymentMethod: 'bank-transfer' }
      );
      if (data.success) {
        toast.success('Salary paid successfully');
        fetchPayrolls();
      }
    } catch (error) {
      toast.error('Failed to pay salary');
    }
  };

  const handleEmailPayslip = async (payrollId) => {
    try {
      const { data } = await axios.post(`/payroll/${payrollId}/email`, {});
      if (data.success) {
        toast.success('Payslip emailed successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to email payslip');
    }
  };

  const handleDownloadPayslip = async (payrollId) => {
    try {
      const response = await axios.get(
        `/payroll/${payrollId}/download`,
        { 
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip-${payrollId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Payslip downloaded successfully');
    } catch (error) {
      toast.error('Failed to download payslip');
    }
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payroll Management</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dull"
        >
          Generate Payroll
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employee</label>
            <select
              value={filters.employeeId}
              onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp.employeeId}>
                  {emp.employeeId} - {emp.userId?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Month</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              {monthNames.map((month, idx) => (
                <option key={idx} value={idx + 1}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Year</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="calculated">Calculated</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payrolls.map((payroll) => (
                <tr key={payroll._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{payroll.employeeId?.userId?.name}</div>
                    <div className="text-xs text-gray-500">{payroll.employeeId?.employeeId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {monthNames[payroll.month - 1]} {payroll.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div>Present: {payroll.attendance.presentDays}</div>
                    <div className="text-xs text-gray-500">
                      Half: {payroll.attendance.halfDays} | Absent: {payroll.attendance.absentDays}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {payroll.workHours.actual.toFixed(1)}h
                    {payroll.workHours.overtime > 0 && (
                      <span className="text-xs text-green-600 ml-1">
                        (+{payroll.workHours.overtime.toFixed(1)}h OT)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    ₹{payroll.salary.calculated.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    +₹{payroll.salary.overtime.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    ₹{payroll.salary.net.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      payroll.status === 'paid' ? 'bg-green-100 text-green-800' :
                      payroll.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      payroll.status === 'calculated' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {payroll.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      {payroll.status !== 'paid' && (
                        <button
                          onClick={() => handlePaySalary(payroll._id)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                        >
                          Pay Now
                        </button>
                      )}
                      {payroll.status === 'paid' && (
                        <span className="text-xs text-gray-500">
                          Paid on {new Date(payroll.paidOn).toLocaleDateString()}
                        </span>
                      )}
                      <button
                        onClick={() => handleEmailPayslip(payroll._id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                        title="Email Payslip"
                      >
                        📧 Email
                      </button>
                      <button
                        onClick={() => handleDownloadPayslip(payroll._id)}
                        className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600"
                        title="Download Payslip"
                      >
                        📥 PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payrolls.length === 0 && (
            <div className="text-center py-8 text-gray-500">No payroll records found</div>
          )}
        </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Generate Payroll</h2>
            <form onSubmit={handleGeneratePayroll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee</label>
                <select
                  value={generateForm.employeeId}
                  onChange={(e) => setGenerateForm({ ...generateForm, employeeId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.employeeId} - {emp.userId?.name || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select
                  value={generateForm.month}
                  onChange={(e) => setGenerateForm({ ...generateForm, month: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                >
                  {monthNames.map((month, idx) => (
                    <option key={idx} value={idx + 1}>{month}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <select
                  value={generateForm.year}
                  onChange={(e) => setGenerateForm({ ...generateForm, year: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={generateForm.sendEmail}
                  onChange={(e) => setGenerateForm({ ...generateForm, sendEmail: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="sendEmail" className="text-sm font-medium">
                  Send payslip via email after generation
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-primary-dull"
                >
                  Generate
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;
