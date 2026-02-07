# 🚗 RentX - Car Rental Application (Netlify Serverless)

A full-stack car rental platform built with React and Netlify Functions that allows users to browse, book, and manage car rentals. Features include user authentication, admin panel, enterprise features, real-time booking system, comprehensive car management, and advanced car replacement functionality.

## ✨ Features

### 🔐 Authentication System
- User registration with OTP email verification (6-digit code)
- Login with email, username, or name
- Role-based access control (Admin/User/Owner)
- JWT token authentication with secure sessions
- Profile management with image upload (Cloudinary integration)
- Password reset with OTP verification
- Multi-device session management
- Logout from all devices functionality

### 🚗 Car Management
- Browse available cars with detailed information
- Advanced search and filtering by category, location, price
- Car image uploads and management (Cloudinary)
- Real-time availability checking with date validation
- Distance calculation with OpenStreetMap & Google Maps API
- User-owned car listings (Peer-to-peer rental)
- Admin-owned car listings
- Car approval/rejection workflow
- Toggle car availability status
- Edit and delete car listings
- Car specifications (brand, model, year, category, transmission, fuel type, seating capacity)

### � Booking System
- Book cars for specific dates and locations
- Pickup and drop-off location with cities
- Real-time availability validation (prevents double booking)
- Booking confirmation and management
- **PDF invoice generation** (Professional invoices with booking details)
- **Email notifications** (Booking confirmation with PDF attachment)
- **Resend invoice via email** functionality
- Booking cancellation by users
- Booking status management (Pending, Confirmed, Completed, Cancelled)
- Payment status tracking (Pay at Drop-off, Paid, Failed)
- Pricing types: Daily rate or Per-KM rate
- Distance-based pricing with round-trip calculation
- Commission system (40% platform, 60% owner for user-owned cars)
- Booking ID and Invoice Number auto-generation

### 🔄 Car Replacement System (NEW!)
- **Admin can replace cars** in active bookings
- Works for both admin-owned and user-owned cars
- Automatic email notification to customers
- Replacement reason tracking
- Original car details preserved for reference
- Customer sees replacement info in their account
- Professional email template with car comparison
- Replacement timestamp tracking
- Only active bookings can be replaced (not cancelled/completed)

### 👨‍💼 Enterprise Features
- Dashboard analytics and revenue tracking
- Add, edit, and delete car listings
- Booking management for car owners
- Car approval system (Admin)
- Monthly earnings reports
- Owner earnings calculation (60% for user-owned cars)
- Platform commission tracking (40% for user-owned cars)
- Payment method tracking (Cash/Online)
- Revenue breakdown by payment method

### 🛡️ Admin Panel
- User management and analytics
- Car approval/rejection system
- Platform-wide booking management
- Revenue analytics and reporting
- **Excel/PDF export functionality** (Earnings, Cars, Bookings)
- Monthly earnings breakdown
- Total users, cars, bookings statistics
- Pending car approvals tracking
- **Car replacement management** for all bookings
- View all available cars for replacement
- Commission and earnings analytics

### 📧 Email System
- Professional HTML email templates
- Booking confirmation emails with PDF invoices
- OTP verification emails (Registration & Password Reset)
- Welcome emails after verification
- **Car replacement notification emails**
- Email resend functionality
- Gmail SMTP integration
- Automated email delivery

### 📄 PDF Generation
- Professional invoice generation with PDFKit
- Booking details with car information
- Customer and owner information
- Pricing breakdown (daily/per-km)
- Commission details
- Payment status
- QR code for booking verification
- Download and email delivery
- Serverless PDF generation

### 🎨 User Interface
- Modern, responsive design with TailwindCSS
- Smooth animations with Motion/React
- Toast notifications for user feedback
- Loading states and error handling
- Image error handling with fallbacks
- Mobile-friendly interface
- Admin dashboard with analytics charts
- Owner dashboard with earnings overview
- User booking history with detailed views
- Car replacement indicators and badges

## 🏗️ Tech Stack

### Frontend
- **React 19** - Modern UI library
- **Vite** - Fast build tool
- **TailwindCSS 4.1** - Utility-first CSS framework
- **React Router DOM 7** - Client-side routing
- **Motion/React** - Smooth animations
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

