import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalCars: 0,
    totalBookings: 0,
    totalUsers: 0,
    pendingApprovals: 0
  });
  const [pendingCars, setPendingCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [carsRes, bookingsRes, usersRes] = await Promise.all([
        axios.get('/api/admin/cars'),
        axios.get('/api/admin/bookings'),
        axios.get('/api/admin/users')
      ]);

      const cars = carsRes.data;
      const bookings = bookingsRes.data;
      const users = usersRes.data;

      setStats({
        totalCars: cars.length,
        totalBookings: bookings.length,
        totalUsers: users.length,
        pendingApprovals: cars.filter(car => car.status === 'pending').length
      });

      setPendingCars(cars.filter(car => car.status === 'pending'));
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (carId, action) => {
    try {
      await axios.put(`/api/admin/cars/${carId}/status`, { status: action });
      toast.success(`Vehicle ${action}d successfully!`);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(`Failed to ${action} vehicle`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Loading dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>🏢 Admin Dashboard</h1>
        <p style={{ color: '#7f8c8d' }}>Manage your car rental platform</p>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '40px' 
      }}>
        <Link to="/admin/cars" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: 'white', 
            padding: '25px', 
            borderRadius: '15px', 
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #3498db',
            cursor: 'pointer',
            transition: 'transform 0.3s ease',
            ':hover': { transform: 'translateY(-5px)' }
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>🚗 Total Cars</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db', margin: 0 }}>{stats.totalCars}</p>
          </div>
        </Link>

        <Link to="/admin/orders" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: 'white', 
            padding: '25px', 
            borderRadius: '15px', 
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #27ae60',
            cursor: 'pointer',
            transition: 'transform 0.3s ease'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>📅 Total Bookings</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60', margin: 0 }}>{stats.totalBookings}</p>
          </div>
        </Link>

        <Link to="/admin/users" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: 'white', 
            padding: '25px', 
            borderRadius: '15px', 
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #9b59b6',
            cursor: 'pointer',
            transition: 'transform 0.3s ease'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>👥 Total Users</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9b59b6', margin: 0 }}>{stats.totalUsers}</p>
          </div>
        </Link>

        <Link to="/admin/approvals" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: 'white', 
            padding: '25px', 
            borderRadius: '15px', 
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #e74c3c',
            cursor: 'pointer',
            transition: 'transform 0.3s ease'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>⏳ Pending Approvals</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e74c3c', margin: 0 }}>{stats.pendingApprovals}</p>
          </div>
        </Link>
      </div>

      {/* Quick Access Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '40px' 
      }}>
        <Link to="/admin/analytics" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white',
            padding: '25px', 
            borderRadius: '15px', 
            boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)',
            cursor: 'pointer',
            transition: 'transform 0.3s ease'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>📊 Travel Analytics</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>View comprehensive travel insights and patterns</p>
          </div>
        </Link>

        <Link to="/admin/reports" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
            color: 'white',
            padding: '25px', 
            borderRadius: '15px', 
            boxShadow: '0 10px 25px rgba(240, 147, 251, 0.3)',
            cursor: 'pointer',
            transition: 'transform 0.3s ease'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>💰 Financial Reports</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Access detailed financial dashboard and reports</p>
          </div>
        </Link>
      </div>

      {/* Pending Approvals */}
      {pendingCars.length > 0 && (
        <div style={{ background: 'white', borderRadius: '15px', padding: '30px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>🔍 Pending Vehicle Approvals</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {pendingCars.map(car => (
              <div key={car._id} style={{ 
                border: '1px solid #ecf0f1', 
                borderRadius: '10px', 
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>
                    {car.name} - {car.brand} {car.model}
                  </h4>
                  <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
                    📍 {car.location?.city}, {car.location?.state} | 
                    💰 ₹{car.pricePerDay}/day | 
                    👤 {car.owner?.name}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleApproval(car._id, 'approved')}
                    style={{
                      background: '#27ae60',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Approve
                  </button>
                  <button 
                    onClick={() => handleApproval(car._id, 'rejected')}
                    style={{
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;