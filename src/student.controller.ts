import { Controller, Post, Body, Get } from '@nestjs/common';
import { StudentService } from './student.service';
import { ConfigService } from '@nestjs/config';
import { MailerService } from './mailer.service';
import { resolveMx } from 'node:dns/promises';
import type { Student } from './student.schema';

type SkillDocLike = {
  code: string;
  description: string;
  trainer?: string | null;
  phone?: string | null;
};

@Controller('student')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly configService: ConfigService,
    private readonly mailer: MailerService,
  ) {}

  private async validateEmail(
    email: string,
  ): Promise<{ valid: boolean; error?: string }> {
    // Basic format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Please enter a valid email address.' };
    }

    // Extract domain
    const domain = email.split('@')[1].toLowerCase();

    // Known valid email providers and educational domains
    const validDomains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'live.com',
      'icloud.com',
      'aol.com',
      'protonmail.com',
      'zoho.com',
      'yandex.com',
      'mail.com',
      'gmx.com',
      'tutanota.com',
      'fastmail.com',
      // Educational domains
      'unilorin.edu.ng',
      'student.unilorin.edu.ng',
      'pg.unilorin.edu.ng',
    ];

    // Check if domain is in known valid list
    if (validDomains.includes(domain)) {
      return { valid: true };
    }

    // Check for common typos of popular providers
    const commonTypos = [
      { typo: 'gmak.com', correct: 'gmail.com' },
      { typo: 'gmai.com', correct: 'gmail.com' },
      { typo: 'gmial.com', correct: 'gmail.com' },
      { typo: 'yahooo.com', correct: 'yahoo.com' },
      { typo: 'yaho.com', correct: 'yahoo.com' },
      { typo: 'outlok.com', correct: 'outlook.com' },
      { typo: 'outloo.com', correct: 'outlook.com' },
      { typo: 'hotmial.com', correct: 'hotmail.com' },
      { typo: 'hotmal.com', correct: 'hotmail.com' },
    ];

    const typo = commonTypos.find((t) => t.typo === domain);
    if (typo) {
      return {
        valid: false,
        error: `Did you mean ${email.replace(domain, typo.correct)}?`,
      };
    }

    // Check for valid educational domain pattern
    if (
      domain.endsWith('.edu') ||
      domain.endsWith('.edu.ng') ||
      domain.endsWith('.ac.ng')
    ) {
      return { valid: true };
    }

    // Verify domain has MX records (DNS check)
    try {
      const mxRecords = await resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        return { valid: true };
      }
    } catch {
      return {
        valid: false,
        error: 'Invalid email domain. Please check and try again.',
      };
    }

    return {
      valid: false,
      error: 'Email domain not recognized. Please use a valid email provider.',
    };
  }

  @Post('matric')
  async enterMatric(@Body('matricNumber') matricNumber: string) {
    // Only fetch, do not create student
    const student = await this.studentService.findByMatricNumber(matricNumber);
    console.log('Student found:', student);

    // Student not found in database
    if (!student) {
      return { error: 'Student not found. Please check your matric number.' };
    }

    // Student found but has already completed registration
    if (student.skills && student.skills.length > 0) {
      // Fetch trainer details for the selected skills
      const skillDocs = await this.studentService['skillModel']
        .find({ code: { $in: student.skills } })
        .lean<SkillDocLike[]>();

      const trainers = skillDocs.map((skill) => ({
        code: skill.code,
        description: skill.description,
        trainer: skill.trainer || 'N/A',
        phone: skill.phone || 'N/A',
      }));

      return {
        error: 'Registration already completed.',
        registered: true,
        trainers,
      };
    }

    // Student found and has not completed registration
    return {
      name: student.name,
      department: student.department,
      faculty: student.faculty,
      phone: student.phone,
      email: student.email,
    };
  }

  @Post('confirm')
  async confirmName(
    @Body() body: { matricNumber: string; name: string; carryOver?: boolean },
  ) {
    const { matricNumber, name, carryOver } = body;
    const data: Partial<Student> = { matricNumber, name };
    if (carryOver) data.isCarryOver = true;
    await this.studentService.createOrUpdateStudent(data);
    // Do not return student or OTP details for security
    return { success: true };
  }

  @Post('details')
  async enterDetails(
    @Body()
    body: {
      matricNumber: string;
      department: string;
      faculty: string;
      phone: string;
      email: string;
      isSubscribed?: boolean;
    },
  ) {
    const { matricNumber, department, faculty, phone, email, isSubscribed } =
      body;
    // NOTE: isSubscribed is a client-side acknowledgement. This check enforces
    // that the client confirmed subscription, but it is not authoritative.
    // For a secure, server-verified check, implement OAuth + YouTube Data API.
    if (!isSubscribed) {
      return {
        error: 'You must subscribe to the YouTube channel before registering.',
      };
    }
    // Validate email format and domain
    if (email) {
      const validation = await this.validateEmail(email);
      if (!validation.valid) {
        return { error: validation.error };
      }
    }
    // Check for duplicate email (if provided)
    if (email) {
      const existing = await this.studentService.findByEmail(email);
      if (existing && existing.matricNumber !== matricNumber) {
        return { error: 'Email already in use by another student.' };
      }
    }
    const student = await this.studentService.createOrUpdateStudent({
      matricNumber,
      department,
      faculty,
      phone,
      email,
    });
    // Only send OTP if email is provided and not already verified
    if (email && !student.isEmailVerified) {
      // Reuse existing OTP if present; otherwise generate and set it once
      let otp: string;
      if (student.otp && String(student.otp).trim().length === 6) {
        otp = String(student.otp).trim();
      } else {
        otp = this.studentService.generateOtp();
        await this.studentService.setOtp(email, otp);
      }
      // Send OTP email using shared transporter with a simple HTML template
      const senderName =
        this.configService.get<string>('GMAIL_SENDER_NAME') ||
        'GSE Student Registration';
      const html = `
        <div style="font-family:Segoe UI, Arial, sans-serif; color:#222;">
          <div style="background:linear-gradient(90deg,#7b61ff,#4f8cff); padding:18px; border-radius:8px; color:#fff; text-align:center;">
            <h2 style="margin:0; font-size:18px;">GSE Student Registration</h2>
          </div>
          <div style="padding:18px; background:#fff; border:1px solid #eee; border-top:0; border-radius:0 0 8px 8px;">
            <p style="font-size:15px; margin:0 0 8px 0;">Hello,</p>
            <p style="margin:0 0 12px 0; color:#333;">Use the code below to complete your registration.</p>
            <div style="display:flex; align-items:center; justify-content:center;">
              <div style="font-weight:700; font-size:24px; letter-spacing:2px; background:#f6f7ff; padding:10px 18px; border-radius:6px; border:1px solid #e6e9ff;">${otp}</div>
            </div>
            <p style="margin-top:14px; color:#666; font-size:13px;">This code does not expire. You can always re-use this same code to verify your email if needed.</p>
            <p style="margin:6px 0 0 0; color:#888; font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
            <hr style="border:none; border-top:1px solid #eee; margin:14px 0;" />
          </div>
        </div>
      `;
      // await this.mailer.sendMail({
      //   from: `${senderName} <${this.configService.get('EMAIL_SENDER')}>`,
      //   to: email,
      //   subject: 'Your OTP Code',
      //   text: `Your OTP code is: ${otp}`,
      //   html,
      // });
    } else if (email && student.isEmailVerified) {
      return { error: 'Email already verified. No OTP sent.' };
    }
    return { error: 'Email already verified. No OTP sent.' };
    // return { success: true };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    const { email, otp } = body; // always use email as identifier for OTP
    const ok = await this.studentService.verifyOtp(email, otp);
    console.log('OTP verification result:', ok);
    return { verified: ok };
  }

  @Get('skills')
  async getSkills() {
    const skills = await this.studentService.getAllSkills();
    return { skills };
  }

  @Post('skills')
  async setSkills(@Body() body: { email: string; skills: string[] }) {
    const { email, skills } = body; // always use email as identifier
    try {
      const result = await this.studentService.setSkills(email, skills);
      const student = result && result.student;
      const skillDocs = result && result.skillDocs;
      if (result && result.alreadyRegistered) {
        // Student had already registered; return trainers without changing selection
        const typedSkills = (skillDocs ?? []) as SkillDocLike[];
        const trainers = typedSkills.map((s: SkillDocLike) => ({
          code: s.code,
          description: s.description,
          trainer: s.trainer ?? null,
          phone: s.phone ?? null,
        }));
        return { success: true, alreadyRegistered: true, trainers };
      }
      if (student && skillDocs && skillDocs.length > 0) {
        // Build a confirmation message listing trainers for chosen skills
        const lines = (skillDocs as SkillDocLike[]).map(
          (s: SkillDocLike) =>
            `Skill: ${s.description} \n - Trainer: ${s.trainer || 'N/A'}\n - Phone: ${s.phone || 'N/A'}`,
        );
        const message = `Your skill selection is confirmed. Please contact your trainer(s):\n\n${lines.join('\n')}`;
        const html = `
          <div style="font-family:Segoe UI, Arial, sans-serif; color:#222;">
            <div style="background:linear-gradient(90deg,#7b61ff,#4f8cff); padding:16px; border-radius:8px; color:#fff; text-align:center;">
              <h2 style="margin:0; font-size:18px;">Skill Selection Confirmed</h2>
            </div>
            <div style="padding:14px; background:#fff; border:1px solid #eee; border-top:0; border-radius:0 0 8px 8px;">
              <p style="margin:0 0 8px 0;">Hello,</p>
              <p style="margin:0 0 10px 0; color:#333;">Your skill selection has been recorded. Below are your trainer details:</p>
              <ul style="padding-left:18px; color:#333;">
                ${(skillDocs as SkillDocLike[])
                  .map(
                    (s: SkillDocLike) =>
                      `<li style="margin-bottom:8px;"><strong>${s.description}</strong><br/>Trainer: ${s.trainer || 'N/A'}<br/>Phone: ${s.phone || 'N/A'}</li>`,
                  )
                  .join('')}
              </ul>
              <p style="font-size:13px; color:#666;">Please contact your trainer to proceed.</p>
              <hr style="border:none; border-top:1px solid #eee; margin:12px 0;" />
            </div>
          </div>
        `;
        // Send confirmation email
        // Send confirmation email using shared transporter. sendMail handles errors internally.
        const senderName =
          this.configService.get<string>('GMAIL_SENDER_NAME') ||
          'GSE Student Registration';
        // await this.mailer.sendMail({
        //   from: `${senderName} <${this.configService.get('EMAIL_SENDER')}>`,
        //   to: email,
        //   subject: 'Skill Selection Confirmation & Trainer Details',
        //   text: message,
        //   html,
        // });
      }
      const trainers = ((skillDocs ?? []) as SkillDocLike[]).map(
        (s: SkillDocLike) => ({
          code: s.code,
          description: s.description,
          trainer: s.trainer ?? null,
          phone: s.phone ?? null,
        }),
      );
      return { success: !!student, trainers };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}
