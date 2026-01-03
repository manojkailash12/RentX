import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const viewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const manageUser = (user) => {
    setSelectedUser(user);
    setShowManageModal(true);
  };

  const updateUserStatus = async (userId, isVerified) => {
    try {
      await axios.put(`/api/admin/users/${userId}/status`, { isVerified });
      toast.success(`User ${isVerified ? 'verified' : 'unverified'} successfully`);
      fetchUsers(); // Refresh the list
      setShowManageModal(false);
    } catch (error) {
      console.error('Update user status error:', error);
      toast.error('Failed to update user status');
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/api/admin/users/${userId}`);
        toast.success('User deleted successfully');
        fetchUsers(); // Refresh the list
        setShowManageModal(false);
      } catch (error) {
        console.error('Delete user error:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  );

  const exportExcel = async () => {
    try {
      const response = await axios.post('/api/admin/reports/export-excel', {
        reportType: 'users',
        filters: { searchTerm }
      });

      const data = response.data.data;
      if (!data || data.length === 0) {
        toast.info('No data available for export');
        return;
      }

      // Create CSV content
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(',')).join('\n');
      const csvContent = `${headers}\n${rows}`;

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users-report-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Users exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export users');
    }
  };

  const exportPDF = async () => {
    try {
      const response = await axios.post('/api/admin/reports/export-pdf', {
        reportType: 'users',
        filters: { searchTerm }
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Users report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Loading users...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>👥 Manage Users</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button 
            onClick={exportExcel}
            style={{
              background: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            📊 Export Excel
          </button>
          <button 
            onClick={exportPDF}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            📄 Export PDF
          </button>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 15px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              width: '250px'
            }}
          />
          <div style={{ 
            background: '#3498db', 
            color: 'white', 
            padding: '10px 15px', 
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            Total: {filteredUsers.length} users
          </div>
        </div>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: '15px', 
        padding: '30px', 
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>User Details</th>
                <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Contact</th>
                <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Role</th>
                <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
                <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Joined</th>
                <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: user.profileImage ? `url(${user.profileImage})` : 'linear-gradient(135deg, #667eea, #764ba2)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.2rem'
                      }}>
                        {!user.profileImage && user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>{user.name}</div>
                        <div style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>ID: {user._id.slice(-8)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div>
                      <div style={{ fontWeight: '500', marginBottom: '4px' }}>📧 {user.email}</div>
                      <div style={{ color: '#7f8c8d' }}>📱 {user.phone}</div>
                    </div>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span style={{ 
                      background: user.role === 'admin' ? '#e74c3c' : '#3498db',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '15px',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {user.role === 'admin' ? '🏢 Admin' : '👤 User'}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span style={{ 
                      background: user.isVerified ? '#27ae60' : '#f39c12',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '15px',
                      fontSize: '0.8rem',
                      fontWeight: '500'
                    }}>
                      {user.isVerified ? '✅ Verified' : '⏳ Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center', fontSize: '0.9rem', color: '#7f8c8d' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => viewUser(user)}
                        style={{
                          background: '#3498db',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        👁️ View
                      </button>
                      <button 
                        onClick={() => manageUser(user)}
                        style={{
                          background: '#95a5a6',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        ⚙️ Manage
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#7f8c8d' }}>
            <h3>No users found</h3>
            <p>No users match your search criteria.</p>
          </div>
        )}
      </div>

      {/* User View Modal */}
      {showUserModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#2c3e50' }}>User Details</h2>
              <button 
                onClick={() => setShowUserModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#7f8c8d'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <strong>Name:</strong> {selectedUser.name}
              </div>
              <div>
                <strong>Email:</strong> {selectedUser.email}
              </div>
              <div>
                <strong>Phone:</strong> {selectedUser.phone || 'Not provided'}
              </div>
              <div>
                <strong>Role:</strong> {selectedUser.role}
              </div>
              <div>
                <strong>Status:</strong> {selectedUser.isVerified ? 'Verified' : 'Unverified'}
              </div>
              <div>
                <strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}
              </div>
              <div>
                <strong>Address:</strong> {selectedUser.address || 'Not provided'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {showManageModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#2c3e50' }}>Manage User</h2>
              <button 
                onClick={() => setShowManageModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#7f8c8d'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <strong>{selectedUser.name}</strong>
              <br />
              <span style={{ color: '#7f8c8d' }}>{selectedUser.email}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => updateUserStatus(selectedUser._id, !selectedUser.isVerified)}
                style={{
                  background: selectedUser.isVerified ? '#e74c3c' : '#27ae60',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {selectedUser.isVerified ? 'Mark as Unverified' : 'Mark as Verified'}
              </button>
              
              <button
                onClick={() => deleteUser(selectedUser._id)}
                style={{
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;