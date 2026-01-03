# 🚗 RentX - South India Car Rental Platform

A complete full-stack car rental application built with React.js and Node.js, deployed on Netlify using serverless functions for South India covering Tamil Nadu, Karnataka, Kerala, Andhra Pradesh, and Telangana.

## 🌟 Features

### 🔐 **Authentication System**
- User registration with OTP verification
- Email-based login system
- JWT token authentication
- Role-based access (User/Admin)

### 🚗 **Car Management**
- Browse available cars with filters
- Detailed car information pages
- Image galleries with navigation
- Car availability tracking
- Vehicle owner submission system

### 📅 **Booking System**
- Complete booking flow
- Date and time selection
- Pricing calculation (per day/per km)
- Payment method selection (Cash/Online)
- Booking confirmation emails

### 📄 **PDF & Email System**
- Automated PDF receipt generation
- Email delivery with PDF attachments
- Booking confirmation emails
- OTP verification emails

### 👨‍💼 **Admin Panel**
- Dashboard with analytics
- User management
- Car approval system
- Booking oversight
- Commission management
- Excel report generation

### 💰 **Commission System**
- Vehicle owner earnings tracking
- Automatic commission calculation (₹200 per booking)
- Payment processing and tracking
- Earnings dashboard for vehicle owners

### 📱 **Mobile Responsive**
- Fully responsive design
- Touch-friendly interface
- Mobile-optimized admin panel
- Progressive Web App features

## 🌍 Coverage Areas

### States Covered
- **Tamil Nadu**: Chennai, Coimbatore, Madurai, Salem, and more
- **Karnataka**: Bangalore, Mysore, Mangalore, Hubli, and more
- **Kerala**: Kochi, Thiruvananthapuram, Kozhikode, Thrissur, and more
- **Andhra Pradesh**: Visakhapatnam, Vijayawada, Guntur, Tirupati, and more
- **Telangana**: Hyderabad, Warangal, Nizamabad, Khammam, and more

## 🛠️ Technology Stack

### **Frontend**
- React.js 18
- React Router DOM
- Axios for API calls
- React Toastify for notifications
- CSS3 with responsive design

### **Backend (Serverless)**
- Node.js with Express.js
- Netlify Functions (Serverless)
- MongoDB Atlas (Database)
- JWT Authentication
- Nodemailer (Email service)

### **PDF & Reports**
- Puppeteer with chrome-aws-lambda
- ExcelJS for Excel generation
- HTML to PDF conversion

### **Deployment**
- Netlify (Frontend + Serverless Backend)
- MongoDB Atlas (Database)
- Gmail SMTP (Email service)

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- MongoDB Atlas account
- Gmail account with app password

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/manojkailash12/RentX.git
cd RentX
```

2. **Install dependencies**
```bash
# Install root dependencies (serverless functions)
npm install

# Install client dependencies
cd client
npm install
cd ..
```

3. **Environment Setup**
Create `.env` file in root directory:
```env
MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.0w661ny.mongodb.net/RentX
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=libroflow8@gmail.com
EMAIL_PASS=ayejpuwsmfrxxacs
NODE_ENV=development
```

4. **Development**
```bash
# Start development server (Netlify Dev)
npm run dev

# Or start client only
cd client && npm start
```

5. **Build for Production**
```bash
npm run build:all
```

## 📦 Deployment

### Netlify Deployment (Recommended)

1. **Install Netlify CLI**
```bash
npm install -g netlify-cli
```

2. **Login and Deploy**
```bash
netlify login
netlify init
netlify deploy --prod
```

3. **Set Environment Variables**
In Netlify Dashboard > Site Settings > Environment Variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `EMAIL_USER`
- `EMAIL_PASS`
- `NODE_ENV=production`

For detailed deployment instructions, see [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)

## 📁 Project Structure

```
RentX/
├── client/                     # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── contexts/          # React contexts
│   │   ├── pages/             # Page components
│   │   └── assets/            # Static assets
│   └── package.json
├── netlify/
│   └── functions/             # Serverless functions
│       ├── api.js             # Main API handler
│       ├── generate-pdf.js    # PDF generation
│       ├── generate-excel.js  # Excel reports
│       └── upload.js          # File uploads
├── routes/                    # Express routes
├── models/                    # MongoDB models
├── utils/                     # Utility functions
├── middleware/                # Custom middleware
├── netlify.toml              # Netlify configuration
├── package.json              # Root dependencies
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/login` - User login
- `POST /api/auth/resend-otp` - Resend OTP

### Cars
- `GET /api/cars` - Get all cars
- `GET /api/cars/:id` - Get car details
- `POST /api/cars` - Add new car (authenticated)

### Bookings
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:id/download-receipt` - Download PDF receipt

### Admin
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - Get all users
- `GET /api/admin/pending-vehicles` - Get pending vehicles
- `PUT /api/admin/vehicles/:id/status` - Approve/reject vehicle

### Serverless Functions
- `/.netlify/functions/api/*` - Main API routes
- `/.netlify/functions/generate-pdf/:id` - PDF generation
- `/.netlify/functions/generate-excel?type=bookings` - Excel reports
- `/.netlify/functions/upload` - File uploads

## 🎨 Features Showcase

### User Features
- **Car Browsing**: Filter by location, type, price range
- **Booking System**: Complete booking flow with date selection
- **My Bookings**: View and manage bookings with PDF downloads
- **Profile Management**: Update profile and view booking history

### Vehicle Owner Features
- **Add Vehicle**: Submit cars for admin approval
- **Earnings Dashboard**: Track commission earnings
- **Document Upload**: Upload required vehicle documents
- **Status Tracking**: Monitor approval status

### Admin Features
- **Dashboard Analytics**: User, car, and booking statistics
- **Vehicle Management**: Approve/reject submitted vehicles
- **User Management**: View and manage user accounts
- **Commission Management**: Process vehicle owner payments
- **Report Generation**: Download Excel reports

## 📧 Email Templates

The application includes beautiful email templates for:
- **OTP Verification**: Secure registration process
- **Booking Confirmation**: Detailed booking information
- **PDF Receipts**: Professional invoice attachments
- **Admin Notifications**: System alerts and updates

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured CORS for API security
- **Environment Variables**: Secure configuration management

## 📱 Mobile Experience

- **Responsive Design**: Works perfectly on all devices
- **Touch Optimized**: Mobile-friendly interactions
- **Fast Loading**: Optimized for mobile networks
- **PWA Ready**: Progressive Web App capabilities

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Manoj Kailash**
- GitHub: [@manojkailash12](https://github.com/manojkailash12)
- Email: libroflow8@gmail.com

## 🙏 Acknowledgments

- React.js team for the amazing framework
- MongoDB for the robust database solution
- Netlify for seamless serverless deployment
- All contributors and users of this project

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Deployment Checklist](./DEPLOYMENT-CHECKLIST.md)
2. Review the [Setup Guide](./netlify-functions-setup.md)
3. Open an issue on GitHub
4. Contact: libroflow8@gmail.com

---

**🚗 Happy Car Rental! Drive safe and enjoy your journey across South India! 🌴**