import { Controller, Post, Body, Get } from '@nestjs/common';
import { StudentService } from './student.service';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Controller('student')
export class StudentController {
    constructor(
        private readonly studentService: StudentService,
        private readonly configService: ConfigService,
    ) { }

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
        const { matricNumber, name, carryOver } = body;
        const data: any = { matricNumber, name };
        if (carryOver) data.isCarryOver = true;
        await this.studentService.createOrUpdateStudent(data);
        // Do not return student or OTP details for security
        return { success: true };
    }

    @Post('details')
    async enterDetails(@Body() body: any) {
        const { matricNumber, department, faculty, phone, email } = body;
        // Check for duplicate email (if provided)
        if (email) {
            const existing = await this.studentService.findByEmail(email);
            if (existing && existing.matricNumber !== matricNumber) {
                return { error: 'Email already in use by another student.' };
            }
        }
        const student = await this.studentService.createOrUpdateStudent({
            matricNumber, department, faculty, phone, email
        });
        // Only send OTP if email is provided and not already verified
        if (email && (!student.isEmailVerified)) {
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
            const senderName = this.configService.get('GMAIL_SENDER_NAME') || 'GSE Student Registration';
            await transporter.sendMail({
                from: `${senderName} <${this.configService.get('GMAIL_USER')}>`,
                to: email,
                subject: 'Your OTP Code',
                text: `Your OTP code is: ${otp}`,
            });
        } else if (email && student.isEmailVerified) {
            return { error: 'Email already verified. No OTP sent.' };
        }
        return { success: true };
    }

    @Post('verify-otp')
    async verifyOtp(@Body() body: any) {
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
    async setSkills(@Body() body: any) {
        const { email, skills } = body; // always use email as identifier
        try {
            const result = await this.studentService.setSkills(email, skills);
            const student = result && result.student;
            const skillDocs = result && result.skillDocs;
            if (student && skillDocs && skillDocs.length > 0) {
                // Build a confirmation message listing trainers for chosen skills
                const lines = skillDocs.map(s => `Skill: ${s.description} \n - Trainer: ${s.trainer || 'N/A'}\n - Phone: ${s.phone || 'N/A'}`);
                const message = `Your skill selection is confirmed. Please contact your trainer(s):\n\n${lines.join('\n')}`;
                // Send confirmation email
                try {
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: this.configService.get('GMAIL_USER'),
                            pass: this.configService.get('GMAIL_PASS'),
                        },
                    });
                    const senderName = this.configService.get('GMAIL_SENDER_NAME') || 'GSE Student Registration';
                    await transporter.sendMail({
                        from: `${senderName} <${this.configService.get('GMAIL_USER')}>`,
                        to: email,
                        subject: 'Skill Selection Confirmation & Trainer Details',
                        text: message,
                    });
                } catch (mailErr) {
                    console.error('Failed to send confirmation email:', mailErr.message || mailErr);
                }
            }
            const trainers = (skillDocs || []).map(s => ({ code: s.code, description: s.description, trainer: s.trainer || null, phone: s.phone || null }));
            return { success: !!student, trainers };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}
