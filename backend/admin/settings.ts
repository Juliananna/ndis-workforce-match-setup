import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "./guard";

export interface PlatformSetting {
  key: string;
  value: string;
  description: string | null;
  updatedByEmail: string | null;
  updatedAt: Date;
}

export interface ListSettingsResponse {
  settings: PlatformSetting[];
}

export const adminListSettings = api<void, ListSettingsResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/settings" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      key: string;
      value: string;
      description: string | null;
      updated_by_email: string | null;
      updated_at: Date;
    }>`
      SELECT
        ps.key,
        ps.value,
        ps.description,
        u.email AS updated_by_email,
        ps.updated_at
      FROM platform_settings ps
      LEFT JOIN users u ON u.user_id = ps.updated_by
      ORDER BY ps.key ASC
    `;

    return {
      settings: rows.map((r) => ({
        key: r.key,
        value: r.value,
        description: r.description,
        updatedByEmail: r.updated_by_email,
        updatedAt: r.updated_at,
      })),
    };
  }
);

export interface UpdateSettingRequest {
  key: string;
  value: string;
}

export const adminUpdateSetting = api<UpdateSettingRequest, PlatformSetting>(
  { expose: true, auth: true, method: "PUT", path: "/admin/settings/:key" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.key?.trim()) throw APIError.invalidArgument("key is required");
    if (req.value === undefined || req.value === null) throw APIError.invalidArgument("value is required");

    const existing = await db.queryRow<{ key: string; value: string }>`
      SELECT key, value FROM platform_settings WHERE key = ${req.key}
    `;
    if (!existing) throw APIError.notFound("setting not found");

    const row = await db.queryRow<{
      key: string;
      value: string;
      description: string | null;
      updated_at: Date;
    }>`
      UPDATE platform_settings
      SET value = ${req.value}, updated_by = ${auth.userID}, updated_at = NOW()
      WHERE key = ${req.key}
      RETURNING key, value, description, updated_at
    `;

    if (!row) throw APIError.internal("update failed");

    const adminUser = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${auth.userID}`;

    await db.exec`
      INSERT INTO admin_audit_log (admin_user_id, admin_email, action, entity_type, entity_id, detail)
      VALUES (
        ${auth.userID},
        ${adminUser?.email ?? "unknown"},
        'UPDATE_SETTING',
        'platform_setting',
        ${req.key},
        ${JSON.stringify({ from: existing.value, to: req.value })}::jsonb
      )
    `;

    return {
      key: row.key,
      value: row.value,
      description: row.description,
      updatedByEmail: adminUser?.email ?? null,
      updatedAt: row.updated_at,
    };
  }
);

export interface AuditLogEntry {
  id: string;
  adminEmail: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ListAuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
}

export interface ListAuditLogRequest {
  limit?: number;
  offset?: number;
  action?: string;
}

export const adminListAuditLog = api<ListAuditLogRequest, ListAuditLogResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/audit-log" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const limit = Math.min(req.limit ?? 50, 200);
    const offset = req.offset ?? 0;
    const actionFilter = req.action?.trim() || null;

    const [rows, countRow] = await Promise.all([
      db.queryAll<{
        id: string;
        admin_email: string;
        action: string;
        entity_type: string | null;
        entity_id: string | null;
        detail: string | null;
        created_at: Date;
      }>`
        SELECT id, admin_email, action, entity_type, entity_id, detail::text, created_at
        FROM admin_audit_log
        WHERE (${actionFilter}::text IS NULL OR action = ${actionFilter}::text)
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM admin_audit_log
        WHERE (${actionFilter}::text IS NULL OR action = ${actionFilter}::text)
      `,
    ]);

    return {
      entries: rows.map((r) => ({
        id: r.id,
        adminEmail: r.admin_email,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        detail: r.detail ? JSON.parse(r.detail) : null,
        createdAt: r.created_at,
      })),
      total: countRow?.count ?? 0,
    };
  }
);

export async function writeAuditLog(
  adminUserId: string,
  adminEmail: string,
  action: string,
  entityType?: string,
  entityId?: string,
  detail?: Record<string, unknown>
): Promise<void> {
  await db.exec`
    INSERT INTO admin_audit_log (admin_user_id, admin_email, action, entity_type, entity_id, detail)
    VALUES (
      ${adminUserId},
      ${adminEmail},
      ${action},
      ${entityType ?? null},
      ${entityId ?? null},
      ${detail ? JSON.stringify(detail) : null}::jsonb
    )
  `;
}
