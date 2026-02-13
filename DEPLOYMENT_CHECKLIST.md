# Deployment Checklist - Employee Attendance Fix

## Pre-Deployment Verification

### ✅ Code Changes
- [x] Updated `netlify.toml` with employee-attendance redirects
- [x] Fixed API calls in `Attendance.jsx` to use relative paths
- [x] Added auto-creation of Employee records in controller
- [x] Improved error handling and logging

### ✅ Configuration Files
- [x] `.env.production` has correct environment variables
- [x] `netlify.toml` has all necessary redirects
- [x] No syntax errors in modified files

## Deployment Steps

1. **Commit Changes**
   ```bash
   cd rentx-netlify
   git add .
   git commit -m "Fix: Employee attendance endpoints for Netlify production"
   git push origin main
   ```

2. **Monitor Deployment**
   - Go to Netlify Dashboard
   - Watch the deployment logs
   - Wait for "Published" status

3. **Verify Deployment**
   - Check deployment URL is live
   - Open browser console (F12)
   - Navigate to `/employee/attendance`

## Post-Deployment Testing

### Test 1: Page Load
- [ ] Navigate to `/employee/attendance`
- [ ] Page loads without errors
- [ ] No "Failed to fetch attendance status" error
- [ ] No "API endpoint not found" error

### Test 2: Today's Status
- [ ] Today's date is displayed
- [ ] Shift timing is shown (if employee record exists)
- [ ] Check In button is visible
- [ ] No console errors

### Test 3: Check In
- [ ] Click "Check In" button
- [ ] Success toast message appears
- [ ] Check In time is displayed
- [ ] Status changes to "present" or "late"
- [ ] Check Out button becomes visible

### Test 4: Check Out
- [ ] Click "Check Out" button
- [ ] Success toast message appears
- [ ] Check Out time is displayed
- [ ] Work duration is calculated
- [ ] "Day Complete" message appears

### Test 5: Attendance History
- [ ] Select a month and year
- [ ] Attendance records are displayed in table
- [ ] Data shows correct dates, times, and status

## Troubleshooting

### If 404 Error Persists
1. Check Netlify function logs
2. Verify redirect rules are deployed
3. Clear browser cache
4. Try in incognito mode

### If "Employee not found" Error
1. Check if user has "employee" role
2. Auto-creation should handle this
3. Check function logs for creation errors
4. Manually create employee record via admin panel

### If Database Connection Issues
1. Verify MONGODB_URI in Netlify environment variables
2. Check MongoDB Atlas network access (allow all IPs: 0.0.0.0/0)
3. Verify database user credentials

## Environment Variables to Verify in Netlify

Go to: Site Settings → Environment Variables

Required variables:
- [ ] `MONGODB_URI`
- [ ] `JWT_SECRET`
- [ ] `EMAIL_USER`
- [ ] `EMAIL_PASS`
- [ ] `EMAIL_SERVICE`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `NODE_ENV=production`

## Success Criteria

✅ All tests pass
✅ No console errors
✅ Attendance can be marked successfully
✅ History displays correctly
✅ Auto-creation of employee records works

## Rollback Plan

If issues occur:
1. Revert the commit: `git revert HEAD`
2. Push: `git push origin main`
3. Wait for Netlify to redeploy
4. Investigate issues in local environment

## Support

If you encounter issues:
1. Check Netlify function logs
2. Check browser console errors
3. Verify all environment variables
4. Test in local environment first
