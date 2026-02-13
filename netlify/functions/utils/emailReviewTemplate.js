// Email-compatible review form template (no JavaScript, works in most email clients)
const generateReviewEmailHTML = (bookingDetails, email) => {
  // Use environment variable or construct URL based on environment
  const baseUrl = process.env.FRONTEND_URL || 
                  process.env.URL || 
                  (process.env.NODE_ENV === 'production' 
                    ? 'https://rentx-netlify.netlify.app' 
                    : 'http://localhost:8888');
  
  const apiUrl = `${baseUrl}/.netlify/functions/api`;
  const submitUrl = `${apiUrl}/reviews/submit-from-email`;
  
  console.log('📧 Review email URL:', submitUrl);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leave a Review - RentX</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 20px; padding: 40px; max-width: 600px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="font-size: 32px; font-weight: 700; color: #1a1a1a; margin: 0 0 10px 0;">Leave a review</h1>
            </td>
          </tr>
          
          <!-- Booking Info -->
          <tr>
            <td style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #667eea; margin-bottom: 30px;">
              <h3 style="color: #667eea; font-size: 16px; margin: 0 0 12px 0;">Your Booking Details</h3>
              <table width="100%" cellpadding="6" cellspacing="0" border="0">
                <tr>
                  <td style="color: #666; font-weight: 500; font-size: 14px;">Booking ID:</td>
                  <td align="right" style="color: #1a1a1a; font-weight: 600; font-size: 14px;">${bookingDetails.bookingId}</td>
                </tr>
                <tr>
                  <td style="color: #666; font-weight: 500; font-size: 14px;">Vehicle:</td>
                  <td align="right" style="color: #1a1a1a; font-weight: 600; font-size: 14px;">${bookingDetails.carName}</td>
                </tr>
                <tr>
                  <td style="color: #666; font-weight: 500; font-size: 14px;">Rental Period:</td>
                  <td align="right" style="color: #1a1a1a; font-weight: 600; font-size: 14px;">${new Date(bookingDetails.pickupDate).toLocaleDateString()} - ${new Date(bookingDetails.returnDate).toLocaleDateString()}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Review Form -->
          <tr>
            <td style="padding: 20px 0;">
              <form action="${submitUrl}" method="POST" style="margin: 0;">
                <input type="hidden" name="bookingId" value="${bookingDetails.bookingId}">
                <input type="hidden" name="carId" value="${bookingDetails.carId}">
                <input type="hidden" name="userEmail" value="${email}">
                
                <!-- Star Rating -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding: 20px 0;">
                      <h2 style="font-size: 18px; color: #1a1a1a; margin: 0 0 15px 0;">Click the stars to rate us <span style="color: #ef4444;">*</span></h2>
                      <div style="font-size: 0; line-height: 0;">
                        <label style="display: inline-block; cursor: pointer; font-size: 48px; color: #ddd; margin: 0 4px;">
                          <input type="radio" name="rating" value="1" required style="display: none;">
                          <span style="color: #fbbf24;">★</span>
                        </label>
                        <label style="display: inline-block; cursor: pointer; font-size: 48px; color: #ddd; margin: 0 4px;">
                          <input type="radio" name="rating" value="2" required style="display: none;">
                          <span style="color: #fbbf24;">★</span>
                        </label>
                        <label style="display: inline-block; cursor: pointer; font-size: 48px; color: #ddd; margin: 0 4px;">
                          <input type="radio" name="rating" value="3" required style="display: none;">
                          <span style="color: #fbbf24;">★</span>
                        </label>
                        <label style="display: inline-block; cursor: pointer; font-size: 48px; color: #ddd; margin: 0 4px;">
                          <input type="radio" name="rating" value="4" required style="display: none;">
                          <span style="color: #fbbf24;">★</span>
                        </label>
                        <label style="display: inline-block; cursor: pointer; font-size: 48px; color: #ddd; margin: 0 4px;">
                          <input type="radio" name="rating" value="5" required style="display: none;">
                          <span style="color: #fbbf24;">★</span>
                        </label>
                      </div>
                    </td>
                  </tr>
                </table>
                
                <!-- Review Text -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 25px 0;">
                  <tr>
                    <td>
                      <label style="display: block; font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 10px;">
                        Review <span style="color: #ef4444;">*</span>
                      </label>
                      <textarea 
                        name="comment" 
                        required 
                        minlength="10"
                        placeholder="I was super surprised with the quality of the products. The delivery experience and service were top-notch, too! I will recommend your company to all my friends. Thank you!"
                        style="width: 100%; min-height: 120px; padding: 15px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 15px; font-family: inherit; resize: vertical; box-sizing: border-box;"
                      ></textarea>
                    </td>
                  </tr>
                </table>
                
                <!-- Submit Button -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding: 20px 0;">
                      <input 
                        type="submit" 
                        value="Submit review"
                        style="width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer;"
                      >
                    </td>
                  </tr>
                </table>
                
                <p style="text-align: center; color: #666; font-size: 13px; margin: 15px 0 0 0;">* Required fields</p>
              </form>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-weight: 600; color: #1a1a1a;">RentX Car Rental Platform</p>
              <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">Your trusted partner for car rentals</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = { generateReviewEmailHTML };
