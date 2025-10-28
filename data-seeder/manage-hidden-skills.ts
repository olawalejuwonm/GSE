import * as mongoose from 'mongoose';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const ZOHO_USER = process.env.ZOHO_USER;
const ZOHO_PASS = process.env.ZOHO_PASS;
const SMTP_PROVIDER = process.env.SMTP_PROVIDER?.toLowerCase();
const GMAIL_SENDER_NAME =
  process.env.GMAIL_SENDER_NAME || 'GSE Student Registration';
const EMAIL_SENDER = process.env.EMAIL_SENDER || GMAIL_USER || ZOHO_USER;

// Define schemas
const StudentSchema = new mongoose.Schema({
  matricNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String },
  skills: [String],
});

const SkillSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  hidden: { type: Boolean, default: false },
  selectedCount: { type: Number, default: 0 },
});

// Rate limiting configuration
const MIN_SEND_INTERVAL = 9000; // 9 seconds between emails
const MAX_EMAILS_PER_MINUTE = 5; // Gmail safe limit
let lastSendTime = 0;
let emailsSentInLastMinute = 0;
let minuteResetTime = Date.now();

/**
 * Create email transporter with rate limiting support
 */
function createTransporter(): nodemailer.Transporter | null {
  if (
    SMTP_PROVIDER === 'zoho' ||
    (ZOHO_USER && ZOHO_PASS && SMTP_PROVIDER !== 'gmail')
  ) {
    console.log('Using Zoho SMTP for email sending.');
    return nodemailer.createTransport({
      host: 'smtp.zeptomail.eu',
      port: 587,
      secure: false,
      auth: {
        user: ZOHO_USER as string,
        pass: ZOHO_PASS as string,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
      tls: {
        rejectUnauthorized: true,
      },
    });
  }

  if (GMAIL_USER && GMAIL_PASS) {
    console.log('Using Gmail SMTP for email sending.');
    return nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 2,
      maxMessages: 50,
      rateDelta: 10000, // 10 seconds
      rateLimit: 2, // Only 2 emails per 10 seconds
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      tls: {
        rejectUnauthorized: true,
      },
    });
  }

  console.warn('No SMTP credentials found. Email sending disabled.');
  return null;
}

/**
 * Send email with rate limiting to prevent overwhelming the server
 */
async function sendEmailWithRateLimit(
  transporter: nodemailer.Transporter,
  mailOptions: nodemailer.SendMailOptions,
): Promise<void> {
  // Reset counter every minute
  const now = Date.now();
  if (now - minuteResetTime > 60000) {
    emailsSentInLastMinute = 0;
    minuteResetTime = now;
  }

  // Check if we've hit the per-minute limit
  if (emailsSentInLastMinute >= MAX_EMAILS_PER_MINUTE) {
    const waitTime = 60000 - (now - minuteResetTime);
    console.log(
      `⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s before sending...`,
    );
    await new Promise((resolve) => setTimeout(resolve, waitTime + 1000));
    emailsSentInLastMinute = 0;
    minuteResetTime = Date.now();
  }

  // Enforce minimum interval between emails
  const timeSinceLastSend = Date.now() - lastSendTime;
  if (timeSinceLastSend < MIN_SEND_INTERVAL) {
    const waitTime = MIN_SEND_INTERVAL - timeSinceLastSend;
    console.log(`⏳ Waiting ${Math.ceil(waitTime / 1000)}s before sending...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Enhanced mail options to reduce soft bounces
  const enhancedOptions: nodemailer.SendMailOptions = {
    ...mailOptions,
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'GSE-Registration-System',
      Importance: 'normal',
      ...(mailOptions.headers || {}),
    },
    envelope: mailOptions.envelope || {
      from: mailOptions.from,
      to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
    },
    text:
      mailOptions.text ||
      (mailOptions.html
        ? 'Please view this email in an HTML-capable email client.'
        : undefined),
  };

  try {
    const info = await transporter.sendMail(enhancedOptions);
    lastSendTime = Date.now();
    emailsSentInLastMinute++;
    console.log(
      `✅ Email sent: ${info.messageId} (${emailsSentInLastMinute}/${MAX_EMAILS_PER_MINUTE} this minute)`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to send email to ${mailOptions.to}:`, message);

    // Retry logic for rate limit errors
    if (
      message.includes('4.7.28') ||
      message.includes('rate limit') ||
      message.includes('UnsolicitedRateLimitError')
    ) {
      console.log('⏳ Gmail rate limit detected. Waiting 2 minutes...');
      await new Promise((resolve) => setTimeout(resolve, 120000));
      emailsSentInLastMinute = 0;
      minuteResetTime = Date.now();

      try {
        const retryInfo = await transporter.sendMail(enhancedOptions);
        lastSendTime = Date.now();
        emailsSentInLastMinute++;
        console.log(
          '✅ Email sent successfully after rate limit wait:',
          retryInfo.messageId,
        );
      } catch (retryErr) {
        const retryMessage =
          retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.error('❌ Retry failed after rate limit:', retryMessage);
        throw retryErr;
      }
    } else {
      throw err;
    }
  }
}

