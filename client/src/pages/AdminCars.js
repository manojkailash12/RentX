import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminCars = () => {
  const navigate = useNavigate();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    state: ''
  });

  const fetchCars = useCallback(async () => {
    try {
      const response = await axios.get('/api/admin/cars');
      let filteredCars = response.data;

      // Apply filters
      if (filters.status) {
        filteredCars = filteredCars.filter(car => car.status === filters.status);
      }
      if (filters.type) {
        filteredCars = filteredCars.filter(car => car.type === filters.type);
      }
      if (filters.state) {
        filteredCars = filteredCars.filter(car => car.location?.state === filters.state);
      }

      setCars(filteredCars);
    } catch (error) {
      console.error('Fetch cars error:', error);
      toast.error('Failed to load cars');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);



  const deleteCar = async (carId) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await axios.delete(`/api/admin/cars/${carId}`);
        toast.success('Vehicle deleted successfully!');
        fetchCars(); // Refresh the list
      } catch (error) {
        console.error('Delete car error:', error);
        toast.error('Failed to delete vehicle');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Loading vehicles...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: '#2c3e50', marginBottom: '5px' }}>AllVehicles</h1>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Manage all vehicles in the system</p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            onClick={() => navigate('/admin/add-vehicle')}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Add+
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '15px', 
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        marginBottom: '30px',
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <select 
          value={filters.status} 
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          style={{ 
            padding: '8px 12px', 
            borderRadius: '8px', 
            border: '1px solid #ddd',
            background: 'white',
            minWidth: '120px'
          }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        
        <select 
          value={filters.type} 
          onChange={(e) => setFilters({...filters, type: e.target.value})}
          style={{ 
            padding: '8px 12px', 
            borderRadius: '8px', 
            border: '1px solid #ddd',
            background: 'white',
            minWidth: '120px'
          }}
        >
          <option value="">All Types</option>
          <option value="sedan">Sedan</option>
          <option value="suv">SUV</option>
          <option value="hatchback">Hatchback</option>
          <option value="luxury">Luxury</option>
          <option value="economy">Economy</option>
        </select>
        
        <select 
          value={filters.state} 
          onChange={(e) => setFilters({...filters, state: e.target.value})}
          style={{ 
            padding: '8px 12px', 
            borderRadius: '8px', 
            border: '1px solid #ddd',
            background: 'white',
            minWidth: '120px'
          }}
        >
          <option value="">All States</option>
          <option value="Tamil Nadu">Tamil Nadu</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Kerala">Kerala</option>
          <option value="Andhra Pradesh">Andhra Pradesh</option>
          <option value="Telangana">Telangana</option>
        </select>
      </div>

      {cars.length === 0 ? (
        <div style={{ 
          background: 'white', 
          padding: '50px', 
          borderRadius: '15px', 
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3>No vehicles found</h3>
          <p>No vehicles match your current filters.</p>
        </div>
      ) : (
        <div style={{ 
          background: 'white', 
          borderRadius: '15px', 
          padding: '0', 
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                    <input type="checkbox" />
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Image</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Registration Number</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Company</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Vehicle Name</th>
                  <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Edit</th>
                  <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => (
                  <tr key={car._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <input type="checkbox" />
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ 
                        width: '60px', 
                        height: '40px', 
                        background: '#f8f9fa', 
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}>
                        🚗
                      </div>
                    </td>
                    <td style={{ padding: '15px', fontWeight: '500', color: '#2c3e50' }}>
                      {car.registrationNumber || 'N/A'}
                    </td>
                    <td style={{ padding: '15px', color: '#2c3e50' }}>
                      {car.brand || 'N/A'}
                    </td>
                    <td style={{ padding: '15px', color: '#2c3e50' }}>
                      {car.name || `${car.brand} ${car.model}` || 'N/A'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <button 
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          cursor: 'pointer',
                          fontSize: '18px'
                        }}
                        title="Edit Vehicle"
                      >
                        ✏️
                      </button>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <button 
                        onClick={() => deleteCar(car._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc3545',
                          cursor: 'pointer',
                          fontSize: '18px'
                        }}
                        title="Delete Vehicle"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div style={{ 
            padding: '20px', 
            borderTop: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8f9fa'
          }}>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Rows per page: 
              <select style={{ marginLeft: '10px', padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <option>5</option>
                <option>10</option>
                <option>25</option>
              </select>
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              1-3 of 3
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCars;