import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { WorkerProfile } from "./profile_get";
import { isValidEmail, isValidPhone } from "../auth/validation";

export interface UpdateWorkerProfileRequest {
  name?: string;
  phone?: string;
  fullName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  travelRadiusKm?: number;
  driversLicense?: boolean;
  vehicleAccess?: boolean;
  bio?: string;
  experienceYears?: number;
  previousEmployers?: string;
  qualifications?: string;
  ndisScreeningNumber?: string;
  email?: string;
}

// Updates the authenticated worker's profile details.
export const updateWorkerProfile = api<UpdateWorkerProfileRequest, WorkerProfile>(
  { expose: true, auth: true, method: "PUT", path: "/workers/profile" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    if (req.email !== undefined && req.email !== "") {
      if (!isValidEmail(req.email)) {
        throw APIError.invalidArgument("invalid email format");
      }
    }
    if (req.phone !== undefined && req.phone.trim() !== "") {
      if (!isValidPhone(req.phone)) {
        throw APIError.invalidArgument("please enter a valid Australian phone number");
      }
    }

    const existing = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!existing) {
      throw APIError.notFound("worker profile not found");
    }

    if (req.email !== undefined) {
      await db.exec`UPDATE users SET email = ${req.email.toLowerCase()} WHERE user_id = ${auth.userID}`;
    }

    const row = await db.queryRow<{
      worker_id: string;
      user_id: string;
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
      UPDATE workers
      SET
        name = COALESCE(${req.name ?? null}, name),
        phone = COALESCE(${req.phone ?? null}, phone),
        full_name = COALESCE(${req.fullName ?? null}, full_name),
        location = COALESCE(${req.location ?? null}, location),
        latitude = COALESCE(${req.latitude ?? null}, latitude),
        longitude = COALESCE(${req.longitude ?? null}, longitude),
        travel_radius_km = COALESCE(${req.travelRadiusKm ?? null}, travel_radius_km),
        drivers_license = COALESCE(${req.driversLicense ?? null}, drivers_license),
        vehicle_access = COALESCE(${req.vehicleAccess ?? null}, vehicle_access),
        bio = COALESCE(${req.bio ?? null}, bio),
        experience_years = COALESCE(${req.experienceYears ?? null}, experience_years),
        previous_employers = COALESCE(${req.previousEmployers ?? null}, previous_employers),
        qualifications = COALESCE(${req.qualifications ?? null}, qualifications),
        ndis_screening_number = COALESCE(${req.ndisScreeningNumber ?? null}, ndis_screening_number),
        updated_at = NOW()
      WHERE user_id = ${auth.userID}
      RETURNING worker_id, user_id, name, phone, full_name, location, latitude, longitude, travel_radius_km,
                drivers_license, vehicle_access, bio, experience_years, previous_employers,
                qualifications, intro_video_url, avatar_url, ndis_screening_number, updated_at
    `;

    if (!row) {
      throw APIError.internal("failed to update worker profile");
    }

    const updatedEmail = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${auth.userID}`;

    const fields = [
      row.full_name,
      row.location,
      row.bio,
      row.experience_years !== null ? "x" : null,
      row.qualifications,
      row.phone,
    ];
    const filled = fields.filter((f) => f !== null && f !== "").length;
    const completionPercent = Math.round((filled / fields.length) * 100);

    return {
      workerId: row.worker_id,
      userId: row.user_id,
      email: updatedEmail?.email ?? "",
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
      completionPercent,
    };
  }
);
