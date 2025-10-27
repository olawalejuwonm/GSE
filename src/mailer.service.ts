import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
  private transporter: any | null = null;
  private sendQueue: Promise<any> = Promise.resolve();
  private lastSendTime = 0;
  private readonly MIN_SEND_INTERVAL = 9000; // 3 seconds between emails (reduced rate)
  private emailsSentInLastMinute = 0;
  private minuteResetTime = Date.now();
  private readonly MAX_EMAILS_PER_MINUTE = 5; // Gmail safe limit

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
        maxConnections: 2, // Reduced from 5 to avoid rate limits
        maxMessages: 50, // Reduced from 100
        rateDelta: 10000, // 10 seconds
        rateLimit: 2, // Only 2 emails per 10 seconds
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

    // Queue emails with rate limiting to prevent overwhelming the server
    this.sendQueue = this.sendQueue.then(async () => {
      // Reset counter every minute
      const now = Date.now();
      if (now - this.minuteResetTime > 60000) {
        this.emailsSentInLastMinute = 0;
        this.minuteResetTime = now;
      }

      // Check if we've hit the per-minute limit
      if (this.emailsSentInLastMinute >= this.MAX_EMAILS_PER_MINUTE) {
        const waitTime = 60000 - (now - this.minuteResetTime);
        console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s before sending...`);
        await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
        this.emailsSentInLastMinute = 0;
        this.minuteResetTime = Date.now();
      }

      // Enforce minimum interval between emails
      const timeSinceLastSend = Date.now() - this.lastSendTime;
      
      if (timeSinceLastSend < this.MIN_SEND_INTERVAL) {
        await new Promise(resolve => 
          setTimeout(resolve, this.MIN_SEND_INTERVAL - timeSinceLastSend)
        );
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
        this.lastSendTime = Date.now();
        this.emailsSentInLastMinute++;
        console.log(`Email sent successfully: ${info.messageId} (${this.emailsSentInLastMinute}/${this.MAX_EMAILS_PER_MINUTE} this minute)`);
        return info;
      } catch (err) {
        console.error('Failed to send email:', err?.message || err);
        
        // Check if it's a rate limit error from Gmail
        if (this.isRateLimitError(err)) {
          console.error('Gmail rate limit detected. Waiting 2 minutes before retry...');
          await new Promise(resolve => setTimeout(resolve, 120000)); // Wait 2 minutes
          this.emailsSentInLastMinute = 0;
          this.minuteResetTime = Date.now();
          
          try {
            const retryInfo = await transporter.sendMail(enhancedOptions);
            this.lastSendTime = Date.now();
            this.emailsSentInLastMinute++;
            console.log('Email sent successfully after rate limit wait:', retryInfo.messageId);
            return retryInfo;
          } catch (retryErr) {
            console.error('Retry failed after rate limit:', retryErr?.message || retryErr);
            throw retryErr;
          }
        }
        
        // Retry logic for other transient errors
        if (this.isTransientError(err)) {
          console.log('Retrying email send after transient error...');
          await new Promise(resolve => setTimeout(resolve, 5000)); // Increased to 5 seconds
          try {
            const retryInfo = await transporter.sendMail(enhancedOptions);
            this.lastSendTime = Date.now();
            this.emailsSentInLastMinute++;
            console.log('Email sent successfully on retry:', retryInfo.messageId);
            return retryInfo;
          } catch (retryErr) {
            console.error('Retry failed:', retryErr?.message || retryErr);
            throw retryErr;
          }
        }
        throw err;
      }
    }).catch(err => {
      console.error('Email queue error:', err);
    });

    return this.sendQueue;
  }

  private isRateLimitError(err: any): boolean {
    if (!err) return false;
    const message = err.message || err.toString();
    return message.includes('4.7.28') || 
           message.includes('rate limit') || 
           message.includes('UnsolicitedRateLimitError');
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
