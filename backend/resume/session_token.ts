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
    throw APIError.permissionDenied(
      "This resume session was created before secure tokens were introduced. " +
      "Please log in to your KizaziHire account to access it, or contact support."
    );
  }

  if (row.session_token_hash !== tokenHash) {
    throw APIError.permissionDenied("invalid session token");
  }
}
