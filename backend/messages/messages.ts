import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { newMessageTopic } from "./topic";

export interface Message {
  id: string;
  offerId: string;
  senderUserId: string;
  senderRole: "EMPLOYER" | "WORKER";
  body: string;
  createdAt: Date;
}

export interface SendMessageRequest {
  offerId: string;
  body: string;
}

export interface ListMessagesRequest {
  offerId: string;
}

export interface ListMessagesResponse {
  messages: Message[];
}

async function assertOfferAccess(
  offerId: string,
  userId: string,
  role: string
): Promise<{ employerId: string; workerId: string }> {
  const offer = await db.queryRow<{ employer_id: string; worker_id: string }>`
    SELECT employer_id, worker_id FROM offers WHERE offer_id = ${offerId}
  `;
  if (!offer) throw APIError.notFound("offer not found");

  if (role === "EMPLOYER") {
    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${userId}
    `;
    if (!employer || employer.employer_id !== offer.employer_id) {
      throw APIError.permissionDenied("not authorized to access this offer");
    }
  } else if (role === "WORKER") {
    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${userId}
    `;
    if (!worker || worker.worker_id !== offer.worker_id) {
      throw APIError.permissionDenied("not authorized to access this offer");
    }
  } else {
    throw APIError.permissionDenied("not authorized");
  }

  return { employerId: offer.employer_id, workerId: offer.worker_id };
}

export const sendMessage = api<SendMessageRequest, Message>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/messages" },
  async (req) => {
    const auth = getAuthData()!;

    if (!req.body?.trim()) throw APIError.invalidArgument("message body cannot be empty");
    if (req.body.length > 2000) throw APIError.invalidArgument("message body cannot exceed 2000 characters");

    await assertOfferAccess(req.offerId, auth.userID, auth.role);

    const row = await db.queryRow<{
      id: string;
      offer_id: string;
      sender_user_id: string;
      sender_role: string;
      body: string;
      created_at: Date;
    }>`
      INSERT INTO messages (offer_id, sender_user_id, sender_role, body)
      VALUES (${req.offerId}, ${auth.userID}, ${auth.role}, ${req.body.trim()})
      RETURNING id, offer_id, sender_user_id, sender_role, body, created_at
    `;

    if (!row) throw APIError.internal("failed to send message");

    const recipientRole: "EMPLOYER" | "WORKER" = auth.role === "EMPLOYER" ? "WORKER" : "EMPLOYER";

    let recipientUserId: string | null = null;
    if (recipientRole === "WORKER") {
      const w = await db.queryRow<{ user_id: string }>`
        SELECT u.user_id FROM users u
        JOIN workers w ON w.user_id = u.user_id
        JOIN offers o ON o.worker_id = w.worker_id
        WHERE o.offer_id = ${req.offerId}
      `;
      recipientUserId = w?.user_id ?? null;
    } else {
      const e = await db.queryRow<{ user_id: string }>`
        SELECT u.user_id FROM users u
        JOIN employers e ON e.user_id = u.user_id
        JOIN offers o ON o.employer_id = e.employer_id
        WHERE o.offer_id = ${req.offerId}
      `;
      recipientUserId = e?.user_id ?? null;
    }

    if (recipientUserId) {
      const offerInfo = await db.queryRow<{ snapshot_location: string; snapshot_shift_date: string }>`
        SELECT snapshot_location, snapshot_shift_date::text AS snapshot_shift_date
        FROM offers WHERE offer_id = ${req.offerId}
      `;
      await newMessageTopic.publish({
        messageId: row.id,
        offerId: row.offer_id,
        senderRole: auth.role as "EMPLOYER" | "WORKER",
        senderUserId: auth.userID,
        recipientUserId,
        recipientRole,
        bodyPreview: row.body.length > 120 ? row.body.slice(0, 117) + "..." : row.body,
        location: offerInfo?.snapshot_location ?? "",
        shiftDate: offerInfo?.snapshot_shift_date ?? "",
      });
    }

    return {
      id: row.id,
      offerId: row.offer_id,
      senderUserId: row.sender_user_id,
      senderRole: row.sender_role as Message["senderRole"],
      body: row.body,
      createdAt: row.created_at,
    };
  }
);

export const listMessages = api<ListMessagesRequest, ListMessagesResponse>(
  { expose: true, auth: true, method: "GET", path: "/offers/:offerId/messages" },
  async (req) => {
    const auth = getAuthData()!;

    await assertOfferAccess(req.offerId, auth.userID, auth.role);

    const now = new Date();
    if (auth.role === "EMPLOYER") {
      await db.exec`
        UPDATE messages
        SET read_by_employer_at = ${now}
        WHERE offer_id = ${req.offerId}
          AND read_by_employer_at IS NULL
          AND sender_role = 'WORKER'
      `;
    } else {
      await db.exec`
        UPDATE messages
        SET read_by_worker_at = ${now}
        WHERE offer_id = ${req.offerId}
          AND read_by_worker_at IS NULL
          AND sender_role = 'EMPLOYER'
      `;
    }

    const rows = await db.queryAll<{
      id: string;
      offer_id: string;
      sender_user_id: string;
      sender_role: string;
      body: string;
      created_at: Date;
    }>`
      SELECT id, offer_id, sender_user_id, sender_role, body, created_at
      FROM messages
      WHERE offer_id = ${req.offerId}
      ORDER BY created_at ASC
    `;

    return {
      messages: rows.map((r) => ({
        id: r.id,
        offerId: r.offer_id,
        senderUserId: r.sender_user_id,
        senderRole: r.sender_role as Message["senderRole"],
        body: r.body,
        createdAt: r.created_at,
      })),
    };
  }
);