/**
 * Get all students who have selected hidden skills
 */
async function getStudentsWithHiddenSkills(): Promise<
  Array<{
    matricNumber: string;
    name: string;
    email: string;
    hiddenSkills: Array<{ code: string; description: string }>;
  }>
> {
  const Student = mongoose.model('Student', StudentSchema);
  const Skill = mongoose.model('Skill', SkillSchema);

  // Find all hidden skills
  const hiddenSkills = await Skill.find({ hidden: true }).lean();
  const hiddenSkillCodes = hiddenSkills.map((s) => s.code);

  if (hiddenSkillCodes.length === 0) {
    console.log('No hidden skills found.');
    return [];
  }

  console.log(
    `Found ${hiddenSkillCodes.length} hidden skills:`,
    hiddenSkills.map((s) => s.description).join(', '),
  );

  // Find students who have selected any hidden skill
  const students = await Student.find({
    skills: { $in: hiddenSkillCodes },
    email: { $exists: true, $nin: [null, ''] },
  }).lean();

  console.log(
    `Found ${students.length} students with hidden skills and valid emails.`,
  );

  // Map students with their hidden skills
  const result = students.map((student) => {
    const studentHiddenSkills = student.skills
      .filter((skillCode: string) => hiddenSkillCodes.includes(skillCode))
      .map((skillCode: string) => {
        const skill = hiddenSkills.find((s) => s.code === skillCode);
        return {
          code: skillCode,
          description: skill?.description || skillCode,
        };
      });

    return {
      matricNumber: student.matricNumber,
      name: student.name,
      email: student.email,
      hiddenSkills: studentHiddenSkills,
    };
  });

  return result;
}

/**
 * Send bulk emails to students asking them to register for a new skill
 */
