import { sendEmail } from "./sender";

export async function sendComplianceOfficerInviteEmail(
  to: string,
  fullName: string,
  token: string,
  appBaseUrl: string
): Promise<void> {
  const setupUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Welcome to Kizazi Hire</h1>
        <p style="color: #666; font-size: 15px; margin-top: 8px;">You've been invited as a Compliance Officer.</p>
      </div>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="color: #555; font-size: 14px; margin: 0 0 8px;">Hi ${fullName},</p>
        <p style="color: #555; font-size: 14px; margin: 0 0 20px;">
          An administrator has created a Compliance Officer account for you on Kizazi Hire.
          Click the button below to set your password and activate your account.
          This link expires in 24 hours.
        </p>
        <a href="${setupUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.02em;">
          Set Password &amp; Activate Account
        </a>
      </div>

      <p style="color: #888; font-size: 13px; text-align: center; margin-top: 24px;">
        If you can't click the button, copy and paste this link into your browser:<br />
        <span style="color: #4f46e5; word-break: break-all;">${setupUrl}</span>
      </p>

      <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 8px;">
        If you were not expecting this invitation, please ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
        Kizazi Hire &mdash; Connecting disability support workers with employers.
      </p>
    </div>
  `;

  await sendEmail({ to, subject: "You've been invited as a Compliance Officer — Kizazi Hire", html });
}
