import { api, APIError } from "encore.dev/api";
import db from "../db";
import { rowToSession } from "./session_helpers";
import { convertSessionToProfile } from "./convert_helpers";

interface ConvertToProfileRequest {
  id: string;
}

interface ConvertToProfileResponse {
  workerId: string;
  userId: string;
  message: string;
  alreadyExists: boolean;
}

export const convertToProfile = api<ConvertToProfileRequest, ConvertToProfileResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/convert-to-profile" },
  async (req) => {
    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${req.id}`;
    if (!row) throw APIError.notFound("session not found");

    const session = rowToSession(row);

    if (!session.email) {
      throw APIError.failedPrecondition("email must be captured before converting to a profile");
    }

    if (session.convertedWorkerId) {
      const userRow = await db.queryRow<{ user_id: string }>`
        SELECT user_id FROM workers WHERE worker_id = ${session.convertedWorkerId}
      `;
      return {
        workerId: session.convertedWorkerId,
        userId: userRow?.user_id ?? "",
        message: "Already converted",
        alreadyExists: true,
      };
    }

    const result = await convertSessionToProfile(req.id, session);

    return {
      workerId: result.workerId,
      userId: result.userId,
      message: result.alreadyExists ? "Linked to existing account" : "KizaziHire worker profile created successfully",
      alreadyExists: result.alreadyExists,
    };
  }
);
