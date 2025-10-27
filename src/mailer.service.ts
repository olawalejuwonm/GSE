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
        secure: false,
        auth: {
          user: zohoUser as string,
          pass: zohoPass as string,
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
      return this.transporter;
    }

    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        auth: { user: gmailUser, pass: gmailPass },
        tls: {
          rejectUnauthorized: true,
        },
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

    // Enhanced mail options to reduce soft bounces
    const enhancedOptions = {
      ...mailOptions,
      // Add proper headers
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'GSE-Registration-System',
        'Importance': 'normal',
        ...(mailOptions.headers || {}),
      },
      // Enable envelope for better delivery
      envelope: mailOptions.envelope || {
        from: mailOptions.from,
        to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
      },
      // Add text alternative if only HTML provided
      text: mailOptions.text || (mailOptions.html ? 
        'Please view this email in an HTML-capable email client.' : 
        undefined
      ),
    };

    try {
      const info = await transporter.sendMail(enhancedOptions);
      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (err) {
      console.error('Failed to send email:', err?.message || err);
      
      // Retry logic for transient errors (single retry, no blocking)
      if (this.isTransientError(err)) {
        console.log('Retrying email send after transient error...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const retryInfo = await transporter.sendMail(enhancedOptions);
          console.log('Email sent successfully on retry:', retryInfo.messageId);
          return retryInfo;
        } catch (retryErr) {
          console.error('Retry failed:', retryErr?.message || retryErr);
          throw retryErr;
        }
      }
      throw err;
    }
  }

  private isTransientError(err: any): boolean {
    if (!err) return false;
    const message = err.message || err.toString();
    const transientErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'timeout',
      'Temporary failure',
      '421',
      '450',
      '451',
      '452',
    ];
    return transientErrors.some(error => message.includes(error));
  }
}
