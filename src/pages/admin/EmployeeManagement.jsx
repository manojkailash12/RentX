import React, { useState } from 'react';
import EmployeeManagement from '../../components/Admin/EmployeeManagement';
import AttendanceManagement from '../../components/Admin/AttendanceManagement';
import PayrollManagement from '../../components/Admin/PayrollManagement';
import BackButton from '../../components/BackButton';

const EmployeeManagementPage = () => {
  const [activeTab, setActiveTab] = useState('employees');

  const tabs = [
    { id: 'employees', label: 'Employees', icon: '👥' },
    { id: 'attendance', label: 'Attendance', icon: '📅' },
    { id: 'payroll', label: 'Payroll', icon: '💰' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="py-4">
            <BackButton />
          </div>
          <div className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {activeTab === 'employees' && <EmployeeManagement />}
        {activeTab === 'attendance' && <AttendanceManagement />}
        {activeTab === 'payroll' && <PayrollManagement />}
      </div>
    </div>
  );
};

export default EmployeeManagementPage;
