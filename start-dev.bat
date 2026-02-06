@echo off
echo Starting RentX Development Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not installed or not in PATH
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo Warning: .env file not found
    echo Please copy .env.example to .env and configure your environment variables
    echo.
    echo Required variables:
    echo - MONGODB_URI
    echo - JWT_SECRET
    echo - EMAIL_USER
    echo - EMAIL_PASS
    echo - GOOGLE_MAPS_API_KEY
    echo.
    pause
)

REM Check if Netlify CLI is installed globally
netlify --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Netlify CLI...
    npm install -g netlify-cli
    if %errorlevel% neq 0 (
        echo Warning: Failed to install Netlify CLI globally
        echo You can still run the development server
        echo.
    )
)

echo Starting development server with Netlify Functions...
echo Frontend will be available at: http://localhost:8888
echo API will be available at: http://localhost:8888/.netlify/functions/api
echo.

REM Start the development server
netlify dev

if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to start development server
    echo Trying alternative method...
    echo.
    
    REM Fallback to regular Vite dev server
    echo Starting Vite development server...
    echo Note: Serverless functions will not be available in this mode
    npm run dev
)

pause