### Backend
- **Netlify Functions** - Serverless backend
- **Express.js** - Web framework (serverless)
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Multer** - File uploads
- **Cloudinary** - Image hosting and management
- **Nodemailer** - Email service (Gmail SMTP)
- **PDFKit** - Professional PDF invoice generation
- **Puppeteer** - HTML to PDF conversion
- **Axios** - HTTP client for API calls
- **OpenStreetMap Nominatim** - Geocoding for distance calculation

### Deployment
- **Netlify** - Full-stack hosting with serverless functions
- **MongoDB Atlas** - Cloud database hosting
- **Cloudinary** - Image CDN and storage
- **Gmail SMTP** - Email delivery service

## 🗂️ Project Structure

```
rentx-netlify/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   │   ├── owner/          # Owner/Admin specific components
│   │   ├── Banner.jsx      # Homepage banner
│   │   ├── CarCard.jsx     # Car display card
│   │   ├── ErrorBoundary.jsx # Error handling
│   │   ├── Footer.jsx      # Footer component
│   │   ├── Navbar.jsx      # Navigation bar
│   │   └── Title.jsx       # Page title component
│   ├── pages/              # Page components
│   │   ├── owner/          # Owner/Admin pages
│   │   │   ├── AddCar.jsx  # Add new car
│   │   │   ├── CarApproval.jsx # Car approval system
│   │   │   ├── Dashboard.jsx # Owner dashboard
│   │   │   ├── EditCar.jsx # Edit car details
│   │   │   ├── Layout.jsx  # Owner layout wrapper
│   │   │   ├── ManageBookings.jsx # Booking management (with car replacement)
│   │   │   └── ManageCars.jsx # Car management
│   │   ├── CarDetails.jsx  # Car detail page
│   │   ├── Cars.jsx        # Car listing page
│   │   ├── Home.jsx        # Homepage
│   │   ├── MyBookings.jsx  # User bookings (with replacement info)
│   │   └── Profile.jsx     # User profile
│   ├── context/            # React Context for state management
│   │   └── AppContext.jsx  # Global app state
│   └── assets/             # Images and static files
├── public/                 # Public assets
│   ├── favicon.svg         # Site favicon
│   └── _redirects          # Netlify redirects
├── netlify/                # Netlify serverless functions
│   └── functions/          # API endpoints as serverless functions
│       ├── controllers/    # Route handlers
│       │   ├── adminController.js # Admin operations (with car replacement)
│       │   ├── bookingController.js # Booking operations
│       │   ├── ownerController.js # Owner operations
│       │   └── userController.js # User operations
│       ├── models/         # Database models
│       │   ├── booking.js  # Booking schema (with replacement fields)
│       │   ├── car.js      # Car schema
│       │   ├── counter.js  # Auto-increment counters
│       │   ├── session.js  # User sessions
│       │   └── user.js     # User schema
│       ├── middleware/     # Custom middleware
│       │   ├── auth.js     # JWT authentication
│       │   ├── multer.js   # File upload handling
│       │   └── multerCloudinary.js # Cloudinary integration
│       ├── utils/          # Utility functions
│       │   ├── db.js       # Database connection
│       │   ├── distanceCalculator.js # Distance calculation
│       │   ├── emailService.js # Email sending (with replacement emails)
│       │   ├── htmlToPdfGenerator.js # HTML to PDF conversion
│       │   ├── pdfGenerator.js # PDF invoice generation
│       │   ├── pdfkitGenerator.js # PDFKit implementation
│       │   ├── pdfmakePdfGenerator.js # PDFMake implementation
│       │   ├── serverlessResponse.js # Response helpers
│       │   └── sessionManager.js # Session management
│       ├── api.js          # Main API router
│       └── package.json    # Function dependencies
├── netlify.toml            # Netlify build configuration
├── package.json            # Frontend dependencies
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # TailwindCSS configuration
├── eslint.config.js        # ESLint configuration
└── README.md               # This file
```

## 🚀 Getting Started

### ✅ Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- MongoDB Atlas account
- Gmail account for email service
- Google Maps API key
- Netlify account

### ⚙️ Local Development Setup

#### 1️⃣ Clone the repository

```bash
git clone https://github.com/yourusername/rentx-netlify.git
cd rentx-netlify
```

#### 2️⃣ Install dependencies

```bash
# Install root dependencies
npm install

# Install function dependencies
cd netlify/functions
npm install
cd ../..
```

