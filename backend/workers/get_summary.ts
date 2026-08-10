import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { WorkerSummary } from "./browse";

function parsePgArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (!val) return [];
  const s = String(val);
  const inner = s.replace(/^{|}$/g, "").trim();
  if (!inner) return [];
  return inner.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
}

interface GetWorkerSummaryRequest {
  workerId: string;
}

export const getWorkerSummary = api<GetWorkerSummaryRequest, WorkerSummary>(
  { expose: true, auth: true, method: "GET", path: "/workers/:workerId/summary" },
  async ({ workerId }) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can view worker summaries");
    }

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
      seeking_placement: boolean;
      priority_boost: boolean;
      docs_verified_purchased: boolean;
      refs_purchased: boolean;
      docs_verified: boolean;
      refs_verified: boolean;
      last_login_at: Date | null;
      latitude: number | null;
      longitude: number | null;
      has_id_doc: boolean;
      has_cert_doc: boolean;
      has_availability: boolean;
      has_references: boolean;
      profile_complete: boolean;
    };

    const row = await db.queryRow<WorkerRow>`
      SELECT
        w.worker_id, w.name, w.full_name, w.location, w.bio, w.experience_years,
        w.qualifications, w.drivers_license, w.vehicle_access, w.travel_radius_km,
        w.avatar_url, w.intro_video_url, w.seeking_placement, w.priority_boost,
        w.docs_verified_purchased, w.refs_purchased, w.latitude, w.longitude,
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
      WHERE w.worker_id = ${workerId}
      GROUP BY w.worker_id, wa.available_days, wa.minimum_pay_rate, u.last_login_at
    `;

    if (!row) {
      throw APIError.notFound("worker not found");
    }

    const skills = await db.queryAll<{ skill: string }>`
      SELECT skill FROM worker_skills WHERE worker_id = ${workerId}
    `;

    const computeVerificationScore = (): number => {
      let s = 0;
      if (row.profile_complete) s += 20;
      if (row.has_id_doc) s += 20;
      if (row.has_cert_doc) s += 20;
      if (row.has_references) s += 20;
      if (row.has_availability) s += 20;
      return s;
    };

    const score = computeVerificationScore();

    return {
      workerId: row.worker_id,
      name: row.name,
      fullName: row.full_name,
      location: row.location,
      bio: row.bio,
      experienceYears: row.experience_years,
      qualifications: row.qualifications,
      driversLicense: row.drivers_license,
      vehicleAccess: row.vehicle_access,
      travelRadiusKm: row.travel_radius_km,
      avatarUrl: row.avatar_url ?? null,
      introVideoUrl: row.intro_video_url,
      distanceKm: null,
      averageRating: row.avg_rating != null ? Math.round(Number(row.avg_rating) * 10) / 10 : null,
      reviewCount: Number(row.review_count),
      skills: skills.map((s) => s.skill),
      availableDays: parsePgArray(row.available_days),
      minimumPayRate: row.minimum_pay_rate,
      seekingPlacement: row.seeking_placement,
      priorityBoost: row.priority_boost,
      docsVerifiedPurchased: row.docs_verified_purchased,
      refsPurchased: row.refs_purchased,
      docsVerified: row.docs_verified,
      refsVerified: row.refs_verified,
      lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
      verificationScore: score,
      isFullyVerified: score === 100,
      latitude: row.latitude,
      longitude: row.longitude,
    };
  }
);