async function sendBulkEmailToStudents(
  students: Array<{
    matricNumber: string;
    name: string;
    email: string;
    hiddenSkills: Array<{ code: string; description: string }>;
  }>,
  dryRun: boolean = false,
): Promise<void> {
  if (students.length === 0) {
    console.log('No students to email.');
    return;
  }

  const transporter = createTransporter();
  if (!transporter && !dryRun) {
    console.error(
      '❌ Email transporter not available. Cannot send emails. Configure SMTP credentials.',
    );
    return;
  }

  console.log(
    `\n📧 ${dryRun ? '[DRY RUN] ' : ''}Sending emails to ${students.length} students...`,
  );
  console.log(
    `⏱️  Estimated time: ~${Math.ceil((students.length * MIN_SEND_INTERVAL) / 1000 / 60)} minutes\n`,
  );

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const skillsList = student.hiddenSkills
      .map((s) => `• ${s.description}`)
      .join('\n');

    const html = `
      <div style="font-family:Segoe UI, Arial, sans-serif; color:#222;">
        <div style="background:linear-gradient(90deg,#7b61ff,#4f8cff); padding:18px; border-radius:8px; color:#fff; text-align:center;">
          <h2 style="margin:0; font-size:18px;">Important: Skill Re-registration Required</h2>
        </div>
        <div style="padding:18px; background:#fff; border:1px solid #eee; border-top:0; border-radius:0 0 8px 8px;">
          <p style="font-size:15px; margin:0 0 8px 0;">Hello ${student.name},</p>
          <p style="margin:0 0 12px 0; color:#333;">
            We noticed that you registered for the following skill(s) that are no longer available:
          </p>
          <div style="background:#f6f7ff; padding:12px; border-radius:6px; border:1px solid #e6e9ff; margin:12px 0;">
            <pre style="margin:0; font-size:14px; color:#333; white-space:pre-wrap;">${skillsList}</pre>
          </div>
          <p style="margin:12px 0; color:#333;">
            <strong>Action Required:</strong> Please log in to the registration portal to select a new skill from the available options.
          </p>
          <p style="margin:12px 0; color:#666; font-size:14px;">
            Your previous skill selection has been removed, and you will need to register for a new skill to complete your enrollment.
          </p>
          <div style="text-align:center; margin:20px 0;">
            <a href="${process.env.REGISTRATION_URL || 'https://your-registration-url.com'}" 
               style="display:inline-block; background:linear-gradient(90deg,#7b61ff,#4f8cff); color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600;">
              Register for New Skill
            </a>
          </div>
          <p style="margin:14px 0 0 0; color:#888; font-size:12px;">
            If you have any questions, please contact the GSE office.
          </p>
          <hr style="border:none; border-top:1px solid #eee; margin:14px 0;" />
          <p style="margin:0; color:#999; font-size:11px; text-align:center;">
            GSE Student Registration System
          </p>
        </div>
      </div>
    `;

    const text = `Hello ${student.name},

We noticed that you registered for the following skill(s) that are no longer available:

${skillsList}

Action Required: Please log in to the registration portal to select a new skill from the available options.

Your previous skill selection has been removed, and you will need to register for a new skill to complete your enrollment.

Registration URL: ${process.env.REGISTRATION_URL || 'https://your-registration-url.com'}

If you have any questions, please contact the GSE office.

---
GSE Student Registration System`;

    if (dryRun) {
      console.log(
        `[${i + 1}/${students.length}] [DRY RUN] Would send email to: ${student.email} (${student.name})`,
      );
      continue;
    }

    try {
      await sendEmailWithRateLimit(transporter!, {
        from: `${GMAIL_SENDER_NAME} <${EMAIL_SENDER}>`,
        to: student.email,
        subject: 'Action Required: Re-register for GSE Skill',
        text,
        html,
      });
      successCount++;
      console.log(
        `[${i + 1}/${students.length}] ✅ Email sent to: ${student.email} (${student.name})`,
      );
    } catch (err) {
      failureCount++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[${i + 1}/${students.length}] ❌ Failed to send to ${student.email}:`,
        message,
      );
    }
  }

  console.log('\n📊 Email sending complete:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failureCount}`);
  console.log(`  📧 Total: ${students.length}`);
}

/**
 * Remove students from hidden skills and decrement selectedCount
 */
async function removeStudentsFromHiddenSkills(): Promise<void> {
  const Student = mongoose.model('Student', StudentSchema);
  const Skill = mongoose.model('Skill', SkillSchema);

  // Find all hidden skills
  const hiddenSkills = await Skill.find({ hidden: true }).lean();
  const hiddenSkillCodes = hiddenSkills.map((s) => s.code);

  if (hiddenSkillCodes.length === 0) {
    console.log('No hidden skills found.');
    return;
  }

  console.log(
    `Found ${hiddenSkillCodes.length} hidden skills to remove from students.`,
  );

  // Find students who have selected any hidden skill
  const students = await Student.find({
    skills: { $in: hiddenSkillCodes },
  }).lean();

  console.log(`Found ${students.length} students with hidden skills.`);

  let updatedCount = 0;
  const skillDecrements: { [key: string]: number } = {};

  for (const student of students) {
    const hiddenSkillsInStudent = student.skills.filter((skillCode: string) =>
      hiddenSkillCodes.includes(skillCode),
    );

    if (hiddenSkillsInStudent.length > 0) {
      // Count how many times each skill needs to be decremented
      hiddenSkillsInStudent.forEach((skillCode: string) => {
        skillDecrements[skillCode] = (skillDecrements[skillCode] || 0) + 1;
      });

      // Remove hidden skills from student's skill array
      await Student.updateOne(
        { matricNumber: student.matricNumber },
        { $pull: { skills: { $in: hiddenSkillCodes } } },
      );

      updatedCount++;
      console.log(
        `✅ Removed ${hiddenSkillsInStudent.length} hidden skill(s) from ${student.name} (${student.matricNumber})`,
      );
    }
  }

  // Decrement selectedCount for each hidden skill
  for (const [skillCode, count] of Object.entries(skillDecrements)) {
    const skill = hiddenSkills.find((s) => s.code === skillCode);
    await Skill.updateOne(
      { code: skillCode },
      { $inc: { selectedCount: -count } },
    );
    console.log(
      `📉 Decremented selectedCount for "${skill?.description}" (${skillCode}) by ${count}`,
    );
  }

  console.log(`\n✅ Removed hidden skills from ${updatedCount} students.`);
}

