import { sendEmail } from "./sender";

export async function sendPasswordResetEmail(to: string, token: string, appBaseUrl: string): Promise<void> {
  const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Reset your password</h1>
        <p style="color: #666; font-size: 15px; margin-top: 8px;">You requested a password reset for your Kizazi Hire account.</p>
      </div>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="color: #555; font-size: 14px; margin: 0 0 20px;">Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.02em;">
          Reset Password
        </a>
      </div>

      <p style="color: #888; font-size: 13px; text-align: center; margin-top: 24px;">
        If you can't click the button, copy and paste this link into your browser:<br />
        <span style="color: #2563eb; word-break: break-all;">${resetUrl}</span>
      </p>

      <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 8px;">
        If you did not request a password reset, you can safely ignore this email. Your password will not change.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
        Kizazi Hire &mdash; Connecting disability support workers with employers.
      </p>
    </div>
  `;

  await sendEmail({ to, subject: "Reset your Kizazi Hire password", html });
}

export async function sendAdminPasswordResetEmail(to: string, temporaryPassword: string): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Your password has been reset</h1>
        <p style="color: #666; font-size: 15px; margin-top: 8px;">An administrator has reset your Kizazi Hire account password.</p>
      </div>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="color: #555; font-size: 14px; margin: 0 0 12px;">Your temporary password is:</p>
        <p style="font-family: monospace; font-size: 20px; font-weight: 700; color: #1a1a1a; background: #e8f0fe; border-radius: 8px; padding: 12px 24px; display: inline-block; letter-spacing: 0.1em;">${temporaryPassword}</p>
        <p style="color: #e63946; font-size: 13px; margin-top: 16px; font-weight: 600;">Please log in and change your password immediately.</p>
      </div>

      <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 8px;">
        If you did not request this, please contact support immediately.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
        Kizazi Hire &mdash; Connecting disability support workers with employers.
      </p>
    </div>
  `;

  await sendEmail({ to, subject: "Your Kizazi Hire password has been reset", html });
}
