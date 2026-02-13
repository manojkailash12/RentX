import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import BackButton from '../../components/BackButton';

const DynamicPricing = () => {
  const { backendUrl, token } = useAppContext();
  const [rules, setRules] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');
  const [formData, setFormData] = useState({
    name: '',
    type: 'demand',
    conditions: {
      demandLevel: 'high',
      location: '',
      category: '',
      minDuration: '',
      maxDuration: ''
    },
    adjustment: {
      type: 'percentage',
      value: 0
    },
    priority: 0
  });

  useEffect(() => {
    fetchRules();
    fetchAnalytics();
  }, []);

  const fetchRules = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/pricing/rules`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRules(data.rules || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rules:', error);
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/pricing/analytics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `${backendUrl}/pricing/rules`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(data.message);
      setShowRuleModal(false);
      resetForm();
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { data } = await axios.delete(
        `${backendUrl}/pricing/rules/${ruleId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(data.message);
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete rule');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'demand',
      conditions: {
        demandLevel: 'high',
        location: '',
        category: '',
        minDuration: '',
        maxDuration: ''
      },
      adjustment: {
        type: 'percentage',
        value: 0
      },
      priority: 0
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dynamic Pricing</h1>
        {activeTab === 'rules' && (
          <button
            onClick={() => setShowRuleModal(true)}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            + Create Rule
          </button>
        )}
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pricing Rules
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Demand Analytics
        </button>
      </div>

      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{rule.name}</h3>
                  <span className="text-sm text-gray-500 capitalize">{rule.type} Rule</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    rule.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleDeleteRule(rule._id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {rule.conditions.demandLevel && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Demand Level</p>
                    <p className="font-semibold capitalize">{rule.conditions.demandLevel}</p>
                  </div>
                )}
                {rule.conditions.location && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-semibold">{rule.conditions.location}</p>
                  </div>
                )}
                {rule.conditions.category && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="font-semibold">{rule.conditions.category}</p>
                  </div>
                )}
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs text-blue-600">Adjustment</p>
                  <p className="font-semibold text-blue-800">
                    {rule.adjustment.value > 0 ? '+' : ''}{rule.adjustment.value}
                    {rule.adjustment.type === 'percentage' ? '%' : ' ₹'}
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Priority: {rule.priority} | Created by: {rule.createdBy?.name || 'System'}
              </div>
            </div>
          ))}

          {rules.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500 text-lg">No pricing rules created yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-2">Total Bookings</h3>
              <p className="text-3xl font-bold text-primary">{analytics.totalBookings}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Category Demand</h3>
            <div className="space-y-3">
              {Object.entries(analytics.categoryDemand || {}).map(([category, data]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="capitalize font-medium">{category}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">{data.count} bookings</span>
                    <span className="font-semibold text-green-600">₹{data.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Location Demand</h3>
            <div className="space-y-3">
              {Object.entries(analytics.locationDemand || {}).map(([location, data]) => (
                <div key={location} className="flex items-center justify-between">
                  <span className="font-medium">{location}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">{data.count} bookings</span>
                    <span className="font-semibold text-green-600">₹{data.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h2 className="text-2xl font-bold mb-4">Create Pricing Rule</h2>
            
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Weekend Surge"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rule Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="demand">Demand Based</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="location">Location Based</option>
                    <option value="duration">Duration Based</option>
                    <option value="category">Category Based</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Conditions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Demand Level
                    </label>
                    <select
                      value={formData.conditions.demandLevel}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {...formData.conditions, demandLevel: e.target.value}
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="peak">Peak</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.conditions.location}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {...formData.conditions, location: e.target.value}
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Mumbai"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.conditions.category}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {...formData.conditions, category: e.target.value}
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="SUV"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Price Adjustment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adjustment Type
                    </label>
                    <select
                      value={formData.adjustment.type}
                      onChange={(e) => setFormData({
                        ...formData,
                        adjustment: {...formData.adjustment, type: e.target.value}
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.adjustment.value}
                      onChange={(e) => setFormData({
                        ...formData,
                        adjustment: {...formData.adjustment, value: parseFloat(e.target.value)}
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="20"
                      step="0.01"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Use positive values for surcharge, negative for discount
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRuleModal(false);
                    resetForm();
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicPricing;
