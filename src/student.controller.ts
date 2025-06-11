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
    if (student && (!student.skills || student.skills.length === 0)) {
      return {
        name: student.name,
        department: student.department,
        faculty: student.faculty,
        phone: student.phone,
        email: student.email,
      };
    }
    // Simulate lookup (replace with real lookup if available)
    return { name: 'Student ' + matricNumber };
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
    // Generate OTP
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
    return { success: true };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: any) {
    const { email, otp } = body;
    const verified = await this.studentService.verifyOtp(email, otp);
    return { verified };
  }

  @Get('skills')
  getSkills() {
    return { skills: SKILLS };
  }

  @Post('skills')
  async setSkills(@Body() body: any) {
    const { email, skills } = body;
    await this.studentService.setSkills(email, skills);
    return { success: true };
  }
}
