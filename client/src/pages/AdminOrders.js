import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    paymentMethod: '',
    paymentStatus: ''
  });

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(`/api/admin/bookings?${params.toString()}`);
      const bookingsData = response.data;
      setOrders(Array.isArray(bookingsData) ? bookingsData : (bookingsData.bookings || []));
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const exportExcel = async () => {
    try {
      const response = await axios.post('/api/admin/reports/export-excel', {
        reportType: 'bookings',
        filters
      });

      // Handle different response formats
      let data = response.data.data || response.data;
      
      // If still no data, try to use the current orders
      if (!data || data.length === 0) {
        if (orders && orders.length > 0) {
          // Convert current orders to export format
          data = orders.map(order => ({
            bookingId: order.bookingId || order.invoiceNumber || order._id,
            customerName: order.user?.name || 'N/A',
            customerEmail: order.user?.email || 'N/A',
            vehicleName: order.car?.name || `${order.car?.brand || ''} ${order.car?.model || ''}`.trim() || 'N/A',
            pickupLocation: order.pickupLocation?.city || order.pickupLocation?.address || 'N/A',
            dropoffLocation: order.dropoffLocation?.city || order.dropoffLocation?.address || 'N/A',
            startDate: order.startDate ? new Date(order.startDate).toLocaleDateString() : 'N/A',
            endDate: order.endDate ? new Date(order.endDate).toLocaleDateString() : 'N/A',
            status: order.bookingStatus || 'N/A',
            totalAmount: order.totalAmount || 0,
            paymentMethod: order.paymentMethod || 'N/A',
            paymentStatus: order.paymentStatus || 'N/A'
          }));
        } else {
          toast.info('No data available for export');
          return;
        }
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
      link.setAttribute('download', `orders-report-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Orders exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export orders');
    }
  };

  const exportPDF = async () => {
    try {
      const response = await axios.post('/api/admin/reports/export-pdf', {
        reportType: 'bookings',
        filters
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Orders report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Loading orders...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: '#2c3e50', marginBottom: '5px' }}>Orders Management</h1>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Manage all customer bookings and orders</p>
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

      {/* Summary Card */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '15px', 
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>All Bookings ({orders.length} total)</h3>
        
        {/* Filters */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
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
            <option value="confirmed">Confirmed</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select 
            value={filters.paymentMethod} 
            onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '8px', 
              border: '1px solid #ddd',
              background: 'white',
              minWidth: '140px'
            }}
          >
            <option value="">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
          </select>
          
          <select 
            value={filters.paymentStatus} 
            onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '8px', 
              border: '1px solid #ddd',
              background: 'white',
              minWidth: '140px'
            }}
          >
            <option value="">All Payment Status</option>
            <option value="pending">Payment Pending</option>
            <option value="paid">Payment Completed</option>
            <option value="failed">Payment Failed</option>
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={{ 
          background: 'white', 
          padding: '50px', 
          borderRadius: '15px', 
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3>No orders found</h3>
          <p>No orders match your current filters.</p>
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
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Vehicle Image</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Booking ID</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Customer Name</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Vehicle Name</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Pickup Location</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Pickup Date</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Dropoff Location</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Dropoff Date</th>
                  <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Distance (km)</th>
                  <th style={{ padding: '15px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Total Amount</th>
                  <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Current Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} style={{ borderBottom: '1px solid #dee2e6' }}>
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
                      {order.invoiceNumber || order._id.slice(-8)}
                    </td>
                    <td style={{ padding: '15px', color: '#2c3e50' }}>
                      {order.user?.name || 'N/A'}
                    </td>
                    <td style={{ padding: '15px', color: '#2c3e50' }}>
                      {order.car?.name || `${order.car?.brand} ${order.car?.model}` || 'N/A'}
                    </td>
                    <td style={{ padding: '15px', color: '#2c3e50' }}>
                      {order.pickupLocation?.address || order.pickupLocation?.city || 'N/A'}
                    </td>
                    <td style={{ padding: '15px', color: '#2c3e50' }}>
                      {order.startDate ? new Date(order.startDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '15px', color: '#2c3e50' }}>
                      {order.dropoffLocation?.address || order.dropoffLocation?.city || 'N/A'}
                    </td>
                    <td style={{ padding: '15px', color: '#2c3e50' }}>
                      {order.endDate ? new Date(order.endDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#2c3e50' }}>
                      {order.distance || 'N/A'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>
                      ₹{order.totalAmount?.toLocaleString() || '0'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{ 
                        background: order.bookingStatus === 'completed' ? '#27ae60' : 
                                   order.bookingStatus === 'ongoing' ? '#3498db' :
                                   order.bookingStatus === 'confirmed' ? '#f39c12' :
                                   order.bookingStatus === 'cancelled' ? '#e74c3c' : '#95a5a6',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '15px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {order.bookingStatus || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;