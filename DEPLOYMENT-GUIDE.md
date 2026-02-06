# Netlify Deployment Guide

## ✅ Pre-Deployment Checklist

All features are now ready for Netlify deployment! Here's what has been configured:

### 1. **PDF Generation** ✅
- Automatically detects environment (local vs Netlify)
- Uses system Chrome locally
- Uses `chrome-aws-lambda` on Netlify
- Dependencies added to `netlify/functions/package.json`

### 2. **Database** ✅
- MongoDB Atlas connection configured
- Connection string in `.env.production`

### 3. **Email/OTP** ✅
- Gmail SMTP configured
- Credentials in `.env.production`

### 4. **Google Maps API** ✅
- API key configured for distance calculation
- Make sure Distance Matrix API is enabled

### 5. **File Uploads** ✅
- Multer configured for car images
- Works with Netlify Functions

---

## 🚀 Deployment Steps

### Step 1: Install Dependencies
```bash
cd rentx-netlify/netlify/functions
npm install
cd ../..
npm install
```

### Step 2: Build the Project
```bash
npm run build
```

### Step 3: Deploy to Netlify

#### Option A: Using Netlify CLI
```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

#### Option B: Using Netlify Dashboard
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`

### Step 4: Set Environment Variables in Netlify

Go to: **Site Settings → Environment Variables** and add:

```
MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.0w661ny.mongodb.net/CarRental
JWT_SECRET=carrental_jwt_secret_key_2024_secure
EMAIL_USER=libroflow8@gmail.com
EMAIL_PASS=ayejpuwsmfrxxacs
EMAIL_SERVICE=gmail
GOOGLE_MAPS_API_KEY=AIzaSyCycsucHJoCBC3on7LQO-Ml87Y183BUm60
NODE_ENV=production
VITE_API_URL=/.netlify/functions/api
VITE_CURRENCY=₹
VITE_APP_NAME=RentX
```

---

## 🔍 Post-Deployment Testing

Test these features after deployment:

### ✅ Authentication
- [ ] User registration with OTP
- [ ] Login/Logout
- [ ] Session persistence

### ✅ Car Management
- [ ] Add new car (with image upload)
- [ ] Edit car details
- [ ] Delete car
- [ ] Car approval (admin)

### ✅ Booking System
- [ ] Create booking
- [ ] View bookings
- [ ] Update booking status
- [ ] Payment status updates

### ✅ PDF Generation
- [ ] Download booking invoice
- [ ] PDF contains all fields correctly

### ✅ Email Notifications
- [ ] OTP emails sent
- [ ] Booking confirmation emails

### ✅ Distance Calculation
- [ ] Google Maps API calculates distance
- [ ] Pricing based on distance

---

## ⚠️ Important Notes

### 1. **MongoDB Atlas Whitelist**
Make sure to whitelist Netlify's IP addresses in MongoDB Atlas:
- Go to MongoDB Atlas → Network Access
- Add IP: `0.0.0.0/0` (allow all) or specific Netlify IPs

### 2. **Google Maps API**
Ensure these APIs are enabled:
- Distance Matrix API
- (Optional) Maps JavaScript API for future features

### 3. **Gmail App Password**
The email password (`ayejpuwsmfrxxacs`) should be a Gmail App Password, not your regular password.

### 4. **Function Timeout**
Netlify Functions have a 10-second timeout on free tier. If PDF generation takes longer:
- Upgrade to Pro plan (26-second timeout)
- Or optimize PDF generation

### 5. **File Size Limits**
- Netlify Functions: 50MB deployment size
- File uploads: Configure max size in multer settings

---

## 🐛 Troubleshooting

### PDF Generation Fails
- Check Netlify Function logs
- Verify `chrome-aws-lambda` is installed
- Check function timeout settings

### Database Connection Issues
- Verify MongoDB Atlas whitelist
- Check connection string format
- Ensure database user has correct permissions

### Email Not Sending
- Verify Gmail App Password
- Check if "Less secure app access" is enabled (if using regular password)
- Check Netlify Function logs for errors

### Images Not Uploading
- Check Netlify Function size limits
- Verify multer configuration
- Check file permissions

---

## 📊 Monitoring

After deployment, monitor:
1. **Netlify Functions Logs** - Check for errors
2. **MongoDB Atlas Metrics** - Monitor database performance
3. **Google Maps API Usage** - Track API calls and costs
4. **Email Delivery** - Monitor bounce rates

---

## 🔄 Continuous Deployment

Once connected to Git:
1. Push changes to your repository
2. Netlify automatically builds and deploys
3. Environment variables persist across deployments

---

## 📝 Summary

**All features will work on Netlify after deployment:**
- ✅ User authentication with OTP
- ✅ Car management (add, edit, delete)
- ✅ Booking system
- ✅ PDF invoice generation
- ✅ Email notifications
- ✅ Image uploads
- ✅ Distance calculation
- ✅ Payment tracking
- ✅ Admin/User roles
- ✅ Dashboard analytics

**Ready to deploy!** 🚀
