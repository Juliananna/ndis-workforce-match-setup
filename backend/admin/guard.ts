import { APIError } from "encore.dev/api";
import db from "../db";

export async function assertAdmin(userId: string): Promise<void> {
  const row = await db.queryRow<{ user_id: string }>`
    SELECT user_id FROM admin_users WHERE user_id = ${userId}
  `;
  if (!row) {
    throw APIError.permissionDenied("admin access required");
  }
}

export async function assertSysAdmin(userId: string): Promise<void> {
  const row = await db.queryRow<{ is_sysadmin: boolean }>`
    SELECT is_sysadmin FROM admin_users WHERE user_id = ${userId}
  `;
  if (!row || !row.is_sysadmin) {
    throw APIError.permissionDenied("sysadmin access required");
  }
}

export async function assertAdminOrCompliance(userId: string): Promise<void> {
  const adminRow = await db.queryRow<{ user_id: string }>`
    SELECT user_id FROM admin_users WHERE user_id = ${userId}
  `;
  if (adminRow) return;

  const complianceRow = await db.queryRow<{ user_id: string }>`
    SELECT user_id FROM compliance_officers WHERE user_id = ${userId}
  `;
  if (complianceRow) return;

  throw APIError.permissionDenied("admin or compliance officer access required");
}
