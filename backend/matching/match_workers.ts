import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface MatchedWorker {
  workerId: string;
  name: string;
  location: string | null;
  distanceKm: number | null;
  skills: string[];
  availableDays: string[];
  travelRadiusKm: number | null;
  minimumPayRate: number | null;
  driversLicense: boolean;
  vehicleAccess: boolean;
  experienceYears: number | null;
  bio: string | null;
  compatibilityScore: number;
  matchReasons: string[];
  priorityBoost: boolean;
  docsVerifiedPurchased: boolean;
  refsPurchased: boolean;
  isFullyVerified: boolean;
  verificationScore: number;
}

export interface MatchWorkersRequest {
  jobId: string;
  maxDistanceKm?: number;
  requiredSkills?: string[];
  limit?: number;
}

export interface MatchWorkersResponse {
  workers: MatchedWorker[];
  hasGeoFilter: boolean;
}

function computeCompatibility(params: {
  jobTags: Set<string>;
  jobWeekdayRate: number;
  jobShiftDate: Date | null;
  workerSkills: string[];
  workerAvailDays: string[];
  workerMinPay: number | null;
  workerExpYears: number | null;
  distanceKm: number | null;
  travelRadiusKm: number | null;
  verificationScore: number;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const max = 100;

  const skillMatches = params.workerSkills.filter((s) => params.jobTags.has(s));
  const skillScore = params.jobTags.size > 0
    ? Math.round((skillMatches.length / params.jobTags.size) * 35)
    : 35;
  score += skillScore;
  if (skillMatches.length > 0) {
    reasons.push(`${skillMatches.length} of ${params.jobTags.size} skills matched`);
  }

  if (params.jobShiftDate) {
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][params.jobShiftDate.getDay()];
    if (params.workerAvailDays.includes(dayName)) {
      score += 25;
      reasons.push(`Available on ${dayName}`);
    }
  } else if (params.workerAvailDays.length > 0) {
    score += 15;
    reasons.push("Has availability set");
  }

  if (params.distanceKm != null) {
    const radius = params.travelRadiusKm ?? 50;
    if (params.distanceKm <= radius) {
      const proximity = Math.round((1 - params.distanceKm / (radius || 50)) * 25);
      score += Math.max(0, proximity);
      reasons.push(`${params.distanceKm}km away`);
    }
  } else {
    score += 10;
  }

  if (params.workerExpYears != null && params.workerExpYears >= 1) {
    const expScore = Math.min(10, params.workerExpYears * 2);
    score += expScore;
    reasons.push(`${params.workerExpYears} yr${params.workerExpYears !== 1 ? "s" : ""} experience`);
  }

  if (params.verificationScore === 100) {
    score += 15;
    reasons.push("Fully verified worker");
  } else if (params.verificationScore >= 80) {
    score += 8;
    reasons.push("High verification score");
  } else if (params.verificationScore >= 60) {
    score += 4;
  }

  return { score: Math.min(max, score), reasons };
}

