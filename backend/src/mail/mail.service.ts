import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: Number(this.configService.get('MAIL_PORT')),
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASS'),
      },
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password.html?token=${resetToken}`;
    try {
      await this.transporter.sendMail({
        from: this.configService.get('MAIL_FROM'),
        to,
        subject: 'ShopSphere - Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to set a new one. This link expires in 15 minutes.</p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send reset email: ${err.message}`);
    }
  }
}
