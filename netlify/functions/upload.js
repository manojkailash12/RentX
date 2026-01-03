const multipart = require('lambda-multipart-parser');
const mongoose = require('mongoose');

// MongoDB connection for serverless
let cachedDb = null;

const connectToDatabase = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    cachedDb = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Connect to database
    await connectToDatabase();

    // Parse multipart form data
    const result = await multipart.parse(event);
    
    if (!result.files || result.files.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'No files uploaded' }),
      };
    }

    // Process uploaded files
    const uploadedFiles = [];
    
    for (const file of result.files) {
      // Convert file to base64 for storage
      const base64Data = file.content.toString('base64');
      
      // Create file record (you can store in MongoDB or use external storage)
      const fileRecord = {
        filename: file.filename,
        contentType: file.contentType,
        size: file.content.length,
        data: base64Data, // In production, consider using external storage
        uploadedAt: new Date(),
      };
      
      uploadedFiles.push(fileRecord);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Files uploaded successfully',
        files: uploadedFiles.map(f => ({
          filename: f.filename,
          size: f.size,
          contentType: f.contentType,
        })),
      }),
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Upload failed',
        error: error.message 
      }),
    };
  }
};