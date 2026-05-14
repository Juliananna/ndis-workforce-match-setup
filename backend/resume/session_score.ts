import { api, APIError } from "encore.dev/api";
import db from "../db";
import { rowToSession, computeScore } from "./session_helpers";
import type { ResumeSession, ScoreBreakdown } from "./types";

interface ScoreSessionParams {
  id: string;
}

interface ScoreSessionResponse {
  session: ResumeSession;
  score: number;
  breakdown: ScoreBreakdown;
  suggestions: string[];
}

// Calculates the resume strength score for a session.
export const scoreSession = api<ScoreSessionParams, ScoreSessionResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/score" },
  async ({ id }) => {
    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${id}`;
    if (!row) throw APIError.notFound("session not found");

    const session = rowToSession(row);

    const docCount = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM resume_session_documents WHERE session_id = ${id}
    `;
    const refereeCount = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM resume_session_referees WHERE session_id = ${id}
    `;

    const { total, breakdown } = computeScore(session, docCount?.count ?? 0, refereeCount?.count ?? 0);
    const suggestions = buildSuggestions(session, docCount?.count ?? 0, refereeCount?.count ?? 0);

    await db.exec`
      UPDATE resume_sessions
      SET resume_strength_score = ${total},
          score_breakdown = ${JSON.stringify(breakdown)}::jsonb,
          updated_at = NOW()
      WHERE id = ${id}
    `;

    const updated = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${id}`;
    return { session: rowToSession(updated!), score: total, breakdown, suggestions };
  }
);

function buildSuggestions(session: ResumeSession, docCount: number, refereeCount: number): string[] {
  const suggestions: string[] = [];

  if (!session.phone) suggestions.push("Add your phone number so providers can reach you.");
  if (!session.suburb) suggestions.push("Add your suburb and state for location-based matching.");
  if (session.workHistory.length === 0) suggestions.push("Add at least one work history entry to strengthen your resume.");
  if (session.qualifications.length === 0) suggestions.push("Include your Certificate III or other qualifications.");
  if (!session.checks.some((c) => c.type === "NDIS Worker Screening")) suggestions.push("Add your NDIS Worker Screening check for provider trust.");
  if (!session.checks.some((c) => c.type === "Police Check")) suggestions.push("Include a Police Check to improve your profile.");
  if (session.availability.length === 0) suggestions.push("Set your availability days and shift preferences.");
  if (session.capabilityStories.length === 0) suggestions.push("Share a capability story to show your support approach.");
  if (refereeCount < 2) suggestions.push("Add at least two referees to complete your professional profile.");
  if (docCount === 0) suggestions.push("Upload a key document (e.g. NDIS screening card or First Aid cert) to verify your profile.");

  return suggestions.slice(0, 5);
}
