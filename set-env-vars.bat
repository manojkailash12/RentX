@echo off
echo Setting Netlify environment variables...

netlify env:set MONGODB_URI "mongodb+srv://Manoj:Manoj@cluster0.0w661ny.mongodb.net/RentX?retryWrites=true&w=majority"
netlify env:set JWT_SECRET "your-secret-key-here-make-it-long-and-secure"
netlify env:set EMAIL_USER "libroflow8@gmail.com"
netlify env:set EMAIL_PASS "ayejpuwsmfrxxacs"
netlify env:set NODE_ENV "production"

echo Environment variables set successfully!
echo Please redeploy your site for changes to take effect.
pause