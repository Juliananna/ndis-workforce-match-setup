import { Subscription } from "encore.dev/pubsub";
import { sendEmail } from "./sender";
import {
  userVerifiedTopic,
  employerSubscribedTopic,
  offerDeclinedTopic,
  paymentSucceededTopic,
} from "../notifications/lifecycle_topics";

new Subscription(userVerifiedTopic, "email-welcome-on-verify", {
  handler: async (event) => {
    const isWorker = event.role === "WORKER";

    const html = isWorker
      ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px;">Welcome to Kizazi Hire, ${event.name}!</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 15px;">Your support worker account is active.</p>
      </div>

      <p style="color: #374151; font-size: 15px;">Here's how to get started and land your first shift:</p>

      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 20px 0;">
        <div style="display: flex; align-items: flex-start; padding: 16px; border-bottom: 1px solid #f3f4f6;">
          <div style="background: #dbeafe; color: #1d4ed8; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; shrink: 0; margin-right: 12px; flex-shrink: 0; text-align: center; line-height: 28px;">1</div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #111827; font-size: 14px;">Complete your profile</p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Add your skills, availability, and location so employers can find you.</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start; padding: 16px; border-bottom: 1px solid #f3f4f6;">
          <div style="background: #dbeafe; color: #1d4ed8; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; flex-shrink: 0; text-align: center; line-height: 28px; margin-right: 12px;">2</div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #111827; font-size: 14px;">Upload your compliance documents</p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">NDIS Screening, police check, WWCC, first aid — all in one place.</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start; padding: 16px;">
          <div style="background: #dbeafe; color: #1d4ed8; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; flex-shrink: 0; text-align: center; line-height: 28px; margin-right: 12px;">3</div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #111827; font-size: 14px;">Browse matched jobs</p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">We'll match you with NDIS providers that need your skills.</p>
          </div>
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
    </div>`
      : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px;">Welcome to Kizazi Hire!</h1>
        <p style="color: #ddd6fe; margin: 8px 0 0; font-size: 15px;">Your employer account is ready, ${event.name}.</p>
      </div>

      <p style="color: #374151; font-size: 15px;">You're one step away from accessing our verified workforce. Here's what to do next:</p>

      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 20px 0;">
        <div style="display: flex; align-items: flex-start; padding: 16px; border-bottom: 1px solid #f3f4f6;">
          <div style="background: #ede9fe; color: #6d28d9; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; flex-shrink: 0; text-align: center; line-height: 28px; margin-right: 12px;">1</div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #111827; font-size: 14px;">Set up your organisation profile</p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Add your logo, location, and details to build trust with workers.</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start; padding: 16px; border-bottom: 1px solid #f3f4f6;">
          <div style="background: #ede9fe; color: #6d28d9; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; flex-shrink: 0; text-align: center; line-height: 28px; margin-right: 12px;">2</div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #111827; font-size: 14px;">Subscribe to unlock the platform</p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Browse verified workers and post job requests with a subscription.</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start; padding: 16px;">
          <div style="background: #ede9fe; color: #6d28d9; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; flex-shrink: 0; text-align: center; line-height: 28px; margin-right: 12px;">3</div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #111827; font-size: 14px;">Post your first job</p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">We'll match you with qualified NDIS support workers instantly.</p>
          </div>
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
    </div>`;

    const subject = isWorker
      ? `Welcome to Kizazi Hire, ${event.name}!`
      : `Welcome aboard, ${event.name} — your employer account is ready`;

    await sendEmail({ to: event.email, subject, html });
  },
});

new Subscription(employerSubscribedTopic, "email-employer-subscribed", {
  handler: async (event) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #059669, #0d9488); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Subscription Confirmed!</h1>
        <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 15px;">${event.organisationName}</p>
      </div>

      <p style="color: #374151; font-size: 15px;">Your <strong>${event.plan}</strong> subscription is now active.</p>

      <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #e5e7eb;">Plan</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #111827; font-size: 14px; border-bottom: 1px solid #e5e7eb;">${event.plan}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 14px;">Active until</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #111827; font-size: 14px;">${event.periodEnd}</td>
        </tr>
      </table>

      <p style="color: #374151; font-size: 14px;">You can now:</p>
      <ul style="color: #374151; font-size: 14px; padding-left: 20px; line-height: 1.8;">
        <li>Browse and contact verified NDIS support workers</li>
        <li>Post unlimited job requests</li>
        <li>Send shift offers and negotiate rates</li>
        <li>Access worker compliance documents</li>
      </ul>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
    </div>`;

    await sendEmail({
      to: event.email,
      subject: `Subscription confirmed — ${event.plan} plan active until ${event.periodEnd}`,
      html,
    });
  },
});

new Subscription(offerDeclinedTopic, "email-offer-declined", {
  handler: async (event) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">Offer Declined</h2>
      <p style="color: #555; font-size: 15px;">Unfortunately, a worker has declined your shift offer.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 40%; font-size: 14px;">Location</td>
          <td style="padding: 8px 0; font-weight: 600; color: #111827; font-size: 14px;">${event.location}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Shift date</td>
          <td style="padding: 8px 0; font-weight: 600; color: #111827; font-size: 14px;">${event.shiftDate}</td>
        </tr>
        ${event.notes ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Worker note</td><td style="padding: 8px 0; color: #374151; font-size: 14px; font-style: italic;">"${event.notes}"</td></tr>` : ""}
      </table>

      <p style="color: #555; font-size: 14px;">You can browse other qualified workers and send a new offer from your dashboard.</p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
    </div>`;

    const { email } = await (async () => {
      const { default: db } = await import("../db");
      const row = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${event.recipientUserId}`;
      return row ?? { email: null };
    })();

    if (!email) return;

    await sendEmail({
      to: email,
      subject: `Offer declined — shift on ${event.shiftDate} at ${event.location}`,
      html,
    });
  },
});

new Subscription(paymentSucceededTopic, "email-payment-receipt", {
  handler: async (event) => {
    const amount = `$${(event.amountAudCents / 100).toFixed(2)} AUD`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #dcfce7; border-radius: 50%; padding: 16px; margin-bottom: 12px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 style="color: #111827; margin: 0; font-size: 22px;">Payment Received</h1>
        <p style="color: #6b7280; margin: 6px 0 0; font-size: 15px;">Thank you, ${event.name}!</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #e5e7eb;">Description</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #111827; font-size: 14px; border-bottom: 1px solid #e5e7eb;">${event.description}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #e5e7eb;">Amount</td>
          <td style="padding: 12px 16px; font-weight: 700; color: #16a34a; font-size: 16px; border-bottom: 1px solid #e5e7eb;">${amount}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #6b7280; font-size: 14px;">Date</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #111827; font-size: 14px;">${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</td>
        </tr>
      </table>

      <p style="color: #6b7280; font-size: 13px; text-align: center;">Please keep this email as your receipt. If you have questions, contact our support team.</p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
    </div>`;

    await sendEmail({
      to: event.email,
      subject: `Payment receipt — ${event.description} (${amount})`,
      html,
    });
  },
});
