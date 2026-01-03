#!/bin/bash

# 🚀 Git Push Commands for RentX Repository
echo "🎯 Pushing RentX project to GitHub repository"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

print_status "Starting Git repository setup..."

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    print_status "Initializing Git repository..."
    git init
    print_success "Git repository initialized!"
else
    print_status "Git repository already exists."
fi

# Add remote origin
print_status "Adding remote origin..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/manojkailash12/RentX.git

# Check if remote was added successfully
if git remote -v | grep -q "origin"; then
    print_success "Remote origin added successfully!"
else
    print_error "Failed to add remote origin."
    exit 1
fi

# Add all files to staging
print_status "Adding all files to staging area..."
git add .

# Check git status
print_status "Current git status:"
git status --short

# Commit changes
print_status "Committing changes..."
git commit -m "🚀 Initial commit: Complete RentX Car Rental Platform

✨ Features:
- Full-stack React + Node.js application
- Serverless deployment with Netlify Functions
- Complete car rental booking system
- Email OTP verification system
- PDF receipt generation
- Excel report downloads
- Admin panel with analytics
- Commission system for vehicle owners
- Mobile responsive design
- South India car rental platform

🛠️ Tech Stack:
- Frontend: React.js, CSS3, Responsive Design
- Backend: Node.js, Express.js, Serverless Functions
- Database: MongoDB Atlas
- Email: Gmail SMTP with Nodemailer
- PDF: Puppeteer with chrome-aws-lambda
- Reports: ExcelJS for Excel generation
- Deployment: Netlify with serverless functions

📦 Deployment Ready:
- Netlify configuration included
- Environment variables documented
- Deployment scripts provided
- Complete documentation

🎯 Ready for production deployment!"

if [ $? -eq 0 ]; then
    print_success "Changes committed successfully!"
else
    print_error "Failed to commit changes."
    exit 1
fi

# Push to GitHub
print_status "Pushing to GitHub repository..."
git branch -M main
git push -u origin main --force

if [ $? -eq 0 ]; then
    print_success "🎉 Successfully pushed to GitHub!"
    echo ""
    print_status "Repository URL: https://github.com/manojkailash12/RentX.git"
    echo ""
    print_status "Next steps:"
    echo "1. Visit your GitHub repository to verify all files are uploaded"
    echo "2. Deploy to Netlify using the repository"
    echo "3. Set up environment variables in Netlify"
    echo "4. Test the deployed application"
    echo ""
    print_success "Your RentX project is now on GitHub! 🚗💨"
else
    print_error "Failed to push to GitHub."
    print_warning "This might be due to:"
    echo "1. Authentication issues (check your GitHub credentials)"
    echo "2. Repository permissions"
    echo "3. Network connectivity"
    echo ""
    print_status "You can try pushing manually with:"
    echo "git push -u origin main --force"
fi