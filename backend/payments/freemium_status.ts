import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { getEmployerTier } from "../employers/subscription_guard";
import { FREE_TIER_JOB_LIMIT } from "../jobs/create";
import { FREE_TIER_BROWSE_LIMIT } from "../workers/browse";

export interface EmployerFreemiumStatus {
  isFreeTier: boolean;
  jobCount: number;
  jobLimit: number;
  browseLimit: number;
}

export const getEmployerFreemiumStatus = api<void, EmployerFreemiumStatus>(
  { expose: true, auth: true, method: "GET", path: "/payments/employer/freemium-status" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can view freemium status");
    }

    const tierInfo = await getEmployerTier(auth.userID);

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const jobCount = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int AS count FROM job_requests WHERE employer_id = ${employer.employer_id}
    `;

    return {
      isFreeTier: !tierInfo.isActive,
      jobCount: jobCount?.count ?? 0,
      jobLimit: FREE_TIER_JOB_LIMIT,
      browseLimit: FREE_TIER_BROWSE_LIMIT,
    };
  }
);
