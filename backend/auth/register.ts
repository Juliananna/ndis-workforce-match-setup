import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "../db";
import { sendVerificationEmail, sendResendVerificationEmail } from "../emailer/verification_email";
import { upsertContact } from "../ghl/client";
import { workerSignedUpTopic } from "../notifications/lifecycle_topics";
import { isValidEmail, isValidPhone } from "./validation";

const appBaseUrl = secret("AppBaseUrl");

export interface RegisterRequest {
  email: string;
  password: string;
  role: "WORKER" | "EMPLOYER";
  name: string;
  phone: string;
  organisation_name?: string;
  contact_person?: string;
  abn?: string;
  promoCode?: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
  promoGrantsApplied?: string[];
}

export const register = api<RegisterRequest, RegisterResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    if (!req.email || !isValidEmail(req.email)) {
      throw APIError.invalidArgument("valid email is required");
    }
    if (!req.password || req.password.length < 8) {
      throw APIError.invalidArgument("password must be at least 8 characters");
    }
    if (req.role !== "WORKER" && req.role !== "EMPLOYER") {
      throw APIError.invalidArgument("role must be WORKER or EMPLOYER");
    }
    if (!req.name || !req.name.trim()) {
      throw APIError.invalidArgument("name is required");
    }
    if (!req.phone || !req.phone.trim()) {
      throw APIError.invalidArgument("phone is required");
    }
    if (!isValidPhone(req.phone)) {
      throw APIError.invalidArgument("please enter a valid Australian phone number");
    }
    if (req.role === "EMPLOYER") {
      if (!req.organisation_name?.trim()) {
        throw APIError.invalidArgument("organisation_name is required for EMPLOYER");
      }
      if (!req.contact_person?.trim()) {
        throw APIError.invalidArgument("contact_person is required for EMPLOYER");
      }
      if (!req.abn?.trim()) {
        throw APIError.invalidArgument("abn is required for EMPLOYER");
      }
    }

    const existing = await db.queryRow`
      SELECT user_id FROM users WHERE email = ${req.email.toLowerCase()}
    `;
    if (existing) {
      throw APIError.alreadyExists("email already registered");
    }

    const passwordHash = await bcrypt.hash(req.password, 12);
    const verificationToken = randomUUID();

    const user = await db.queryRow<{ user_id: string }>`
      INSERT INTO users (email, password_hash, role, verification_token)
      VALUES (${req.email.toLowerCase()}, ${passwordHash}, ${req.role}, ${verificationToken})
      RETURNING user_id
    `;

    if (!user) {
      throw APIError.internal("failed to create user");
    }

    if (req.role === "WORKER") {
      await db.exec`
        INSERT INTO workers (user_id, name, phone)
        VALUES (${user.user_id}, ${req.name.trim()}, ${req.phone.trim()})
      `;
      const firstName = req.name.trim().split(/\s+/)[0] ?? req.name.trim();
      try {
        await workerSignedUpTopic.publish({ userId: user.user_id, email: req.email.toLowerCase(), firstName });
      } catch { }
    } else {
      await db.exec`
        INSERT INTO employers (user_id, organisation_name, contact_person, phone, abn)
        VALUES (
          ${user.user_id},
          ${req.organisation_name!.trim()},
          ${req.contact_person!.trim()},
          ${req.phone.trim()},
          ${req.abn!.trim()}
        )
      `;
    }

    let promoGrantsApplied: string[] | undefined;

    if (req.promoCode) {
      try {
        const code = req.promoCode.trim().toUpperCase();
        const discount = await db.queryRow<{
          id: string;
          grants_upgrades: string[];
          applies_to: string;
          max_uses: number | null;
          uses_count: number;
          valid_from: Date;
          valid_until: Date | null;
          is_active: boolean;
        }>`
          SELECT id, grants_upgrades, applies_to, max_uses, uses_count, valid_from, valid_until, is_active
          FROM sales_discounts
          WHERE code = ${code}
        `;

        const now = new Date();
        if (
          discount &&
          discount.is_active &&
          discount.valid_from <= now &&
          (!discount.valid_until || discount.valid_until >= now) &&
          (discount.max_uses === null || discount.uses_count < discount.max_uses)
        ) {
          const appliesTo = discount.applies_to as "employer_subscription" | "worker_purchase" | "all";
          const upgrades = (discount.grants_upgrades ?? []) as string[];

          if (req.role === "WORKER" && appliesTo !== "employer_subscription" && upgrades.length > 0) {
            await db.exec`
              UPDATE workers
              SET docs_verified_purchased = CASE WHEN ${upgrades.includes("docs_verified")} THEN TRUE ELSE docs_verified_purchased END,
                  refs_purchased          = CASE WHEN ${upgrades.includes("refs")} THEN TRUE ELSE refs_purchased END,
                  priority_boost          = CASE WHEN ${upgrades.includes("priority_boost")} THEN TRUE ELSE priority_boost END
              WHERE user_id = ${user.user_id}
            `;

            await db.exec`UPDATE sales_discounts SET uses_count = uses_count + 1 WHERE id = ${discount.id}`;

            const labels: Record<string, string> = {
              docs_verified: "Document Verification",
              refs: "Reference Checks",
              priority_boost: "Priority Boost",
            };
            promoGrantsApplied = upgrades.map((u) => labels[u] ?? u);
          } else if (req.role === "EMPLOYER" && appliesTo !== "worker_purchase") {
            const employer = await db.queryRow<{ employer_id: string; subscription_status: string; subscription_period_end: Date | null }>`
              SELECT employer_id, subscription_status, subscription_period_end FROM employers WHERE user_id = ${user.user_id}
            `;

            if (employer) {
              const grantMonths = upgrades.find((u) => u.startsWith("subscription_months:"));
              let months = 1;
              if (upgrades.includes("subscription_biannual")) months = 6;
              else if (upgrades.includes("subscription_annual")) months = 12;
              else if (grantMonths) months = parseInt(grantMonths.split(":")[1] ?? "1", 10) || 1;

              const isCurrentlyActive =
                employer.subscription_status === "active" &&
                employer.subscription_period_end != null &&
                employer.subscription_period_end > now;
              const baseDate = isCurrentlyActive ? employer.subscription_period_end! : now;
              const newEnd = new Date(baseDate);
              newEnd.setMonth(newEnd.getMonth() + months);
              const planLabel = months >= 12 ? "annual" : months >= 6 ? "biannual" : "monthly";

              await db.exec`
                UPDATE employers
                SET subscription_status = 'active', subscription_plan = ${planLabel}, subscription_period_end = ${newEnd}
                WHERE employer_id = ${employer.employer_id}
              `;
              await db.exec`
                INSERT INTO employer_subscriptions (employer_id, plan, stripe_session_id, amount_aud_cents, status, current_period_start, current_period_end, paid_at)
                VALUES (${employer.employer_id}, ${planLabel}, ${'promo:' + discount.id + ':' + Date.now()}, 0, 'active', ${now}, ${newEnd}, ${now})
              `;
              await db.exec`UPDATE sales_discounts SET uses_count = uses_count + 1 WHERE id = ${discount.id}`;

              const label = months >= 12 ? "12-month subscription" : months >= 6 ? "6-month subscription" : `${months}-month subscription`;
              promoGrantsApplied = [`${label} access`];
            }
          }
        }
      } catch {
      }
    }

    try {
      const baseUrl = appBaseUrl();
      await sendVerificationEmail(req.email.toLowerCase(), verificationToken, baseUrl);
    } catch {
    }

    try {
      const nameParts = req.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? req.name;
      const lastName = nameParts.slice(1).join(" ") || undefined;
      await upsertContact({
        email: req.email.toLowerCase(),
        phone: req.phone.trim(),
        firstName,
        lastName,
        name: req.name.trim(),
        companyName: req.organisation_name?.trim(),
        tags: [req.role.toLowerCase(), "ndis-platform", "registered"],
      });
    } catch {
    }

    return {
      message: "Registration successful. Please check your email to verify your account.",
      userId: user.user_id,
      promoGrantsApplied,
    };
  }
);

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export const resendVerification = api<ResendVerificationRequest, ResendVerificationResponse>(
  { expose: true, method: "POST", path: "/auth/resend-verification" },
  async (req) => {
    if (!req.email || !isValidEmail(req.email)) {
      throw APIError.invalidArgument("valid email is required");
    }

    const user = await db.queryRow<{ user_id: string; verification_token: string | null; is_verified: boolean }>`
      SELECT user_id, verification_token, is_verified
      FROM users
      WHERE email = ${req.email.toLowerCase()}
    `;

    if (!user || user.is_verified) {
      return { message: "If this email is registered and unverified, a new link has been sent." };
    }

    let token = user.verification_token;
    if (!token) {
      token = randomUUID();
      await db.exec`UPDATE users SET verification_token = ${token} WHERE user_id = ${user.user_id}`;
    }

    try {
      const baseUrl = appBaseUrl();
      await sendResendVerificationEmail(req.email.toLowerCase(), token, baseUrl);
    } catch {
    }

    return { message: "If this email is registered and unverified, a new link has been sent." };
  }
);
