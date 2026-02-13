import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const GPSTracker = ({ bookingId }) => {
  const [gpsData, setGpsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const { backendUrl, token } = useAppContext();

  useEffect(() => {
    loadGPSData();
    const interval = setInterval(() => {
      if (tracking) {
        loadGPSData();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [bookingId, tracking]);

  const loadGPSData = async () => {
    try {
      const response = await axios.get(`${backendUrl}/gps/booking/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGpsData(response.data.gpsTracking);
      setTracking(response.data.gpsTracking?.enabled || false);
    } catch (error) {
      console.error('Load GPS data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTracking = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await axios.post(
            `${backendUrl}/gps/start`,
            {
              bookingId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              address: 'Current Location'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          loadGPSData();
          toast.success('GPS tracking started successfully!');
        } catch (error) {
          console.error('Start tracking error:', error);
          toast.error(error.response?.data?.message || 'Failed to start GPS tracking');
        }
      },
      (error) => {
        toast.error('Unable to get your location. Please enable location services.');
      }
    );
  };

  const stopTracking = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await axios.post(
            `${backendUrl}/gps/stop`,
            {
              bookingId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              address: 'End Location'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          loadGPSData();
          toast.success('GPS tracking stopped successfully!');
        } catch (error) {
          console.error('Stop tracking error:', error);
          toast.error(error.response?.data?.message || 'Failed to stop GPS tracking');
        }
      },
      (error) => {
        toast.error('Unable to get your location. Please enable location services.');
      }
    );
  };

  const updateLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    const loadingToast = toast.loading('Updating location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await axios.post(
            `${backendUrl}/gps/update`,
            {
              bookingId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              speed: position.coords.speed || 0,
              address: 'Current Location'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          await loadGPSData();
          toast.success('Location updated successfully!', { id: loadingToast });
        } catch (error) {
          console.error('Update location error:', error);
          toast.error(error.response?.data?.message || 'Failed to update location', { id: loadingToast });
        }
      },
      (error) => {
        toast.error('Unable to get your location. Please enable location services.', { id: loadingToast });
      }
    );
  };

  if (loading) {
    return <div className="text-center py-4">Loading GPS data...</div>;
  }

  if (!gpsData || !gpsData.enabled) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">GPS Tracking</h3>
        <p className="text-gray-600 mb-4">
          GPS tracking is not active for this booking. Start tracking to monitor your trip.
        </p>
        <button
          onClick={startTracking}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
        >
          Start GPS Tracking
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">GPS Tracking</h3>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          Active
        </span>
      </div>

      <div className="space-y-4">
        {/* Current Location */}
        {gpsData.currentLocation && (
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-gray-900">Current Location</h4>
            <p className="text-sm text-gray-600">{gpsData.currentLocation.address}</p>
            <p className="text-xs text-gray-500">
              Lat: {gpsData.currentLocation.latitude?.toFixed(6)}, 
              Lon: {gpsData.currentLocation.longitude?.toFixed(6)}
            </p>
            <p className="text-xs text-gray-400">
              Last updated: {new Date(gpsData.currentLocation.lastUpdated).toLocaleString()}
            </p>
          </div>
        )}

        {/* Distance Traveled */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {gpsData.totalDistanceTraveled?.toFixed(2) || 0} km
          </div>
          <div className="text-sm text-gray-600">Total Distance Traveled</div>
        </div>

        {/* Start Location */}
        {gpsData.startLocation && (
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-gray-900">Start Location</h4>
            <p className="text-sm text-gray-600">{gpsData.startLocation.address}</p>
            <p className="text-xs text-gray-400">
              {new Date(gpsData.startLocation.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {/* End Location */}
        {gpsData.endLocation && (
          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="font-semibold text-gray-900">End Location</h4>
            <p className="text-sm text-gray-600">{gpsData.endLocation.address}</p>
            <p className="text-xs text-gray-400">
              {new Date(gpsData.endLocation.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {tracking && (
            <>
              <button
                onClick={updateLocation}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Update Location
              </button>
              <button
                onClick={stopTracking}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Stop Tracking
              </button>
            </>
          )}
        </div>

        {/* Map Link */}
        {gpsData.currentLocation && (
          <a
            href={`https://www.google.com/maps?q=${gpsData.currentLocation.latitude},${gpsData.currentLocation.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-green-600 hover:text-green-700 text-sm font-medium"
          >
            View on Google Maps →
          </a>
        )}
      </div>
    </div>
  );
};

export default GPSTracker;
