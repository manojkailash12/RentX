@echo off
echo 🧹 Cleaning and restarting RentX API...
echo.

REM Kill any existing Netlify processes
echo Stopping existing processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im netlify.exe >nul 2>&1

REM Wait a moment
timeout /t 2 >nul

REM Clear any cached modules
echo Clearing cache...
if exist ".netlify" rmdir /s /q ".netlify"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM Test models first
echo Testing models...
node test-simple.js
if %errorlevel% neq 0 (
    echo ❌ Model test failed! Check the error above.
    pause
    exit /b 1
)

echo.
echo ✅ All tests passed! Starting server...
echo.

REM Start fresh
echo 🚀 Starting clean development server...
echo.
echo ✅ API will be available at: http://localhost:8888/.netlify/functions/api
echo ✅ Test endpoint: http://localhost:8888/.netlify/functions/api/test
echo ✅ Health check: http://localhost:8888/.netlify/functions/api/health
echo ✅ Roles endpoint: http://localhost:8888/.netlify/functions/api/user/roles
echo ✅ Cars endpoint: http://localhost:8888/.netlify/functions/api/user/cars
echo.

netlify dev --port 8888

pause