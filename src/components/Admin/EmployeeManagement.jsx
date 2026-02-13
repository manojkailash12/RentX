import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';

const EmployeeManagement = () => {
  const { backendUrl, token } = useAppContext();
  const [employees, setEmployees] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    userId: '',
    shift: '', // Will be populated from user's registration
    salaryType: 'hourly',
    salaryAmount: '',
    designation: 'Support Executive',
    department: 'support'
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      console.log('🔍 Fetching available users...');
      const { data } = await axios.get(`${backendUrl}/employees/available-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📦 Response:', data);
      if (data.success) {
        console.log(`✅ Found ${data.count} available users`);
        console.log(`📊 Total employee users: ${data.totalEmployeeUsers}`);
        console.log(`📊 Existing records: ${data.existingRecords}`);
        setAvailableUsers(data.users);
        
        if (data.users.length === 0 && data.totalEmployeeUsers > 0) {
          toast.info(`All ${data.totalEmployeeUsers} employee users already have records`);
        } else if (data.users.length === 0) {
          toast.error('No users with employee role found. Users must register with employee role first.');
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch available users:', error);
      toast.error('Failed to fetch available users');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee && !formData.userId) {
      toast.error('Please select a user');
      return;
    }
    
    try {
      if (selectedEmployee) {
        // Update existing employee with salary
        const { data } = await axios.put(
          `${backendUrl}/employees/${selectedEmployee.employeeId}`,
          {
            salary: {
              type: formData.salaryType,
              amount: formData.salaryAmount
            }
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (data.success) {
          toast.success('Employee salary updated successfully');
          setShowAddModal(false);
          setSelectedEmployee(null);
          fetchEmployees();
        }
      } else {
        // Create new employee
        const { data} = await axios.post(`${backendUrl}/employees/create`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (data.success) {
          toast.success('Employee created successfully');
          setShowAddModal(false);
          fetchEmployees();
        }
      }
      
      setFormData({
        userId: '',
        shift: 'morning',
        salaryType: 'hourly',
        salaryAmount: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save employee');
    }
  };

  const handleStatusChange = async (employeeId, newStatus) => {
    try {
      const { data } = await axios.put(
        `${backendUrl}/employees/${employeeId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success('Status updated');
        fetchEmployees();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Total Employees: {employees.length}
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            fetchAvailableUsers();
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dull"
        >
          Add Employee
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{emp.employeeId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={emp.userId?.image || '/default-avatar.png'}
                        alt={emp.userId?.name}
                        className="w-8 h-8 rounded-full mr-2"
                      />
                      <div>
                        <div className="text-sm font-medium">{emp.userId?.name}</div>
                        <div className="text-xs text-gray-500">{emp.userId?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{emp.shift}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {emp.salary?.amount > 0 ? (
                      `₹${emp.salary.amount}/${emp.salary.type === 'hourly' ? 'hr' : 'mo'}`
                    ) : (
                      <span className="text-red-500 text-xs">Not Set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      emp.status === 'active' ? 'bg-green-100 text-green-800' :
                      emp.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {emp.salary?.amount > 0 ? (
                      <select
                        value={emp.status}
                        onChange={(e) => handleStatusChange(emp.employeeId, e.target.value)}
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="terminated">Terminated</option>
                      </select>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setFormData({
                            userId: emp.userId._id,
                            shift: emp.shift,
                            salaryType: emp.salary?.type || 'hourly',
                            salaryAmount: '',
                            designation: emp.designation,
                            department: emp.department
                          });
                          setShowAddModal(true);
                          // No need to fetch available users since we already have the employee
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                      >
                        Add Salary
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {selectedEmployee ? 'Update Employee Salary' : 'Add New Employee'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedEmployee ? (
                <div className="p-3 bg-gray-50 rounded-md">
                  <label className="block text-sm font-medium mb-2">Employee</label>
                  <div className="flex items-center">
                    <img
                      src={selectedEmployee.userId?.image || '/default-avatar.png'}
                      alt={selectedEmployee.userId?.name}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <div className="text-sm font-medium">{selectedEmployee.userId?.name}</div>
                      <div className="text-xs text-gray-500">{selectedEmployee.employeeId}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Select User</label>
                  <select
                    value={formData.userId}
                    onChange={(e) => {
                      const selectedUser = availableUsers.find(u => u._id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        userId: e.target.value,
                        shift: selectedUser?.employeeShift || 'morning' // Use shift from registration
                      });
                    }}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Choose a user</option>
                    {availableUsers.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email}) {user.employeeShift && `- ${user.employeeShift} shift`}
                      </option>
                    ))}
                  </select>
                  {availableUsers.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No users with employee role found. Users must register with employee role first.
                    </p>
                  )}
                  {availableUsers.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      {availableUsers.length} employee user(s) available
                    </p>
                  )}
                </div>
              )}

              {formData.userId && formData.shift && !selectedEmployee && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Selected Shift:</strong> {formData.shift.charAt(0).toUpperCase() + formData.shift.slice(1)} 
                    {formData.shift === 'morning' ? ' (9 AM - 2 PM)' : ' (3 PM - 8 PM)'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    This shift was selected during registration
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Salary Type</label>
                <select
                  value={formData.salaryType}
                  onChange={(e) => setFormData({ ...formData, salaryType: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="hourly">Hourly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Salary Amount (₹/{formData.salaryType === 'hourly' ? 'hour' : 'month'})
                </label>
                <input
                  type="number"
                  value={formData.salaryAmount}
                  onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  min="0"
                  placeholder="Enter salary amount (optional - can be added later)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can add salary information now or update it later
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-primary-dull"
                >
                  {selectedEmployee ? 'Update Salary' : 'Create Employee'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedEmployee(null);
                  }}
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

export default EmployeeManagement;