#### 3️⃣ Configure Environment Variables

Create `.env` file in the root directory:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key

# Email Service (Gmail)
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
EMAIL_SERVICE=gmail

# Google Maps (Optional - OpenStreetMap used as fallback)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Cloudinary (Image hosting)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Environment
NODE_ENV=development
NETLIFY_DEV=true

# Frontend URL
VITE_API_URL=http://localhost:8888/.netlify/functions/api
VITE_CURRENCY=₹
```

**Important Notes:**
- **Gmail App Password**: Enable 2FA on Gmail and generate an app-specific password
- **MongoDB Atlas**: Create a free cluster and get connection string
- **Cloudinary**: Sign up for free account and get credentials
- **Google Maps API**: Optional, OpenStreetMap is used as free alternative

#### 4️⃣ Run the application

Start the development server with Netlify CLI:

```bash
# Install Netlify CLI globally if not already installed
npm install -g netlify-cli

# Start development server (runs both frontend and functions)
netlify dev
```

This will start:
- Frontend: `http://localhost:8888`
- Serverless Functions: `http://localhost:8888/.netlify/functions/api`
- MongoDB connection will be established automatically

### Alternative Development (without Netlify CLI)

```bash
# Start frontend only
npm run dev

# In another terminal, start functions locally
npm run functions:serve
```

## 🌐 Deployment

### Netlify Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Netlify:**
   - Connect your GitHub repository to Netlify
   - Build settings are automatically configured via `netlify.toml`
   - Add environment variables in Netlify dashboard

### Environment Variables for Netlify

Add these in Netlify Dashboard → Site Settings → Environment Variables:

```
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
EMAIL_SERVICE=gmail
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=production
```

## 🎯 Key Features Explained

### Car Replacement System
When a booked car needs repair or maintenance, admins can:
1. Select the booking from "Manage Bookings"
2. Click "Replace Car" button
3. Choose a replacement car from available options
4. Provide a reason for replacement
5. System automatically:
   - Updates the booking with new car
   - Sends email to customer with details
   - Preserves original car info for reference
   - Shows replacement badge in user's bookings

### Commission System
- **User-owned cars**: 60% to owner, 40% to platform
- **Admin-owned cars**: 100% to platform
- Automatic calculation on booking creation
- Transparent earnings display for owners

### Pricing Models
1. **Daily Rate**: Fixed price per day
2. **Per-KM Rate**: ₹15/km with round-trip calculation
3. Automatic distance calculation using OpenStreetMap

### PDF Invoice Generation
- Professional invoices with booking details
- Car and customer information
- Pricing breakdown
- Payment status
- QR code for verification
- Automatic email delivery
- Download anytime from bookings

### Email Notifications
- Booking confirmation with PDF invoice
- OTP verification for registration
- Password reset OTP
- Welcome email after verification
- **Car replacement notifications**
- Invoice resend functionality

## 📱 Usage

### For Users
1. **Register** with email verification (6-digit OTP)
2. **Browse** available cars with filters
3. **Book** cars for specific dates and locations
4. **Manage** bookings and view booking history
5. **Download** PDF invoices or resend via email
6. **Cancel** bookings if needed
7. **View** car replacement notifications if admin replaces your booked car
8. **Access** enterprise features to list your own cars for rent

### For Car Owners (Enterprise)
1. **Change role** to owner in profile
2. **Add cars** for rent with images and details
3. **Manage** car listings (edit, delete, toggle availability)
4. **View** bookings for your cars
5. **Track** earnings and commission (60% owner, 40% platform)
6. **Approve/Reject** bookings
7. **Update** payment status

### For Admins
1. **Login** with admin credentials
2. **Access** admin dashboard with analytics
3. **Approve/reject** user-submitted cars
4. **Manage** platform users and all bookings
5. **View** analytics and generate reports (PDF/Excel)
6. **Replace cars** in active bookings when needed
7. **Track** platform revenue and commissions
8. **Export** data for analysis

## 🔧 API Endpoints

All API endpoints are available at `/.netlify/functions/api/`

