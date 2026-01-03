const mongoose = require('mongoose');

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    await connectDB();

    // For now, we'll handle base64 encoded files from the frontend
    const body = JSON.parse(event.body);
    const { fileName, fileData, fileType } = body;

    if (!fileName || !fileData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'File name and data are required' })
      };
    }

    // In a real implementation, you would save to a cloud storage service
    // For now, we'll just return a success response with a mock URL
    const fileUrl = `https://example.com/uploads/${Date.now()}-${fileName}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'File uploaded successfully',
        fileUrl: fileUrl,
        fileName: fileName,
        fileType: fileType || 'unknown'
      })
    };

  } catch (error) {
    console.error('Upload function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Upload failed',
        error: error.message 
      })
    };
  }
};