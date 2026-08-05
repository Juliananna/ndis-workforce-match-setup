import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface PublicSchadRate {
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
      }>`
        SELECT id, level, pay_point, classification, hourly_rate, casual_loading_rate,
               saturday_rate, sunday_rate, public_holiday_rate, evening_rate, sleepover_rate,
               notes, effective_date::text
        FROM schads_award_rates
        WHERE effective_date = (SELECT MAX(effective_date) FROM schads_award_rates)
        ORDER BY level ASC, pay_point ASC
      `;
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
    }>`
      SELECT id, level, pay_point, classification, hourly_rate, casual_loading_rate,
             saturday_rate, sunday_rate, public_holiday_rate, evening_rate, sleepover_rate,
             notes, effective_date::text
      FROM schads_award_rates
      WHERE effective_date = ${latestDate.effective_date}::date
      ORDER BY level ASC, pay_point ASC
    `;

    return {
      rates: rows.map((r) => ({
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
      })),
      effectiveDate: latestDate.effective_date,
    };
  }
);