### Authentication
- `POST /user/register` - User registration with OTP
- `POST /user/verify-otp` - Email verification
- `POST /user/resend-otp` - Resend OTP
- `POST /user/login` - User login
- `POST /user/logout` - Logout current session
- `POST /user/logout-all` - Logout all devices
- `GET /user/data` - Get user profile
- `PUT /user/profile` - Update user profile
- `PUT /user/profile-image` - Update profile image

### Cars
- `GET /user/cars` - Get available cars
- `POST /owner/add-car` - Add new car (with image upload)
- `GET /owner/cars` - Get owner's cars
- `GET /owner/car/:carId` - Get car details for editing
- `PUT /owner/car/:carId` - Update car (with image upload)
- `POST /owner/toggle-car` - Toggle car availability
- `POST /owner/delete-car` - Delete car
- `GET /owner/pending-cars` - Get pending car approvals (Admin/Owner)
- `POST /owner/approve-reject-car` - Approve/reject car (Admin)

### Bookings
- `POST /bookings/check-availability` - Check car availability
- `POST /bookings/check-car-availability` - Check specific car availability
- `POST /bookings/calculate-distance` - Calculate distance between locations
- `POST /bookings/create` - Create new booking
- `GET /bookings/user` - Get user bookings
- `GET /bookings/owner` - Get owner/admin bookings
- `POST /bookings/change-status` - Change booking status
- `POST /bookings/update-payment-status` - Update payment status
- `GET /bookings/invoice/:bookingId` - Download PDF invoice
- `POST /bookings/cancel/:bookingId` - Cancel booking (User)
- `POST /bookings/resend-invoice/:bookingId` - Resend invoice email

### Admin
- `GET /admin/dashboard` - Admin analytics dashboard
- `GET /admin/earnings/monthly` - Monthly earnings report
- `GET /admin/earnings/export/pdf` - Export earnings to PDF
- `GET /admin/earnings/export/excel` - Export earnings to Excel
- `GET /admin/cars/export/pdf` - Export cars to PDF
- `GET /admin/cars/export/excel` - Export cars to Excel
- `GET /admin/bookings/export/pdf` - Export bookings to PDF
- `GET /admin/bookings/export/excel` - Export bookings to Excel
- `GET /admin/users` - Get all users
- `GET /admin/bookings` - Get all bookings
- `POST /admin/replace-car` - Replace car in booking (NEW!)
- `GET /admin/available-cars` - Get available cars for replacement (NEW!)

### Owner/Enterprise
- `POST /owner/change-role` - Change user role to owner
- `GET /owner/dashboard` - Owner dashboard with analytics
- `POST /owner/update-image` - Update user image

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## � Known Issues & Limitations

- Google Maps API is optional; OpenStreetMap is used as free alternative
- File uploads limited to 10MB
- Email sending requires Gmail account with app password
- Cloudinary free tier has storage limits

## 🔮 Future Enhancements

- [ ] Real-time chat between users and owners
- [ ] Payment gateway integration (Stripe/Razorpay)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Car insurance integration
- [ ] GPS tracking for rented cars
- [ ] Rating and review system
- [ ] Loyalty program and discounts

## 📊 Database Schema

### User Model
- Authentication (email, password, OTP)
- Profile (name, phone, image)
- Role (admin, user, owner)
- Sessions (JWT tokens)

### Car Model
- Details (brand, model, year, category)
- Specifications (transmission, fuel, seating)
- Pricing (daily rate, per-km rate)
- Availability status
- Owner reference
- Approval status

### Booking Model
- Car and user references
- Dates (pickup, return)
- Locations (pickup, drop-off)
- Pricing details
- Payment status
- **Replacement fields** (isCarReplaced, originalCarId, replacementReason, replacedAt)
- Commission calculation

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- OTP verification for registration
- Session management
- Role-based access control
- Input validation and sanitization
- CORS configuration
- Environment variable protection
- Secure file upload handling

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and queries, contact: **rentxcars.spprt@gmail.com**

## 🙏 Acknowledgments

- React team for the amazing framework
- Netlify for serverless hosting
- MongoDB Atlas for database hosting
- Cloudinary for image management
- OpenStreetMap for free geocoding
- All contributors and users

---

<p align="center">
  <strong>Made with ❤️ for car rental enthusiasts</strong><br>
  <sub>© 2024 RentX. All rights reserved.</sub>
</p>

<p align="center">
  <a href="#-rentx---car-rental-application-netlify-serverless">Back to Top ⬆️</a>
</p>