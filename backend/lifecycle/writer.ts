import { createHash } from "crypto";
import db from "../db";
import { LIFECYCLE_EVENT_VERSION, type LifecycleEntityType, type LifecycleEventType, type LifecyclePayload } from "./types";

export interface WriteEventOptions {
  eventType: LifecycleEventType;
  entityType: LifecycleEntityType;
  entityId: string;
  payload: LifecyclePayload;
  workerId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  idempotencyKey?: string;
}

/**
 * Derives a deterministic idempotency key from entity coordinates + event type.
 * Callers may supply their own key to scope idempotency to a specific state
 * snapshot (e.g. including a timestamp component for events that can recur
 * legitimately, such as ready_to_hire_auto_revoked).
 */
export function deriveEventId(
  entityType: LifecycleEntityType,
  entityId: string,
  eventType: LifecycleEventType,
  suffix?: string
): string {
  const raw = `${entityType}:${entityId}:${eventType}${suffix ? `:${suffix}` : ""}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 64);
}

/**
 * Writes a lifecycle event to the durable store.
 *
 * Idempotent: if a row with the same event_id already exists, the INSERT is
 * silently skipped via ON CONFLICT DO NOTHING.  The function always returns
 * without error — it must never interrupt the calling business action.
 *
 * Events cannot regress: callers are responsible for not emitting an earlier
 * event after a later one.  The writer does not enforce ordering because
 * the append-only log is the source of truth.
 */
export async function writeLifecycleEvent(opts: WriteEventOptions): Promise<void> {
  try {
    const eventId = opts.idempotencyKey ??
      deriveEventId(opts.entityType, opts.entityId, opts.eventType);

    const payload = opts.payload as unknown as Record<string, unknown>;
    const now = new Date();

    await db.exec`
      INSERT INTO lifecycle_events
        (event_id, event_type, event_version, entity_type, entity_id,
         occurred_at, payload, worker_id, session_id, user_id)
      VALUES
        (${eventId}, ${opts.eventType}, ${LIFECYCLE_EVENT_VERSION},
         ${opts.entityType}, ${opts.entityId},
         ${now}, ${JSON.stringify(payload)}::jsonb,
         ${opts.workerId ?? null}, ${opts.sessionId ?? null}, ${opts.userId ?? null})
      ON CONFLICT (event_id) DO NOTHING
    `;
  } catch (err) {
    console.error("[lifecycle] failed to write event", opts.eventType, opts.entityId, err);
  }
}

/**
 * Returns the most recent lifecycle event of a given type for an entity.
 * Returns null if no matching event exists.
 */
export async function getLatestEvent(
  entityType: LifecycleEntityType,
  entityId: string,
  eventType: LifecycleEventType
): Promise<{ eventId: string; occurredAt: Date; payload: Record<string, unknown> } | null> {
  const row = await db.queryRow<{
    event_id: string;
    occurred_at: Date;
    payload: unknown;
  }>`
    SELECT event_id, occurred_at, payload
    FROM lifecycle_events
    WHERE entity_type = ${entityType}
      AND entity_id = ${entityId}
      AND event_type = ${eventType}
    ORDER BY occurred_at DESC
    LIMIT 1
  `;

  if (!row) return null;
  return {
    eventId: row.event_id,
    occurredAt: row.occurred_at,
    payload: (typeof row.payload === "string"
      ? JSON.parse(row.payload)
      : row.payload) as Record<string, unknown>,
  };
}

/**
 * Returns true if an event type has already been recorded for the entity.
 * Used by callers to avoid emitting duplicate non-recurring events.
 */
export async function hasEvent(
  entityType: LifecycleEntityType,
  entityId: string,
  eventType: LifecycleEventType
): Promise<boolean> {
  const row = await db.queryRow<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM lifecycle_events
      WHERE entity_type = ${entityType}
        AND entity_id = ${entityId}
        AND event_type = ${eventType}
    ) AS exists
  `;
  return row?.exists ?? false;
}
