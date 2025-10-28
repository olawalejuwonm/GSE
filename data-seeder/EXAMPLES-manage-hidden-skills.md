# Hidden Skills Management Script - Usage Examples

This document provides practical examples of using the `manage-hidden-skills.ts` script.

## Prerequisites

Ensure your `.env` file contains:
```env
MONGODB_URI=mongodb://your-connection-string
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
GMAIL_SENDER_NAME=GSE Student Registration
REGISTRATION_URL=https://your-registration-url.com
```

## Example Outputs

### 1. Count Command

Shows all students with hidden skills:

```bash
$ npx ts-node data-seeder/manage-hidden-skills.ts count
```

**Expected Output:**
```
✅ Connected to MongoDB

📊 Counting students with hidden skills...

Found 3 hidden skills: Indoor Catering Service, Bead Making & Wire Works, Glass blowing
Found 15 students with hidden skills and valid emails.

📈 Summary:
  Total students with hidden skills: 15

  Students:
    1. John Doe (20/0001) - john.doe@gmail.com
       Hidden skills: Indoor Catering Service
    2. Jane Smith (20/0002) - jane.smith@yahoo.com
       Hidden skills: Bead Making & Wire Works, Glass blowing
    ... (13 more students)

✅ Operation completed successfully.
🔌 Disconnected from MongoDB
```

### 2. Send Emails (Dry Run)

Preview what emails would be sent without actually sending:

```bash
$ npx ts-node data-seeder/manage-hidden-skills.ts send-emails --dry-run
```

**Expected Output:**
```
✅ Connected to MongoDB

📧 Sending emails to students with hidden skills...

Found 3 hidden skills: Indoor Catering Service, Bead Making & Wire Works, Glass blowing
Found 15 students with hidden skills and valid emails.

📧 [DRY RUN] Sending emails to 15 students...
⏱️  Estimated time: ~3 minutes

[1/15] [DRY RUN] Would send email to: john.doe@gmail.com (John Doe)
[2/15] [DRY RUN] Would send email to: jane.smith@yahoo.com (Jane Smith)
... (13 more)

📊 Email sending complete:
  ✅ Success: 0
  ❌ Failed: 0
  📧 Total: 15

✅ Operation completed successfully.
🔌 Disconnected from MongoDB
```

### 3. Send Emails (Actual)

Send emails to all affected students:

```bash
$ npx ts-node data-seeder/manage-hidden-skills.ts send-emails
```

**Expected Output:**
```
✅ Connected to MongoDB

📧 Sending emails to students with hidden skills...

Found 3 hidden skills: Indoor Catering Service, Bead Making & Wire Works, Glass blowing
Found 15 students with hidden skills and valid emails.

📧 Sending emails to 15 students...
⏱️  Estimated time: ~3 minutes

Using Gmail SMTP for email sending.
✅ Email sent: <20231120123456.1.abc@gmail.com> (1/5 this minute)
[1/15] ✅ Email sent to: john.doe@gmail.com (John Doe)
⏳ Waiting 9s before sending...
✅ Email sent: <20231120123505.2.def@gmail.com> (2/5 this minute)
[2/15] ✅ Email sent to: jane.smith@yahoo.com (Jane Smith)
... (13 more)

📊 Email sending complete:
  ✅ Success: 15
  ❌ Failed: 0
  📧 Total: 15

✅ Operation completed successfully.
🔌 Disconnected from MongoDB
```

### 4. Remove Students

Remove all students from hidden skills:

```bash
$ npx ts-node data-seeder/manage-hidden-skills.ts remove
```

**Expected Output:**
```
✅ Connected to MongoDB

🗑️  Removing students from hidden skills...

Found 3 hidden skills to remove from students.
Found 15 students with hidden skills.
✅ Removed 1 hidden skill(s) from John Doe (20/0001)
✅ Removed 2 hidden skill(s) from Jane Smith (20/0002)
... (13 more)
📉 Decremented selectedCount for "Indoor Catering Service" (GSE301-001) by 8
📉 Decremented selectedCount for "Bead Making & Wire Works" (GSE301-002) by 5
📉 Decremented selectedCount for "Glass blowing" (GSE301-003) by 4

✅ Removed hidden skills from 15 students.

✅ Operation completed successfully.
🔌 Disconnected from MongoDB
```

### 5. All Operations

Run all operations in sequence (recommended workflow):

