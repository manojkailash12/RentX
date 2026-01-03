import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminApprovals = () => {
  const [pendingCars, setPendingCars] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingCars = useCallback(async () => {
    try {
      const response = await axios.get('/api/admin/cars');
      const pending = response.data.filter(car => car.status === 'pending');
      setPendingCars(pending);
    } catch (error) {
      console.error('Fetch pending cars error:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingCars();
  }, [fetchPendingCars]);

  const handleApproval = async (carId, action, rejectionReason = '') => {
    try {
      const payload = { status: action };
      if (action === 'rejected' && rejectionReason) {
        payload.rejectionReason = rejectionReason;
      }

      await axios.put(`/api/admin/cars/${carId}/status`, payload);
      toast.success(`Vehicle ${action} successfully!`);
      fetchPendingCars(); // Refresh the list
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(`Failed to ${action} vehicle`);
    }
  };

  const handleReject = (carId) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    handleApproval(carId, 'rejected', reason);
  };

  const exportExcel = async () => {
    try {
      const response = await axios.post('/api/admin/reports/export-excel', {
        reportType: 'approvals',
        filters: {}
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
      link.setAttribute('download', `approvals-report-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Approvals exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export approvals');
    }
  };

  const exportPDF = async () => {
    try {
      const response = await axios.post('/api/admin/reports/export-pdf', {
        reportType: 'approvals',
        filters: {}
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `approvals-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Approvals report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Loading pending approvals...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1>⏳ Vehicle Approvals</h1>
          <p style={{ color: '#7f8c8d', fontSize: '1.1rem', margin: 0 }}>
            Review and approve vehicles submitted by users
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
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
        </div>
      </div>

      {pendingCars.length === 0 ? (
        <div style={{ 
          background: 'white', 
          padding: '60px', 
          borderRadius: '15px', 
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
          <h3 style={{ color: '#27ae60', marginBottom: '10px' }}>All Caught Up!</h3>
          <p style={{ color: '#7f8c8d' }}>No vehicles pending approval at the moment.</p>
        </div>
      ) : (
        <div style={{ 
          background: 'white', 
          borderRadius: '15px', 
          padding: '30px', 
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: '#2c3e50' }}>Pending Vehicles ({pendingCars.length})</h2>
            <div style={{ 
              background: '#f39c12', 
              color: 'white', 
              padding: '8px 16px', 
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              ⏳ Requires Action
            </div>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {pendingCars.map(car => (
              <div key={car._id} style={{ 
                border: '2px solid #f39c12', 
                borderRadius: '15px', 
                padding: '25px',
                background: '#fffbf0',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '1.3rem' }}>
                          {car.name} - {car.brand} {car.model}
                        </h3>
                        <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#7f8c8d' }}>
                          <span>📅 {car.year}</span>
                          <span>🚗 {car.type}</span>
                          <span>👥 {car.seats} seats</span>
                          <span>🔧 {car.transmission}</span>
                          <span>⛽ {car.fuelType}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '1rem' }}>📍 Location</h4>
                        <p style={{ margin: 0, color: '#7f8c8d' }}>
                          {car.location?.city}, {car.location?.district}<br/>
                          {car.location?.state}
                        </p>
                      </div>
                      
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '1rem' }}>👤 Owner</h4>
                        <p style={{ margin: 0, color: '#7f8c8d' }}>
                          {car.owner?.name}<br/>
                          {car.owner?.email}<br/>
                          📱 {car.owner?.phone}
                        </p>
                      </div>
                      
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '1rem' }}>💰 Pricing</h4>
                        <p style={{ margin: 0, color: '#27ae60', fontWeight: '500' }}>
                          ₹{car.pricePerDay}/day<br/>
                          ₹{car.pricePerKm}/km
                        </p>
                      </div>
                      
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '1rem' }}>🔢 Registration</h4>
                        <p style={{ margin: 0, color: '#7f8c8d', fontWeight: '500' }}>
                          {car.registrationNumber}
                        </p>
                      </div>
                    </div>

                    {car.features && car.features.length > 0 && (
                      <div style={{ marginBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '1rem' }}>⭐ Features</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {car.features.map((feature, index) => (
                            <span key={index} style={{
                              background: '#3498db',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}>
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                      📅 Submitted: {new Date(car.createdAt).toLocaleDateString()} at {new Date(car.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px' }}>
                    <button 
                      onClick={() => handleApproval(car._id, 'approved')}
                      style={{
                        background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      ✅ Approve Vehicle
                    </button>
                    
                    <button 
                      onClick={() => handleReject(car._id)}
                      style={{
                        background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      ❌ Reject Vehicle
                    </button>

                    <button 
                      onClick={() => toast.info('Document viewer coming soon!')}
                      style={{
                        background: '#95a5a6',
                        color: 'white',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      📄 View Documents
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;