import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { JobRequest } from "../jobs/get";

export interface MatchedJob extends JobRequest {
  distanceKm: number | null;
  matchScore: number;
}

export interface MatchJobsResponse {
  jobs: MatchedJob[];
  hasGeoFilter: boolean;
}

export const matchJobsForWorker = api<void, MatchJobsResponse>(
  { expose: true, auth: true, method: "GET", path: "/matching/workers/jobs" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can use job matching");
    }

    const workerRow = await db.queryRow<{
      worker_id: string;
      latitude: number | null;
      longitude: number | null;
      travel_radius_km: number | null;
    }>`
      SELECT worker_id, latitude, longitude, travel_radius_km
      FROM workers
      WHERE user_id = ${auth.userID}
    `;
    if (!workerRow) throw APIError.notFound("worker profile not found");

    const availability = await db.queryRow<{
      available_days: string | null;
      minimum_pay_rate: number | null;
      max_travel_distance_km: number | null;
    }>`
      SELECT available_days, minimum_pay_rate, max_travel_distance_km
      FROM worker_availability
      WHERE worker_id = ${workerRow.worker_id}
    `;

    const skills = await db.queryAll<{ skill: string }>`
      SELECT skill FROM worker_skills WHERE worker_id = ${workerRow.worker_id}
    `;
    const skillSet = new Set(skills.map((s) => s.skill));

    const hasGeoFilter = workerRow.latitude != null && workerRow.longitude != null;
    const maxDist = availability?.max_travel_distance_km ?? workerRow.travel_radius_km ?? 50;
    const minPay = availability?.minimum_pay_rate ?? 0;

    type JobRow = {
      job_id: string;
      employer_id: string;
      job_type: string;
      job_title: string | null;
      location: string;
      shift_date: string | null;
      shift_start_time: string | null;
      shift_duration_hours: number | null;
      support_type_tags: string[] | null;
      client_notes: string | null;
      gender_preference: string | null;
      age_range_preference: string | null;
      behavioural_considerations: string | null;
      medical_requirements: string | null;
      weekday_rate: number;
      weekend_rate: number;
      public_holiday_rate: number;
      status: string;
      is_emergency: boolean;
      response_deadline: Date | null;
      latitude: number | null;
      longitude: number | null;
      created_at: Date;
      updated_at: Date;
      distance_km: number | null;
    };

    let jobs: JobRow[];

    if (hasGeoFilter) {
      const lat = workerRow.latitude!;
      const lon = workerRow.longitude!;
      jobs = await db.queryAll<JobRow>`
        SELECT
          job_id, employer_id, job_type, job_title, location, shift_date::text, shift_start_time,
          shift_duration_hours, support_type_tags, client_notes, gender_preference,
          age_range_preference, behavioural_considerations, medical_requirements,
          weekday_rate, weekend_rate, public_holiday_rate, status,
          is_emergency, response_deadline, latitude, longitude, created_at, updated_at,
          CASE
            WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN
              6371 * 2 * ASIN(SQRT(
                POWER(SIN(RADIANS(latitude - ${lat}) / 2), 2) +
                COS(RADIANS(${lat})) * COS(RADIANS(latitude)) *
                POWER(SIN(RADIANS(longitude - ${lon}) / 2), 2)
              ))
            ELSE NULL
          END AS distance_km
        FROM job_requests
        WHERE
          status = 'Open'
          AND weekday_rate >= ${minPay}
          AND (
            latitude IS NULL OR longitude IS NULL OR
            6371 * 2 * ASIN(SQRT(
              POWER(SIN(RADIANS(latitude - ${lat}) / 2), 2) +
              COS(RADIANS(${lat})) * COS(RADIANS(latitude)) *
              POWER(SIN(RADIANS(longitude - ${lon}) / 2), 2)
            )) <= ${maxDist}
          )
        ORDER BY distance_km ASC NULLS LAST
        LIMIT 50
      `;
    } else {
      jobs = await db.queryAll<JobRow>`
        SELECT
          job_id, employer_id, job_type, job_title, location, shift_date::text, shift_start_time,
          shift_duration_hours, support_type_tags, client_notes, gender_preference,
          age_range_preference, behavioural_considerations, medical_requirements,
          weekday_rate, weekend_rate, public_holiday_rate, status,
          is_emergency, response_deadline, latitude, longitude, created_at, updated_at,
          NULL::double precision AS distance_km
        FROM job_requests
        WHERE status = 'Open' AND weekday_rate >= ${minPay}
        ORDER BY created_at DESC
        LIMIT 50
      `;
    }

    const result: MatchedJob[] = jobs.map((row) => {
      const tags = row.support_type_tags ?? [];
      const matchScore = tags.filter((t) => skillSet.has(t)).length;
      return {
        jobId: row.job_id,
        employerId: row.employer_id,
        jobType: (row.job_type ?? "shift") as JobRequest["jobType"],
        jobTitle: row.job_title,
        location: row.location,
        shiftDate: row.shift_date,
        shiftStartTime: row.shift_start_time,
        shiftDurationHours: row.shift_duration_hours,
        supportTypeTags: tags,
        clientNotes: row.client_notes,
        genderPreference: row.gender_preference as JobRequest["genderPreference"],
        ageRangePreference: row.age_range_preference,
        behaviouralConsiderations: row.behavioural_considerations,
        medicalRequirements: row.medical_requirements,
        weekdayRate: row.weekday_rate,
        weekendRate: row.weekend_rate,
        publicHolidayRate: row.public_holiday_rate,
        status: row.status as JobRequest["status"],
        isEmergency: row.is_emergency,
        responseDeadline: row.response_deadline,
        latitude: row.latitude,
        longitude: row.longitude,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        distanceKm: row.distance_km != null ? Math.round(row.distance_km * 10) / 10 : null,
        matchScore,
      };
    });

    result.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        const scoreA = a.matchScore * 10 - a.distanceKm;
        const scoreB = b.matchScore * 10 - b.distanceKm;
        return scoreB - scoreA;
      }
      return b.matchScore - a.matchScore;
    });

    return { jobs: result, hasGeoFilter };
  }
);
