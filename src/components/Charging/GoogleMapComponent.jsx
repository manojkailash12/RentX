import { useEffect, useRef, useState } from 'react';

const GoogleMapComponent = ({ stations, userLocation, onStationClick }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [userMarker, setUserMarker] = useState(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !window.google || !userLocation) return;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: { lat: userLocation.lat, lng: userLocation.lng },
      zoom: 12,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    setMap(mapInstance);

    // Add user location marker
    const userMarkerInstance = new window.google.maps.Marker({
      position: { lat: userLocation.lat, lng: userLocation.lng },
      map: mapInstance,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    setUserMarker(userMarkerInstance);

    return () => {
      if (userMarkerInstance) userMarkerInstance.setMap(null);
    };
  }, [userLocation]);

  // Add station markers
  useEffect(() => {
    if (!map || !stations.length) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    // Create new markers
    const newMarkers = stations.map(station => {
      const marker = new window.google.maps.Marker({
        position: {
          lat: station.location.coordinates[1],
          lng: station.location.coordinates[0],
        },
        map,
        title: station.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="2"/>
              <text x="20" y="26" font-size="20" text-anchor="middle" fill="white">⚡</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
        },
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onStationClick) onStationClick(station);
        
        // Center map on clicked marker
        map.panTo(marker.getPosition());
        map.setZoom(15);
      });

      return marker;
    });

    setMarkers(newMarkers);

    // Fit bounds to show all markers
    if (newMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Include user location
      if (userLocation) {
        bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
      }
      
      // Include all stations
      newMarkers.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      
      map.fitBounds(bounds);
    }

    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
    };
  }, [map, stations, onStationClick, userLocation]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-[600px] rounded-lg shadow-lg"
      style={{ minHeight: '600px' }}
    />
  );
};

export default GoogleMapComponent;
