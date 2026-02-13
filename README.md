# 🚗 RentX - Car Rental Platform

A comprehensive car rental platform built with React, Node.js, Express, and MongoDB, deployed on Netlify.

## 🌟 Recent Updates

### Latest Fixes (February 2026)
- ✅ **Attendance Timezone Fix** - Check-in times now display correctly in IST (10:20 AM shows as 10:20 AM, not 5:20 AM)
- ✅ **Page Refresh Error Fix** - Fixed "Something went wrong" error on attendance page refresh
- ✅ **Employee Role Restrictions** - Removed "My Bookings" page access from employee role
- ✅ **Cloudinary Image Support** - Fixed car images not displaying in production with proper Cloudinary integration
- ✅ **Error Boundary** - Added global error handling for better user experience
- ✅ **Improved Loading States** - Better null checks and loading indicators

## 🌟 Features

### Core Features
- **User Authentication** - Register, login, OTP verification, password reset
- **Car Management** - Add, edit, delete cars with image uploads
- **Booking System** - Create bookings, manage reservations, track payments
- **Reviews & Ratings** - User reviews with owner responses
- **Real-time Chat** - Communication between users and owners
- **Multi-language Support** - English, Telugu, Hindi, Tamil

### Employee Management
- **Attendance Tracking** - Clock in/out with biometric support
- **Leave Management** - Request and approve leave
- **Payroll System** - Automated salary calculations and payslips
- **Shift Scheduling** - Manage employee shifts
- **Performance Reviews** - Track employee performance
- **Training Management** - Employee training and certifications

### Admin Features
- **Dashboard Analytics** - Comprehensive business insights
- **User Management** - Manage all users and roles
- **Car Approval System** - Review and approve car listings
- **Report Generation** - Export data in PDF and Excel formats
- **Support Tickets** - Customer support management

### Advanced Features
- **Loyalty Program** - Points and rewards system
- **Insurance Plans** - Multiple insurance options
- **GPS Tracking** - Real-time vehicle tracking
- **Dynamic Pricing** - AI-powered pricing optimization
- **AI Recommendations** - Personalized car suggestions
- **Predictive Maintenance** - Vehicle maintenance alerts
- **EV Charging Stations** - Find nearby charging stations
- **Smart Contracts** - Blockchain-based agreements

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **i18next** - Internationalization
- **Chart.js** - Data visualization
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email service
- **Multer** - File uploads
- **Cloudinary** - Image storage

### Deployment
- **Netlify** - Hosting and serverless functions
- **MongoDB Atlas** - Cloud database
- **Cloudinary** - CDN for images

## 📋 Prerequisites

- Node.js 20 or higher
- MongoDB Atlas account
- Cloudinary account
- Gmail account for OTP emails
- Google Maps API key

## 🚀 Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd rentx-netlify
```

### 2. Install dependencies
```bash
npm install
cd netlify/functions
npm install
cd ../..
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_SERVICE=gmail

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# App Configuration
NODE_ENV=development
FRONTEND_URL=http://localhost:8888
URL=http://localhost:8888

# Vite Configuration
VITE_API_URL=/.netlify/functions/api
VITE_CURRENCY=₹
VITE_APP_NAME=RentX
```

### 4. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:8888`

## 📦 Build for Production

```bash
npm run build
```

## 🌐 Netlify Deployment

### 1. Connect to Netlify
1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Netlify](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your repository

### 2. Build Settings
- **Build command**: `cd netlify/functions && npm install && cd ../.. && npm install && npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### 3. Environment Variables
Add all environment variables from your `.env` file in:
**Site settings → Environment variables**

Important: Update `FRONTEND_URL` and `URL` with your actual Netlify URL after first deployment.

### 4. Deploy
Click "Deploy site" and wait for the build to complete.

## 📱 User Roles

### User
- Browse and search cars
- Create bookings
- Make payments
- Leave reviews
- Chat with owners
- Track GPS location
- Earn loyalty points

### Owner
- List cars for rent
- Manage bookings
- Respond to reviews
- View earnings
- Chat with renters
- Track car performance

### Employee
- Clock in/out
- Request leave
- View payroll
- Manage shifts
- Handle support tickets
- Process bookings

### Admin
- Full system access
- Approve cars
- Manage users
- View analytics
- Generate reports
- Configure pricing
- Manage employees

## 🔧 Configuration

### Email Setup (Gmail)
1. Enable 2-factor authentication
2. Generate app password: [Google Account Settings](https://myaccount.google.com/apppasswords)
3. Use app password in `EMAIL_PASS`

### Google Maps Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Distance Matrix API
3. Create API key
4. Add to `GOOGLE_MAPS_API_KEY`

### Cloudinary Setup
1. Sign up at [Cloudinary](https://cloudinary.com)
2. Get credentials from dashboard
3. Add to environment variables

### MongoDB Atlas Setup
1. Create cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Whitelist IP: `0.0.0.0/0` (for Netlify)
3. Create database user
4. Get connection string

## 📊 Database Collections

- **users** - User accounts
- **cars** - Car listings
- **bookings** - Rental bookings
- **reviews** - Car reviews
- **conversations** - Chat messages
- **employees** - Employee records
- **attendance** - Attendance logs
- **leave** - Leave requests
- **payroll** - Salary records
- **schedules** - Shift schedules
- **loyaltyPrograms** - Loyalty points
- **insurances** - Insurance plans
- **gpsTracking** - GPS data
- **pricingRules** - Dynamic pricing
- **maintenanceAlerts** - Maintenance records
- **chargingStations** - EV charging locations
- **smartContracts** - Contract records
- **supportTickets** - Support requests

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- OTP verification for registration
- Session management
- Role-based access control
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

## 📈 Performance Optimizations

- Image optimization with Cloudinary
- Database indexing
- Query optimization
- Caching strategies
- Code splitting
- Lazy loading
- CDN for static assets
- Serverless functions

## 🧪 Testing

Run diagnostics:
```bash
npm run lint
```

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to Netlify
- `npm run lint` - Run ESLint

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version (20+)
- Verify all dependencies installed
- Check environment variables

### Database Connection Issues
- Verify MongoDB URI
- Check IP whitelist
- Ensure database user has permissions

### File Upload Issues
- Verify Cloudinary credentials
- Check file size limits (5MB)
- Ensure proper CORS configuration

### Email Not Sending
- Verify Gmail app password
- Check email service configuration
- Ensure 2FA enabled on Gmail

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For support, email support@rentx.com or create an issue in the repository.

## 🙏 Acknowledgments

- React team for the amazing framework
- Netlify for serverless hosting
- MongoDB for the database
- Cloudinary for image management
- All open-source contributors

---

**Built with ❤️ by the RentX Team**
