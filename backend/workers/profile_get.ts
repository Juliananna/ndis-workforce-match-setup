import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface WorkerProfile {
  workerId: string;
  userId: string;
  email: string;
  name: string;
  phone: string;
  fullName: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  travelRadiusKm: number | null;
  driversLicense: boolean;
  vehicleAccess: boolean;
  bio: string | null;
  experienceYears: number | null;
  previousEmployers: string | null;
  qualifications: string | null;
  introVideoUrl: string | null;
  avatarUrl: string | null;
  ndisScreeningNumber: string | null;
  updatedAt: Date;
  completionPercent: number;
}

function computeCompletion(w: {
  full_name: string | null;
  location: string | null;
  bio: string | null;
  experience_years: number | null;
  qualifications: string | null;
  phone: string;
}): number {
  const fields = [
    w.full_name,
    w.location,
    w.bio,
    w.experience_years !== null ? "x" : null,
    w.qualifications,
    w.phone,
  ];
  const filled = fields.filter((f) => f !== null && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

// Returns the authenticated worker's full profile.
export const getWorkerProfile = api<void, WorkerProfile>(
  { expose: true, auth: true, method: "GET", path: "/workers/profile" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const row = await db.queryRow<{
      worker_id: string;
      user_id: string;
      email: string;
      name: string;
      phone: string;
      full_name: string | null;
      location: string | null;
      latitude: number | null;
      longitude: number | null;
      travel_radius_km: number | null;
      drivers_license: boolean;
      vehicle_access: boolean;
      bio: string | null;
      experience_years: number | null;
      previous_employers: string | null;
      qualifications: string | null;
      intro_video_url: string | null;
      avatar_url: string | null;
      ndis_screening_number: string | null;
      updated_at: Date;
    }>`
      SELECT w.worker_id, w.user_id, u.email, w.name, w.phone, w.full_name, w.location,
             w.latitude, w.longitude, w.travel_radius_km,
             w.drivers_license, w.vehicle_access, w.bio, w.experience_years, w.previous_employers,
             w.qualifications, w.intro_video_url, w.avatar_url, w.ndis_screening_number, w.updated_at
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE w.user_id = ${auth.userID}
    `;

    if (!row) {
      throw APIError.notFound("worker profile not found");
    }

    return {
      workerId: row.worker_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      fullName: row.full_name,
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      travelRadiusKm: row.travel_radius_km,
      driversLicense: row.drivers_license,
      vehicleAccess: row.vehicle_access,
      bio: row.bio,
      experienceYears: row.experience_years,
      previousEmployers: row.previous_employers,
      qualifications: row.qualifications,
      introVideoUrl: row.intro_video_url,
      avatarUrl: row.avatar_url,
      ndisScreeningNumber: row.ndis_screening_number,
      updatedAt: row.updated_at,
      completionPercent: computeCompletion(row),
    };
  }
);
