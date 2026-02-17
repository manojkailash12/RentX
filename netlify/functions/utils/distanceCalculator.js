const axios = require('axios');

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance);
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Get coordinates for a location using Nominatim (OpenStreetMap) - FREE, no API key needed
 */
const getCoordinates = async (location) => {
  try {
    // Clean up location string
    const cleanLocation = location.trim();
    
    // Use Nominatim (OpenStreetMap) geocoding API - completely free, no API key required
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: cleanLocation,
        format: 'json',
        limit: 1,
        countrycodes: 'in' // Restrict to India for better accuracy
      },
      headers: {
        'User-Agent': 'RentX-CarRental-App' // Required by Nominatim
      }
    });
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        displayName: result.display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
};

/**
 * Calculate accurate distance between two locations
 * Uses free OpenStreetMap geocoding + Haversine formula
 */
const calculateAccurateDistance = async (pickupLocation, dropLocation) => {
  try {
    console.log('🗺️ Calculating accurate distance using OpenStreetMap...');
    
    // Get coordinates for both locations
    const [pickupCoords, dropCoords] = await Promise.all([
      getCoordinates(pickupLocation),
      getCoordinates(dropLocation)
    ]);
    
    if (!pickupCoords || !dropCoords) {
      console.warn('⚠️ Could not geocode one or both locations');
      return null;
    }
    
    console.log('📍 Pickup:', pickupCoords.displayName);
    console.log('📍 Drop:', dropCoords.displayName);
    
    // Calculate distance using Haversine formula
    const distance = haversineDistance(
      pickupCoords.lat,
      pickupCoords.lon,
      dropCoords.lat,
      dropCoords.lon
    );
    
    console.log(`✅ Calculated distance: ${distance} km`);
    
    // Add 10% for road distance (straight line vs actual roads)
    const roadDistance = Math.round(distance * 1.1);
    console.log(`🛣️ Estimated road distance: ${roadDistance} km`);
    
    return roadDistance;
  } catch (error) {
    console.error('Distance calculation error:', error.message);
    return null;
  }
};

/**
 * Comprehensive city database for instant lookups (no API calls needed)
 */
const cityDistanceDatabase = {
  // Hyderabad routes
  'hyderabad-raichur': 200, 'raichur-hyderabad': 200,
  'hyderabad-bangalore': 570, 'bangalore-hyderabad': 570,
  'hyderabad-chennai': 630, 'chennai-hyderabad': 630,
  'hyderabad-mumbai': 710, 'mumbai-hyderabad': 710,
  'hyderabad-delhi': 1580, 'delhi-hyderabad': 1580,
  'hyderabad-pune': 560, 'pune-hyderabad': 560,
  'hyderabad-vijayawada': 270, 'vijayawada-hyderabad': 270,
  'hyderabad-warangal': 150, 'warangal-hyderabad': 150,
  'hyderabad-karimnagar': 165, 'karimnagar-hyderabad': 165,
  'hyderabad-nizamabad': 175, 'nizamabad-hyderabad': 175,
  'hyderabad-tirupati': 630, 'tirupati-hyderabad': 630,
  
  // Mumbai routes
  'mumbai-pune': 150, 'pune-mumbai': 150,
  'mumbai-nashik': 165, 'nashik-mumbai': 165,
  'mumbai-goa': 460, 'goa-mumbai': 460,
  'mumbai-delhi': 1400, 'delhi-mumbai': 1400,
  'mumbai-bangalore': 980, 'bangalore-mumbai': 980,
  'mumbai-ahmedabad': 525, 'ahmedabad-mumbai': 525,
  'mumbai-surat': 280, 'surat-mumbai': 280,
  'mumbai-nagpur': 525, 'nagpur-mumbai': 525,
  
  // Delhi routes
  'delhi-jaipur': 280, 'jaipur-delhi': 280,
  'delhi-agra': 230, 'agra-delhi': 230,
  'delhi-chandigarh': 245, 'chandigarh-delhi': 245,
  'delhi-lucknow': 555, 'lucknow-delhi': 555,
  'delhi-amritsar': 450, 'amritsar-delhi': 450,
  'delhi-dehradun': 250, 'dehradun-delhi': 250,
  'delhi-haridwar': 220, 'haridwar-delhi': 220,
  
  // Bangalore routes
  'bangalore-chennai': 350, 'chennai-bangalore': 350,
  'bangalore-kochi': 460, 'kochi-bangalore': 460,
  'bangalore-pune': 840, 'pune-bangalore': 840,
  'bangalore-mysore': 150, 'mysore-bangalore': 150,
  'bangalore-mangalore': 350, 'mangalore-bangalore': 350,
  'bangalore-coimbatore': 360, 'coimbatore-bangalore': 360,
  
  // Chennai routes
  'chennai-pondicherry': 160, 'pondicherry-chennai': 160,
  'chennai-madurai': 460, 'madurai-chennai': 460,
  'chennai-tirupati': 150, 'tirupati-chennai': 150,
  'chennai-vellore': 140, 'vellore-chennai': 140,
  
  // Raichur routes
  'raichur-bangalore': 380, 'bangalore-raichur': 380,
  'raichur-tirupati': 450, 'tirupati-raichur': 450,
  'raichur-vijayawada': 320, 'vijayawada-raichur': 320,
  'raichur-chennai': 550, 'chennai-raichur': 550,
  'raichur-sirwar': 128, 'sirwar-raichur': 128,
  
  // Other major routes
  'pune-nashik': 210, 'nashik-pune': 210,
  'pune-goa': 450, 'goa-pune': 450,
  'kolkata-bhubaneswar': 440, 'bhubaneswar-kolkata': 440,
  'ahmedabad-rajkot': 220, 'rajkot-ahmedabad': 220,
  'jaipur-udaipur': 400, 'udaipur-jaipur': 400,
  'lucknow-kanpur': 80, 'kanpur-lucknow': 80,
};

/**
 * Get distance from database (instant, no API calls)
 */
const getDistanceFromDatabase = (pickupLocation, dropLocation) => {
  const pickup = pickupLocation.toLowerCase().trim().split(',')[0]; // Get city name only
  const drop = dropLocation.toLowerCase().trim().split(',')[0];
  
  // If same location, return 0
  if (pickup === drop) {
    return 0;
  }
  
  const routeKey = `${pickup}-${drop}`;
  
  if (cityDistanceDatabase[routeKey]) {
    console.log(`📚 Found in database: ${routeKey} = ${cityDistanceDatabase[routeKey]} km`);
    return cityDistanceDatabase[routeKey];
  }
  
  return null;
};

module.exports = {
  calculateAccurateDistance,
  getDistanceFromDatabase,
  haversineDistance
};
