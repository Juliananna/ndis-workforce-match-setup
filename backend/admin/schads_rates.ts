import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "./guard";

export interface SchadRate {
  id: string;
  level: string;
  payPoint: string;
  classification: string;
  hourlyRate: number;
  casualLoadingRate: number | null;
  saturdayRate: number | null;
  sundayRate: number | null;
  publicHolidayRate: number | null;
  eveningRate: number | null;
  sleepooverRate: number | null;
  notes: string | null;
  effectiveDate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSchadRatesResponse {
  rates: SchadRate[];
}

function mapRow(r: {
  id: string;
  level: string;
  pay_point: string;
  classification: string;
  hourly_rate: number;
  casual_loading_rate: number | null;
  saturday_rate: number | null;
  sunday_rate: number | null;
  public_holiday_rate: number | null;
  evening_rate: number | null;
  sleepover_rate: number | null;
  notes: string | null;
  effective_date: string;
  created_at: Date;
  updated_at: Date;
}): SchadRate {
  return {
    id: r.id,
    level: r.level,
    payPoint: r.pay_point,
    classification: r.classification,
    hourlyRate: Number(r.hourly_rate),
    casualLoadingRate: r.casual_loading_rate != null ? Number(r.casual_loading_rate) : null,
    saturdayRate: r.saturday_rate != null ? Number(r.saturday_rate) : null,
    sundayRate: r.sunday_rate != null ? Number(r.sunday_rate) : null,
    publicHolidayRate: r.public_holiday_rate != null ? Number(r.public_holiday_rate) : null,
    eveningRate: r.evening_rate != null ? Number(r.evening_rate) : null,
    sleepooverRate: r.sleepover_rate != null ? Number(r.sleepover_rate) : null,
    notes: r.notes,
    effectiveDate: r.effective_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const adminListSchadRates = api<void, ListSchadRatesResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/schads-rates" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      id: string;
      level: string;
      pay_point: string;
      classification: string;
      hourly_rate: number;
      casual_loading_rate: number | null;
      saturday_rate: number | null;
      sunday_rate: number | null;
      public_holiday_rate: number | null;
      evening_rate: number | null;
      sleepover_rate: number | null;
      notes: string | null;
      effective_date: string;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT id, level, pay_point, classification, hourly_rate, casual_loading_rate,
             saturday_rate, sunday_rate, public_holiday_rate, evening_rate, sleepover_rate,
             notes, effective_date::text, created_at, updated_at
      FROM schads_award_rates
      ORDER BY effective_date DESC, level ASC, pay_point ASC
    `;

    return { rates: rows.map(mapRow) };
  }
);

export interface CreateSchadRateRequest {
  level: string;
  payPoint: string;
  classification: string;
  hourlyRate: number;
  casualLoadingRate?: number;
  saturdayRate?: number;
  sundayRate?: number;
  publicHolidayRate?: number;
  eveningRate?: number;
  sleepooverRate?: number;
  notes?: string;
  effectiveDate: string;
}

export const adminCreateSchadRate = api<CreateSchadRateRequest, SchadRate>(
  { expose: true, auth: true, method: "POST", path: "/admin/schads-rates" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.level?.trim()) throw APIError.invalidArgument("level is required");
    if (!req.payPoint?.trim()) throw APIError.invalidArgument("payPoint is required");
    if (!req.classification?.trim()) throw APIError.invalidArgument("classification is required");
    if (req.hourlyRate == null || req.hourlyRate < 0) throw APIError.invalidArgument("hourlyRate must be non-negative");
    if (!req.effectiveDate?.trim()) throw APIError.invalidArgument("effectiveDate is required");

    const row = await db.queryRow<{
      id: string;
      level: string;
      pay_point: string;
      classification: string;
      hourly_rate: number;
      casual_loading_rate: number | null;
      saturday_rate: number | null;
      sunday_rate: number | null;
      public_holiday_rate: number | null;
      evening_rate: number | null;
      sleepover_rate: number | null;
      notes: string | null;
      effective_date: string;
      created_at: Date;
      updated_at: Date;
    }>`
      INSERT INTO schads_award_rates (
        level, pay_point, classification, hourly_rate, casual_loading_rate,
        saturday_rate, sunday_rate, public_holiday_rate, evening_rate, sleepover_rate,
        notes, effective_date, created_by, updated_by
      ) VALUES (
        ${req.level}, ${req.payPoint}, ${req.classification}, ${req.hourlyRate},
        ${req.casualLoadingRate ?? null}, ${req.saturdayRate ?? null},
        ${req.sundayRate ?? null}, ${req.publicHolidayRate ?? null},
        ${req.eveningRate ?? null}, ${req.sleepooverRate ?? null},
        ${req.notes ?? null}, ${req.effectiveDate}::date, ${auth.userID}, ${auth.userID}
      )
      RETURNING id, level, pay_point, classification, hourly_rate, casual_loading_rate,
        saturday_rate, sunday_rate, public_holiday_rate, evening_rate, sleepover_rate,
        notes, effective_date::text, created_at, updated_at
    `;

    if (!row) throw APIError.internal("failed to create SCHADS rate");
    return mapRow(row);
  }
);

export interface UpdateSchadRateRequest {
  id: string;
  level?: string;
  payPoint?: string;
  classification?: string;
  hourlyRate?: number;
  casualLoadingRate?: number | null;
  saturdayRate?: number | null;
  sundayRate?: number | null;
  publicHolidayRate?: number | null;
  eveningRate?: number | null;
  sleepooverRate?: number | null;
  notes?: string | null;
  effectiveDate?: string;
}

export const adminUpdateSchadRate = api<UpdateSchadRateRequest, SchadRate>(
  { expose: true, auth: true, method: "PUT", path: "/admin/schads-rates/:id" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const existing = await db.queryRow<{ id: string }>`
      SELECT id FROM schads_award_rates WHERE id = ${req.id}
    `;
    if (!existing) throw APIError.notFound("SCHADS rate not found");

    const row = await db.queryRow<{
      id: string;
      level: string;
      pay_point: string;
      classification: string;
      hourly_rate: number;
      casual_loading_rate: number | null;
      saturday_rate: number | null;
      sunday_rate: number | null;
      public_holiday_rate: number | null;
      evening_rate: number | null;
      sleepover_rate: number | null;
      notes: string | null;
      effective_date: string;
      created_at: Date;
      updated_at: Date;
    }>`
      UPDATE schads_award_rates SET
        level            = COALESCE(${req.level ?? null}, level),
        pay_point        = COALESCE(${req.payPoint ?? null}, pay_point),
        classification   = COALESCE(${req.classification ?? null}, classification),
        hourly_rate      = COALESCE(${req.hourlyRate ?? null}, hourly_rate),
        casual_loading_rate   = CASE WHEN ${req.casualLoadingRate !== undefined}::boolean THEN ${req.casualLoadingRate ?? null} ELSE casual_loading_rate END,
        saturday_rate    = CASE WHEN ${req.saturdayRate !== undefined}::boolean THEN ${req.saturdayRate ?? null} ELSE saturday_rate END,
        sunday_rate      = CASE WHEN ${req.sundayRate !== undefined}::boolean THEN ${req.sundayRate ?? null} ELSE sunday_rate END,
        public_holiday_rate = CASE WHEN ${req.publicHolidayRate !== undefined}::boolean THEN ${req.publicHolidayRate ?? null} ELSE public_holiday_rate END,
        evening_rate     = CASE WHEN ${req.eveningRate !== undefined}::boolean THEN ${req.eveningRate ?? null} ELSE evening_rate END,
        sleepover_rate   = CASE WHEN ${req.sleepooverRate !== undefined}::boolean THEN ${req.sleepooverRate ?? null} ELSE sleepover_rate END,
        notes            = CASE WHEN ${req.notes !== undefined}::boolean THEN ${req.notes ?? null} ELSE notes END,
        effective_date   = COALESCE(${req.effectiveDate ? req.effectiveDate : null}::date, effective_date),
        updated_by       = ${auth.userID},
        updated_at       = NOW()
      WHERE id = ${req.id}
      RETURNING id, level, pay_point, classification, hourly_rate, casual_loading_rate,
        saturday_rate, sunday_rate, public_holiday_rate, evening_rate, sleepover_rate,
        notes, effective_date::text, created_at, updated_at
    `;

    if (!row) throw APIError.internal("update failed");
    return mapRow(row);
  }
);

export interface DeleteSchadRateRequest {
  id: string;
}

export const adminDeleteSchadRate = api<DeleteSchadRateRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/admin/schads-rates/:id" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const existing = await db.queryRow<{ id: string }>`
      SELECT id FROM schads_award_rates WHERE id = ${req.id}
    `;
    if (!existing) throw APIError.notFound("SCHADS rate not found");

    await db.exec`DELETE FROM schads_award_rates WHERE id = ${req.id}`;

    const adminUser = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${auth.userID}`;
    await db.exec`
      INSERT INTO admin_audit_log (admin_user_id, admin_email, action, entity_type, entity_id)
      VALUES (${auth.userID}, ${adminUser?.email ?? "unknown"}, 'DELETE_SCHADS_RATE', 'schads_rate', ${req.id})
    `;
  }
);
