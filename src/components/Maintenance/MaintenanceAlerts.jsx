import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const MaintenanceAlerts = () => {
  const { axios } = useAppContext();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data } = await axios.get('/maintenance/alerts');
      
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (alertId, status) => {
    try {
      const { data } = await axios.put(`/maintenance/alerts/${alertId}`, { status });
      
      if (data.success) {
        toast.success('Alert updated');
        fetchAlerts();
      }
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || colors.medium;
  };

  if (loading) return <div className="text-center py-8">Loading alerts...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Maintenance Alerts</h2>
      
      {alerts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No maintenance alerts</p>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {alert.carId?.brand} {alert.carId?.model} ({alert.carId?.year})
                  </h3>
                  <p className="text-gray-600">{alert.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${getSeverityColor(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-medium">{alert.alertType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-500">Predicted Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(alert.predictedDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Mileage:</span>
                  <span className="ml-2 font-medium">{alert.mileage} miles</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 font-medium capitalize">{alert.status}</span>
                </div>
              </div>
              
              {alert.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(alert._id, 'acknowledged')}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => updateStatus(alert._id, 'scheduled')}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => updateStatus(alert._id, 'dismissed')}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaintenanceAlerts;
