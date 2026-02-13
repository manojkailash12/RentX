import { useState, useEffect } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import GoogleMapComponent from './GoogleMapComponent';

const ChargingStationMap = ({ userLocation }) => {
  const { axios } = useAppContext();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (userLocation) {
      fetchNearbyStations();
    }
  }, [userLocation]);

  const fetchNearbyStations = async () => {
    try {
      const { data } = await axios.get('/charging/nearby', {
        params: {
          longitude: userLocation.lng,
          latitude: userLocation.lat,
          radius: 50000 // 50km radius
        }
      });
      
      if (data.success) {
        setStations(data.stations);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to load charging stations');
    } finally {
      setLoading(false);
    }
  };

  const getChargerIcon = (types) => {
    if (types.includes('Tesla')) return '⚡';
    if (types.includes('CCS')) return '🔌';
    return '🔋';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="text-center py-8 text-red-600">
        Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">⚡ EV Charging Stations</h2>
          <p className="text-gray-600 mt-1">
            Found {stations.length} charging station{stations.length !== 1 ? 's' : ''} nearby
          </p>
        </div>
      </div>

      {/* Google Map */}
      <div className="mb-6">
        <Wrapper apiKey={apiKey} libraries={['places']}>
          <GoogleMapComponent
            stations={stations}
            userLocation={userLocation}
            onStationClick={setSelectedStation}
          />
        </Wrapper>
      </div>

      {/* Station List */}
      {stations.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station) => (
            <div
              key={station._id}
              onClick={() => setSelectedStation(station)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-4 border-2 border-transparent hover:border-green-500"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{station.name}</h3>
                  <p className="text-sm text-gray-600">{station.location.address}</p>
                  <p className="text-xs text-gray-500">{station.location.city}, {station.location.state}</p>
                </div>
                <span className="text-3xl">{getChargerIcon(station.chargerTypes)}</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Available:</span>
                  <span className="font-semibold text-green-600">
                    {station.availablePlugs}/{station.totalPlugs} plugs
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Power:</span>
                  <span className="font-semibold">{station.powerOutput} kW</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold">
                    ₹{station.pricing.perKwh}/kWh
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {station.chargerTypes.map((type) => (
                    <span
                      key={type}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      {type}
                    </span>
                  ))}
                </div>

                {station.rating > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold">{station.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t">
                <span className={`px-2 py-1 rounded text-xs ${
                  station.status === 'active' ? 'bg-green-100 text-green-800' :
                  station.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {station.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No charging stations found nearby</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your location or check back later</p>
        </div>
      )}

      {/* Station Detail Modal */}
      {selectedStation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{selectedStation.name}</h3>
              <button
                onClick={() => setSelectedStation(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-gray-600">{selectedStation.location.address}</p>
                <p className="text-sm text-gray-500">{selectedStation.location.city}, {selectedStation.location.state}</p>
              </div>
              
              <div className="bg-gray-50 rounded p-3 space-y-2">
                <div className="flex justify-between">
                  <span>Operating Hours:</span>
                  <span className="font-semibold">
                    {selectedStation.operatingHours.is24Hours
                      ? '24/7'
                      : `${selectedStation.operatingHours.open} - ${selectedStation.operatingHours.close}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="font-semibold">{selectedStation.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span>Power Output:</span>
                  <span className="font-semibold">{selectedStation.powerOutput} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Plugs:</span>
                  <span className="font-semibold text-green-600">
                    {selectedStation.availablePlugs}/{selectedStation.totalPlugs}
                  </span>
                </div>
              </div>

              {selectedStation.amenities?.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Amenities:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStation.amenities.map((amenity, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  window.open(
                    `https://maps.google.com/?q=${selectedStation.location.coordinates[1]},${selectedStation.location.coordinates[0]}`,
                    '_blank'
                  );
                }}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Get Directions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChargingStationMap;
