import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "./guard";

export interface SchadRate {
  id: string;
  awardCode: string;
  streamCode: string | null;
  streamName: string | null;
  classificationCode: string | null;
  classificationName: string;
  level: string;
  payPoint: string;
  employmentBasis: string;
  weeklyRate: number | null;
  ordinaryHourlyRate: number;
  saturdayRate: number | null;
  sundayRate: number | null;
  publicHolidayRate: number | null;
  afternoonShiftRate: number | null;
  nightShiftRate: number | null;
  notes: string | null;
  sourceUrl: string | null;
  effectiveDate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSchadRatesResponse {
  rates: SchadRate[];
}

function mapRow(r: {
  id: string;
  award_code: string;
  stream_code: string | null;
  stream_name: string | null;
  classification_code: string | null;
  classification: string;
  level: string;
  pay_point: string;
  employment_basis: string;
  weekly_rate: number | null;
  hourly_rate: number;
  saturday_rate: number | null;
  sunday_rate: number | null;
  public_holiday_rate: number | null;
  afternoon_shift_rate: number | null;
  night_shift_rate: number | null;
  notes: string | null;
  source_url: string | null;
  effective_date: string;
  created_at: Date;
  updated_at: Date;
}): SchadRate {
  return {
    id: r.id,
    awardCode: r.award_code,
    streamCode: r.stream_code,
    streamName: r.stream_name,
    classificationCode: r.classification_code,
    classificationName: r.classification,
    level: r.level,
    payPoint: r.pay_point,
    employmentBasis: r.employment_basis,
    weeklyRate: r.weekly_rate != null ? Number(r.weekly_rate) : null,
    ordinaryHourlyRate: Number(r.hourly_rate),
    saturdayRate: r.saturday_rate != null ? Number(r.saturday_rate) : null,
    sundayRate: r.sunday_rate != null ? Number(r.sunday_rate) : null,
    publicHolidayRate: r.public_holiday_rate != null ? Number(r.public_holiday_rate) : null,
    afternoonShiftRate: r.afternoon_shift_rate != null ? Number(r.afternoon_shift_rate) : null,
    nightShiftRate: r.night_shift_rate != null ? Number(r.night_shift_rate) : null,
    notes: r.notes,
    sourceUrl: r.source_url,
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
      award_code: string;
      stream_code: string | null;
      stream_name: string | null;
      classification_code: string | null;
      classification: string;
      level: string;
      pay_point: string;
      employment_basis: string;
      weekly_rate: number | null;
      hourly_rate: number;
      saturday_rate: number | null;
      sunday_rate: number | null;
      public_holiday_rate: number | null;
      afternoon_shift_rate: number | null;
      night_shift_rate: number | null;
      notes: string | null;
      source_url: string | null;
      effective_date: string;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT id, award_code, stream_code, stream_name, classification_code, classification,
             level, pay_point, employment_basis, weekly_rate, hourly_rate,
             saturday_rate, sunday_rate, public_holiday_rate,
             afternoon_shift_rate, night_shift_rate,
             notes, source_url, effective_date::text, created_at, updated_at
      FROM schads_award_rates
      ORDER BY effective_date DESC, stream_code ASC, level ASC, pay_point ASC, employment_basis ASC
    `;

    return { rates: rows.map(mapRow) };
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
  }
);

export interface DeleteSchadRatesByDateRequest {
  effectiveDate: string;
}

export const adminDeleteSchadRatesByDate = api<DeleteSchadRatesByDateRequest, { deleted: number }>(
  { expose: true, auth: true, method: "DELETE", path: "/admin/schads-rates/by-date" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.effectiveDate) throw APIError.invalidArgument("effectiveDate is required");

    const result = await db.queryRow<{ count: number }>`
      WITH deleted AS (
        DELETE FROM schads_award_rates WHERE effective_date = ${req.effectiveDate}::date RETURNING 1
      )
      SELECT COUNT(*)::int AS count FROM deleted
    `;

    return { deleted: result?.count ?? 0 };
  }
);

export interface UploadSchadRatesCsvRequest {
  csvContent: string;
  replaceEffectiveDate?: string;
}

export interface UploadSchadRatesCsvResponse {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface CsvRow {
  award_code: string;
  stream_code: string;
  stream_name: string;
  classification_code: string;
  classification_name: string;
  level: string;
  pay_point: string;
  employment_basis: string;
  weekly_rate_aud: string;
  ordinary_hourly_aud: string;
  saturday_hourly_aud: string;
  sunday_hourly_aud: string;
  public_holiday_hourly_aud: string;
  afternoon_shift_hourly_aud: string;
  night_shift_hourly_aud: string;
  effective_from: string;
  source_url: string;
}

function parseCsv(content: string): { rows: CsvRow[]; errors: string[] } {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const errors: string[] = [];
  const rows: CsvRow[] = [];

  if (lines.length < 2) {
    errors.push("CSV must have a header row and at least one data row");
    return { rows, errors };
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  const required = [
    "classification_code",
    "employment_basis",
    "ordinary_hourly_aud",
    "effective_from",
  ];
  for (const r of required) {
    if (!headers.includes(r)) {
      errors.push(`Missing required column: ${r}`);
    }
  }
  if (errors.length > 0) return { rows, errors };

  const idx = (name: string) => headers.indexOf(name);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);

    const get = (name: string) => (cols[idx(name)] ?? "").trim().replace(/^"|"$/g, "");

    const ordinaryHourly = get("ordinary_hourly_aud");
    const effectiveFrom = get("effective_from");
    const classificationCode = get("classification_code");
    const employmentBasis = get("employment_basis").toUpperCase();

    if (!classificationCode) { errors.push(`Row ${i + 1}: classification_code is required`); continue; }
    if (!ordinaryHourly || isNaN(Number(ordinaryHourly))) { errors.push(`Row ${i + 1}: ordinary_hourly_aud must be a number`); continue; }
    if (!effectiveFrom || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) { errors.push(`Row ${i + 1}: effective_from must be YYYY-MM-DD`); continue; }
    if (employmentBasis !== "PERMANENT" && employmentBasis !== "CASUAL") { errors.push(`Row ${i + 1}: employment_basis must be PERMANENT or CASUAL`); continue; }

    rows.push({
      award_code: get("award_code") || "MA000100",
      stream_code: get("stream_code"),
      stream_name: get("stream_name"),
      classification_code: classificationCode,
      classification_name: get("classification_name"),
      level: get("level"),
      pay_point: get("pay_point"),
      employment_basis: employmentBasis,
      weekly_rate_aud: get("weekly_rate_aud"),
      ordinary_hourly_aud: ordinaryHourly,
      saturday_hourly_aud: get("saturday_hourly_aud"),
      sunday_hourly_aud: get("sunday_hourly_aud"),
      public_holiday_hourly_aud: get("public_holiday_hourly_aud"),
      afternoon_shift_hourly_aud: get("afternoon_shift_hourly_aud"),
      night_shift_hourly_aud: get("night_shift_hourly_aud"),
      effective_from: effectiveFrom,
      source_url: get("source_url"),
    });
  }

  return { rows, errors };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function optNum(v: string): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export const adminUploadSchadRatesCsv = api<UploadSchadRatesCsvRequest, UploadSchadRatesCsvResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/schads-rates/upload-csv" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.csvContent?.trim()) throw APIError.invalidArgument("csvContent is required");

    const { rows, errors } = parseCsv(req.csvContent);
    if (errors.length > 0 && rows.length === 0) {
      return { inserted: 0, updated: 0, skipped: 0, errors };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const rowErrors: string[] = [...errors];

    for (const row of rows) {
      try {
        const existing = await db.queryRow<{ id: string }>`
          SELECT id FROM schads_award_rates
          WHERE classification_code = ${row.classification_code}
            AND employment_basis = ${row.employment_basis}
            AND effective_date = ${row.effective_from}::date
        `;

        if (existing) {
          await db.exec`
            UPDATE schads_award_rates SET
              award_code          = ${row.award_code},
              stream_code         = ${row.stream_code || null},
              stream_name         = ${row.stream_name || null},
              classification      = ${row.classification_name || row.classification_code},
              level               = ${row.level || null},
              pay_point           = ${row.pay_point || null},
              weekly_rate         = ${optNum(row.weekly_rate_aud)},
              hourly_rate         = ${Number(row.ordinary_hourly_aud)},
              saturday_rate       = ${optNum(row.saturday_hourly_aud)},
              sunday_rate         = ${optNum(row.sunday_hourly_aud)},
              public_holiday_rate = ${optNum(row.public_holiday_hourly_aud)},
              afternoon_shift_rate = ${optNum(row.afternoon_shift_hourly_aud)},
              night_shift_rate    = ${optNum(row.night_shift_hourly_aud)},
              source_url          = ${row.source_url || null},
              updated_by          = ${auth.userID},
              updated_at          = NOW()
            WHERE id = ${existing.id}
          `;
          updated++;
        } else {
          await db.exec`
            INSERT INTO schads_award_rates (
              award_code, stream_code, stream_name, classification_code, classification,
              level, pay_point, employment_basis, weekly_rate, hourly_rate,
              saturday_rate, sunday_rate, public_holiday_rate,
              afternoon_shift_rate, night_shift_rate,
              source_url, effective_date, created_by, updated_by
            ) VALUES (
              ${row.award_code},
              ${row.stream_code || null},
              ${row.stream_name || null},
              ${row.classification_code},
              ${row.classification_name || row.classification_code},
              ${row.level || null},
              ${row.pay_point || null},
              ${row.employment_basis},
              ${optNum(row.weekly_rate_aud)},
              ${Number(row.ordinary_hourly_aud)},
              ${optNum(row.saturday_hourly_aud)},
              ${optNum(row.sunday_hourly_aud)},
              ${optNum(row.public_holiday_hourly_aud)},
              ${optNum(row.afternoon_shift_hourly_aud)},
              ${optNum(row.night_shift_hourly_aud)},
              ${row.source_url || null},
              ${row.effective_from}::date,
              ${auth.userID},
              ${auth.userID}
            )
          `;
          inserted++;
        }
      } catch (e: unknown) {
        rowErrors.push(`Row (${row.classification_code}/${row.employment_basis}): ${e instanceof Error ? e.message : String(e)}`);
        skipped++;
      }
    }

    return { inserted, updated, skipped, errors: rowErrors };
  }
);
