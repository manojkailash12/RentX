# 🚗 RentX - Car Rental Application (Netlify Serverless)

A full-stack car rental platform built with React and Netlify Functions that allows users to browse, book, and manage car rentals. Features include user authentication, admin panel, enterprise features, real-time booking system, and comprehensive car management.

## ✨ Features

### 🔐 Authentication System
- User registration with OTP email verification
- Login with email, username, or name
- Role-based access (Admin/User)
- JWT token authentication
- Profile management with image upload

### 🚗 Car Management
- Browse available cars with detailed information
- Advanced search and filtering
- Car image uploads and management
- Real-time availability checking
- Distance calculation with Google Maps API

### 📅 Booking System
- Book cars for specific dates and locations
- Pickup and drop-off location with cities
- Real-time availability validation
- Booking confirmation and management
- PDF invoice generation
- Email notifications

### 👨‍💼 Enterprise Features
- Dashboard analytics and revenue tracking
- Add, edit, and delete car listings
- Booking management for car owners
- Car approval system (Admin)
- Monthly earnings reports

### 🛡️ Admin Panel
- User management and analytics
- Car approval/rejection system
- Platform-wide booking management
- Revenue analytics and reporting
- Excel/PDF export functionality

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
- **Nodemailer** - Email service
- **PDFKit** - PDF generation

### Deployment
- **Netlify** - Full-stack hosting with serverless functions

## 🗂️ Project Structure

```
rentx-netlify/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── context/            # React Context for state management
│   └── assets/             # Images and static files
├── public/                 # Public assets
├── netlify/                # Netlify serverless functions
│   └── functions/          # API endpoints as serverless functions
├── server/                 # Backend logic (used by functions)
│   ├── controllers/        # Route handlers
│   ├── models/             # Database models
│   ├── middleware/         # Custom middleware
│   └── utils/              # Utility functions
├── netlify.toml            # Netlify build configuration
└── package.json            # Dependencies
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
git clone <your-repo-url>
cd rentx-netlify
```

#### 2️⃣ Install dependencies

```bash
npm install
```

#### 3️⃣ Configure Environment Variables

Create `.env` file in the root directory:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key

# Email Service
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
EMAIL_SERVICE=gmail

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Environment
NODE_ENV=development
NETLIFY_DEV=true

# Frontend URL
VITE_API_URL=http://localhost:8888/.netlify/functions/api
VITE_CURRENCY=₹
```

#### 4️⃣ Run the application

Start the development server with Netlify CLI:

```bash
# Install Netlify CLI globally if not already installed
npm install -g netlify-cli

# Start development server
netlify dev
```

This will start:
- Frontend: `http://localhost:8888`
- Serverless Functions: `http://localhost:8888/.netlify/functions/api`

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
NODE_ENV=production
```

## 📱 Usage

### For Users
1. Register with email verification
2. Browse available cars
3. Book cars for specific dates
4. Manage bookings and profile
5. Access enterprise features to list your own cars

### For Admins
1. Login with admin credentials
2. Access admin dashboard
3. Approve/reject user-submitted cars
4. Manage platform users and bookings
5. View analytics and generate reports

## 🔧 API Endpoints

All API endpoints are available at `/.netlify/functions/api/`

### Authentication
- `POST /.netlify/functions/api/user/register` - User registration
- `POST /.netlify/functions/api/user/verify-otp` - Email verification
- `POST /.netlify/functions/api/user/login` - User login

### Cars
- `GET /.netlify/functions/api/user/cars` - Get available cars
- `POST /.netlify/functions/api/owner/add-car` - Add new car
- `PUT /.netlify/functions/api/owner/car/:id` - Update car
- `DELETE /.netlify/functions/api/owner/delete-car` - Delete car

### Bookings
- `POST /.netlify/functions/api/bookings/create` - Create booking
- `GET /.netlify/functions/api/bookings/user` - Get user bookings
- `GET /.netlify/functions/api/bookings/owner` - Get owner bookings

### Admin
- `GET /.netlify/functions/api/admin/dashboard` - Admin analytics
- `GET /.netlify/functions/api/owner/pending-cars` - Pending car approvals
- `POST /.netlify/functions/api/owner/approve-reject-car` - Approve/reject cars

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and queries, contact: **rentxcars.spprt@gmail.com**

---

<p align="center">Made with ❤️ for car rental enthusiasts</p>