/**
 * Mailer utility.
 *
 * Sends transactional emails via SMTP using nodemailer.
 * Configuration is read from environment variables:
 * `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
 *
 * **Gmail**: set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`.
 * Use a 16-character App Password for `SMTP_PASS` (Google Account → Security →
 * 2-Step Verification → App passwords). Plain account passwords are rejected by Google.
 * App Passwords must be stored **without spaces** (the Google UI displays them with spaces
 * for readability, but the actual password is the 16 contiguous characters).
 *
 * @module Utils/Mailer
 */

import nodemailer from 'nodemailer';

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.trim(),
  },
});

/**
 * Sends a password reset email to the given address.
 *
 * @param to - Recipient email address.
 * @param resetUrl - The full password reset URL to include in the email body.
 *   Constructed as `{FRONTEND_URL}/reset-password?token=<token>`.
 *
 * @throws If the SMTP transport fails to deliver the message.
 */
export const sendPasswordResetEmail = async (to: string, resetUrl: string): Promise<void> => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
    html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
  });
};
