import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { computeCompletion, type CompletionSection, type CompletionResult } from "./completion_shared";

export type { CompletionSection };
export type WorkerCompletionResponse = CompletionResult;

export const getWorkerCompletion = api<void, CompletionResult>(
  { expose: true, auth: true, method: "GET", path: "/workers/completion" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const worker = await db.queryRow<{
      worker_id: string;
      full_name: string | null;
      location: string | null;
      bio: string | null;
      experience_years: number | null;
      phone: string;
      avatar_url: string | null;
    }>`
      SELECT worker_id, full_name, location, bio, experience_years, phone, avatar_url
      FROM workers WHERE user_id = ${auth.userID}
    `;

    if (!worker) throw APIError.notFound("worker profile not found");

    const wid = worker.worker_id;

    const [skillsRow, availRow, docsRow, resumeRow, refsRow] = await Promise.all([
      db.queryRow<{ cnt: number }>`SELECT COUNT(*)::int AS cnt FROM worker_skills WHERE worker_id = ${wid}`,
      db.queryRow<{ cnt: number }>`SELECT COUNT(*)::int AS cnt FROM worker_availability WHERE worker_id = ${wid}`,
      db.queryRow<{ cnt: number }>`SELECT COUNT(*)::int AS cnt FROM worker_documents WHERE worker_id = ${wid}`,
      db.queryRow<{ cnt: number }>`SELECT COUNT(*)::int AS cnt FROM worker_resumes WHERE worker_id = ${wid}`,
      db.queryRow<{ cnt: number }>`SELECT COUNT(*)::int AS cnt FROM worker_references WHERE worker_id = ${wid}`,
    ]);

    return computeCompletion({
      fullName:      !!worker.full_name?.trim(),
      phone:         !!worker.phone?.trim(),
      location:      !!worker.location?.trim(),
      bio:           !!worker.bio?.trim(),
      experienceYears: worker.experience_years !== null,
      photo:         !!worker.avatar_url,
      skills:        (skillsRow?.cnt ?? 0) > 0,
      availability:  (availRow?.cnt ?? 0) > 0,
      documents:     (docsRow?.cnt ?? 0) >= 3,
      resume:        (resumeRow?.cnt ?? 0) > 0,
      references:    (refsRow?.cnt ?? 0) > 0,
    });
  }
);
