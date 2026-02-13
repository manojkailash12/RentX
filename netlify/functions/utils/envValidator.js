/**
 * Environment Variable Validator
 * 
 * Validates that all required environment variables are set before the application starts.
 * Provides clear error messages indicating which variables are missing.
 */

// List of required environment variables
const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'EMAIL_SERVICE',
  'EMAIL_USER',
  'EMAIL_PASS',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'GOOGLE_MAPS_API_KEY'
];

// Optional environment variables (with defaults or not critical)
const OPTIONAL_ENV_VARS = [
  'NODE_ENV',
  'NETLIFY_DEV',
  'VITE_API_URL',
  'VITE_CURRENCY',
  'VITE_APP_NAME',
  'VITE_WEBSOCKET_URL'
];

/**
 * Validates that all required environment variables are set
 * @returns {Object} { isValid: boolean, missing: string[], warnings: string[] }
 */
function validateEnvironment() {
  const missing = [];
  const warnings = [];
  
  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName] || process.env[varName].trim() === '') {
      missing.push(varName);
    }
  });
  
  // Check optional variables and provide warnings
  OPTIONAL_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });
  
  // Additional validation checks
  
  // Check MongoDB URI format
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
    warnings.push('MONGODB_URI should start with "mongodb://" or "mongodb+srv://"');
  }
  
  // Check JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters for security');
  }
  
  // Check NODE_ENV
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    warnings.push('NODE_ENV should be "development", "production", or "test"');
  }
  
  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Displays validation results and exits if critical variables are missing
 * @param {boolean} exitOnError - Whether to exit process on validation failure
 */
function checkEnvironment(exitOnError = true) {
  const result = validateEnvironment();
  
  if (!result.isValid) {
    console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n');
    console.error('The following required environment variables are missing:');
    result.missing.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    console.error('\nPlease set these variables in your .env file or environment configuration.');
    console.error('See .env.example for reference.\n');
    
    if (exitOnError) {
      process.exit(1);
    }
    
    return false;
  }
  
  // Display warnings if any
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  ENVIRONMENT WARNINGS\n');
    result.warnings.forEach(warning => {
      console.warn(`  - ${warning}`);
    });
    console.warn('');
  }
  
  // Success message
  console.log('✅ Environment validation passed');
  
  return true;
}

/**
 * Gets environment information for debugging
 * @returns {Object} Environment information
 */
function getEnvironmentInfo() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'development',
    isNetlify: !!process.env.NETLIFY,
    isNetlifyDev: !!process.env.NETLIFY_DEV,
    hasDatabase: !!process.env.MONGODB_URI,
    hasCloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
    hasEmail: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    hasGoogleMaps: !!process.env.GOOGLE_MAPS_API_KEY,
    hasWebSocket: !!process.env.VITE_WEBSOCKET_URL
  };
}

module.exports = {
  validateEnvironment,
  checkEnvironment,
  getEnvironmentInfo,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS
};
