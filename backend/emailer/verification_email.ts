import { sendEmail } from "./sender";

export async function sendVerificationEmail(to: string, token: string, appBaseUrl: string): Promise<void> {
  const verifyUrl = `${appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Verify your email address</h1>
        <p style="color: #666; font-size: 15px; margin-top: 8px;">Welcome to Kizazi Hire! Please confirm your email to get started.</p>
      </div>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="color: #555; font-size: 14px; margin: 0 0 20px;">Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.02em;">
          Verify Email Address
        </a>
      </div>

      <p style="color: #888; font-size: 13px; text-align: center; margin-top: 24px;">
        If you can't click the button, copy and paste this link into your browser:<br />
        <span style="color: #2563eb; word-break: break-all;">${verifyUrl}</span>
      </p>

      <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 8px;">
        If you did not create an account, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
        Kizazi Hire &mdash; Connecting disability support workers with employers.
      </p>
    </div>
  `;

  await sendEmail({ to, subject: "Verify your Kizazi Hire email address", html });
}

export async function sendResendVerificationEmail(to: string, token: string, appBaseUrl: string): Promise<void> {
  const verifyUrl = `${appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">Email verification resend</h2>
      <p style="color: #555; font-size: 15px;">You requested a new verification link for your Kizazi Hire account.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #aaa; font-size: 12px; text-align: center;">This link expires in 24 hours. If you did not request this, ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
    </div>
  `;

  await sendEmail({ to, subject: "Your new Kizazi Hire verification link", html });
}
