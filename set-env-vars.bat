@echo off
echo ========================================
echo    RentX Netlify Environment Setup
echo ========================================
echo.
echo Setting up environment variables for Netlify deployment...
echo.

echo 1. Setting MongoDB connection...
netlify env:set MONGODB_URI "mongodb+srv://Manoj:Manoj@cluster0.0w661ny.mongodb.net/RentX?retryWrites=true&w=majority"

echo 2. Setting JWT secret...
netlify env:set JWT_SECRET "rentx-super-secret-jwt-key-for-production-2024-secure"

echo 3. Setting email credentials...
netlify env:set EMAIL_USER "libroflow8@gmail.com"
netlify env:set EMAIL_PASS "ayejpuwsmfrxxacs"

echo 4. Setting environment...
netlify env:set NODE_ENV "production"

echo 5. Setting site URL (replace with your actual Netlify URL)...
netlify env:set URL "https://rentx-cars.netlify.app"

echo.
echo ========================================
echo   Environment Variables Set Successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Verify your MongoDB Atlas network access allows 0.0.0.0/0
echo 2. Trigger a new deployment in Netlify
echo 3. Test the health endpoint: https://your-site.netlify.app/.netlify/functions/api/health
echo 4. Check all features: registration, login, booking, PDFs, Excel downloads
echo.
echo ========================================
pause