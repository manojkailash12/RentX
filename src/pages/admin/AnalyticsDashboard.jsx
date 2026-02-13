import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import KPICard from '../../components/Analytics/KPICard';
import toast from 'react-hot-toast';
import BackButton from '../../components/BackButton';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [topCars, setTopCars] = useState([]);
  const [topOwners, setTopOwners] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dateRange, setDateRange] = useState('30'); // days
  const { token, axios, isAdmin, backendUrl } = useAppContext();

  // Helper function to download files
  const downloadFile = async (endpoint, filename) => {
    try {
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [isAdmin, dateRange]);

  const loadAnalytics = async (refresh = false) => {
    try {
      setLoading(true);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const params = {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        ...(refresh && { refresh: true })
      };

      const [overviewRes, bookingsRes, ownersRes, geoRes] = await Promise.all([
        axios.get('/analytics/overview', {
          headers: { Authorization: `Bearer ${token}` },
          params
        }),
        axios.get('/analytics/bookings', {
          headers: { Authorization: `Bearer ${token}` },
          params
        }),
        axios.get('/analytics/owners', {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 10, ...(refresh && { refresh: true }) }
        }),
        axios.get('/analytics/geographic', {
          headers: { Authorization: `Bearer ${token}` },
          params: { ...(refresh && { refresh: true }) }
        })
      ]);

      setOverview(overviewRes.data);
      setTopCars(bookingsRes.data.topCars || []);
      setTopOwners(ownersRes.data.topOwners || []);
      setLocations(geoRes.data.locations || []);
    } catch (error) {
      console.error('Load analytics error:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAnalytics(true);
    toast.success('Analytics data refreshed');
  };

  // Export full analytics Excel
  const handleExportAnalyticsExcel = async () => {
    setExportLoading(true);
    try {
      await downloadFile('/analytics/export-excel', `analytics-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Analytics Excel exported successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExportLoading(false);
    }
  };

  // Export full analytics PDF (placeholder - needs backend implementation)
  const handleExportAnalyticsPDF = async () => {
    setExportLoading(true);
    try {
      await downloadFile('/analytics/export-pdf', `analytics-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Analytics PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  // Individual section exports
  const handleExportSection = async (section, format) => {
    try {
      const filename = `${section}-${new Date().toISOString().split('T')[0]}.${format}`;
      const endpoint = `/analytics/export-${section}-${format}`;
      await downloadFile(endpoint, filename);
      toast.success(`${section} ${format.toUpperCase()} exported successfully!`);
    } catch (error) {
      console.error(`${section} export error:`, error);
      toast.error(`Failed to export ${section}`);
    }
  };

  const handleExport = async (type) => {
    try {
      const response = await axios.post(
        '/analytics/export',
        {
          type,
          format: 'csv',
          startDate: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(`${type} data exported successfully`);
      console.log('Export data:', response.data);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin privileges required to view analytics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Platform performance and insights</p>
            </div>
            <div className="flex gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <button
                onClick={handleExportAnalyticsPDF}
                disabled={exportLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {exportLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '📄'
                )}
                PDF
              </button>
              <button
                onClick={handleExportAnalyticsExcel}
                disabled={exportLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {exportLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '📊'
                )}
                Excel
              </button>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {overview && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportSection('overview', 'pdf')}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => handleExportSection('overview', 'excel')}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  📊 Excel
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Total Revenue"
                value={`₹${overview.revenue?.totalRevenue?.toLocaleString() || 0}`}
                color="green"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <KPICard
                title="Total Bookings"
                value={overview.revenue?.totalBookings || 0}
                color="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
              <KPICard
                title="Total Users"
                value={overview.users?.totalUsers || 0}
                color="purple"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
              <KPICard
                title="Active Users"
                value={overview.users?.activeUsers || 0}
                color="yellow"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              />
            </div>
          </div>
        )}

        {/* Booking Status */}
        {overview?.bookingStatus && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Booking Status Distribution</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportSection('booking-status', 'pdf')}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => handleExportSection('booking-status', 'excel')}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  📊 Excel
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(overview.bookingStatus).map(([status, count]) => (
                <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600 capitalize mt-1">{status}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Cars */}
        {topCars.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Top Performing Cars</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportSection('top-cars', 'pdf')}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => handleExportSection('top-cars', 'excel')}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  📊 Excel
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Car</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topCars.map((car) => (
                    <tr key={car._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={car.image || '/default-car.png'}
                            alt={`${car.brand} ${car.model}`}
                            className="h-10 w-10 rounded object-cover"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {car.brand} {car.model}
                            </div>
                            <div className="text-sm text-gray-500">{car.year}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {car.bookingCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{car.totalRevenue?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {car.averageRating?.toFixed(1) || 'N/A'} ⭐
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Owners */}
        {topOwners.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Top Performing Owners</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportSection('top-owners', 'pdf')}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => handleExportSection('top-owners', 'excel')}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  📊 Excel
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cars</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topOwners.map((owner, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={owner.owner?.image || '/default-avatar.png'}
                            alt={owner.owner?.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {owner.owner?.name}
                            </div>
                            <div className="text-sm text-gray-500">{owner.owner?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {owner.totalCars} ({owner.approvedCars} approved)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {owner.totalBookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{owner.totalEarnings?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{owner.platformCommission?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Geographic Distribution */}
        {locations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Geographic Distribution</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportSection('geographic', 'pdf')}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => handleExportSection('geographic', 'excel')}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  📊 Excel
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.slice(0, 9).map((loc, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">{loc.location}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Bookings: {loc.bookings}</p>
                    <p>Cars: {loc.cars}</p>
                    <p>Revenue: ₹{loc.revenue?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      Demand/Supply: {loc.demandSupplyRatio?.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
