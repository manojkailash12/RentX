const mongoose = require('mongoose');

// Car Schema
const carSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  type: { type: String, enum: ['sedan', 'suv', 'hatchback', 'luxury'], required: true },
  pricePerDay: { type: Number, required: true },
  pricePerKm: { type: Number, default: 10 },
  registrationNumber: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  features: [String],
  images: [String],
  documents: [String],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  isAvailable: { type: Boolean, default: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  fuelType: { type: String, enum: ['petrol', 'diesel', 'electric', 'hybrid'], default: 'petrol' },
  transmission: { type: String, enum: ['manual', 'automatic'], default: 'manual' },
  seatingCapacity: { type: Number, default: 5 },
  year: Number,
  mileage: String
}, { timestamps: true });

let Car;
try {
  Car = mongoose.model('Car');
} catch {
  Car = mongoose.model('Car', carSchema);
}

// MongoDB connection
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
    });
    
    cachedDb = connection;
    console.log('✅ MongoDB Connected');
    return connection;
  } catch (error) {
    console.error('❌ MongoDB Error:', error.message);
    throw error;
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await connectDB();

    const path = event.path.replace('/.netlify/functions/cars', '');
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    // GET ALL CARS
    if (path === '' && method === 'GET') {
      const { 
        type, 
        location, 
        state, 
        city, 
        minPrice, 
        maxPrice, 
        transmission, 
        fuelType,
        page = 1, 
        limit = 12 
      } = event.queryStringParameters || {};

      let query = { status: 'approved', isAvailable: true };

      if (type) query.type = type;
      if (location) query.location = new RegExp(location, 'i');
      if (state) query.state = new RegExp(state, 'i');
      if (city) query.city = new RegExp(city, 'i');
      if (transmission) query.transmission = transmission;
      if (fuelType) query.fuelType = fuelType;
      if (minPrice || maxPrice) {
        query.pricePerDay = {};
        if (minPrice) query.pricePerDay.$gte = parseInt(minPrice);
        if (maxPrice) query.pricePerDay.$lte = parseInt(maxPrice);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const cars = await Car.find(query)
        .populate('owner', 'name phone email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Car.countDocuments(query);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          cars,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        })
      };
    }

    // GET CAR BY ID
    if (path.startsWith('/') && method === 'GET') {
      const carId = path.substring(1);
      
      const car = await Car.findById(carId)
        .populate('owner', 'name phone email');

      if (!car) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Car not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ car })
      };
    }

    // ADD NEW CAR
    if (path === '' && method === 'POST') {
      const carData = body;

      // Basic validation
      const required = ['name', 'brand', 'model', 'type', 'pricePerDay', 'registrationNumber', 'location', 'state', 'city'];
      for (let field of required) {
        if (!carData[field]) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: `${field} is required` })
          };
        }
      }

      // Check if registration number already exists
      const existingCar = await Car.findOne({ registrationNumber: carData.registrationNumber });
      if (existingCar) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Car with this registration number already exists' })
        };
      }

      const car = new Car(carData);
      await car.save();

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Car added successfully! Pending admin approval.',
          car
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Cars function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Server error',
        error: error.message 
      })
    };
  }
};