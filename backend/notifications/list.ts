import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { NotificationType } from "./topic";

export interface Notification {
  id: string;
  type: NotificationType;
  documentId: string | null;
  title: string;
  body: string;
  senderName: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface ListNotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export const listNotifications = api<void, ListNotificationsResponse>(
  { expose: true, auth: true, method: "GET", path: "/notifications" },
  async () => {
    const auth = getAuthData()!;

    const rows = await db.queryAll<{
      id: string;
      type: string;
      document_id: string | null;
      title: string;
      body: string;
      sender_name: string | null;
      read_at: Date | null;
      created_at: Date;
    }>`
      SELECT id, type, document_id, title, body, sender_name, read_at, created_at
      FROM notifications
      WHERE user_id = ${auth.userID}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const notifications: Notification[] = rows.map((r) => ({
      id: r.id,
      type: r.type as NotificationType,
      documentId: r.document_id,
      title: r.title,
      body: r.body,
      senderName: r.sender_name,
      readAt: r.read_at,
      createdAt: r.created_at,
    }));

    return {
      notifications,
      unreadCount: notifications.filter((n) => n.readAt === null).length,
    };
  }
);

export interface MarkReadRequest {
  notificationIds: string[];
}

export const markNotificationsRead = api<MarkReadRequest, void>(
  { expose: true, auth: true, method: "POST", path: "/notifications/read" },
  async (req) => {
    const auth = getAuthData()!;

    if (!req.notificationIds || req.notificationIds.length === 0) {
      throw APIError.invalidArgument("notificationIds must be non-empty");
    }

    await db.exec`
      UPDATE notifications
      SET read_at = NOW()
      WHERE user_id = ${auth.userID}
        AND id = ANY(${req.notificationIds}::uuid[])
        AND read_at IS NULL
    `;
  }
);
