import { APIError } from "encore.dev/api";
import db from "../db";

export async function assertSalesOrAdmin(userId: string): Promise<void> {
  const adminRow = await db.queryRow<{ user_id: string }>`
    SELECT user_id FROM admin_users WHERE user_id = ${userId}
  `;
  if (adminRow) return;

  const salesRow = await db.queryRow<{ user_id: string }>`
    SELECT user_id FROM sales_agents WHERE user_id = ${userId}
  `;
  if (salesRow) return;

  throw APIError.permissionDenied("sales or admin access required");
}

export async function assertAdmin(userId: string): Promise<void> {
  const row = await db.queryRow<{ user_id: string }>`
    SELECT user_id FROM admin_users WHERE user_id = ${userId}
  `;
  if (!row) throw APIError.permissionDenied("admin access required");
}
