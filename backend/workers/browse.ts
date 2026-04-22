import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { requireEmployerSubscription } from "../employers/subscription_guard";

function parsePgArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (!val) return [];
  const s = String(val);
  const inner = s.replace(/^{|}$/g, "").trim();
  if (!inner) return [];
  return inner.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
}

export interface BrowseWorkersRequest {
  query?: string;
  skills?: string[];
  location?: string;
  driversLicense?: boolean;
  vehicleAccess?: boolean;
  verifiedOnly?: boolean;
  maxDistanceKm?: number;
  latitude?: number;
  longitude?: number;
  limit?: number;
  offset?: number;
}

export interface WorkerSummary {
  workerId: string;
  name: string;
  fullName: string | null;
  location: string | null;
  bio: string | null;
  experienceYears: number | null;
  qualifications: string | null;
  driversLicense: boolean;
  vehicleAccess: boolean;
  travelRadiusKm: number | null;
  skills: string[];
  introVideoUrl: string | null;
  distanceKm: number | null;
  averageRating: number | null;
  reviewCount: number;
  availableDays: string[];
  minimumPayRate: number | null;
  priorityBoost: boolean;
  docsVerifiedPurchased: boolean;
  refsPurchased: boolean;
  docsVerified: boolean;
  refsVerified: boolean;
  lastLoginAt: string | null;
  verificationScore: number;
  isFullyVerified: boolean;
}

export interface BrowseWorkersResponse {
  workers: WorkerSummary[];
  total: number;
}

