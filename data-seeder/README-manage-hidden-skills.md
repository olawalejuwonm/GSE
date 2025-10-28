# Hidden Skills Management Script

This script manages students who have selected hidden skills (skills with `hidden: true`). It provides functionality to:
1. Count and list students who selected hidden skills
2. Send bulk rate-limited emails to affected students
3. Remove students from hidden skills

## Prerequisites

- Node.js 20.x or later
- MongoDB connection (MONGODB_URI in .env)
- SMTP credentials for email sending (GMAIL_USER/GMAIL_PASS or ZOHO_USER/ZOHO_PASS in .env)

## Environment Variables

Required:
- `MONGODB_URI` - MongoDB connection string

For email functionality:
- `GMAIL_USER` - Gmail email address
- `GMAIL_PASS` - Gmail app password
- `ZOHO_USER` - Zoho email address (alternative to Gmail)
- `ZOHO_PASS` - Zoho password (alternative to Gmail)
- `SMTP_PROVIDER` - Set to 'gmail' or 'zoho' (optional, auto-detected)
- `GMAIL_SENDER_NAME` - Name to display in emails (default: "GSE Student Registration")
- `EMAIL_SENDER` - Email address to send from (default: GMAIL_USER or ZOHO_USER)
- `REGISTRATION_URL` - URL for students to register for new skills (optional)

## Commands

### Count Students
Lists all students who have selected hidden skills:
```bash
npx ts-node data-seeder/manage-hidden-skills.ts count
```

### Send Bulk Emails
Sends rate-limited emails to all students who selected hidden skills, asking them to register for a new skill:
```bash
npx ts-node data-seeder/manage-hidden-skills.ts send-emails
```

With dry-run (preview without sending):
```bash
npx ts-node data-seeder/manage-hidden-skills.ts send-emails --dry-run
```

### Remove Students from Hidden Skills
Removes all students from hidden skills and decrements the skill selection counts:
```bash
npx ts-node data-seeder/manage-hidden-skills.ts remove
```

### All Operations
Runs all operations in sequence (count, email, remove):
```bash
npx ts-node data-seeder/manage-hidden-skills.ts all
```

With dry-run (count and preview emails, but don't send or remove):
```bash
npx ts-node data-seeder/manage-hidden-skills.ts all --dry-run
```

## Rate Limiting

The script implements safe rate limiting to prevent email soft bounces:
- **Minimum interval**: 9 seconds between emails
- **Maximum per minute**: 5 emails
- **Automatic retry**: For rate limit errors with 2-minute wait
- **Progress tracking**: Shows real-time progress and estimated time

For large batches, the script will automatically:
1. Pause when hitting rate limits
2. Wait the required time
3. Continue sending
4. Retry failed sends automatically

## Features

### Email Template
The email sent to students includes:
- Professional HTML design with gradient header
- Clear explanation of the issue
- List of hidden skills they selected
- Call-to-action button to re-register
- Plain text alternative for email clients

### Safe Operations
- All MongoDB operations use atomic updates
- Skills' `selectedCount` is properly decremented when removing students
- Dry-run mode available for testing
- Comprehensive error handling and logging

### Progress Tracking
- Real-time progress counters (e.g., `[3/50] ✅ Email sent...`)
- Summary statistics at completion
- Estimated time calculation for bulk operations
- Per-minute rate limit tracking

## Example Workflow

1. **Check affected students**:
   ```bash
   npx ts-node data-seeder/manage-hidden-skills.ts count
   ```

2. **Preview the email campaign**:
   ```bash
   npx ts-node data-seeder/manage-hidden-skills.ts send-emails --dry-run
   ```

3. **Send emails and remove students**:
   ```bash
   npx ts-node data-seeder/manage-hidden-skills.ts all
   ```

## Notes

- Students without email addresses will be counted but not emailed
- The script ensures only students with valid emails receive notifications
- Hidden skills are identified by the `hidden: true` flag in the Skill model
- The script can safely be re-run; it only affects students currently assigned to hidden skills

## Troubleshooting

### "MONGODB_URI is not set"
Add `MONGODB_URI` to your `.env` file with your MongoDB connection string.

### "Email transporter not available"
Ensure you have either:
- `GMAIL_USER` and `GMAIL_PASS` configured, OR
- `ZOHO_USER` and `ZOHO_PASS` configured

### Rate limit errors
The script automatically handles rate limits, but if you encounter persistent issues:
- Reduce `MAX_EMAILS_PER_MINUTE` in the script (currently 5)
- Increase `MIN_SEND_INTERVAL` (currently 9000ms)

### Gmail App Password
For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.
