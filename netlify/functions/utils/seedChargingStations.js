const ChargingStation = require('../models/chargingStation.js');

// Sample charging stations for Hyderabad, India
const sampleStations = [
  {
    name: 'Hitech City EV Hub',
    location: {
      type: 'Point',
      coordinates: [78.3808, 17.4485], // [longitude, latitude]
      address: 'Hitech City, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500081'
    },
    provider: 'Tata Power',
    chargerTypes: ['Type2', 'CCS'],
    powerOutput: 50,
    availablePlugs: 3,
    totalPlugs: 4,
    pricing: {
      perKwh: 15,
      perMinute: 0,
      currency: 'INR'
    },
    amenities: ['WiFi', 'Cafe', 'Restroom'],
    operatingHours: {
      open: '06:00',
      close: '22:00',
      is24Hours: false
    },
    status: 'active',
    rating: 4.5
  },
  {
    name: 'Gachibowli Tech Park Charging',
    location: {
      type: 'Point',
      coordinates: [78.3489, 17.4401],
      address: 'Gachibowli',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500032'
    },
    provider: 'Ather Energy',
    chargerTypes: ['Type2', 'CCS', 'CHAdeMO'],
    powerOutput: 60,
    availablePlugs: 4,
    totalPlugs: 6,
    pricing: {
      perKwh: 18,
      perMinute: 0,
      currency: 'INR'
    },
    amenities: ['WiFi', 'Parking', 'Security'],
    operatingHours: {
      is24Hours: true
    },
    status: 'active',
    rating: 4.7
  },
  {
    name: 'Banjara Hills Premium Charging',
    location: {
      type: 'Point',
      coordinates: [78.4376, 17.4239],
      address: 'Road No 12, Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500034'
    },
    provider: 'ChargeZone',
    chargerTypes: ['Type2', 'Tesla'],
    powerOutput: 120,
    availablePlugs: 2,
    totalPlugs: 2,
    pricing: {
      perKwh: 25,
      perMinute: 0,
      currency: 'INR'
    },
    amenities: ['WiFi', 'Lounge', 'Valet'],
    operatingHours: {
      open: '07:00',
      close: '23:00',
      is24Hours: false
    },
    status: 'active',
    rating: 4.8
  },
  {
    name: 'Secunderabad Railway Station EV Point',
    location: {
      type: 'Point',
      coordinates: [78.5014, 17.4344],
      address: 'Secunderabad Railway Station',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500003'
    },
    provider: 'Indian Railways',
    chargerTypes: ['Type1', 'Type2'],
    powerOutput: 30,
    availablePlugs: 5,
    totalPlugs: 8,
    pricing: {
      perKwh: 12,
      perMinute: 0,
      currency: 'INR'
    },
    amenities: ['Restroom', 'Food Court'],
    operatingHours: {
      is24Hours: true
    },
    status: 'active',
    rating: 4.2
  },
  {
    name: 'Jubilee Hills Fast Charge',
    location: {
      type: 'Point',
      coordinates: [78.4089, 17.4326],
      address: 'Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500033'
    },
    provider: 'Tata Power',
    chargerTypes: ['CCS', 'CHAdeMO'],
    powerOutput: 150,
    availablePlugs: 1,
    totalPlugs: 2,
    pricing: {
      perKwh: 22,
      perMinute: 0,
      currency: 'INR'
    },
    amenities: ['WiFi', 'Cafe'],
    operatingHours: {
      open: '06:00',
      close: '22:00',
      is24Hours: false
    },
    status: 'active',
    rating: 4.6
  }
];

async function seedChargingStations() {
  try {
    // Clear existing stations
    await ChargingStation.deleteMany({});
    console.log('Cleared existing charging stations');

    // Insert sample stations
    const stations = await ChargingStation.insertMany(sampleStations);
    console.log(`Seeded ${stations.length} charging stations`);

    return { success: true, count: stations.length };
  } catch (error) {
    console.error('Error seeding charging stations:', error);
    throw error;
  }
}

module.exports = { seedChargingStations, sampleStations };