export const matchWorkersForJob = api<MatchWorkersRequest, MatchWorkersResponse>(
  { expose: true, auth: true, method: "GET", path: "/matching/jobs/:jobId/workers" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can use worker matching");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const job = await db.queryRow<{
      job_id: string;
      employer_id: string;
      support_type_tags: string[] | null;
      weekday_rate: number;
      shift_date: string | null;
      latitude: number | null;
      longitude: number | null;
    }>`
      SELECT job_id, employer_id, support_type_tags, weekday_rate, shift_date::text, latitude, longitude
      FROM job_requests
      WHERE job_id = ${req.jobId} AND employer_id = ${employer.employer_id}
    `;
    if (!job) throw APIError.notFound("job request not found");

    const hasGeoFilter = job.latitude != null && job.longitude != null;
    const maxDist = req.maxDistanceKm ?? 50;
    const limit = Math.min(req.limit ?? 50, 100);

    type WorkerRow = {
      worker_id: string;
      name: string;
      location: string | null;
      travel_radius_km: number | null;
      drivers_license: boolean;
      vehicle_access: boolean;
      experience_years: number | null;
      bio: string | null;
      available_days: string | null;
      minimum_pay_rate: number | null;
      distance_km: number | null;
      priority_boost: boolean;
      docs_verified_purchased: boolean;
      refs_purchased: boolean;
      has_id_doc: boolean;
      has_cert_doc: boolean;
      has_avail: boolean;
      has_refs: boolean;
      profile_complete: boolean;
    };

    let workers: WorkerRow[];

    if (hasGeoFilter) {
      const lat = job.latitude!;
      const lon = job.longitude!;
      workers = await db.queryAll<WorkerRow>`
        SELECT
          w.worker_id, w.name, w.location, w.travel_radius_km,
          w.drivers_license, w.vehicle_access, w.experience_years, w.bio,
          w.priority_boost, w.docs_verified_purchased, w.refs_purchased,
          wa.available_days, wa.minimum_pay_rate,
          CASE
            WHEN w.latitude IS NOT NULL AND w.longitude IS NOT NULL THEN
              6371 * 2 * ASIN(SQRT(
                POWER(SIN(RADIANS(w.latitude - ${lat}) / 2), 2) +
                COS(RADIANS(${lat})) * COS(RADIANS(w.latitude)) *
                POWER(SIN(RADIANS(w.longitude - ${lon}) / 2), 2)
              ))
            ELSE NULL
          END AS distance_km,
          EXISTS (SELECT 1 FROM worker_documents wd WHERE wd.worker_id = w.worker_id AND wd.document_type IN ('Driver''s Licence', 'Passport / ID')) AS has_id_doc,
          EXISTS (SELECT 1 FROM worker_documents wd WHERE wd.worker_id = w.worker_id AND wd.document_type IN ('NDIS Worker Screening Check','NDIS Worker Orientation Module','NDIS Code of Conduct acknowledgement','Infection Control Certificate','First Aid Certificate','CPR Certificate','Certificate III / IV Disability','Working With Children Check','Police Clearance')) AS has_cert_doc,
          EXISTS (SELECT 1 FROM worker_availability wva WHERE wva.worker_id = w.worker_id) AS has_avail,
          EXISTS (SELECT 1 FROM worker_references wrf WHERE wrf.worker_id = w.worker_id) AS has_refs,
          ((w.full_name IS NOT NULL AND w.full_name <> '') AND (w.location IS NOT NULL AND w.location <> '') AND (w.bio IS NOT NULL AND w.bio <> '') AND (w.experience_years IS NOT NULL) AND (w.phone IS NOT NULL AND w.phone <> '')) AS profile_complete
        FROM workers w
        JOIN users u ON u.user_id = w.user_id
        LEFT JOIN worker_availability wa ON wa.worker_id = w.worker_id
        WHERE
          u.is_demo = FALSE
          AND (
            w.latitude IS NULL OR w.longitude IS NULL OR
            6371 * 2 * ASIN(SQRT(
              POWER(SIN(RADIANS(w.latitude - ${lat}) / 2), 2) +
              COS(RADIANS(${lat})) * COS(RADIANS(w.latitude)) *
              POWER(SIN(RADIANS(w.longitude - ${lon}) / 2), 2)
            )) <= ${maxDist}
          )
          AND (wa.minimum_pay_rate IS NULL OR wa.minimum_pay_rate <= ${job.weekday_rate})
        ORDER BY w.priority_boost DESC, distance_km ASC NULLS LAST
        LIMIT ${limit}
      `;
    } else {
      workers = await db.queryAll<WorkerRow>`
        SELECT
          w.worker_id, w.name, w.location, w.travel_radius_km,
          w.drivers_license, w.vehicle_access, w.experience_years, w.bio,
          w.priority_boost, w.docs_verified_purchased, w.refs_purchased,
          wa.available_days, wa.minimum_pay_rate,
          NULL::double precision AS distance_km,
          EXISTS (SELECT 1 FROM worker_documents wd WHERE wd.worker_id = w.worker_id AND wd.document_type IN ('Driver''s Licence', 'Passport / ID')) AS has_id_doc,
          EXISTS (SELECT 1 FROM worker_documents wd WHERE wd.worker_id = w.worker_id AND wd.document_type IN ('NDIS Worker Screening Check','NDIS Worker Orientation Module','NDIS Code of Conduct acknowledgement','Infection Control Certificate','First Aid Certificate','CPR Certificate','Certificate III / IV Disability','Working With Children Check','Police Clearance')) AS has_cert_doc,
          EXISTS (SELECT 1 FROM worker_availability wva WHERE wva.worker_id = w.worker_id) AS has_avail,
          EXISTS (SELECT 1 FROM worker_references wrf WHERE wrf.worker_id = w.worker_id) AS has_refs,
          ((w.full_name IS NOT NULL AND w.full_name <> '') AND (w.location IS NOT NULL AND w.location <> '') AND (w.bio IS NOT NULL AND w.bio <> '') AND (w.experience_years IS NOT NULL) AND (w.phone IS NOT NULL AND w.phone <> '')) AS profile_complete
        FROM workers w
        JOIN users u ON u.user_id = w.user_id
        LEFT JOIN worker_availability wa ON wa.worker_id = w.worker_id
        WHERE u.is_demo = FALSE
          AND (wa.minimum_pay_rate IS NULL OR wa.minimum_pay_rate <= ${job.weekday_rate})
        ORDER BY w.priority_boost DESC, w.updated_at DESC
        LIMIT ${limit}
      `;
    }

    const jobTags = new Set<string>(job.support_type_tags ?? []);
    const requiredSkills = req.requiredSkills ?? [];
    const jobShiftDate = job.shift_date ? new Date(job.shift_date) : null;

    const result: MatchedWorker[] = [];
    for (const w of workers) {
      const skills = await db.queryAll<{ skill: string }>`
        SELECT skill FROM worker_skills WHERE worker_id = ${w.worker_id}
      `;
      const skillList = skills.map((s) => s.skill);

      if (requiredSkills.length > 0) {
        const skillSet = new Set(skillList);
        if (!requiredSkills.every((s) => skillSet.has(s))) continue;
      }

      let availDays: string[] = [];
      try {
        if (w.available_days) availDays = JSON.parse(w.available_days);
      } catch { /* empty */ }

      const distanceKm = w.distance_km != null ? Math.round(w.distance_km * 10) / 10 : null;

      const workerVerifScore = (w.profile_complete ? 20 : 0) + (w.has_id_doc ? 20 : 0) + (w.has_cert_doc ? 20 : 0) + (w.has_refs ? 20 : 0) + (w.has_avail ? 20 : 0);

      const { score, reasons } = computeCompatibility({
        jobTags,
        jobWeekdayRate: job.weekday_rate,
        jobShiftDate,
        workerSkills: skillList,
        workerAvailDays: availDays,
        workerMinPay: w.minimum_pay_rate,
        workerExpYears: w.experience_years,
        distanceKm,
        travelRadiusKm: w.travel_radius_km,
        verificationScore: workerVerifScore,
      });

      result.push({
        workerId: w.worker_id,
        name: w.name,
        location: w.location,
        distanceKm,
        skills: skillList,
        availableDays: availDays,
        travelRadiusKm: w.travel_radius_km,
        minimumPayRate: w.minimum_pay_rate,
        driversLicense: w.drivers_license,
        vehicleAccess: w.vehicle_access,
        experienceYears: w.experience_years,
        bio: w.bio,
        compatibilityScore: score,
        matchReasons: reasons,
        priorityBoost: w.priority_boost,
        docsVerifiedPurchased: w.docs_verified_purchased,
        refsPurchased: w.refs_purchased,
        isFullyVerified: workerVerifScore === 100,
        verificationScore: workerVerifScore,
      });
    }

    result.sort((a, b) => {
      if (a.priorityBoost !== b.priorityBoost) return a.priorityBoost ? -1 : 1;
      return b.compatibilityScore - a.compatibilityScore;
    });

    return { workers: result, hasGeoFilter };
  }
);
