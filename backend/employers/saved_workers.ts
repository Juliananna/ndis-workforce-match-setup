import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { requireEmployerSubscription } from "./subscription_guard";
import type { WorkerSummary } from "../workers/browse";

interface SaveWorkerRequest {
  workerId: string;
}

interface SaveWorkerResponse {
  saved: boolean;
}

interface UnsaveWorkerRequest {
  workerId: string;
}

interface UnsaveWorkerResponse {
  saved: boolean;
}

interface GetSavedStatusRequest {
  workerIds: string[];
}

interface GetSavedStatusResponse {
  savedIds: string[];
}

interface ListSavedWorkersResponse {
  workers: WorkerSummary[];
}

function parsePgArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (!val) return [];
  const s = String(val);
  const inner = s.replace(/^{|}$/g, "").trim();
  if (!inner) return [];
  return inner.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
}

// Saves a worker to the employer's shortlist.
export const saveWorker = api<SaveWorkerRequest, SaveWorkerResponse>(
  { expose: true, auth: true, method: "POST", path: "/employers/saved-workers" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can save workers");
    }
    await requireEmployerSubscription(auth.userID);

    const workerToSave = await db.queryRow<{ onboarding_status: string }>`
      SELECT onboarding_status FROM workers WHERE worker_id = ${req.workerId}
    `;
    if (!workerToSave) throw APIError.notFound("worker not found");
    if (workerToSave.onboarding_status !== "active") {
      throw APIError.failedPrecondition("worker has not uploaded any compliance documents yet");
    }

    await db.exec`
      INSERT INTO saved_workers (employer_id, worker_id)
      VALUES (${auth.userID}, ${req.workerId})
      ON CONFLICT (employer_id, worker_id) DO NOTHING
    `;

    return { saved: true };
  }
);

// Removes a worker from the employer's shortlist.
export const unsaveWorker = api<UnsaveWorkerRequest, UnsaveWorkerResponse>(
  { expose: true, auth: true, method: "DELETE", path: "/employers/saved-workers/:workerId" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can unsave workers");
    }

    await db.exec`
      DELETE FROM saved_workers
      WHERE employer_id = ${auth.userID} AND worker_id = ${req.workerId}
    `;

    return { saved: false };
  }
);

// Returns saved status for a list of worker IDs.
export const getSavedWorkerStatus = api<GetSavedStatusRequest, GetSavedStatusResponse>(
  { expose: true, auth: true, method: "POST", path: "/employers/saved-workers/status" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      return { savedIds: [] };
    }

    if (req.workerIds.length === 0) return { savedIds: [] };

    const rows = await db.queryAll<{ worker_id: string }>`
      SELECT worker_id FROM saved_workers
      WHERE employer_id = ${auth.userID} AND worker_id = ANY(${req.workerIds})
    `;

    return { savedIds: rows.map((r) => r.worker_id) };
  }
);

