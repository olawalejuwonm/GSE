import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
  private transporter: any | null = null;
  private sendQueue: Promise<any> = Promise.resolve();
  private lastSendTime = 0;
  private readonly MIN_SEND_INTERVAL = 3000; // 3 seconds between emails
  private emailsSentInLastMinute = 0;
  private minuteResetTime = Date.now();
  private readonly MAX_EMAILS_PER_MINUTE = 10;
  // Per-recipient throttle to avoid rapid repeats to same address
  private lastSentPerRecipient: Map<string, number> = new Map();
  private readonly MIN_INTERVAL_PER_RECIPIENT = 60000; // 60s
  // Per-domain pacing to spread out traffic
  private perDomainCounts: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly MAX_PER_DOMAIN_PER_MINUTE = 5;

  constructor(private readonly configService: ConfigService) {}

  private getTransporter(): any | null {
    if (this.transporter) return this.transporter;

    const providerRaw = this.configService.get('SMTP_PROVIDER');
    const provider = providerRaw ? String(providerRaw).toLowerCase() : '';
    const zohoUser = this.configService.get('ZOHO_USER');
    const zohoPass = this.configService.get('ZOHO_PASS');
    const gmailUser = this.configService.get('GMAIL_USER');
    const gmailPass = this.configService.get('GMAIL_PASS');

    if (provider === 'zoho' || (zohoUser && zohoPass && provider !== 'gmail')) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.zeptomail.eu',
        port: 587,
        secure: false,
        auth: { user: zohoUser as string, pass: zohoPass as string },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        tls: { rejectUnauthorized: true },
      });
      return this.transporter;
    }

    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        pool: true,
        maxConnections: 2,
        maxMessages: 50,
        rateDelta: 10000, // 10 seconds
        rateLimit: 2, // 2 emails per 10 seconds
        auth: { user: gmailUser, pass: gmailPass },
        tls: { rejectUnauthorized: true },
      });
      return this.transporter;
    }

    console.warn('No SMTP credentials found (ZOHO or GMAIL). Email sending disabled.');
    return null;
  }

  async sendMail(mailOptions: nodemailer.SendMailOptions) {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn('Transporter not available. Mail not sent:', mailOptions);
      return;
    }

    this.sendQueue = this.sendQueue
      .then(async () => {
        // Reset global per-minute counter
        const now = Date.now();
        if (now - this.minuteResetTime > 60000) {
          this.emailsSentInLastMinute = 0;
          this.minuteResetTime = now;
        }

        // Global per-minute cap
        if (this.emailsSentInLastMinute >= this.MAX_EMAILS_PER_MINUTE) {
          const waitTime = 60000 - (now - this.minuteResetTime);
          console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s before sending...`);
          await this.sleep(waitTime + 500);
          this.emailsSentInLastMinute = 0;
          this.minuteResetTime = Date.now();
        }

        // Enforce minimum interval between emails globally
        const sinceLast = Date.now() - this.lastSendTime;
        if (sinceLast < this.MIN_SEND_INTERVAL) {
          await this.sleep(this.MIN_SEND_INTERVAL - sinceLast);
        }

        // Determine primary recipient and domain for pacing
        const toList = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];
        const primaryTo: any = (toList && toList[0]) || '';
        const toEmail: string = typeof primaryTo === 'string' ? primaryTo : (primaryTo?.address || '');
        const toDomain: string = toEmail.includes('@') ? toEmail.split('@')[1].toLowerCase() : '';

        // Per-recipient throttle
        if (toEmail) {
          const lastForRecipient = this.lastSentPerRecipient.get(toEmail) || 0;
          const sinceRecipient = Date.now() - lastForRecipient;
          if (sinceRecipient < this.MIN_INTERVAL_PER_RECIPIENT) {
            const wait = this.MIN_INTERVAL_PER_RECIPIENT - sinceRecipient;
            console.log(`Throttling ${toEmail}. Waiting ${Math.ceil(wait / 1000)}s before resend.`);
            await this.sleep(wait);
          }
        }

        // Per-domain pacing
        if (toDomain) {
          const ts = Date.now();
          const record = this.perDomainCounts.get(toDomain) || { count: 0, resetAt: ts + 60000 };
          if (ts > record.resetAt) {
            record.count = 0;
            record.resetAt = ts + 60000;
          }
          if (record.count >= this.MAX_PER_DOMAIN_PER_MINUTE) {
            const wait = record.resetAt - ts;
            console.log(`Per-domain cap reached for ${toDomain}. Waiting ${Math.ceil(wait / 1000)}s...`);
            await this.sleep(wait + 200);
            record.count = 0;
            record.resetAt = Date.now() + 60000;
          }
          this.perDomainCounts.set(toDomain, record);
        }

        // Build enhanced options
        const enhancedOptions: nodemailer.SendMailOptions = {
          ...mailOptions,
          headers: {
            'X-Priority': '3',
            'X-Mailer': 'GSE-Registration-System',
            Importance: 'normal',
            ...(mailOptions.headers || {}),
          },
          envelope: mailOptions.envelope || {
            from: this.getSenderEnvelopeFrom(mailOptions.from),
            to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
          },
          text: mailOptions.text || (mailOptions.html ? this.htmlToText(String(mailOptions.html)) : undefined),
        };

        // Optional List-Unsubscribe headers
        const unsubscribeUrl = this.configService.get('UNSUBSCRIBE_URL');
        const unsubscribeEmail = this.configService.get('UNSUBSCRIBE_EMAIL');
        if (unsubscribeUrl || unsubscribeEmail) {
          const listUnsub: string[] = [];
          if (unsubscribeUrl) listUnsub.push(`<${String(unsubscribeUrl)}>`);
          if (unsubscribeEmail) listUnsub.push(`<mailto:${String(unsubscribeEmail)}>`);
          enhancedOptions.headers = {
            ...(enhancedOptions.headers as any),
            'List-Unsubscribe': listUnsub.join(', '),
            ...(unsubscribeUrl ? { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : {}),
          } as any;
        }

        try {
          const info = await this.attemptSendWithRetries(transporter, enhancedOptions);
          this.lastSendTime = Date.now();
          this.emailsSentInLastMinute++;
          if (toEmail) this.lastSentPerRecipient.set(toEmail, Date.now());
          if (toDomain) {
            const rec = this.perDomainCounts.get(toDomain) || { count: 0, resetAt: Date.now() + 60000 };
            rec.count += 1;
            this.perDomainCounts.set(toDomain, rec);
          }
          console.log(`Email sent successfully: ${info.messageId} (${this.emailsSentInLastMinute}/${this.MAX_EMAILS_PER_MINUTE} this minute)`);
          return info;
        } catch (err) {
          console.error('Failed to send email:', (err as any)?.message || err);
          throw err;
        }
      })
      .catch(err => {
        console.error('Email queue error:', err);
      });

    return this.sendQueue;
  }

  // Attempt send with smarter retries and jittered backoff
  private async attemptSendWithRetries(transporter: any, options: any) {
    const maxRetries = 3;
    let attempt = 0;
    while (true) {
      try {
        return await transporter.sendMail(options);
      } catch (err) {
        attempt++;
        if (this.isRateLimitError(err)) {
          const wait = 120000 + this.jitter(1000, 4000); // 2 min + jitter
          console.warn(`Rate limit detected. Waiting ${Math.ceil(wait / 1000)}s before retry (attempt ${attempt}).`);
          await this.sleep(wait);
          if (attempt <= maxRetries) continue;
          throw err;
        }
        if (this.isTransientError(err) && attempt <= maxRetries) {
          const base = 3000; // 3s
          const backoff = base * Math.pow(2, attempt - 1) + this.jitter(300, 1200);
          console.warn(`Transient error. Retrying in ${Math.ceil(backoff / 1000)}s (attempt ${attempt}/${maxRetries}).`);
          await this.sleep(backoff);
          continue;
        }
        throw err;
      }
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private jitter(min = 200, max = 800) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getSenderEnvelopeFrom(from: any): string {
    const configuredSender =
      this.configService.get('EMAIL_SENDER') ||
      this.configService.get('GMAIL_USER') ||
      this.configService.get('ZOHO_USER');
    if (configuredSender) return String(configuredSender);
    if (typeof from === 'string') {
      const match = from.match(/<([^>]+)>/);
      return match ? match[1] : from;
    }
    return from && (from.address || from.user) ? from.address || from.user : '';
  }

  private htmlToText(html: string): string {
    const withoutTags = html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>(\r?\n)?/gi, '\n')
      .replace(/<\/(p|div|h\d|li)>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    return withoutTags.trim().slice(0, 8000);
  }

  private isRateLimitError(err: any): boolean {
    if (!err) return false;
    const message = (err.message || String(err)).toLowerCase();
    return (
      message.includes('4.7.28') ||
      /\b4\.7\.[0-9]+\b/.test(message) ||
      message.includes('rate limit') ||
      message.includes('try again later') ||
      message.includes('temporarily deferred') ||
      message.includes('greylist') ||
      message.includes('unsolicitedratelimiterror')
    );
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
