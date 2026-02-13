import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GeofenceMonitor = ({ bookingId }) => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    fetchViolations();
    
    if (isTracking) {
      const interval = setInterval(checkLocation, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [bookingId, isTracking]);

  const fetchViolations = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/geofence/violations/${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (data.success) {
        setViolations(data.violations);
      }
    } catch (error) {
      console.error('Error fetching violations:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const token = localStorage.getItem('token');
          const { data } = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/geofence/check`,
            {
              bookingId,
              longitude: position.coords.longitude,
              latitude: position.coords.latitude,
              speed: position.coords.speed || 0
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (data.success && data.violation) {
            toast.error(`Geofence violation: ${data.violation.type}`);
            fetchViolations();
          }
        } catch (error) {
          console.error('Error checking geofence:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-yellow-100 text-yellow-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[severity] || colors.medium;
  };

  const getViolationIcon = (type) => {
    const icons = {
      boundary_exit: '🚨',
      speed_violation: '⚡',
      restricted_area: '⛔'
    };
    return icons[type] || '⚠️';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">📍</span>
          Geofence Monitoring
        </h3>
        
        <button
          onClick={() => setIsTracking(!isTracking)}
          className={`px-4 py-2 rounded-lg font-semibold ${
            isTracking
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isTracking ? 'Stop Tracking' : 'Start Tracking'}
        </button>
      </div>

      {isTracking && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
          <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-blue-700">Active monitoring enabled</span>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Total Violations:</span>
          <span className="text-2xl font-bold text-red-600">{violations.length}</span>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-4">Loading violations...</p>
      ) : violations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">✅</span>
          <p>No violations detected</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {violations.map((violation, index) => (
            <div
              key={index}
              className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getViolationIcon(violation.type)}</span>
                  <div>
                    <p className="font-semibold capitalize">
                      {violation.type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(violation.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(violation.severity)}`}>
                  {violation.severity}
                </span>
              </div>
              
              {violation.location && (
                <div className="text-xs text-gray-600 mt-2">
                  Location: {violation.location.coordinates[1].toFixed(6)}, {violation.location.coordinates[0].toFixed(6)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
        <p className="font-semibold mb-1">Geofence Rules:</p>
        <ul className="space-y-1">
          <li>• Stay within designated rental area</li>
          <li>• Respect speed limits</li>
          <li>• Avoid restricted zones</li>
        </ul>
      </div>
    </div>
  );
};

export default GeofenceMonitor;
