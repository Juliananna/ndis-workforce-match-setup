import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { VALID_SKILLS } from "./skill_tags";

export { VALID_SKILLS };

export interface WorkerSkillsResponse {
  skills: string[];
}

export interface UpdateWorkerSkillsRequest {
  skills: string[];
}

// Returns the authenticated worker's current skill tags.
export const getWorkerSkills = api<void, WorkerSkillsResponse>(
  { expose: true, auth: true, method: "GET", path: "/workers/skills" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) {
      throw APIError.notFound("worker not found");
    }

    const rows = await db.queryAll<{ skill: string }>`
      SELECT skill FROM worker_skills WHERE worker_id = ${worker.worker_id} ORDER BY skill
    `;

    return { skills: rows.map((r) => r.skill) };
  }
);

// Replaces the authenticated worker's skill tags with the provided list.
export const updateWorkerSkills = api<UpdateWorkerSkillsRequest, WorkerSkillsResponse>(
  { expose: true, auth: true, method: "PUT", path: "/workers/skills" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const validSet = new Set<string>(VALID_SKILLS);
    for (const skill of req.skills) {
      if (!validSet.has(skill)) {
        throw APIError.invalidArgument(`invalid skill: ${skill}`);
      }
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) {
      throw APIError.notFound("worker not found");
    }

    await db.exec`DELETE FROM worker_skills WHERE worker_id = ${worker.worker_id}`;

    for (const skill of req.skills) {
      await db.exec`
        INSERT INTO worker_skills (worker_id, skill) VALUES (${worker.worker_id}, ${skill})
        ON CONFLICT DO NOTHING
      `;
    }

    return { skills: [...req.skills].sort() };
  }
);

// Returns the list of all supported skill tags.
export const listSkillTags = api<void, { skills: string[] }>(
  { expose: true, method: "GET", path: "/workers/skill-tags" },
  async () => {
    return { skills: [...VALID_SKILLS] };
  }
);
