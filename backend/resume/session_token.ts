import { createHash, randomBytes } from "crypto";
import { APIError } from "encore.dev/api";
import db from "../db";

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifySessionToken(sessionId: string, token: string | undefined | null): Promise<void> {
  if (!token) {
    throw APIError.permissionDenied("session token required");
  }

  const tokenHash = hashToken(token);

  const row = await db.queryRow<{ id: string; session_token_hash: string | null }>`
    SELECT id, session_token_hash FROM resume_sessions WHERE id = ${sessionId}
  `;

  if (!row) {
    throw APIError.notFound("session not found");
  }

  if (row.session_token_hash === null) {
    await db.exec`
      UPDATE resume_sessions
      SET session_token_hash = ${tokenHash}, updated_at = NOW()
      WHERE id = ${sessionId}
    `;
    return;
  }

  if (row.session_token_hash !== tokenHash) {
    throw APIError.permissionDenied("invalid session token");
  }
}