export const browseWorkers = api<BrowseWorkersRequest, BrowseWorkersResponse>(
  { expose: true, auth: true, method: "POST", path: "/workers/browse" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can browse worker profiles");
    }

    await requireEmployerSubscription(auth.userID);

    const limit = Math.min(req.limit ?? 20, 50);
    const offset = req.offset ?? 0;
    const hasGeo = req.latitude != null && req.longitude != null;
    const verifiedOnly = req.verifiedOnly ?? false;

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
      intro_video_url: string | null;
      distance_km: number | null;
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

    let rows: WorkerRow[];

    const searchQuery = req.query?.trim() ?? "";
    const skills = req.skills ?? [];

    if (hasGeo) {
      const lat = req.latitude!;
      const lon = req.longitude!;
      const maxDist = req.maxDistanceKm ?? 9999;

      rows = await db.queryAll<WorkerRow>`
        SELECT
          w.worker_id, w.name, w.full_name, w.location, w.bio, w.experience_years,
          w.qualifications, w.drivers_license, w.vehicle_access, w.travel_radius_km,
          w.intro_video_url, w.priority_boost, w.docs_verified_purchased, w.refs_purchased,
          wa.available_days, wa.minimum_pay_rate, u.last_login_at,
          CASE
            WHEN w.latitude IS NOT NULL AND w.longitude IS NOT NULL THEN
              6371 * 2 * ASIN(SQRT(
                POWER(SIN(RADIANS(w.latitude - ${lat}) / 2), 2) +
                COS(RADIANS(${lat})) * COS(RADIANS(w.latitude)) *
                POWER(SIN(RADIANS(w.longitude - ${lon}) / 2), 2)
              ))
            ELSE NULL
          END AS distance_km,
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
        FROM workers w
        LEFT JOIN worker_availability wa ON wa.worker_id = w.worker_id
        LEFT JOIN reviews r ON r.reviewee_user_id = w.user_id AND r.reviewee_role = 'WORKER'
        LEFT JOIN users u ON u.user_id = w.user_id
        WHERE
          (
            ${searchQuery} = '' OR
            w.name ILIKE ${'%' + searchQuery + '%'} OR
            w.full_name ILIKE ${'%' + searchQuery + '%'} OR
            w.location ILIKE ${'%' + searchQuery + '%'} OR
            w.bio ILIKE ${'%' + searchQuery + '%'} OR
            w.qualifications ILIKE ${'%' + searchQuery + '%'}
          )
          AND (${!req.driversLicense} OR w.drivers_license = TRUE)
          AND (${!req.vehicleAccess} OR w.vehicle_access = TRUE)
          AND u.is_demo = FALSE
          AND (
            w.latitude IS NULL OR w.longitude IS NULL OR
            6371 * 2 * ASIN(SQRT(
              POWER(SIN(RADIANS(w.latitude - ${lat}) / 2), 2) +
              COS(RADIANS(${lat})) * COS(RADIANS(w.latitude)) *
              POWER(SIN(RADIANS(w.longitude - ${lon}) / 2), 2)
            )) <= ${maxDist}
          )
        GROUP BY w.worker_id, wa.available_days, wa.minimum_pay_rate, u.last_login_at
        ORDER BY w.priority_boost DESC, distance_km ASC NULLS LAST, avg_rating DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      rows = await db.queryAll<WorkerRow>`
        SELECT
          w.worker_id, w.name, w.full_name, w.location, w.bio, w.experience_years,
          w.qualifications, w.drivers_license, w.vehicle_access, w.travel_radius_km,
          w.intro_video_url, w.priority_boost, w.docs_verified_purchased, w.refs_purchased,
          wa.available_days, wa.minimum_pay_rate, u.last_login_at,
          NULL::double precision AS distance_km,
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
        FROM workers w
        LEFT JOIN worker_availability wa ON wa.worker_id = w.worker_id
        LEFT JOIN reviews r ON r.reviewee_user_id = w.user_id AND r.reviewee_role = 'WORKER'
        LEFT JOIN users u ON u.user_id = w.user_id
        WHERE
          (
            ${searchQuery} = '' OR
            w.name ILIKE ${'%' + searchQuery + '%'} OR
            w.full_name ILIKE ${'%' + searchQuery + '%'} OR
            w.location ILIKE ${'%' + searchQuery + '%'} OR
            w.bio ILIKE ${'%' + searchQuery + '%'} OR
            w.qualifications ILIKE ${'%' + searchQuery + '%'}
          )
          AND (${!req.driversLicense} OR w.drivers_license = TRUE)
          AND (${!req.vehicleAccess} OR w.vehicle_access = TRUE)
          AND u.is_demo = FALSE
        GROUP BY w.worker_id, wa.available_days, wa.minimum_pay_rate, u.last_login_at
        ORDER BY w.priority_boost DESC, avg_rating DESC NULLS LAST, w.name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const computeVerificationScore = (r: typeof rows[0]): number => {
      let s = 0;
      if (r.profile_complete) s += 20;
      if (r.has_id_doc) s += 20;
      if (r.has_cert_doc) s += 20;
      if (r.has_references) s += 20;
      if (r.has_availability) s += 20;
      return s;
    };

    const preFiltered = verifiedOnly
      ? rows.filter((r) => computeVerificationScore(r) === 100)
      : rows;

    let filteredWorkerIds = preFiltered.map((r) => r.worker_id);

    if (skills.length > 0) {
      const skillMatches = await db.queryAll<{ worker_id: string; match_count: number }>`
        SELECT worker_id, COUNT(*)::int AS match_count
        FROM worker_skills
        WHERE worker_id = ANY(${filteredWorkerIds}) AND skill = ANY(${skills})
        GROUP BY worker_id
        HAVING COUNT(*) = ${skills.length}
      `;
      const matchedIds = new Set(skillMatches.map((s) => s.worker_id));
      filteredWorkerIds = filteredWorkerIds.filter((id) => matchedIds.has(id));
    }

    const filteredRows = preFiltered.filter((r) => filteredWorkerIds.includes(r.worker_id));

    const allSkills = filteredWorkerIds.length > 0
      ? await db.queryAll<{ worker_id: string; skill: string }>`
          SELECT worker_id, skill FROM worker_skills WHERE worker_id = ANY(${filteredWorkerIds})
        `
      : [];

    const skillsByWorker = new Map<string, string[]>();
    for (const s of allSkills) {
      const arr = skillsByWorker.get(s.worker_id) ?? [];
      arr.push(s.skill);
      skillsByWorker.set(s.worker_id, arr);
    }

    const sortedFilteredRows = [...filteredRows].sort((a, b) => {
      if (a.priority_boost !== b.priority_boost) return a.priority_boost ? -1 : 1;
      return computeVerificationScore(b) - computeVerificationScore(a);
    });

    const workers: WorkerSummary[] = sortedFilteredRows.map((r) => ({
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
      introVideoUrl: r.intro_video_url,
      distanceKm: r.distance_km != null ? Math.round(r.distance_km * 10) / 10 : null,
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

    return { workers, total: workers.length };
  }
);
