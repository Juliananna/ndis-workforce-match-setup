import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "../db";
import { assertAdmin } from "./guard";

export interface CreateComplianceOfficerRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface CreateComplianceOfficerResponse {
  userId: string;
  email: string;
  fullName: string;
}

export const createComplianceOfficer = api<CreateComplianceOfficerRequest, CreateComplianceOfficerResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/compliance-officers" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) {
      throw APIError.invalidArgument("valid email is required");
    }
    if (!req.password || req.password.length < 8) {
      throw APIError.invalidArgument("password must be at least 8 characters");
    }
    if (!req.fullName?.trim()) {
      throw APIError.invalidArgument("fullName is required");
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
      INSERT INTO users (email, password_hash, role, is_verified, verification_token)
      VALUES (${req.email.toLowerCase()}, ${passwordHash}, 'COMPLIANCE', TRUE, ${verificationToken})
      RETURNING user_id
    `;

    if (!user) {
      throw APIError.internal("failed to create user");
    }

    await db.exec`
      INSERT INTO compliance_officers (user_id, full_name, created_by)
      VALUES (${user.user_id}, ${req.fullName.trim()}, ${auth.userID})
    `;

    return {
      userId: user.user_id,
      email: req.email.toLowerCase(),
      fullName: req.fullName.trim(),
    };
  }
);

export interface ListComplianceOfficersResponse {
  officers: Array<{
    userId: string;
    email: string;
    fullName: string;
    createdAt: Date;
  }>;
}

export const listComplianceOfficers = api<void, ListComplianceOfficersResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/compliance-officers" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      user_id: string;
      email: string;
      full_name: string;
      created_at: Date;
    }>`
      SELECT co.user_id, u.email, co.full_name, co.created_at
      FROM compliance_officers co
      JOIN users u ON u.user_id = co.user_id
      ORDER BY co.created_at DESC
    `;

    return {
      officers: rows.map((r) => ({
        userId: r.user_id,
        email: r.email,
        fullName: r.full_name,
        createdAt: r.created_at,
      })),
    };
  }
);

export interface DeleteComplianceOfficerRequest {
  userId: string;
}

export const deleteComplianceOfficer = api<DeleteComplianceOfficerRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/admin/compliance-officers/:userId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const row = await db.queryRow<{ user_id: string }>`
      SELECT user_id FROM compliance_officers WHERE user_id = ${req.userId}
    `;
    if (!row) throw APIError.notFound("compliance officer not found");

    await db.exec`DELETE FROM users WHERE user_id = ${req.userId}`;
  }
);