// Lists all workers saved/shortlisted by the employer.
export const listSavedWorkers = api<void, ListSavedWorkersResponse>(
  { expose: true, auth: true, method: "GET", path: "/employers/saved-workers" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can list saved workers");
    }
    await requireEmployerSubscription(auth.userID);

    type WorkerRow = {
      worker_id: string;
      name: string;
      full_name: string | null;
      location: string | null;
      bio: string | null;
      experience_years: number | null;
      qualifications: string | null;
      drivers_license: boolean;
      vehicle_access: boolean;
      travel_radius_km: number | null;
      avatar_url: string | null;
      intro_video_url: string | null;
      avg_rating: number | null;
      review_count: number;
      available_days: string[] | null;
      minimum_pay_rate: number | null;
      priority_boost: boolean;
      docs_verified_purchased: boolean;
      refs_purchased: boolean;
      docs_verified: boolean;
      refs_verified: boolean;
      last_login_at: Date | null;
      has_id_doc: boolean;
      has_cert_doc: boolean;
      has_availability: boolean;
      has_references: boolean;
      profile_complete: boolean;
    };

    const rows = await db.queryAll<WorkerRow>`
      SELECT
        w.worker_id, w.name, w.full_name, w.location, w.bio, w.experience_years,
        w.qualifications, w.drivers_license, w.vehicle_access, w.travel_radius_km,
        w.avatar_url, w.intro_video_url, w.priority_boost, w.docs_verified_purchased, w.refs_purchased,
        wa.available_days, wa.minimum_pay_rate, u.last_login_at,
        AVG(r.rating) AS avg_rating,
        COUNT(r.id) AS review_count,
        EXISTS (
          SELECT 1 FROM worker_documents wd
          WHERE wd.worker_id = w.worker_id AND wd.verification_status = 'Verified'
        ) AS docs_verified,
        EXISTS (
          SELECT 1 FROM worker_references wr
          JOIN reference_checks rc ON rc.reference_id = wr.id
          WHERE wr.worker_id = w.worker_id
        ) AS refs_verified,
        EXISTS (
          SELECT 1 FROM worker_documents wd
          WHERE wd.worker_id = w.worker_id
          AND wd.document_type IN ('Driver''s Licence', 'Passport / ID')
        ) AS has_id_doc,
        EXISTS (
          SELECT 1 FROM worker_documents wd
          WHERE wd.worker_id = w.worker_id
          AND wd.document_type IN (
            'NDIS Worker Screening Check', 'NDIS Worker Orientation Module',
            'NDIS Code of Conduct acknowledgement', 'Infection Control Certificate',
            'First Aid Certificate', 'CPR Certificate',
            'Certificate III / IV Disability', 'Working With Children Check', 'Police Clearance'
          )
        ) AS has_cert_doc,
        EXISTS (
          SELECT 1 FROM worker_availability wva WHERE wva.worker_id = w.worker_id
        ) AS has_availability,
        EXISTS (
          SELECT 1 FROM worker_references wrf WHERE wrf.worker_id = w.worker_id
        ) AS has_references,
        (
          (w.full_name IS NOT NULL AND w.full_name <> '') AND
          (w.location IS NOT NULL AND w.location <> '') AND
          (w.bio IS NOT NULL AND w.bio <> '') AND
          (w.experience_years IS NOT NULL) AND
          (w.phone IS NOT NULL AND w.phone <> '')
        ) AS profile_complete
      FROM saved_workers sw
      JOIN workers w ON w.worker_id = sw.worker_id
      LEFT JOIN worker_availability wa ON wa.worker_id = w.worker_id
      LEFT JOIN reviews r ON r.reviewee_user_id = w.user_id AND r.reviewee_role = 'WORKER'
      LEFT JOIN users u ON u.user_id = w.user_id
      WHERE sw.employer_id = ${auth.userID}
      GROUP BY w.worker_id, wa.available_days, wa.minimum_pay_rate, u.last_login_at, sw.created_at
      ORDER BY sw.created_at DESC
    `;

    const workerIds = rows.map((r) => r.worker_id);

    const allSkills = workerIds.length > 0
      ? await db.queryAll<{ worker_id: string; skill: string }>`
          SELECT worker_id, skill FROM worker_skills WHERE worker_id = ANY(${workerIds})
        `
      : [];

    const skillsByWorker = new Map<string, string[]>();
    for (const s of allSkills) {
      const arr = skillsByWorker.get(s.worker_id) ?? [];
      arr.push(s.skill);
      skillsByWorker.set(s.worker_id, arr);
    }

    const computeVerificationScore = (r: WorkerRow): number => {
      let s = 0;
      if (r.profile_complete) s += 20;
      if (r.has_id_doc) s += 20;
      if (r.has_cert_doc) s += 20;
      if (r.has_references) s += 20;
      if (r.has_availability) s += 20;
      return s;
    };

    const workers: WorkerSummary[] = rows.map((r) => ({
      workerId: r.worker_id,
      name: r.name,
      fullName: r.full_name,
      location: r.location,
      bio: r.bio,
      experienceYears: r.experience_years,
      qualifications: r.qualifications,
      driversLicense: r.drivers_license,
      vehicleAccess: r.vehicle_access,
      travelRadiusKm: r.travel_radius_km,
      avatarUrl: r.avatar_url ?? null,
      introVideoUrl: r.intro_video_url,
      distanceKm: null,
      averageRating: r.avg_rating != null ? Math.round(r.avg_rating * 10) / 10 : null,
      reviewCount: Number(r.review_count),
      skills: skillsByWorker.get(r.worker_id) ?? [],
      availableDays: parsePgArray(r.available_days),
      minimumPayRate: r.minimum_pay_rate,
      priorityBoost: r.priority_boost,
      docsVerifiedPurchased: r.docs_verified_purchased,
      refsPurchased: r.refs_purchased,
      docsVerified: r.docs_verified,
      refsVerified: r.refs_verified,
      lastLoginAt: r.last_login_at ? r.last_login_at.toISOString() : null,
      verificationScore: computeVerificationScore(r),
      isFullyVerified: computeVerificationScore(r) === 100,
    }));

    return { workers };
  }
);