/**
 * Main function to orchestrate the script
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const dryRun = args.includes('--dry-run');

  // Show help without requiring MongoDB connection
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log('Usage: npx ts-node manage-hidden-skills.ts <command>');
    console.log('\nCommands:');
    console.log(
      '  count         - Count and list students with hidden skills',
    );
    console.log(
      '  send-emails   - Send bulk emails to students with hidden skills',
    );
    console.log('  remove        - Remove students from hidden skills');
    console.log(
      '  all           - Run all operations (count, email, remove)',
    );
    console.log('\nOptions:');
    console.log(
      '  --dry-run     - Simulate actions without actually sending emails or removing skills',
    );
    console.log('\nExamples:');
    console.log('  npx ts-node manage-hidden-skills.ts count');
    console.log('  npx ts-node manage-hidden-skills.ts send-emails');
    console.log(
      '  npx ts-node manage-hidden-skills.ts send-emails --dry-run',
    );
    console.log('  npx ts-node manage-hidden-skills.ts remove');
    console.log('  npx ts-node manage-hidden-skills.ts all --dry-run');
    process.exit(0);
  }

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    switch (command) {
      case 'count':
        console.log('📊 Counting students with hidden skills...\n');
        const countStudents = await getStudentsWithHiddenSkills();
        console.log(`\n📈 Summary:`);
        console.log(
          `  Total students with hidden skills: ${countStudents.length}`,
        );
        if (countStudents.length > 0) {
          console.log('\n  Students:');
          countStudents.forEach((s, i) => {
            console.log(
              `    ${i + 1}. ${s.name} (${s.matricNumber}) - ${s.email}`,
            );
            console.log(
              `       Hidden skills: ${s.hiddenSkills.map((sk) => sk.description).join(', ')}`,
            );
          });
        }
        break;

      case 'send-emails':
        console.log('📧 Sending emails to students with hidden skills...\n');
        const emailStudents = await getStudentsWithHiddenSkills();
        await sendBulkEmailToStudents(emailStudents, dryRun);
        break;

      case 'remove':
        console.log('🗑️  Removing students from hidden skills...\n');
        await removeStudentsFromHiddenSkills();
        break;

      case 'all':
        console.log('🚀 Running all operations...\n');
        console.log('Step 1: Counting students with hidden skills...');
        const allStudents = await getStudentsWithHiddenSkills();
        console.log(
          `\nFound ${allStudents.length} students with hidden skills.\n`,
        );

        if (allStudents.length > 0) {
          console.log('Step 2: Sending emails...');
          await sendBulkEmailToStudents(allStudents, dryRun);

          if (!dryRun) {
            console.log('\nStep 3: Removing students from hidden skills...');
            await removeStudentsFromHiddenSkills();
          } else {
            console.log(
              '\n[DRY RUN] Skipping removal. Run without --dry-run to actually remove.',
            );
          }
        }
        break;

      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Run without arguments or with "help" to see available commands.');
        process.exit(1);
    }

    console.log('\n✅ Operation completed successfully.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Error:', message);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the main function
main();
