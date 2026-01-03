import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './AdminSidebar.css';

const AdminSidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/admin', icon: '🏠', label: 'Dashboard' },
    { path: '/admin/analytics', icon: '📊', label: 'Travel Analytics' },
    { path: '/admin/approvals', icon: '✅', label: 'Approvals' },
    { path: '/admin/orders', icon: '📋', label: 'Orders' },
    { path: '/admin/reports', icon: '📈', label: 'Financial Reports' },
    { path: '/admin/cars', icon: '🚗', label: 'Cars' },
    { path: '/admin/users', icon: '👥', label: 'Users' }
  ];

  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <h3>Admin Panel</h3>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default AdminSidebar;