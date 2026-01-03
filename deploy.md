# 🚀 Deployment Guide

## Netlify Deployment Steps

### 1. Prepare for Deployment

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Build the client
cd client && npm run build && cd ..
```

### 2. Environment Variables

Set these environment variables in Netlify:

```env
MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.0w661ny.mongodb.net/RentX
JWT_SECRET=your-super-secret-jwt-key-here
EMAIL_USER=libroflow8@gmail.com
EMAIL_PASS=ayejpuwsmfrxxacs
NODE_ENV=production
```

### 3. Deploy to Netlify

1. **Connect Repository**
   - Go to Netlify dashboard
   - Click "New site from Git"
   - Connect your GitHub repository

2. **Build Settings**
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/build`

3. **Environment Variables**
   - Go to Site settings > Environment variables
   - Add all the environment variables listed above

4. **Functions Configuration**
   - The `netlify.toml` file is already configured
   - API routes will be deployed as Netlify Functions

### 4. Database Setup (MongoDB Atlas)

Your MongoDB connection is already configured:
- **Connection String**: `mongodb+srv://Manoj:Manoj@cluster0.0w661ny.mongodb.net/RentX`
- **Database**: RentX
- **User**: Manoj

### 5. Email Configuration

The app uses Gmail SMTP with the provided credentials:
- Email: libroflow8@gmail.com
- App Password: ayejpuwsmfrxxacs

These are already configured and should work after deployment.

### 6. New Features Added

#### 🚗 Vehicle Owner System
- **User Vehicle Submission**: Any user can add their vehicle with documents
- **Admin Approval**: All vehicles require admin approval before going live
- **Commission System**: Vehicle owners earn ₹200 per booking
- **Document Upload**: RC book, registration certificate, insurance, pollution certificate
- **Status Tracking**: Pending, approved, rejected status for vehicles

#### 💰 Commission Management
- **Automatic Commission**: ₹200 generated per booking for vehicle owners
- **Admin Commission Panel**: View and manage all commissions
- **Payment Tracking**: Mark commissions as paid with transaction details
- **Earnings Dashboard**: Vehicle owners can track their earnings

#### 💳 Payment Updates
- **Cash on Delivery**: Automatically marked as "paid" status
- **Payment Status**: Proper handling of cash vs online payments
- **Invoice Generation**: All bookings get PDF invoices regardless of payment method

### 7. Testing After Deployment

1. **Test Registration & OTP**
   - Register a new user
   - Check if OTP email is received
   - Verify email with OTP

2. **Test Vehicle Addition**
   - Login as regular user
   - Go to "Add Vehicle" in navbar
   - Submit vehicle with all required documents
   - Check if vehicle appears in admin panel for approval

3. **Test Admin Features**
   - Register as admin
   - Approve/reject submitted vehicles
   - View commission management
   - Check dashboard analytics

4. **Test Booking Flow**
   - Book an approved vehicle
   - Check if commission is generated for vehicle owner
   - Verify cash payments are marked as "paid"
   - Test PDF invoice generation and email delivery

### 8. Admin Panel Features

#### Vehicle Management
- **Pending Vehicles**: View all user-submitted vehicles
- **Approval System**: Approve or reject with reasons
- **Document Review**: View uploaded RC, registration, insurance documents
- **Status Updates**: Track vehicle approval status

#### Commission Management
- **Commission Dashboard**: View all pending and paid commissions
- **Payment Processing**: Mark commissions as paid
- **Transaction Tracking**: Record payment method and transaction IDs
- **Earnings Reports**: Generate commission reports

#### Enhanced Analytics
- **Vehicle Owner Stats**: Track performance of individual vehicle owners
- **Commission Analytics**: Monitor commission payments and pending amounts
- **Revenue Breakdown**: Separate platform revenue from commission payouts

### 9. User Features

#### Vehicle Owners
- **Add Vehicle**: Submit vehicle with complete documentation
- **Track Status**: Monitor approval status of submitted vehicles
- **Earnings Dashboard**: View commission earnings and booking history
- **Document Management**: Upload and manage vehicle documents

#### Regular Users
- **Browse Approved Cars**: Only see admin-approved vehicles
- **Booking System**: Same booking flow with enhanced payment handling
- **Receipt Management**: Download and resend booking receipts

### 10. File Upload Handling

The app now handles file uploads for:
- **Vehicle Images**: Multiple photos of the vehicle
- **RC Book**: Registration certificate image
- **Registration Certificate**: Official registration document
- **Insurance Certificate**: Insurance policy document
- **Pollution Certificate**: Pollution under control certificate

Files are stored in `/uploads` directory and served statically.

### 11. Commission System Flow

1. **User submits vehicle** → Status: Pending
2. **Admin approves vehicle** → Status: Approved, Available for booking
3. **Customer books vehicle** → Commission of ₹200 created for vehicle owner
4. **Admin processes commission** → Marks as paid with transaction details
5. **Vehicle owner receives payment** → Commission status updated

### 12. Database Collections

#### New Collections Added:
- **commissions**: Track all commission payments to vehicle owners
- **Enhanced cars**: Added document storage, approval status, commission tracking
- **Enhanced bookings**: Added commission tracking and improved payment status

### 13. API Endpoints Added

#### Vehicle Management
- `POST /api/cars` - Submit vehicle (any authenticated user)
- `GET /api/cars/my/vehicles` - Get user's submitted vehicles
- `GET /api/admin/pending-vehicles` - Get pending vehicles (admin)
- `PUT /api/admin/vehicles/:id/status` - Approve/reject vehicle (admin)

#### Commission Management
- `GET /api/bookings/my-earnings` - Get user's commission earnings
- `GET /api/bookings/my-vehicle-bookings` - Get bookings for user's vehicles
- `GET /api/admin/commissions` - Get all commissions (admin)
- `PUT /api/admin/commissions/:id/pay` - Mark commission as paid (admin)

### 14. Deployment Checklist

- [ ] MongoDB connection string updated
- [ ] Environment variables configured
- [ ] File upload directory created
- [ ] Vehicle submission works
- [ ] Admin approval system works
- [ ] Commission generation works
- [ ] Cash payments marked as paid
- [ ] PDF invoices generated
- [ ] Email notifications sent
- [ ] Document uploads functional
- [ ] Commission tracking works

---

**🎉 Your enhanced South India Car Rentals app is now ready with the vehicle owner system! 🎉**

Users can now:
- Submit their vehicles for approval
- Earn ₹200 commission per booking
- Track their earnings and vehicle performance
- Upload all required documents

Admins can:
- Review and approve submitted vehicles
- Manage commission payments
- Track platform performance and vehicle owner earnings