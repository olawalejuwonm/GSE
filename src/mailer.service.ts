import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
  private transporter: any | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getTransporter(): any | null {
    if (this.transporter) return this.transporter;

    const providerRaw = this.configService.get('SMTP_PROVIDER');
    const provider = providerRaw ? providerRaw.toString().toLowerCase() : '';
    const zohoUser = this.configService.get('ZOHO_USER');
    const zohoPass = this.configService.get('ZOHO_PASS');
    const gmailUser = this.configService.get('GMAIL_USER');
    const gmailPass = this.configService.get('GMAIL_PASS');

    console.log('Using Zoho SMTP for email sending.', zohoUser);

    if (provider === 'zoho' || (zohoUser && zohoPass && provider !== 'gmail')) {
      console.log('Using Zoho SMTP for email sending.', zohoUser);
      this.transporter = nodemailer.createTransport({
        host: 'smtp.zeptomail.eu',
        port: 587,
        auth: {
          user: zohoUser as string,
          pass: zohoPass as string,
        },
      });
      return this.transporter;
    }

    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });
      return this.transporter;
    }

    console.warn(
      'No SMTP credentials found (ZOHO or GMAIL). Email sending disabled.',
    );
    return null;
  }

  async sendMail(mailOptions: nodemailer.SendMailOptions) {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn('Transporter not available. Mail not sent:', mailOptions);
      return;
    }
    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error('Failed to send email:', err?.message || err);
    }
  }
}
