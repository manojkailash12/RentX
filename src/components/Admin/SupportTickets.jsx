import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const SupportTickets = () => {
  const { t } = useTranslation();
  const { axios, user } = useAppContext();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [response, setResponse] = useState('');
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [admins, setAdmins] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchTickets();
    fetchAdmins();
  }, [filter, priorityFilter, categoryFilter, assignedFilter, searchQuery, pagination.page]);

  useEffect(() => {
    if (showAnalytics) {
      fetchAnalytics();
    }
  }, [showAnalytics]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20
      };
      
      if (filter !== 'all') params.status = filter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (assignedFilter !== 'all') params.assignedTo = assignedFilter;
      if (searchQuery) params.search = searchQuery;
      
      const { data } = await axios.get('/support/tickets', { params });

      if (data.success) {
        setTickets(data.tickets);
        setPagination({
          page: data.page,
          pages: data.pages,
          total: data.total
        });
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data } = await axios.get('/admin/users?role=admin');
      if (data.success) {
        setAdmins(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data } = await axios.get('/support/analytics');
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    }
  };

  const handleUpdateStatus = async (ticketId, status) => {
    try {
      const { data } = await axios.put(`/support/tickets/${ticketId}`, { status });

      if (data.success) {
        toast.success('Ticket status updated');
        fetchTickets();
        if (selectedTicket?.ticketId === ticketId) {
          setSelectedTicket(data.ticket);
        }
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const handleUpdatePriority = async (ticketId, priority) => {
    try {
      const { data } = await axios.put(`/support/tickets/${ticketId}`, { priority });

      if (data.success) {
        toast.success('Priority updated');
        fetchTickets();
        if (selectedTicket?.ticketId === ticketId) {
          setSelectedTicket(data.ticket);
        }
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleAssignTicket = async (ticketId, assignedTo) => {
    try {
      const { data} = await axios.put(`/support/tickets/${ticketId}/assign`, { assignedTo });

      if (data.success) {
        toast.success('Ticket assigned successfully');
        fetchTickets();
        if (selectedTicket?.ticketId === ticketId) {
          setSelectedTicket(data.ticket);
        }
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast.error('Failed to assign ticket');
    }
  };

  const handleFileUpload = async (ticketId, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      const { data } = await axios.post(`/support/tickets/${ticketId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        toast.success('Attachment uploaded successfully');
        const ticketData = await axios.get(`/support/tickets/${ticketId}`);
        if (ticketData.data.success) {
          setSelectedTicket(ticketData.data.ticket);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload attachment');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddResponse = async (ticketId) => {
    if (!response.trim()) {
      toast.error('Please enter a response');
      return;
    }

    try {
      const { data } = await axios.post(`/support/tickets/${ticketId}/respond`, { message: response });

      if (data.success) {
        toast.success('Response sent successfully! Email sent to customer.');
        setResponse('');
        fetchTickets();
        setSelectedTicket(data.ticket);
      }
    } catch (error) {
      console.error('Error adding response:', error);
      toast.error('Failed to send response');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      technical: '🔧',
      billing: '💰',
      booking: '📅',
      account: '👤',
      'car-issue': '🚗',
      payment: '💳',
      other: '📋'
    };
    return icons[category] || '📋';
  };

  const resetFilters = () => {
    setFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setAssignedFilter('all');
    setSearchQuery('');
    setPagination({ ...pagination, page: 1 });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (showAnalytics && analytics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Support Ticket Analytics</h1>
          <button
            onClick={() => setShowAnalytics(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Back to Tickets
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Tickets</p>
                <p className="text-3xl font-bold text-gray-800">{analytics.totalTickets}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Open Tickets</p>
                <p className="text-3xl font-bold text-orange-600">{analytics.openTickets}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg Response Time</p>
                <p className="text-3xl font-bold text-green-600">{analytics.avgResponseTimeHours}h</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Resolution Rate</p>
                <p className="text-3xl font-bold text-purple-600">
                  {analytics.totalTickets > 0 
                    ? Math.round(((analytics.ticketsByStatus?.resolved || 0) / analytics.totalTickets) * 100)
                    : 0}%
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Tickets by Status</h3>
            <div className="space-y-3">
              {Object.entries(analytics.ticketsByStatus || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(status)}`}>
                      {status.replace('_', ' ')}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${(count / analytics.totalTickets) * 100}%` }} />
                    </div>
                  </div>
                  <span className="font-bold text-gray-700 ml-3">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Tickets by Priority</h3>
            <div className="space-y-3">
              {Object.entries(analytics.ticketsByPriority || {}).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getPriorityColor(priority)}`}>{priority}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / analytics.totalTickets) * 100}%` }} />
                    </div>
                  </div>
                  <span className="font-bold text-gray-700 ml-3">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Support Tickets</h1>
        <button
          onClick={() => setShowAnalytics(true)}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          View Analytics
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search tickets (ID, subject, email, message)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Categories</option>
            <option value="technical">🔧 Technical</option>
            <option value="billing">💰 Billing</option>
            <option value="booking">📅 Booking</option>
            <option value="account">👤 Account</option>
            <option value="car-issue">🚗 Car Issue</option>
            <option value="payment">💳 Payment</option>
            <option value="other">📋 Other</option>
          </select>
        </div>

        {admins.length > 1 && (
          <div className="flex justify-between items-center">
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Assignments</option>
              <option value="">Unassigned</option>
              {admins.map((admin) => (
                <option key={admin._id} value={admin._id}>{admin.name}</option>
              ))}
            </select>

            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {admins.length <= 1 && (
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Showing {tickets.length} of {pagination.total} tickets
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-4 max-h-[700px] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Tickets ({tickets.length})</h2>
          {tickets.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tickets found</p>
          ) : (
            <>
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTicket?._id === ticket._id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-orange-600">{ticket.ticketId}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(ticket.category)}</span>
                      <p className="font-medium text-gray-800 flex-1 truncate">{ticket.subject}</p>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{ticket.email}</p>
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {ticket.assignedTo && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {ticket.assignedTo.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6 max-h-[700px] overflow-y-auto">
          {selectedTicket ? (
            <>
              <div className="border-b pb-4 mb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedTicket.ticketId}</h2>
                    <p className="text-gray-600">{selectedTicket.subject}</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(selectedTicket.ticketId, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleUpdatePriority(selectedTicket.ticketId, e.target.value)}
                      className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${getPriorityColor(selectedTicket.priority)}`}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{selectedTicket.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <span className="ml-2 font-medium">
                      {getCategoryIcon(selectedTicket.category)} {selectedTicket.category.replace('-', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Updated:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedTicket.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Admin:
                  </label>
                  {admins.length > 1 ? (
                    <>
                      <select
                        value={selectedTicket.assignedTo?._id || ''}
                        onChange={(e) => handleAssignTicket(selectedTicket.ticketId, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Unassigned</option>
                        {admins.map((admin) => (
                          <option key={admin._id} value={admin._id}>
                            {admin.name} ({admin.email})
                          </option>
                        ))}
                      </select>
                      {selectedTicket.assignedTo && (
                        <p className="text-xs text-gray-500 mt-1">
                          Assigned by {selectedTicket.assignedBy?.name} on{' '}
                          {new Date(selectedTicket.assignedAt).toLocaleString()}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">ℹ️ Single Admin Mode:</span> All tickets are automatically handled by you.
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Add more admin users to enable ticket assignment feature.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Original Message:</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
              </div>

              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">Attachments:</h3>
                  <div className="space-y-2">
                    {selectedTicket.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{attachment.filename}</p>
                          <p className="text-xs text-gray-500">
                            {(attachment.size / 1024).toFixed(2)} KB • {new Date(attachment.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Add Attachment:</h3>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(selectedTicket.ticketId, e.target.files[0])}
                  disabled={uploadingFile}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {uploadingFile && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
              </div>

              {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">Responses:</h3>
                  <div className="space-y-3">
                    {selectedTicket.responses.map((resp, index) => (
                      <div key={index} className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-blue-800">
                            {resp.respondedBy?.name || 'Admin'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(resp.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{resp.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Add Response (Email will be sent to customer):</h3>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response here... This will be sent to the customer via email."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[120px]"
                />
                <button
                  onClick={() => handleAddResponse(selectedTicket.ticketId)}
                  className="mt-3 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Response via Email
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-lg">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
