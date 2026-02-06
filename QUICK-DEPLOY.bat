@echo off
echo ========================================
echo QUICK DEPLOYMENT - RentX
echo ========================================
echo.

echo [1/2] Building...
call npm run build
echo.

echo [2/2] Deploying to production...
call netlify deploy --prod
echo.

echo ========================================
echo Deployment Complete!
echo ========================================
pause