```bash
$ npx ts-node data-seeder/manage-hidden-skills.ts all --dry-run
```

**Expected Output:**
```
✅ Connected to MongoDB

🚀 Running all operations...

Step 1: Counting students with hidden skills...
Found 3 hidden skills: Indoor Catering Service, Bead Making & Wire Works, Glass blowing
Found 15 students with hidden skills and valid emails.

Found 15 students with hidden skills.

Step 2: Sending emails...

📧 [DRY RUN] Sending emails to 15 students...
⏱️  Estimated time: ~3 minutes

[1/15] [DRY RUN] Would send email to: john.doe@gmail.com (John Doe)
... (14 more)

📊 Email sending complete:
  ✅ Success: 0
  ❌ Failed: 0
  📧 Total: 15

[DRY RUN] Skipping removal. Run without --dry-run to actually remove.

✅ Operation completed successfully.
🔌 Disconnected from MongoDB
```

## Email Template Preview

Students receive a professional HTML email like this:

```
┌──────────────────────────────────────────────┐
│  Important: Skill Re-registration Required   │  (Purple gradient header)
├──────────────────────────────────────────────┤
│ Hello John Doe,                              │
│                                              │
│ We noticed that you registered for the      │
│ following skill(s) that are no longer        │
│ available:                                   │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │ • Indoor Catering Service            │    │
│ └──────────────────────────────────────┘    │
│                                              │
│ Action Required: Please log in to the       │
│ registration portal to select a new skill   │
│ from the available options.                 │
│                                              │
│ Your previous skill selection has been      │
│ removed, and you will need to register for  │
│ a new skill to complete your enrollment.    │
│                                              │
│         [ Register for New Skill ]          │  (Button)
│                                              │
│ If you have any questions, please contact   │
│ the GSE office.                             │
├──────────────────────────────────────────────┤
│      GSE Student Registration System        │
└──────────────────────────────────────────────┘
```

## Rate Limiting in Action

When sending to many students, you'll see rate limiting:

```
[5/50] ✅ Email sent to: student5@gmail.com (Student 5)
⏳ Rate limit reached. Waiting 55s before sending...
[6/50] ✅ Email sent to: student6@gmail.com (Student 6)
⏳ Waiting 9s before sending...
[7/50] ✅ Email sent to: student7@gmail.com (Student 7)
```

## Error Handling

### Rate Limit Retry
```
❌ Failed to send email to student@gmail.com: 4.7.28 Daily sending quota exceeded
⏳ Gmail rate limit detected. Waiting 2 minutes...
✅ Email sent successfully after rate limit wait: <message-id>
```

### Invalid Email
```
❌ Failed to send to invalid@domain: ENOTFOUND domain
[5/50] ❌ Failed to send to invalid@domain: Error: ENOTFOUND
```

## Common Workflows

### Workflow 1: Safe Testing
```bash
# 1. Check who would be affected
npx ts-node data-seeder/manage-hidden-skills.ts count

# 2. Preview emails
npx ts-node data-seeder/manage-hidden-skills.ts send-emails --dry-run

# 3. Send emails and remove (if satisfied with preview)
npx ts-node data-seeder/manage-hidden-skills.ts all
```

### Workflow 2: Email Only
```bash
# Send emails but don't remove students yet
npx ts-node data-seeder/manage-hidden-skills.ts send-emails

# Later, after students have re-registered:
npx ts-node data-seeder/manage-hidden-skills.ts remove
```

### Workflow 3: Just Remove
```bash
# Remove students without emailing (if already notified via other means)
npx ts-node data-seeder/manage-hidden-skills.ts remove
```

## Tips

1. **Always test with --dry-run first** to preview what will happen
2. **Run during off-peak hours** if sending to many students to avoid rate limits
3. **Monitor the output** for any failed sends and manually follow up if needed
4. **Keep logs** by redirecting output: `npx ts-node ... > output.log 2>&1`
5. **Use the 'all' command** for the complete workflow in one operation

## Troubleshooting

### No students found
- Check that skills are actually marked as `hidden: true` in the database
- Verify students have been assigned to those skills
- Ensure students have valid email addresses

### Emails not sending
- Verify SMTP credentials in `.env`
- Check Gmail App Password is correctly configured
- Ensure no firewall blocking SMTP ports (587 for Zoho, 465/587 for Gmail)

### Script hangs
- This is normal during rate limiting - wait for the timeout to complete
- The script will show progress messages indicating wait times
