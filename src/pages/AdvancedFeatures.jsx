import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MaintenanceAlerts from '../components/Maintenance/MaintenanceAlerts';
import ChargingStationMap from '../components/Charging/ChargingStationMap';

const AdvancedFeatures = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userLocation, setUserLocation] = useState(null);
  const navigate = useNavigate();

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setActiveTab('charging');
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const features = [
    {
      id: 'maintenance',
      icon: '🔧',
      title: 'Predictive Maintenance',
      description: 'AI-powered alerts for vehicle maintenance needs',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'charging',
      icon: '⚡',
      title: 'EV Charging Stations',
      description: 'Find nearby electric vehicle charging points',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'contract',
      icon: '📜',
      title: 'Smart Contracts',
      description: 'Blockchain-based rental agreements',
      color: 'from-emerald-500 to-emerald-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Advanced Features</h1>
          <p className="text-xl text-gray-600">
            Experience the future of car rental with cutting-edge technology
          </p>
        </div>

        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.id}
                onClick={() => {
                  if (feature.id === 'charging') {
                    getUserLocation();
                  } else {
                    setActiveTab(feature.id);
                  }
                }}
                className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-all transform hover:-translate-y-1"
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center text-3xl mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
                <button className="mt-4 text-blue-600 hover:text-blue-700 font-semibold text-sm">
                  Explore →
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div>
            <button
              onClick={() => setActiveTab('overview')}
              className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ← Back
            </button>
            <MaintenanceAlerts />
          </div>
        )}

        {activeTab === 'charging' && (
          <div>
            <button
              onClick={() => setActiveTab('overview')}
              className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ← Back
            </button>
            <ChargingStationMap userLocation={userLocation} />
          </div>
        )}

        {activeTab === 'contract' && (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ← Back
            </button>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-4">📜 Smart Contract Rentals</h2>
              <p className="text-gray-600 mb-6">
                Blockchain-based rental agreements with automated payments and
                transparent terms enforcement.
              </p>
              <div className="space-y-4 mb-6">
                <div className="bg-emerald-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">🔗 Blockchain Security</h3>
                  <p className="text-sm text-gray-600">
                    Immutable contracts stored on Polygon network
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">⚡ Automated Payments</h3>
                  <p className="text-sm text-gray-600">
                    Smart contract handles deposits and final payments
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">📊 Milestone Tracking</h3>
                  <p className="text-sm text-gray-600">
                    Track rental progress with blockchain verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/my-bookings')}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
              >
                View Contracts
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedFeatures;
