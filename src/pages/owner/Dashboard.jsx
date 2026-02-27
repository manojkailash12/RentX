import { useEffect, useState, useCallback } from 'react'
import { assets } from '../../assets/assets'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useDashboardDataRefresh } from '../../hooks/useAutoRefresh'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import RevenueChart from '../../components/Charts/RevenueChart'
import BookingStatusChart from '../../components/Charts/BookingStatusChart'
import TopCarsChart from '../../components/Charts/TopCarsChart'
import PaymentMethodsChart from '../../components/Charts/PaymentMethodsChart'
import ConfirmDialog from '../../components/ConfirmDialog'

const Dashboard = () => {
  const { t } = useTranslation();

  const { axios, isOwner, isAdmin, currency, user, downloadFile, getImageUrl } = useAppContext()

  const [data, setData] = useState({
    totalCars: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    recentBookings: [],
    monthlyRevenue: 0,
    approvedCars: 0,
    pendingApprovalCars: 0,
  })

  const [adminData, setAdminData] = useState({
    totalUsers: 0,
    totalEmployees: 0,
    availableCars: 0,
    pendingApprovalCars: 0,
    platformEarnings: 0,
    ownerEarnings: 0,
    cashEarnings: 0,
    onlineEarnings: 0,
  })

  // Analytics data
  const [analyticsData, setAnalyticsData] = useState({
    topCars: [],
    topOwners: [],
    locations: [],
    overview: null
  })

  // Chart data
  const [chartData, setChartData] = useState({
    revenueTrend: { labels: [], values: [] },
    bookingStatus: { pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
    paymentMethods: { cash: 0, online: 0 }
  })

  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [dateRange, setDateRange] = useState('30') // days for analytics
  const [showRecalculateDialog, setShowRecalculateDialog] = useState(false)

  const getDashboardCards = () => {
    if (isAdmin) {
      return [
        { title: t('dashboard.totalUsers'), value: adminData.totalUsers, icon: assets.users_icon },
        { title: 'Total Employees', value: adminData.totalEmployees, icon: assets.users_icon },
        { title: t('dashboard.totalCars'), value: data.totalCars, icon: assets.carIconColored },
        { title: t('dashboard.availableCars'), value: adminData.availableCars, icon: assets.carIconColored },
        { title: t('dashboard.pendingApproval'), value: adminData.pendingApprovalCars, icon: assets.cautionIconColored },
        { title: t('dashboard.totalBookings'), value: data.totalBookings, icon: assets.listIconColored },
        { title: t('dashboard.platformEarnings'), value: adminData.platformEarnings, icon: assets.listIconColored },
      ]
    } else {
      return [
        { title: t('dashboard.myCars'), value: data.totalCars, icon: assets.carIconColored },
        { title: t('dashboard.totalBookings'), value: data.totalBookings, icon: assets.listIconColored },
        { title: t('dashboard.pending'), value: data.pendingBookings, icon: assets.cautionIconColored },
        { title: t('dashboard.confirmed'), value: data.completedBookings, icon: assets.listIconColored },
        { title: t('dashboard.approvedCars'), value: data.approvedCars || 0, icon: assets.carIconColored },
        { title: t('dashboard.awaitingApproval'), value: data.pendingApprovalCars || 0, icon: assets.cautionIconColored },
      ]
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching dashboard data...');
      console.log('📝 Token:', token ? 'Present' : 'Missing');
      console.log('📝 User:', user ? user.name : 'Not loaded');
      
      const { data } = await axios.get('/owner/dashboard')
      if (data.success) {
        setData(data.dashboardData)
        console.log('✅ Dashboard data loaded successfully');
      } else {
        console.warn('⚠️ Dashboard API returned success: false', data.message);
      }
    } catch (error) {
      console.error('❌ Dashboard fetch error:', error.response?.status, error.response?.data?.message || error.message);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminData = async () => {
    try {
      const { data } = await axios.get('/admin/dashboard')
      if (data.success) {
        setAdminData(data.analytics)
      }
    } catch (error) {
      // Silent error handling
    }
  }

  const fetchAnalyticsData = async () => {
    if (!isAdmin) return;
    
    try {
      setAnalyticsLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const params = {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      };

      const [bookingsRes, ownersRes, geoRes, revenueTrendRes, paymentMethodsRes, statusRes] = await Promise.all([
        axios.get('/analytics/bookings', { params }),
        axios.get('/analytics/owners', { params: { limit: 10 } }),
        axios.get('/analytics/geographic', { params }),
        axios.get('/analytics/revenue-trend', { params: { months: 12 } }),
        axios.get('/analytics/payment-methods'),
        axios.get('/analytics/bookings', { params })
      ]);

      setAnalyticsData({
        topCars: bookingsRes.data.topCars || [],
        topOwners: ownersRes.data.topOwners || [],
        locations: geoRes.data.locations || []
      });

      setChartData({
        revenueTrend: revenueTrendRes.data || { labels: [], values: [] },
        bookingStatus: bookingsRes.data.statusDistribution || { pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
        paymentMethods: paymentMethodsRes.data || { cash: 0, online: 0 }
      });
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  const refreshAllData = useCallback(async () => {
    console.log('🔄 Refreshing all dashboard data...');
    console.log('📝 Current state - Token:', token ? 'Present' : 'Missing', 'User:', user?.name, 'Role:', user?.role);
    await fetchDashboardData()
    if (isAdmin) {
      await fetchAdminData()
      await fetchAnalyticsData()
    }
  }, [isAdmin, dateRange]);

  // Use auto-refresh hook for dashboard
  const { manualRefresh } = useDashboardDataRefresh(refreshAllData);

  useEffect(() => {
    if (isOwner) {
      // Only call refreshAllData once on mount, auto-refresh hook will handle the rest
      refreshAllData()
    }
  }, [isOwner, isAdmin, refreshAllData])

  // Fetch analytics when date range changes
  useEffect(() => {
    if (isAdmin) {
      fetchAnalyticsData()
    }
  }, [dateRange, isAdmin])

  const getDashboardTitle = () => {
    if (isAdmin) return t('dashboard.adminDashboard')
    return t('dashboard.enterpriseDashboard')
  }

  const getDashboardSubtitle = () => {
    if (isAdmin) return t('dashboard.adminSubtitle')
    return t('dashboard.enterpriseSubtitle')
  }

  // Export function
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      await downloadFile('/analytics/export-excel', `analytics-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Analytics exported successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export analytics');
    } finally {
      setExportLoading(false);
    }
  };

  // Export earnings PDF
  const handleExportEarningsPDF = async () => {
    setExportLoading(true);
    try {
      const year = new Date().getFullYear();
      await downloadFile(`/admin/earnings/export/pdf?year=${year}`, `earnings-report-${year}.pdf`);
      toast.success('Earnings PDF exported successfully!');
    } catch (error) {
      console.error('Earnings PDF export error:', error);
      toast.error('Failed to export earnings PDF');
    } finally {
      setExportLoading(false);
    }
  };

  // Export earnings Excel
  const handleExportEarningsExcel = async () => {
    setExportLoading(true);
    try {
      const year = new Date().getFullYear();
      await downloadFile(`/admin/earnings/export/excel?year=${year}`, `earnings-report-${year}.xlsx`);
      toast.success('Earnings Excel exported successfully!');
    } catch (error) {
      console.error('Earnings Excel export error:', error);
      toast.error('Failed to export earnings Excel');
    } finally {
      setExportLoading(false);
    }
  };

  // Recalculate platform earnings
  const handleRecalculateEarnings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/admin/recalculate-earnings');
      if (data.success) {
        toast.success(`Successfully updated ${data.updated} bookings!`);
        await refreshAllData(); // Refresh dashboard data
      } else {
        toast.error(data.message || 'Failed to recalculate earnings');
      }
    } catch (error) {
      console.error('Recalculate earnings error:', error);
      toast.error('Failed to recalculate earnings');
    } finally {
      setLoading(false);
    }
  };

  // Recalculate all car ratings
  const handleRecalculateRatings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/admin/recalculate-ratings');
      if (data.success) {
        toast.success(`Successfully updated ${data.updated} car ratings!`);
        await refreshAllData(); // Refresh dashboard data
      } else {
        toast.error(data.message || 'Failed to recalculate ratings');
      }
    } catch (error) {
      console.error('Recalculate ratings error:', error);
      toast.error('Failed to recalculate ratings');
    } finally {
      setLoading(false);
    }
  };

  // Export individual chart sections
  const handleExportChart = async (chartType, format) => {
    setExportLoading(true);
    try {
      const endpoints = {
        'revenue-trend': format === 'pdf' ? '/analytics/export-overview-pdf' : '/analytics/export-overview-excel',
        'booking-status': format === 'pdf' ? '/analytics/export-booking-status-pdf' : '/analytics/export-booking-status-excel',
        'top-cars': format === 'pdf' ? '/analytics/export-top-cars-pdf' : '/analytics/export-top-cars-excel',
        'payment-methods': format === 'pdf' ? '/analytics/export-overview-pdf' : '/analytics/export-overview-excel',
        'top-owners': format === 'pdf' ? '/analytics/export-top-owners-pdf' : '/analytics/export-top-owners-excel',
        'geographic': format === 'pdf' ? '/analytics/export-geographic-pdf' : '/analytics/export-geographic-excel'
      };

      const endpoint = endpoints[chartType];
      if (!endpoint) {
        toast.error('Invalid chart type');
        return;
      }

      const fileName = `${chartType}-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      await downloadFile(endpoint, fileName);
      toast.success(`${chartType} exported successfully!`);
    } catch (error) {
      console.error('Chart export error:', error);
      toast.error(`Failed to export ${chartType}`);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className='h-full flex flex-col bg-gray-50 overflow-auto'>
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 md:p-4">
        <div className="flex flex-col gap-3">
          {/* Title and buttons row */}
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                {getDashboardTitle()}
              </h1>
              <p className="text-xs md:text-sm text-gray-500 truncate">
                {getDashboardSubtitle()}
              </p>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-2">
              {/* Export button for admin - hide text on mobile */}
              {isAdmin && (
                <button 
                  onClick={handleExportExcel}
                  disabled={exportLoading}
                  className="px-2 md:px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                  title="Export Excel"
                >
                  {exportLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    '📊'
                  )}
                  <span className="hidden md:inline">{t('dashboard.excel')}</span>
                </button>
              )}
              <button 
                onClick={manualRefresh}
                disabled={loading}
                className="px-2 md:px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                title="Refresh"
              >
                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                <span className="hidden md:inline">{loading ? t('dashboard.refreshing') : t('dashboard.refresh')}</span>
              </button>
            </div>
          </div>

          {/* Role indicator - mobile optimized */}
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
            <span className={`px-2 md:px-3 py-1 rounded-full font-medium ${
              isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isAdmin ? t('dashboard.adminPanel') : t('dashboard.userEnterprisePanel')}
            </span>
            <span className="text-gray-600 truncate">
              {t('dashboard.welcomeBack')}, {user?.name}!
            </span>
            {process.env.NODE_ENV === 'development' && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded flex items-center gap-1">
                🟢 <span className="hidden sm:inline">{t('dashboard.active')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main content with padding */}
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Cards - Mobile optimized grid */}
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4'>
          {getDashboardCards().map((card, index) => (
            <div key={index} className='flex flex-col gap-1 md:gap-2 p-3 md:p-4 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10'>
                  <img src={card.icon} alt="" className='h-4 w-4 md:h-5 md:w-5' />
                </div>
              </div>
              <div>
                <h2 className='text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1 leading-tight'>{card.title}</h2>
                <p className='text-base md:text-lg font-semibold text-gray-900'>{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Content Area - Mobile optimized layout */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
          {/* Recent Bookings - Mobile optimized */}
          <div className='lg:col-span-2 p-3 md:p-4 border border-gray-200 rounded-lg bg-white flex flex-col'>
            <div className='mb-3 md:mb-4 flex-shrink-0'>
              <h2 className='text-base md:text-lg font-medium'>{t('dashboard.recentBookings')}</h2>
              <p className='text-xs md:text-sm text-gray-500'>{isAdmin ? t('dashboard.latestPlatform') : t('dashboard.latestCustomer')}</p>
            </div>
            <div className='space-y-2 md:space-y-3 overflow-y-auto max-h-[400px] md:max-h-[500px]'>
              {data.recentBookings && data.recentBookings.length > 0 ? (
                data.recentBookings.map((booking, index) => (
                  booking.car || booking.carId ? (
                    <div key={index} className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 md:p-3 bg-gray-50 rounded-lg'>
                      <div className='flex items-center gap-2 md:gap-3 min-w-0'>
                        <div className='flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex-shrink-0'>
                          <img src={assets.listIconColored} alt="" className='h-4 w-4 md:h-5 md:w-5' />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className='font-medium text-xs md:text-sm truncate'>{(booking.car || booking.carId)?.brand} {(booking.car || booking.carId)?.model}</p>
                          <p className='text-[10px] md:text-xs text-gray-500'>{new Date(booking.createdAt).toLocaleDateString()}</p>
                          {booking.bookingId && (
                            <p className='text-[10px] md:text-xs text-gray-400 truncate'>ID: {booking.bookingId}</p>
                          )}
                        </div>
                      </div>

                      <div className='flex items-center gap-2 justify-between sm:justify-end flex-shrink-0'>
                        <p className='text-xs md:text-sm font-medium'>
                          ₹{booking.totalAmount || booking.price || 0}
                        </p>
                        <p className={`px-2 py-0.5 md:py-1 border rounded-full text-[10px] md:text-xs ${
                          booking.status === 'confirmed' ? 'border-green-300 text-green-700 bg-green-50' :
                          booking.status === 'pending' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                          'border-gray-300 text-gray-700'
                        }`}>
                          {booking.status}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div key={index} className='text-xs md:text-sm text-red-500 italic p-2 md:p-3 bg-red-50 rounded-lg'>
                      {t('dashboard.bookingInfoMissing')}
                    </div>
                  )
                ))
              ) : (
                <div className='text-xs md:text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg text-center'>
                  {t('dashboard.noRecentBookings')}
                </div>
              )}
            </div>
          </div>

          {/* Revenue and Quick Actions - Mobile optimized */}
          <div className='space-y-4 md:space-y-6'>
            {/* Monthly Revenue */}
            <div className='p-3 md:p-4 border border-gray-200 rounded-lg bg-white'>
              <h2 className='text-base md:text-lg font-medium mb-1 md:mb-2'>{t('dashboard.monthlyRevenue')}</h2>
              <p className='text-xs md:text-sm text-gray-500 mb-2 md:mb-4'>{t('dashboard.revenueForMonth')}</p>
              <p className='text-xl md:text-2xl font-semibold text-primary'>
                ₹{typeof data.monthlyRevenue === 'string' ? 
                  data.monthlyRevenue.replace('₹', '').replace(/,/g, '') : 
                  data.monthlyRevenue || 0}
              </p>
              {isAdmin && (
                <div className='mt-2 md:mt-3 text-xs md:text-sm text-gray-600 space-y-1'>
                  <p>{t('dashboard.cash')}: ₹{adminData.cashEarnings}</p>
                  <p>{t('dashboard.online')}: ₹{adminData.onlineEarnings}</p>
                </div>
              )}
            </div>

            {/* Admin Quick Actions */}
            {isAdmin && (
              <div className='p-3 md:p-4 border border-gray-200 rounded-lg bg-white'>
                <h2 className='text-base md:text-lg font-medium mb-1 md:mb-2'>{t('dashboard.quickActions')}</h2>
                <p className='text-xs md:text-sm text-gray-500 mb-2 md:mb-4'>{t('dashboard.adminManagement')}</p>
                <div className='space-y-2'>
                  <button 
                    onClick={handleExportExcel}
                    disabled={exportLoading}
                    className='w-full text-left px-2 md:px-3 py-2 text-xs md:text-sm bg-green-50 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50'
                  >
                    📊 {t('dashboard.exportExcel')}
                  </button>
                  <button 
                    onClick={handleExportEarningsPDF}
                    disabled={exportLoading}
                    className='w-full text-left px-2 md:px-3 py-2 text-xs md:text-sm bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50'
                  >
                    📄 Export Earnings PDF
                  </button>
                  <button 
                    onClick={handleExportEarningsExcel}
                    disabled={exportLoading}
                    className='w-full text-left px-2 md:px-3 py-2 text-xs md:text-sm bg-green-50 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50'
                  >
                    📊 Export Earnings Excel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Section - Admin Only - Mobile Optimized */}
      {isAdmin && (
        <div className="p-3 md:p-6 space-y-4 md:space-y-6">
          {/* Analytics Header - Mobile optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200 pt-4 md:pt-6">
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-gray-900">📊 Advanced Analytics</h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Detailed platform insights</p>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-xs md:text-sm w-full sm:w-auto"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          {analyticsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Charts Section - Mobile optimized */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                {/* Revenue Trend Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-4">
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900">📈 Revenue Trend</h3>
                    <div className="flex gap-1 md:gap-2">
                      <button
                        onClick={() => handleExportChart('revenue-trend', 'pdf')}
                        disabled={exportLoading}
                        className="px-2 md:px-3 py-1 text-[10px] md:text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                        title="Export as PDF"
                      >
                        📄 <span className="hidden sm:inline">PDF</span>
                      </button>
                      <button
                        onClick={() => handleExportChart('revenue-trend', 'excel')}
                        disabled={exportLoading}
                        className="px-2 md:px-3 py-1 text-[10px] md:text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                        title="Export as Excel"
                      >
                        📊 <span className="hidden sm:inline">Excel</span>
                      </button>
                    </div>
                  </div>
                  <RevenueChart data={chartData.revenueTrend} />
                </div>

                {/* Booking Status Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-4">
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900">📊 Booking Status</h3>
                    <div className="flex gap-1 md:gap-2">
                      <button
                        onClick={() => handleExportChart('booking-status', 'pdf')}
                        disabled={exportLoading}
                        className="px-2 md:px-3 py-1 text-[10px] md:text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                        title="Export as PDF"
                      >
                        📄 <span className="hidden sm:inline">PDF</span>
                      </button>
                      <button
                        onClick={() => handleExportChart('booking-status', 'excel')}
                        disabled={exportLoading}
                        className="px-2 md:px-3 py-1 text-[10px] md:text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                        title="Export as Excel"
                      >
                        📊 <span className="hidden sm:inline">Excel</span>
                      </button>
                    </div>
                  </div>
                  <BookingStatusChart data={chartData.bookingStatus} />
                </div>

                {/* Top Cars Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-4">
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900">🚗 Top Performing Cars</h3>
                    <div className="flex gap-1 md:gap-2">
                      <button
                        onClick={() => handleExportChart('top-cars', 'pdf')}
                        disabled={exportLoading}
                        className="px-2 md:px-3 py-1 text-[10px] md:text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                        title="Export as PDF"
                      >
                        📄 <span className="hidden sm:inline">PDF</span>
                      </button>
                      <button
                        onClick={() => handleExportChart('top-cars', 'excel')}
                        disabled={exportLoading}
                        className="px-2 md:px-3 py-1 text-[10px] md:text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                        title="Export as Excel"
                      >
                        📊 <span className="hidden sm:inline">Excel</span>
                      </button>
                    </div>
                  </div>
                  <TopCarsChart data={analyticsData.topCars.slice(0, 10)} />
                </div>

                {/* Payment Methods Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">💳 Payment Methods</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportChart('payment-methods', 'pdf')}
                        disabled={exportLoading}
                        className="px-3 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                        title="Export as PDF"
                      >
                        📄 PDF
                      </button>
                      <button
                        onClick={() => handleExportChart('payment-methods', 'excel')}
                        disabled={exportLoading}
                        className="px-3 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                        title="Export as Excel"
                      >
                        📊 Excel
                      </button>
                    </div>
                  </div>
                  <PaymentMethodsChart data={chartData.paymentMethods} />
                </div>
              </div>

              {/* Top Performing Cars */}
              {analyticsData.topCars.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">🚗 Top Performing Cars</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportChart('top-cars', 'pdf')}
                        disabled={exportLoading}
                        className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                      >
                        📄 Export PDF
                      </button>
                      <button
                        onClick={() => handleExportChart('top-cars', 'excel')}
                        disabled={exportLoading}
                        className="px-3 py-1.5 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                      >
                        📊 Export Excel
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
                        {analyticsData.topCars.map((car) => (
                          <tr key={car._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  src={getImageUrl(car.image) || '/default-car.png'}
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
                              {car.averageRating !== undefined && car.averageRating !== null ? (
                                <span>{car.averageRating.toFixed(1)} ⭐</span>
                              ) : (
                                <span className="text-gray-400">0.0 ⭐</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top Performing Owners */}
              {analyticsData.topOwners.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">👥 Top Performing Owners</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportChart('top-owners', 'pdf')}
                        disabled={exportLoading}
                        className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                      >
                        📄 Export PDF
                      </button>
                      <button
                        onClick={() => handleExportChart('top-owners', 'excel')}
                        disabled={exportLoading}
                        className="px-3 py-1.5 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                      >
                        📊 Export Excel
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
                        {analyticsData.topOwners.map((owner, index) => (
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
              {analyticsData.locations.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">📍 Geographic Distribution</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportChart('geographic', 'pdf')}
                        disabled={exportLoading}
                        className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                      >
                        📄 Export PDF
                      </button>
                      <button
                        onClick={() => handleExportChart('geographic', 'excel')}
                        disabled={exportLoading}
                        className="px-3 py-1.5 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                      >
                        📊 Export Excel
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analyticsData.locations.slice(0, 9).map((loc, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">{loc.location}</h4>
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
            </>
          )}
        </div>
      )}

      {/* Recalculate Earnings Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRecalculateDialog}
        onClose={() => setShowRecalculateDialog(false)}
        onConfirm={handleRecalculateEarnings}
        title="Recalculate Platform Earnings"
        message="This will recalculate platform earnings for all bookings based on car ownership. This process may take a few moments. Do you want to continue?"
        confirmText="Yes, Recalculate"
        cancelText="Cancel"
        confirmColor="bg-purple-600 hover:bg-purple-700"
        icon="💰"
      />
    </div>
  )
}

export default Dashboard