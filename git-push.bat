@echo off
echo 🚀 Pushing RentX project to GitHub repository
echo =============================================

REM Initialize git repository if not exists
if not exist ".git" (
    echo Initializing Git repository...
    git init
)

REM Add remote origin
echo Adding remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/manojkailash12/RentX.git

REM Add all files
echo Adding all files to staging area...
git add .

REM Commit changes
echo Committing changes...
git commit -m "🚀 Initial commit: Complete RentX Car Rental Platform - Full-stack React + Node.js application with serverless deployment"

REM Push to GitHub
echo Pushing to GitHub repository...
git branch -M main
git push -u origin main --force

if %errorlevel% == 0 (
    echo.
    echo ✅ Successfully pushed to GitHub!
    echo Repository URL: https://github.com/manojkailash12/RentX.git
    echo.
    echo Next steps:
    echo 1. Visit your GitHub repository to verify all files are uploaded
    echo 2. Deploy to Netlify using the repository
    echo 3. Set up environment variables in Netlify
    echo 4. Test the deployed application
    echo.
    echo 🎉 Your RentX project is now on GitHub! 🚗💨
) else (
    echo ❌ Failed to push to GitHub.
    echo Please check your GitHub credentials and try again.
)

pause