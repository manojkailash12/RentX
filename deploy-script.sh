#!/bin/bash

# 🚀 RentX Netlify Serverless Deployment Script
echo "🎯 RentX Netlify Serverless Deployment"
echo "======================================"

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

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    print_success "Dependencies check passed!"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies (serverless functions)
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install root dependencies"
        exit 1
    fi
    
    # Install client dependencies
    print_status "Installing client dependencies..."
    cd client
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install client dependencies"
        exit 1
    fi
    cd ..
    
    print_success "All dependencies installed!"
}

# Build application
build_app() {
    print_status "Building application..."
    npm run build:all
    if [ $? -eq 0 ]; then
        print_success "Application built successfully!"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Deploy to Netlify
deploy_netlify() {
    print_status "Deploying to Netlify..."
    
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi
    
    print_status "Logging into Netlify..."
    netlify login
    
    print_status "Deploying to production..."
    netlify deploy --prod
    
    if [ $? -eq 0 ]; then
        print_success "Deployed successfully to Netlify!"
    else
        print_error "Deployment failed"
        exit 1
    fi
}

# Main function
main() {
    echo ""
    print_status "Starting RentX Netlify deployment..."
    echo ""
    
    echo "What would you like to do?"
    echo "1) Full deployment (install, build, deploy)"
    echo "2) Build only"
    echo "3) Deploy only (assumes already built)"
    echo "4) Install dependencies only"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            check_dependencies
            install_dependencies
            build_app
            deploy_netlify
            ;;
        2)
            check_dependencies
            install_dependencies
            build_app
            ;;
        3)
            deploy_netlify
            ;;
        4)
            check_dependencies
            install_dependencies
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "🎉 Process completed!"
    echo ""
    print_status "Next steps:"
    echo "1. Set environment variables in Netlify dashboard"
    echo "2. Test all functionality"
    echo "3. Your app is live! 🚀"
    echo ""
    print_status "Required environment variables:"
    echo "- MONGODB_URI"
    echo "- JWT_SECRET"
    echo "- EMAIL_USER"
    echo "- EMAIL_PASS"
    echo "- NODE_ENV=production"
    echo ""
}

# Run main function
main