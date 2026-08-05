import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface PublicSchadRate {
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
}

export interface ListSchadRatesPublicResponse {
  rates: PublicSchadRate[];
  effectiveDate: string | null;
}

export const listSchadRates = api<void, ListSchadRatesPublicResponse>(
  { expose: true, auth: true, method: "GET", path: "/offers/schads-rates" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER" && auth.role !== "WORKER" && auth.role !== "ADMIN") {
      return { rates: [], effectiveDate: null };
    }

    const latestDate = await db.queryRow<{ effective_date: string | null }>`
      SELECT MAX(effective_date)::text AS effective_date FROM schads_award_rates
    `;

    if (!latestDate?.effective_date) {
      return { rates: [], effectiveDate: null };
    }

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
    }>`
      SELECT id, award_code, stream_code, stream_name, classification_code, classification,
             level, pay_point, employment_basis, weekly_rate, hourly_rate,
             saturday_rate, sunday_rate, public_holiday_rate,
             afternoon_shift_rate, night_shift_rate,
             notes, source_url, effective_date::text
      FROM schads_award_rates
      WHERE effective_date = ${latestDate.effective_date}::date
      ORDER BY stream_code ASC, level ASC, pay_point ASC, employment_basis ASC
    `;

    return {
      rates: rows.map((r) => ({
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
      })),
      effectiveDate: latestDate.effective_date,
    };
  }
);
