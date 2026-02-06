@echo off
echo 🚀 Starting RentX Full Stack Application...
echo.

REM Kill any existing processes
echo Stopping existing processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im netlify.exe >nul 2>&1
timeout /t 3 >nul

REM Clear cache and problematic files
echo Clearing cache...
if exist ".netlify" (
    echo Removing .netlify folder...
    rmdir /s /q ".netlify" 2>nul
    timeout /t 1 >nul
)

if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache" 2>nul
)

REM Ensure functions dependencies are installed
echo Checking function dependencies...
cd netlify\functions
if not exist "node_modules" (
    echo Installing function dependencies...
    call npm install
)
cd ..\..

echo.
echo ✅ Starting Netlify Dev Server (Frontend + Backend)...
echo.
echo 📱 Frontend: http://localhost:8888
echo 🔌 API: http://localhost:8888/.netlify/functions/api
echo 💾 Database: MongoDB Atlas
echo.
echo ⏳ Please wait for the server to start (may take 30-60 seconds)...
echo.

REM Start netlify dev
netlify dev

pause
