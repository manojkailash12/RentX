/**
 * Serverless Response Utility
 * Handles binary data encoding for Netlify serverless functions
 */

/**
 * Create a standardized serverless response
 * @param {number} statusCode - HTTP status code
 * @param {Buffer|Object|string} body - Response body
 * @param {Object} headers - HTTP headers
 * @param {boolean} isBinary - Whether the body is binary data
 * @returns {Object|null} Serverless response object or null for local Express
 */
const createServerlessResponse = (statusCode, body, headers = {}, isBinary = false) => {
  // Detect serverless environment
  const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  
  if (!isServerless) {
    return null; // Let Express handle it normally
  }
  
  const response = {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers
    }
  };
  
  // Handle binary data (PDFs, images, etc.)
  if (isBinary && Buffer.isBuffer(body)) {
    response.body = body.toString('base64');
    response.isBase64Encoded = true;
  } 
  // Handle JSON objects
  else if (typeof body === 'object' && body !== null) {
    response.body = JSON.stringify(body);
    response.headers['Content-Type'] = 'application/json';
  } 
  // Handle strings
  else {
    response.body = body;
  }
  
  return response;
};

module.exports = { createServerlessResponse };
