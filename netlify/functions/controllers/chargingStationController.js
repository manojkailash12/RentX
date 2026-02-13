const ChargingStation = require('../models/chargingStation.js');

// Ensure geospatial index exists
const ensureIndex = async () => {
  try {
    await ChargingStation.collection.createIndex({ location: '2dsphere' });
  } catch (error) {
    console.log('Index may already exist:', error.message);
  }
};

// Get nearby charging stations
exports.getNearbyStations = async (req, res) => {
  try {
    const { longitude, latitude, radius = 10000 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Longitude and latitude are required' 
      });
    }

    // Ensure index exists
    await ensureIndex();

    const stations = await ChargingStation.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius)
        }
      },
      status: 'active'
    }).limit(20);

    res.json({ success: true, stations, count: stations.length });
  } catch (error) {
    console.error('Charging station nearby error:', error);
    // If geospatial index doesn't exist, return empty array
    if (error.message.includes('unable to find index') || error.message.includes('$geoNear')) {
      return res.json({ success: true, stations: [], count: 0, message: 'No stations available' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all charging stations
exports.getAllStations = async (req, res) => {
  try {
    const { chargerType, provider, city } = req.query;
    const filter = { status: 'active' };

    if (chargerType) filter.chargerTypes = chargerType;
    if (provider) filter.provider = provider;
    if (city) filter['location.city'] = city;

    const stations = await ChargingStation.find(filter);

    res.json({ success: true, stations, count: stations.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create charging station (Admin only)
exports.createStation = async (req, res) => {
  try {
    const station = await ChargingStation.create(req.body);
    res.json({ success: true, station });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update station availability
exports.updateStationAvailability = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { availablePlugs } = req.body;

    const station = await ChargingStation.findByIdAndUpdate(
      stationId,
      { availablePlugs },
      { new: true }
    );

    res.json({ success: true, station });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add station review
exports.addStationReview = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { rating, comment } = req.body;

    const station = await ChargingStation.findById(stationId);
    
    station.reviews.push({
      userId: req.user._id,
      rating,
      comment
    });

    // Update average rating
    const avgRating = station.reviews.reduce((sum, r) => sum + r.rating, 0) / station.reviews.length;
    station.rating = avgRating;

    await station.save();

    res.json({ success: true, station });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seed sample charging stations across India
exports.seedStations = async (req, res) => {
  try {
    // Ensure index exists first
    await ensureIndex();

    const sampleStations = [
      // Hyderabad
      { name: 'Hitech City Charging Hub', location: { type: 'Point', coordinates: [78.3808, 17.4485], address: 'Hitech City, Hyderabad', city: 'Hyderabad', state: 'Telangana' }, provider: 'Tata Power', chargerTypes: ['CCS', 'Type2'], powerOutput: 50, totalPlugs: 4, availablePlugs: 3, pricing: { perKwh: 15, currency: 'INR' }, amenities: ['WiFi', 'Cafe', 'Restroom'], operatingHours: { is24Hours: true }, status: 'active' },
      { name: 'Gachibowli EV Station', location: { type: 'Point', coordinates: [78.3489, 17.4399], address: 'Gachibowli, Hyderabad', city: 'Hyderabad', state: 'Telangana' }, provider: 'Ather Energy', chargerTypes: ['Type2', 'CHAdeMO'], powerOutput: 60, totalPlugs: 6, availablePlugs: 4, pricing: { perKwh: 12, currency: 'INR' }, amenities: ['WiFi', 'Parking'], operatingHours: { is24Hours: true }, status: 'active' },
      
      // Bangalore
      { name: 'Koramangala Charging Point', location: { type: 'Point', coordinates: [77.6309, 12.9352], address: 'Koramangala, Bangalore', city: 'Bangalore', state: 'Karnataka' }, provider: 'Tata Power', chargerTypes: ['CCS', 'Type2'], powerOutput: 50, totalPlugs: 5, availablePlugs: 3, pricing: { perKwh: 14, currency: 'INR' }, amenities: ['WiFi', 'Cafe'], operatingHours: { is24Hours: true }, status: 'active' },
      { name: 'Whitefield EV Hub', location: { type: 'Point', coordinates: [77.7499, 12.9698], address: 'Whitefield, Bangalore', city: 'Bangalore', state: 'Karnataka' }, provider: 'Ather Energy', chargerTypes: ['Type2', 'CCS'], powerOutput: 60, totalPlugs: 8, availablePlugs: 6, pricing: { perKwh: 13, currency: 'INR' }, amenities: ['WiFi', 'Restroom', 'Parking'], operatingHours: { is24Hours: true }, status: 'active' },
      
      // Mumbai
      { name: 'Bandra Kurla Complex Station', location: { type: 'Point', coordinates: [72.8697, 19.0625], address: 'BKC, Mumbai', city: 'Mumbai', state: 'Maharashtra' }, provider: 'Tata Power', chargerTypes: ['CCS', 'Type2', 'CHAdeMO'], powerOutput: 120, totalPlugs: 10, availablePlugs: 7, pricing: { perKwh: 16, currency: 'INR' }, amenities: ['WiFi', 'Cafe', 'Restroom', 'Parking'], operatingHours: { is24Hours: true }, status: 'active' },
      { name: 'Andheri EV Point', location: { type: 'Point', coordinates: [72.8479, 19.1136], address: 'Andheri West, Mumbai', city: 'Mumbai', state: 'Maharashtra' }, provider: 'Ather Energy', chargerTypes: ['Type2', 'CCS'], powerOutput: 50, totalPlugs: 6, availablePlugs: 4, pricing: { perKwh: 15, currency: 'INR' }, amenities: ['WiFi', 'Parking'], operatingHours: { is24Hours: true }, status: 'active' },
      
      // Delhi
      { name: 'Connaught Place Charging Hub', location: { type: 'Point', coordinates: [77.2167, 28.6289], address: 'Connaught Place, New Delhi', city: 'Delhi', state: 'Delhi' }, provider: 'Tata Power', chargerTypes: ['CCS', 'Type2'], powerOutput: 60, totalPlugs: 8, availablePlugs: 5, pricing: { perKwh: 14, currency: 'INR' }, amenities: ['WiFi', 'Cafe', 'Restroom'], operatingHours: { is24Hours: true }, status: 'active' },
      { name: 'Cyber City Gurgaon', location: { type: 'Point', coordinates: [77.0880, 28.4950], address: 'Cyber City, Gurgaon', city: 'Gurgaon', state: 'Haryana' }, provider: 'Ather Energy', chargerTypes: ['Type2', 'CCS', 'CHAdeMO'], powerOutput: 100, totalPlugs: 12, availablePlugs: 9, pricing: { perKwh: 15, currency: 'INR' }, amenities: ['WiFi', 'Cafe', 'Parking', 'Restroom'], operatingHours: { is24Hours: true }, status: 'active' },
      
      // Chennai
      { name: 'OMR Charging Station', location: { type: 'Point', coordinates: [80.2329, 12.9121], address: 'OMR, Chennai', city: 'Chennai', state: 'Tamil Nadu' }, provider: 'Tata Power', chargerTypes: ['CCS', 'Type2'], powerOutput: 50, totalPlugs: 6, availablePlugs: 4, pricing: { perKwh: 13, currency: 'INR' }, amenities: ['WiFi', 'Parking'], operatingHours: { is24Hours: true }, status: 'active' },
      { name: 'T Nagar EV Point', location: { type: 'Point', coordinates: [80.2337, 13.0418], address: 'T Nagar, Chennai', city: 'Chennai', state: 'Tamil Nadu' }, provider: 'Ather Energy', chargerTypes: ['Type2', 'CCS'], powerOutput: 60, totalPlugs: 5, availablePlugs: 3, pricing: { perKwh: 14, currency: 'INR' }, amenities: ['WiFi', 'Cafe'], operatingHours: { is24Hours: true }, status: 'active' },
      
      // Pune
      { name: 'Hinjewadi IT Park Station', location: { type: 'Point', coordinates: [73.7279, 18.5912], address: 'Hinjewadi, Pune', city: 'Pune', state: 'Maharashtra' }, provider: 'Tata Power', chargerTypes: ['CCS', 'Type2'], powerOutput: 50, totalPlugs: 6, availablePlugs: 4, pricing: { perKwh: 13, currency: 'INR' }, amenities: ['WiFi', 'Parking', 'Restroom'], operatingHours: { is24Hours: true }, status: 'active' },
      { name: 'Koregaon Park Charging Hub', location: { type: 'Point', coordinates: [73.8961, 18.5362], address: 'Koregaon Park, Pune', city: 'Pune', state: 'Maharashtra' }, provider: 'Ather Energy', chargerTypes: ['Type2', 'CCS'], powerOutput: 60, totalPlugs: 4, availablePlugs: 3, pricing: { perKwh: 14, currency: 'INR' }, amenities: ['WiFi', 'Cafe'], operatingHours: { is24Hours: true }, status: 'active' }
    ];

    // Clear existing stations
    await ChargingStation.deleteMany({});
    
    // Insert new stations
    const stations = await ChargingStation.insertMany(sampleStations);

    res.json({ 
      success: true, 
      message: `Successfully seeded ${stations.length} charging stations across India`,
      count: stations.length 
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
