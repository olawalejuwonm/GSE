# Admin Download Page Setup

The admin download page (`/download.html`) allows authorized administrators to export all registered students as an Excel file organized by skills.

## Setup Instructions

### 1. Set Admin Password

Add the following to your `.env` file:

```env
ADMIN_PASSWORD=your_secure_password_here
```

⚠️ **Important**: Choose a strong password and keep it secure. Do not commit this to version control.

### 2. Access the Download Page

1. Navigate to: `http://your-domain.com/download.html`
2. Enter the admin password you set in the `.env` file
3. Click "Unlock" to authenticate
4. Once authenticated, you can download the Excel file

### 3. Security Features

- **Password Protection**: Page requires authentication before allowing any downloads
- **Session-Based**: Authentication state is stored in session storage (cleared when browser closes)
- **Server Validation**: Each download request verifies the password against the environment variable
- **No Password Exposure**: Password is never sent to the client or logged

## Excel File Format

The downloaded file contains:
- **One sheet per skill** (each tab represents a different skill)
- **Trainer details** at the top of each sheet (skill name, trainer name, phone)
- **Student list** below with columns:
  - Matric Number
  - Name
  - Department
  - Faculty
  - Phone
  - Email

## Troubleshooting

### "Admin access not configured" error
- Make sure `ADMIN_PASSWORD` is set in your `.env` file
- Restart the server after adding the environment variable

### "Invalid password" error
- Double-check the password in your `.env` file
- Ensure there are no extra spaces or special characters
- Password comparison is case-sensitive

### Can't access after authentication
- Clear your browser's session storage
- Try authenticating again
- Check browser console for any JavaScript errors

## Production Deployment

When deploying to production (e.g., Heroku):

1. Set the environment variable through your hosting platform's dashboard:
   ```bash
   # For Heroku
   heroku config:set ADMIN_PASSWORD=your_secure_password
   ```

2. Never commit the actual password to your repository

3. Share the password securely with authorized administrators (not via email or public channels)

## Access Control

Currently, the system uses a single shared password. For enhanced security in production:
- Consider implementing user-based authentication
- Add activity logging for download events
- Implement rate limiting to prevent brute-force attempts
- Use HTTPS to encrypt password transmission
