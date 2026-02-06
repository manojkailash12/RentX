import { useEffect, useState, useCallback } from 'react'
import { assets } from '../../assets/assets'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useDashboardDataRefresh } from '../../hooks/useAutoRefresh'

const Dashboard = () => {

  const { axios, isOwner, isAdmin, currency, user, downloadFile } = useAppContext()

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
    availableCars: 0,
    pendingApprovalCars: 0,
    platformEarnings: 0,
    ownerEarnings: 0,
    cashEarnings: 0,
    onlineEarnings: 0,
  })

  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const getDashboardCards = () => {
    if (isAdmin) {
      return [
        { title: "Total Users", value: adminData.totalUsers, icon: assets.users_icon },
        { title: "Total Cars", value: data.totalCars, icon: assets.carIconColored },
        { title: "Available Cars", value: adminData.availableCars, icon: assets.carIconColored },
        { title: "Pending Approval", value: adminData.pendingApprovalCars, icon: assets.cautionIconColored },
        { title: "Total Bookings", value: data.totalBookings, icon: assets.listIconColored },
        { title: "Platform Earnings", value: `${currency} ${adminData.platformEarnings}`, icon: assets.listIconColored },
      ]
    } else {
      return [
        { title: "My Cars", value: data.totalCars, icon: assets.carIconColored },
        { title: "Total Bookings", value: data.totalBookings, icon: assets.listIconColored },
        { title: "Pending", value: data.pendingBookings, icon: assets.cautionIconColored },
        { title: "Confirmed", value: data.completedBookings, icon: assets.listIconColored },
        { title: "Approved Cars", value: data.approvedCars || 0, icon: assets.carIconColored },
        { title: "Awaiting Approval", value: data.pendingApprovalCars || 0, icon: assets.cautionIconColored },
      ]
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/owner/dashboard')
      if (data.success) {
        setData(data.dashboardData)
      }
    } catch (error) {
      // Silent error handling
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

  const refreshAllData = useCallback(async () => {
    await fetchDashboardData()
    if (isAdmin) {
      await fetchAdminData()
    }
  }, [isAdmin]);

  // Use auto-refresh hook for dashboard
  const { manualRefresh } = useDashboardDataRefresh(refreshAllData);

  useEffect(() => {
    if (isOwner) {
      // Only call refreshAllData once on mount, auto-refresh hook will handle the rest
      refreshAllData()
    }
  }, [isOwner, isAdmin, refreshAllData])

  const getDashboardTitle = () => {
    if (isAdmin) return 'Admin Dashboard'
    return 'Enterprise Dashboard'
  }

  const getDashboardSubtitle = () => {
    if (isAdmin) return 'Monitor overall platform performance including users, cars, bookings, and revenue analytics'
    return 'Manage your car listings and track your bookings and earnings'
  }

  // Export function
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      await downloadFile('/admin/earnings/export/excel', `earnings-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className='h-full flex flex-col p-4 md:p-6 bg-gray-50 overflow-auto'>
      <div className="flex justify-between items-start mb-4">
        <Title title={getDashboardTitle()} subTitle={getDashboardSubtitle()} />
        <div className="flex items-center gap-2">
          {/* Export button for admin */}
          {isAdmin && (
            <button 
              onClick={handleExportExcel}
              disabled={exportLoading}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {exportLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                '📊'
              )}
              Excel
            </button>
          )}
          <button 
            onClick={manualRefresh}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Role indicator */}
      <div className="mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {isAdmin ? 'Admin Panel' : 'User Enterprise Panel'}
        </span>
        <span className="ml-3 text-gray-600 text-sm">Welcome back, {user?.name}!</span>
        <span className="ml-3 text-xs text-gray-400">
          Auto-refreshes every 30 seconds
          {process.env.NODE_ENV === 'development' && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
              🟢 Active
            </span>
          )}
        </span>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6'>
        {getDashboardCards().map((card, index) => (
          <div key={index} className='flex flex-col gap-2 p-4 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center justify-center w-10 h-10 rounded-full bg-primary/10'>
                <img src={card.icon} alt="" className='h-5 w-5' />
              </div>
            </div>
            <div>
              <h1 className='text-xs text-gray-500 mb-1'>{card.title}</h1>
              <p className='text-lg font-semibold text-gray-900'>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Content Area - Flexible Layout */}
      <div className='flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0'>
        {/* Recent Bookings */}
        <div className='lg:col-span-2 p-4 border border-gray-200 rounded-lg bg-white overflow-hidden'>
          <div className='mb-4'>
            <h1 className='text-lg font-medium'>Recent Bookings</h1>
            <p className='text-gray-500 text-sm'>Latest {isAdmin ? 'platform' : 'customer'} bookings</p>
          </div>
          <div className='space-y-3 overflow-y-auto max-h-64'>
            {data.recentBookings && data.recentBookings.length > 0 ? (
              data.recentBookings.map((booking, index) => (
                booking.car || booking.carId ? (
                  <div key={index} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                    <div className='flex items-center gap-3'>
                      <div className='flex items-center justify-center w-10 h-10 rounded-full bg-primary/10'>
                        <img src={assets.listIconColored} alt="" className='h-5 w-5' />
                      </div>
                      <div>
                        <p className='font-medium text-sm'>{(booking.car || booking.carId)?.brand} {(booking.car || booking.carId)?.model}</p>
                        <p className='text-xs text-gray-500'>{new Date(booking.createdAt).toLocaleDateString()}</p>
                        {booking.bookingId && (
                          <p className='text-xs text-gray-400'>ID: {booking.bookingId}</p>
                        )}
                      </div>
                    </div>

                    <div className='flex items-center gap-2'>
                      <p className='text-sm font-medium'>
                        ₹{booking.totalAmount || booking.price || 0}
                      </p>
                      <p className={`px-2 py-1 border rounded-full text-xs ${
                        booking.status === 'confirmed' ? 'border-green-300 text-green-700 bg-green-50' :
                        booking.status === 'pending' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                        'border-gray-300 text-gray-700'
                      }`}>
                        {booking.status}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={index} className='text-sm text-red-500 italic p-3 bg-red-50 rounded-lg'>
                    Booking info missing (Car unavailable)
                  </div>
                )
              ))
            ) : (
              <div className='text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg text-center'>
                No recent bookings found
              </div>
            )}
          </div>
        </div>

        {/* Revenue and Quick Actions */}
        <div className='space-y-6'>
          {/* Monthly Revenue */}
          <div className='p-4 border border-gray-200 rounded-lg bg-white'>
            <h1 className='text-lg font-medium mb-2'>Monthly Revenue</h1>
            <p className='text-gray-500 text-sm mb-4'>Revenue for current month</p>
            <p className='text-2xl font-semibold text-primary'>
              ₹{typeof data.monthlyRevenue === 'string' ? 
                data.monthlyRevenue.replace('₹', '').replace(/,/g, '') : 
                data.monthlyRevenue || 0}
            </p>
            {isAdmin && (
              <div className='mt-3 text-sm text-gray-600 space-y-1'>
                <p>Cash: ₹{adminData.cashEarnings}</p>
                <p>Online: ₹{adminData.onlineEarnings}</p>
              </div>
            )}
          </div>

          {/* Admin Quick Actions */}
          {isAdmin && (
            <div className='p-4 border border-gray-200 rounded-lg bg-white'>
              <h1 className='text-lg font-medium mb-2'>Quick Actions</h1>
              <p className='text-gray-500 text-sm mb-4'>Admin management tools</p>
              <div className='space-y-2'>
                <button 
                  onClick={handleExportPDF}
                  disabled={exportLoading}
                  className='w-full text-left px-3 py-2 text-sm bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50'
                >
                  📊 Export Excel Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard