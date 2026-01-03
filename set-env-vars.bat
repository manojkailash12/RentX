@echo off
cls
echo ========================================
echo         RentX Netlify Setup
echo ========================================
echo.
echo This will set up your RentX app for Netlify deployment
echo with ALL features working:
echo.
echo ✅ User Registration with OTP emails
echo ✅ PDF receipt generation and download  
echo ✅ Excel report downloads
echo ✅ Email notifications and invoices
echo ✅ Complete admin panel
echo ✅ Car booking system
echo.
echo ========================================
echo.

echo 🔧 Setting environment variables in Netlify...
echo.

echo [1/5] MongoDB Connection...
netlify env:set MONGODB_URI "mongodb+srv://Manoj:Manoj@cluster0.0w661ny.mongodb.net/RentX?retryWrites=true&w=majority"

echo [2/5] JWT Security...
netlify env:set JWT_SECRET "rentx-super-secret-jwt-key-for-production-2024-secure-long-key"

echo [3/5] Email Service...
netlify env:set EMAIL_USER "libroflow8@gmail.com"
netlify env:set EMAIL_PASS "ayejpuwsmfrxxacs"

echo [4/5] Environment...
netlify env:set NODE_ENV "production"

echo [5/5] Complete!
echo.

echo ========================================
echo     Environment Variables Set! ✅
echo ========================================
echo.
echo NEXT STEPS:
echo.
echo 1. 🌐 Go to MongoDB Atlas (https://cloud.mongodb.com)
echo    → Network Access → Add IP: 0.0.0.0/0
echo.
echo 2. 🚀 Deploy your site:
echo    → Go to Netlify Dashboard
echo    → Deploys tab → Trigger deploy
echo.
echo 3. 🧪 Test your deployment:
echo    → Visit: https://your-site.netlify.app
echo    → Register a new user (OTP email will be sent)
echo    → Book a car and download PDF receipt
echo.
echo ========================================
echo   Your RentX app is ready to deploy! 🎉
echo ========================================
echo.
pause