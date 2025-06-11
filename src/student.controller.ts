import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { StudentService } from './student.service';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

const SKILLS = [
  'Programming',
  'Web Development',
  'Data Analysis',
  'Graphic Design',
  'Public Speaking',
  'Writing',
  'Project Management',
];

@Controller('student')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly configService: ConfigService,
  ) {}

  @Post('matric')
  async enterMatric(@Body('matricNumber') matricNumber: string) {
    // Only fetch, do not create student
    const student = await this.studentService.findByMatricNumber(matricNumber);
    console.log('Student found:', student);
    if (student && (!student.skills || student.skills.length === 0)) {
      return {
        name: student.name,
        department: student.department,
        faculty: student.faculty,
        phone: student.phone,
        email: student.email,
      };
    }
    // If not found, return error
    return { error: 'Student not found or registration already completed.' };
  }

  @Post('confirm')
  async confirmName(@Body() body: any) {
    const { matricNumber, name } = body;
    const student = await this.studentService.createOrUpdateStudent({ matricNumber, name });
    return { success: true, student };
  }

  @Post('details')
  async enterDetails(@Body() body: any) {
    const { matricNumber, department, faculty, phone, email } = body;
    const student = await this.studentService.createOrUpdateStudent({
      matricNumber, department, faculty, phone, email, isEmailVerified: false
    });
    // Generate OTP only if email is provided
    if (email) {
      const otp = this.studentService.generateOtp();
      await this.studentService.setOtp(email, otp);
      // Send OTP email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.configService.get('GMAIL_USER'),
          pass: this.configService.get('GMAIL_PASS'),
        },
      });
      await transporter.sendMail({
        from: this.configService.get('GMAIL_USER'),
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`,
      });
    }
    return { success: true, student, otpSent: !!email };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: any) {
    const { identifier, otp } = body; // identifier can be email or matricNumber
    const ok = await this.studentService.verifyOtp(identifier, otp);
    return { success: ok };
  }

  @Get('skills')
  getSkills() {
    return { skills: SKILLS };
  }

  @Post('skills')
  async setSkills(@Body() body: any) {
    const { identifier, skills } = body; // identifier can be email or matricNumber
    const student = await this.studentService.setSkills(identifier, skills);
    return { success: !!student };
  }
}
