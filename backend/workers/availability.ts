import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface WorkerAvailability {
  id: string;
  workerId: string;
  availableDays: string[];
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  preferredShiftTypes: string[];
  minimumPayRate: number | null;
  maxTravelDistanceKm: number | null;
  updatedAt: Date;
}

export interface UpsertAvailabilityRequest {
  availableDays: string[];
  timeWindowStart?: string;
  timeWindowEnd?: string;
  preferredShiftTypes: string[];
  minimumPayRate?: number;
  maxTravelDistanceKm?: number;
}

const VALID_DAYS = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
const VALID_SHIFTS = new Set(["Morning", "Afternoon", "Evening", "Night", "Overnight", "Flexible"]);

function parseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Returns the authenticated worker's availability settings.
export const getWorkerAvailability = api<void, WorkerAvailability>(
  { expose: true, auth: true, method: "GET", path: "/workers/availability" },
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

    const row = await db.queryRow<{
      id: string;
      worker_id: string;
      available_days: string;
      time_window_start: string | null;
      time_window_end: string | null;
      preferred_shift_types: string;
      minimum_pay_rate: number | null;
      max_travel_distance_km: number | null;
      updated_at: Date;
    }>`
      SELECT id, worker_id, available_days, time_window_start, time_window_end,
             preferred_shift_types, minimum_pay_rate, max_travel_distance_km, updated_at
      FROM worker_availability
      WHERE worker_id = ${worker.worker_id}
    `;

    if (!row) {
      return {
        id: "",
        workerId: worker.worker_id,
        availableDays: [],
        timeWindowStart: null,
        timeWindowEnd: null,
        preferredShiftTypes: [],
        minimumPayRate: null,
        maxTravelDistanceKm: null,
        updatedAt: new Date(),
      };
    }

    return {
      id: row.id,
      workerId: row.worker_id,
      availableDays: parseJsonArray(row.available_days),
      timeWindowStart: row.time_window_start,
      timeWindowEnd: row.time_window_end,
      preferredShiftTypes: parseJsonArray(row.preferred_shift_types),
      minimumPayRate: row.minimum_pay_rate,
      maxTravelDistanceKm: row.max_travel_distance_km,
      updatedAt: row.updated_at,
    };
  }
);

// Creates or updates the authenticated worker's availability settings.
export const upsertWorkerAvailability = api<UpsertAvailabilityRequest, WorkerAvailability>(
  { expose: true, auth: true, method: "PUT", path: "/workers/availability" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    for (const day of req.availableDays) {
      if (!VALID_DAYS.has(day)) {
        throw APIError.invalidArgument(`invalid day: ${day}`);
      }
    }
    for (const shift of req.preferredShiftTypes) {
      if (!VALID_SHIFTS.has(shift)) {
        throw APIError.invalidArgument(`invalid shift type: ${shift}`);
      }
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) {
      throw APIError.notFound("worker not found");
    }

    const daysJson = JSON.stringify(req.availableDays);
    const shiftsJson = JSON.stringify(req.preferredShiftTypes);

    const row = await db.queryRow<{
      id: string;
      worker_id: string;
      available_days: string;
      time_window_start: string | null;
      time_window_end: string | null;
      preferred_shift_types: string;
      minimum_pay_rate: number | null;
      max_travel_distance_km: number | null;
      updated_at: Date;
    }>`
      INSERT INTO worker_availability (worker_id, available_days, time_window_start, time_window_end,
        preferred_shift_types, minimum_pay_rate, max_travel_distance_km)
      VALUES (
        ${worker.worker_id},
        ${daysJson},
        ${req.timeWindowStart ?? null},
        ${req.timeWindowEnd ?? null},
        ${shiftsJson},
        ${req.minimumPayRate ?? null},
        ${req.maxTravelDistanceKm ?? null}
      )
      ON CONFLICT (worker_id) DO UPDATE SET
        available_days = EXCLUDED.available_days,
        time_window_start = EXCLUDED.time_window_start,
        time_window_end = EXCLUDED.time_window_end,
        preferred_shift_types = EXCLUDED.preferred_shift_types,
        minimum_pay_rate = EXCLUDED.minimum_pay_rate,
        max_travel_distance_km = EXCLUDED.max_travel_distance_km,
        updated_at = NOW()
      RETURNING id, worker_id, available_days, time_window_start, time_window_end,
                preferred_shift_types, minimum_pay_rate, max_travel_distance_km, updated_at
    `;

    if (!row) {
      throw APIError.internal("failed to save availability");
    }

    return {
      id: row.id,
      workerId: row.worker_id,
      availableDays: parseJsonArray(row.available_days),
      timeWindowStart: row.time_window_start,
      timeWindowEnd: row.time_window_end,
      preferredShiftTypes: parseJsonArray(row.preferred_shift_types),
      minimumPayRate: row.minimum_pay_rate,
      maxTravelDistanceKm: row.max_travel_distance_km,
      updatedAt: row.updated_at,
    };
  }
);
