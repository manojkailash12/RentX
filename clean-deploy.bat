@echo off
echo ========================================
echo RentX - Clean Deployment Script
echo ========================================
echo.

echo [1/5] Cleaning local Netlify artifacts...
if exist .netlify\functions-serve rmdir /s /q .netlify\functions-serve
if exist .netlify\blobs-serve rmdir /s /q .netlify\blobs-serve
if exist .netlify\functions-internal rmdir /s /q .netlify\functions-internal
echo Done!
echo.

echo [2/5] Cleaning function dependencies...
cd netlify\functions
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo Done!
echo.

echo [3/5] Installing function dependencies...
call npm install
cd ..\..
echo Done!
echo.

echo [4/5] Cleaning root dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo Done!
echo.

echo [5/5] Installing root dependencies...
call npm install
echo Done!
echo.

echo ========================================
echo Cleanup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Test locally: netlify dev
echo 2. Build: npm run build
echo 3. Deploy: netlify deploy --prod
echo.
pause
