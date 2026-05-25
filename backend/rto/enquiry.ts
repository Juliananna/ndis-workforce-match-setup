import { api, APIError } from "encore.dev/api";
import { sendEmail } from "../emailer/sender";
import db from "../db";

export interface RtoEnquiryRequest {
  name: string;
  organisationName: string;
  email: string;
  phone?: string;
  message: string;
  rtoSlug?: string;
}

export interface RtoEnquiryResponse {
  ok: boolean;
}

export const submitRtoEnquiry = api<RtoEnquiryRequest, RtoEnquiryResponse>(
  { expose: true, method: "POST", path: "/rto/enquiry" },
  async (req) => {
    if (!req.name?.trim()) throw APIError.invalidArgument("name is required");
    if (!req.organisationName?.trim()) throw APIError.invalidArgument("organisation name is required");
    if (!req.email?.trim()) throw APIError.invalidArgument("email is required");
    if (!req.message?.trim()) throw APIError.invalidArgument("message is required");
    if (req.message.length > 2000) throw APIError.invalidArgument("message too long");

    await db.exec`
      INSERT INTO rto_enquiries (name, organisation_name, email, phone, message, rto_slug)
      VALUES (
        ${req.name.trim()},
        ${req.organisationName.trim()},
        ${req.email.trim()},
        ${req.phone?.trim() ?? null},
        ${req.message.trim()},
        ${req.rtoSlug?.trim() ?? null}
      )
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0d9488; margin-bottom: 4px;">New RTO Partner Enquiry</h2>
        ${req.rtoSlug ? `<p style="color:#888;font-size:12px;margin-top:0;">Via /rto/${req.rtoSlug}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px 0;color:#555;font-size:14px;width:160px;vertical-align:top;font-weight:600;">Name</td><td style="padding:8px 0;color:#222;font-size:14px;">${req.name.trim()}</td></tr>
          <tr><td style="padding:8px 0;color:#555;font-size:14px;font-weight:600;">Organisation</td><td style="padding:8px 0;color:#222;font-size:14px;">${req.organisationName.trim()}</td></tr>
          <tr><td style="padding:8px 0;color:#555;font-size:14px;font-weight:600;">Email</td><td style="padding:8px 0;color:#222;font-size:14px;"><a href="mailto:${req.email.trim()}">${req.email.trim()}</a></td></tr>
          ${req.phone ? `<tr><td style="padding:8px 0;color:#555;font-size:14px;font-weight:600;">Phone</td><td style="padding:8px 0;color:#222;font-size:14px;">${req.phone.trim()}</td></tr>` : ""}
        </table>
        <div style="background:#f5f5f5;border-left:4px solid #0d9488;padding:16px;border-radius:4px;margin-top:8px;">
          <p style="color:#333;font-size:14px;margin:0;white-space:pre-wrap;">${req.message.trim()}</p>
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#999;font-size:12px;">Kizazi Hire · RTO Partner Programme</p>
      </div>
    `;

    try {
      await sendEmail({
        to: "hello@kizazihire.com.au",
        subject: `RTO Partner Enquiry — ${req.organisationName.trim()}`,
        html,
      });
    } catch { }

    const confirmHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0d9488;">Thanks for your enquiry, ${req.name.trim().split(" ")[0]}!</h2>
        <p style="color:#555;font-size:15px;">We've received your message about the KIZAZI Hire RTO Partner Programme.</p>
        <p style="color:#555;font-size:15px;">Our team will be in touch within one business day to discuss how we can support your students.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#999;font-size:12px;">Kizazi Hire · Connecting disability support workers with employers.</p>
      </div>
    `;

    try {
      await sendEmail({
        to: req.email.trim(),
        subject: "Thanks for reaching out — KIZAZI Hire RTO Partner Programme",
        html: confirmHtml,
      });
    } catch { }

    return { ok: true };
  }
);
