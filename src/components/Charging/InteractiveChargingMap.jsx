import { useState, useEffect, useRef } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

// Map component that renders the actual Google Map
const MapComponent = ({ center, zoom, stations, onStationClick }) => {
  const ref = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);

  // Initialize map
  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
      setMap(newMap);
    }
  }, [ref, map, center, zoom]);

  // Update center when it changes
  useEffect(() => {
    if (map && center) {
      map.setCenter(center);
    }
  }, [map, center]);

  // Add markers for stations
  useEffect(() => {
    if (!map || !stations) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    // Create new markers
    const newMarkers = stations.map(station => {
      const marker = new window.google.maps.Marker({
        position: {
          lat: station.location.coordinates[1],
          lng: station.location.coordinates[0]
        },
        map,
        title: station.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        onStationClick(station);
      });

      return marker;
    });

    setMarkers(newMarkers);

    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
    };
  }, [map, stations]);

  return <div ref={ref} className="w-full h-full min-h-[600px] rounded-lg" />;
};

const InteractiveChargingMap = ({ userLocation }) => {
  const { axios } = useAppContext();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [center, setCenter] = useState({ lat: 20.5937, lng: 78.9629 }); // India center
  const [zoom, setZoom] = useState(5);

  useEffect(() => {
    if (userLocation) {
      setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      setZoom(12);
      fetchNearbyStations();
    }
  }, [userLocation]);

  const fetchNearbyStations = async () => {
    if (!userLocation) return;
    
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <Wrapper apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'}>
          <MapComponent
            center={center}
            zoom={zoom}
            stations={stations}
            onStationClick={setSelectedStation}
          />
        </Wrapper>
      </div>

      {/* Station List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stations.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No charging stations found nearby. Try zooming out on the map or moving to a different location.
          </div>
        ) : (
          stations.map((station) => (
            <div
              key={station._id}
              onClick={() => setSelectedStation(station)}
              className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-4 border-2 ${
                selectedStation?._id === station._id ? 'border-primary' : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{station.name}</h3>
                  <p className="text-sm text-gray-600">{station.location.address}</p>
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
          ))
        )}
      </div>

      {/* Station Details Modal */}
      {selectedStation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{selectedStation.name}</h3>
              <button
                onClick={() => setSelectedStation(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <p className="text-gray-600">{selectedStation.location.address}</p>
              
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
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

export default InteractiveChargingMap;
