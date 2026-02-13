import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import BackButton from '../../components/BackButton';

const BiometricDevices = () => {
  const { backendUrl, token } = useAppContext();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    deviceId: '',
    deviceName: '',
    deviceType: 'fingerprint',
    location: '',
    ipAddress: ''
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/biometric/devices`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDevices(data.devices || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `${backendUrl}/biometric/register-device`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(data.message);
      setShowAddModal(false);
      setFormData({
        deviceId: '',
        deviceName: '',
        deviceType: 'fingerprint',
        location: '',
        ipAddress: ''
      });
      fetchDevices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register device');
    }
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
        <h1 className="text-3xl font-bold text-gray-800">Biometric Devices</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          + Add Device
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <div key={device._id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">
                {device.deviceType === 'fingerprint' && '👆'}
                {device.deviceType === 'face' && '📷'}
                {device.deviceType === 'iris' && '👁️'}
                {device.deviceType === 'palm' && '🖐️'}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                device.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : device.status === 'inactive'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {device.status}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold mb-2">{device.deviceName}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">ID:</span> {device.deviceId}</p>
              <p><span className="font-medium">Type:</span> {device.deviceType}</p>
              <p><span className="font-medium">Location:</span> {device.location}</p>
              <p><span className="font-medium">IP:</span> {device.ipAddress || 'N/A'}</p>
              <p><span className="font-medium">Last Sync:</span> {
                device.lastSync 
                  ? new Date(device.lastSync).toLocaleString() 
                  : 'Never'
              }</p>
            </div>
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No devices registered yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-primary hover:underline"
          >
            Register your first device
          </button>
        </div>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Register Biometric Device</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device ID
                </label>
                <input
                  type="text"
                  required
                  value={formData.deviceId}
                  onChange={(e) => setFormData({...formData, deviceId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="DEV001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.deviceName}
                  onChange={(e) => setFormData({...formData, deviceName: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Main Entrance Scanner"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Type
                </label>
                <select
                  value={formData.deviceType}
                  onChange={(e) => setFormData({...formData, deviceType: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="fingerprint">Fingerprint</option>
                  <option value="face">Face Recognition</option>
                  <option value="iris">Iris Scanner</option>
                  <option value="palm">Palm Scanner</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Main Office Entrance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP Address (Optional)
                </label>
                <input
                  type="text"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="192.168.1.100"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiometricDevices;
