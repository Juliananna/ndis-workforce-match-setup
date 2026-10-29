import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "../admin/guard";
import type { LifecycleEventType } from "./types";

export interface LifecycleEventRow {
  id: string;
  eventId: string;
  eventType: string;
  eventVersion: number;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
  workerId: string | null;
  sessionId: string | null;
  userId: string | null;
}

export interface ListLifecycleEventsRequest {
  workerId?: string;
  sessionId?: string;
  userId?: string;
  eventType?: string;
  limit?: number;
}

export interface ListLifecycleEventsResponse {
  events: LifecycleEventRow[];
}

export const listLifecycleEvents = api<ListLifecycleEventsRequest, ListLifecycleEventsResponse>(
  {
    expose: true,
    auth: true,
    method: "GET",
    path: "/admin/lifecycle-events",
  },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const limit = Math.min(req.limit ?? 50, 200);

    let rows: Array<{
      id: string;
      event_id: string;
      event_type: string;
      event_version: number;
      entity_type: string;
      entity_id: string;
      occurred_at: Date;
      payload: unknown;
      worker_id: string | null;
      session_id: string | null;
      user_id: string | null;
    }>;

    if (req.workerId) {
      rows = await db.queryAll`
        SELECT id, event_id, event_type, event_version, entity_type, entity_id,
               occurred_at, payload, worker_id, session_id, user_id
        FROM lifecycle_events
        WHERE worker_id = ${req.workerId}
        ORDER BY occurred_at DESC
        LIMIT ${limit}
      `;
    } else if (req.sessionId) {
      rows = await db.queryAll`
        SELECT id, event_id, event_type, event_version, entity_type, entity_id,
               occurred_at, payload, worker_id, session_id, user_id
        FROM lifecycle_events
        WHERE session_id = ${req.sessionId}
        ORDER BY occurred_at DESC
        LIMIT ${limit}
      `;
    } else if (req.userId) {
      rows = await db.queryAll`
        SELECT id, event_id, event_type, event_version, entity_type, entity_id,
               occurred_at, payload, worker_id, session_id, user_id
        FROM lifecycle_events
        WHERE user_id = ${req.userId}
        ORDER BY occurred_at DESC
        LIMIT ${limit}
      `;
    } else if (req.eventType) {
      rows = await db.queryAll`
        SELECT id, event_id, event_type, event_version, entity_type, entity_id,
               occurred_at, payload, worker_id, session_id, user_id
        FROM lifecycle_events
        WHERE event_type = ${req.eventType}
        ORDER BY occurred_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = await db.queryAll`
        SELECT id, event_id, event_type, event_version, entity_type, entity_id,
               occurred_at, payload, worker_id, session_id, user_id
        FROM lifecycle_events
        ORDER BY occurred_at DESC
        LIMIT ${limit}
      `;
    }

    return {
      events: rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        eventType: r.event_type,
        eventVersion: r.event_version,
        entityType: r.entity_type,
        entityId: r.entity_id,
        occurredAt: r.occurred_at,
        payload: (typeof r.payload === "string"
          ? JSON.parse(r.payload)
          : r.payload) as Record<string, unknown>,
        workerId: r.worker_id,
        sessionId: r.session_id,
        userId: r.user_id,
      })),
    };
  }
);
