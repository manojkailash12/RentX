// This script will help update all API calls to use serverless functions
// Run this to see what needs to be updated

const fs = require('fs');
const path = require('path');

const apiMappings = {
  // Auth endpoints
  '/api/auth/register': '/.netlify/functions/auth/register',
  '/api/auth/login': '/.netlify/functions/auth/login',
  '/api/auth/verify-otp': '/.netlify/functions/auth/verify-otp',
  '/api/auth/resend-otp': '/.netlify/functions/auth/resend-otp',
  '/api/auth/profile': '/.netlify/functions/auth/profile',
  
  // Cars endpoints
  '/api/cars': '/.netlify/functions/cars',
  
  // Bookings endpoints
  '/api/bookings': '/.netlify/functions/bookings',
  '/api/bookings/my-bookings': '/.netlify/functions/bookings/user',
  
  // Admin endpoints (need to be created)
  '/api/admin/users': '/.netlify/functions/admin/users',
  '/api/admin/cars': '/.netlify/functions/admin/cars',
  '/api/admin/bookings': '/.netlify/functions/admin/bookings',
  
  // PDF and Excel endpoints
  '/api/admin/reports/export-excel': '/.netlify/functions/generate-excel',
  '/api/admin/reports/export-pdf': '/.netlify/functions/generate-pdf',
  
  // Download endpoints
  '/download-receipt': '/.netlify/functions/generate-pdf',
  '/resend-receipt': '/.netlify/functions/bookings/resend-email'
};

console.log('API Endpoint Mappings:');
console.log(JSON.stringify(apiMappings, null, 2));