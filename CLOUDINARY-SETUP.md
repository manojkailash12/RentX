# Cloudinary Setup Guide for RentX

## Why Cloudinary?

Netlify Functions use ephemeral storage (`/tmp`), which means uploaded files are deleted after each function invocation. To persist car images and user profile pictures, we need cloud storage. Cloudinary is a free, reliable solution for image hosting.

## Step 1: Create Cloudinary Account

1. Go to [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Sign up for a **FREE account** (no credit card required)
3. Verify your email address

## Step 2: Get Your Credentials

After logging in:

1. Go to your **Dashboard**: [https://cloudinary.com/console](https://cloudinary.com/console)
2. You'll see your credentials:
   - **Cloud Name** (e.g., `dxyz123abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (click "Reveal" to see it)

## Step 3: Add to Netlify Environment Variables

1. Go to your Netlify site dashboard
2. Navigate to: **Site Settings → Environment Variables**
3. Add these three variables:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Example:**
```
CLOUDINARY_CLOUD_NAME=dxyz123abc
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

## Step 4: Redeploy Your Site

After adding the environment variables:
1. Go to **Deploys** tab
2. Click **Trigger deploy → Deploy site**
3. Wait for deployment to complete

## Step 5: Test Image Upload

1. Go to your deployed site
2. Login as admin or user
3. Try adding a new car with an image
4. The image should now be visible!

## How It Works

### Before (Local Storage - Doesn't Work on Netlify)
```
User uploads image → Saved to /tmp/uploads → ❌ Deleted after function ends
```

### After (Cloudinary - Works on Netlify)
```
User uploads image → Uploaded to Cloudinary → ✅ Permanent URL returned → Saved to database
```

## Cloudinary Free Tier Limits

- **Storage:** 25 GB
- **Bandwidth:** 25 GB/month
- **Transformations:** 25,000/month
- **Images:** Unlimited

This is more than enough for a car rental platform!

## Folder Structure on Cloudinary

Your images will be organized as:
```
rentx/
├── cars/          # Car images
└── users/         # User profile pictures
```

## Image Optimization

Cloudinary automatically:
- ✅ Optimizes image size
- ✅ Converts to best format (WebP when supported)
- ✅ Provides CDN delivery (fast loading worldwide)
- ✅ Generates thumbnails on-the-fly

## Troubleshooting

### Images Still Not Showing?

1. **Check Environment Variables**
   - Go to Netlify → Site Settings → Environment Variables
   - Verify all three Cloudinary variables are set correctly
   - No typos in variable names

2. **Check Cloudinary Dashboard**
   - Go to [https://cloudinary.com/console/media_library](https://cloudinary.com/console/media_library)
   - Look for `rentx/cars` folder
   - Images should appear here after upload

3. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for image loading errors
   - Check if URLs are correct

4. **Redeploy**
   - Sometimes you need to trigger a fresh deploy after adding env variables
   - Go to Deploys → Trigger deploy → Clear cache and deploy site

### Getting 401 Unauthorized Error?

- Your API credentials are incorrect
- Double-check Cloud Name, API Key, and API Secret
- Make sure there are no extra spaces

### Images Upload But Don't Display?

- Check if the image URL in the database starts with `https://res.cloudinary.com/`
- If it starts with `/uploads/` or `/tmp/`, Cloudinary is not configured properly

## Alternative: Use Existing Images

If you don't want to set up Cloudinary right now, you can:

1. Use placeholder images from [https://placeholder.com/](https://placeholder.com/)
2. Use direct image URLs from other sources
3. Set up Cloudinary later (recommended for production)

## Cost Considerations

- **Free tier is sufficient** for most small to medium car rental businesses
- If you exceed limits, Cloudinary has affordable paid plans starting at $89/month
- You can monitor usage in the Cloudinary dashboard

## Security

- ✅ API Secret is never exposed to the client
- ✅ All uploads go through your backend
- ✅ Cloudinary provides secure HTTPS URLs
- ✅ You can set upload restrictions (file size, format, etc.)

## Support

If you need help:
- Cloudinary Docs: [https://cloudinary.com/documentation](https://cloudinary.com/documentation)
- Cloudinary Support: [https://support.cloudinary.com/](https://support.cloudinary.com/)

---

**Ready to deploy!** Once you add the Cloudinary credentials to Netlify, all image uploads will work perfectly. 🚀
