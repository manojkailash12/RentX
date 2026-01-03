import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminReports = () => {
  const [dashboardData, setDashboardData] = useState({
    monthlyEarnings: [],
    paymentWise: [],
    totalEarnings: 0,
    totalBookings: 0,
    pendingPayments: 0,
    completedBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('All Time');
  const [selectedMonth, setSelectedMonth] = useState('All Months');

  const fetchReports = useCallback(async () => {
    try {
      const [bookingsRes] = await Promise.all([
        axios.get('/api/admin/bookings')
      ]);

      const bookingsData = bookingsRes.data;
      const bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData.bookings || []);

      // Calculate totals from actual booking data
      const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');
      const totalEarnings = paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
      const totalBookings = bookings.length;
      const completedBookings = bookings.filter(b => ['completed', 'confirmed'].includes(b.bookingStatus)).length;
      
      // Calculate pending payments (bookings that are confirmed but payment is pending)
      const pendingPayments = bookings
        .filter(b => b.paymentStatus === 'pending' && ['confirmed', 'ongoing'].includes(b.bookingStatus))
        .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

      // Calculate payment method distribution
      const cashPayments = bookings.filter(b => b.paymentMethod === 'cash').length;
      const onlinePayments = bookings.filter(b => b.paymentMethod === 'online').length;
      const totalPayments = cashPayments + onlinePayments;
      
      const paymentWise = [];
      
      if (cashPayments > 0) {
        paymentWise.push({
          _id: 'cash',
          total: bookings.filter(b => b.paymentMethod === 'cash').reduce((sum, b) => sum + (b.totalAmount || 0), 0),
          count: cashPayments,
          percentage: totalPayments > 0 ? Math.round((cashPayments / totalPayments) * 100) : 0
        });
      }
      
      if (onlinePayments > 0) {
        paymentWise.push({
          _id: 'online',
          total: bookings.filter(b => b.paymentMethod === 'online').reduce((sum, b) => sum + (b.totalAmount || 0), 0),
          count: onlinePayments,
          percentage: totalPayments > 0 ? Math.round((onlinePayments / totalPayments) * 100) : 0
        });
      }
      
      // If no payments exist, show default structure
      if (paymentWise.length === 0) {
        paymentWise.push(
          {
            _id: 'cash',
            total: 0,
            count: 0,
            percentage: 0
          },
          {
            _id: 'online',
            total: 0,
            count: 0,
            percentage: 0
          }
        );
      }

      // Generate monthly earnings data for current year
      const currentYear = new Date().getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyEarnings = monthNames.map((month, index) => {
        const monthBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate.getFullYear() === currentYear && 
                 bookingDate.getMonth() === index &&
                 booking.paymentStatus === 'paid';
        });
        
        return {
          month,
          monthNumber: index + 1,
          totalEarnings: monthBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
          totalBookings: monthBookings.length,
          cashPayments: monthBookings.filter(b => b.paymentMethod === 'cash').reduce((sum, b) => sum + (b.totalAmount || 0), 0),
          onlinePayments: monthBookings.filter(b => b.paymentMethod === 'online').reduce((sum, b) => sum + (b.totalAmount || 0), 0)
        };
      });

      setDashboardData({
        monthlyEarnings,
        paymentWise,
        totalEarnings,
        totalBookings,
        pendingPayments,
        completedBookings
      });
    } catch (error) {
      console.error('Fetch reports error:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const exportExcel = async () => {
    try {
      const response = await axios.post('/api/admin/reports/export-excel', {
        reportType: 'earnings',
        filters: { period: selectedPeriod, month: selectedMonth }
      });

      // Convert JSON data to CSV format for Excel compatibility
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
      link.setAttribute('download', `financial-report-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Financial report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export financial report');
    }
  };

  const exportToPDF = async () => {
    try {
      const response = await axios.post('/api/admin/reports/export-pdf', {
        reportType: 'earnings',
        filters: { period: selectedPeriod, month: selectedMonth }
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Loading financial dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '0' }}>Financial Dashboard</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button 
            onClick={exportExcel}
            style={{
              background: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📊 Export Excel
          </button>
          <button 
            onClick={exportToPDF}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📄 Export PDF
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
        gap: '20px',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#2c3e50' }}>Period</label>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '8px', 
              border: '1px solid #ddd',
              background: 'white',
              minWidth: '120px'
            }}
          >
            <option value="All Time">All Time</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 90 Days">Last 90 Days</option>
            <option value="This Year">This Year</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#2c3e50' }}>Month Filter</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '8px', 
              border: '1px solid #ddd',
              background: 'white',
              minWidth: '120px'
            }}
          >
            <option value="All Months">All Months</option>
            <option value="Jan">January</option>
            <option value="Feb">February</option>
            <option value="Mar">March</option>
            <option value="Apr">April</option>
            <option value="May">May</option>
            <option value="Jun">June</option>
            <option value="Jul">July</option>
            <option value="Aug">August</option>
            <option value="Sep">September</option>
            <option value="Oct">October</option>
            <option value="Nov">November</option>
            <option value="Dec">December</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '40px' 
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', 
          color: 'white',
          padding: '25px', 
          borderRadius: '15px', 
          boxShadow: '0 10px 25px rgba(39, 174, 96, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '2rem', opacity: 0.3 }}>📈</div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>Total Earnings</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>₹{dashboardData.totalEarnings.toLocaleString()}</p>
          <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>+15% from last month</p>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)', 
          color: 'white',
          padding: '25px', 
          borderRadius: '15px', 
          boxShadow: '0 10px 25px rgba(52, 152, 219, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '2rem', opacity: 0.3 }}>📋</div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>Total Orders</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>{dashboardData.totalBookings}</p>
          <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>+8% from last month</p>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)', 
          color: 'white',
          padding: '25px', 
          borderRadius: '15px', 
          boxShadow: '0 10px 25px rgba(233, 30, 99, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '2rem', opacity: 0.3 }}>💰</div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>Commissions</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>0</p>
          <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>Platform earnings</p>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)', 
          color: 'white',
          padding: '25px', 
          borderRadius: '15px', 
          boxShadow: '0 10px 25px rgba(255, 152, 0, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '2rem', opacity: 0.3 }}>⏳</div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>Pending Payments</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>₹{dashboardData.pendingPayments.toLocaleString()}</p>
          <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>Awaiting processing</p>
        </div>
      </div>

      {/* Monthly Earnings and Payment Methods */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '40px' }}>
        {/* Monthly Earnings Trend */}
        <div style={{ 
          background: 'white', 
          borderRadius: '15px', 
          padding: '30px', 
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Monthly Earnings Trend</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Month</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Orders</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.monthlyEarnings
                  .filter(monthData => selectedMonth === 'All Months' || monthData.month === selectedMonth)
                  .map((monthData, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{monthData.month}</td>
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'right', 
                      fontWeight: 'bold', 
                      color: monthData.totalEarnings > 0 ? '#27ae60' : '#7f8c8d' 
                    }}>
                      ₹{monthData.totalEarnings.toLocaleString()}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'right', 
                      color: monthData.totalBookings > 0 ? '#3498db' : '#7f8c8d' 
                    }}>
                      {monthData.totalBookings}
                    </td>
                  </tr>
                ))}
                {dashboardData.monthlyEarnings.filter(monthData => 
                  selectedMonth === 'All Months' || monthData.month === selectedMonth
                ).length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                      No data available for selected month
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ 
          background: 'white', 
          borderRadius: '15px', 
          padding: '30px', 
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Payment Methods</h2>
          {dashboardData.paymentWise.map((payment, index) => (
            <div key={index} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#2c3e50' }}>
                  {payment._id === 'cash' ? 'Cash on Delivery' : 'Online Payment'}
                </span>
                <span style={{ fontWeight: 'bold' }}>{payment.percentage}%</span>
              </div>
              <div style={{ 
                background: '#e9ecef', 
                borderRadius: '10px', 
                height: '8px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: payment._id === 'cash' ? '#e74c3c' : '#27ae60',
                  height: '100%',
                  width: `${payment.percentage}%`,
                  borderRadius: '10px'
                }}></div>
              </div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px' }}>
                {payment.count} orders • ₹{payment.total.toLocaleString()}
              </div>
            </div>
          ))}
          {dashboardData.paymentWise.length === 0 && (
            <div style={{ textAlign: 'center', color: '#7f8c8d', padding: '20px' }}>
              No payment data available
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div style={{ 
        background: 'white', 
        borderRadius: '15px', 
        padding: '30px', 
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '30px', color: '#2c3e50' }}>Financial Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: '#27ae60', marginBottom: '10px' }}>
              ₹{dashboardData.totalEarnings.toLocaleString()}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Total Revenue</div>
            <div style={{ color: '#27ae60', fontSize: '12px', marginTop: '5px' }}>Completed bookings</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: '#3498db', marginBottom: '10px' }}>
              {dashboardData.completedBookings}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Completed Orders</div>
            <div style={{ color: '#3498db', fontSize: '12px', marginTop: '5px' }}>Successfully finished</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: '#e67e22', marginBottom: '10px' }}>
              ₹{dashboardData.pendingPayments.toLocaleString()}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Pending Payments</div>
            <div style={{ color: '#e67e22', fontSize: '12px', marginTop: '5px' }}>Awaiting settlement</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;