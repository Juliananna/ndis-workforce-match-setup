import { describe, it, expect } from "vitest";

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
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const skillMatches = params.workerSkills.filter((s) => params.jobTags.has(s));
  const skillScore =
    params.jobTags.size > 0
      ? Math.round((skillMatches.length / params.jobTags.size) * 35)
      : 35;
  score += skillScore;
  if (skillMatches.length > 0) {
    reasons.push(`${skillMatches.length} of ${params.jobTags.size} skills matched`);
  }

  if (params.jobShiftDate) {
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
      params.jobShiftDate.getDay()
    ];
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
    const expScore = Math.min(15, params.workerExpYears * 3);
    score += expScore;
    reasons.push(`${params.workerExpYears} yr${params.workerExpYears !== 1 ? "s" : ""} experience`);
  }

  return { score: Math.min(100, score), reasons };
}

describe("computeCompatibility", () => {
  it("gives full skill score when all job tags matched", () => {
    const { score, reasons } = computeCompatibility({
      jobTags: new Set(["Personal care", "Mobility support"]),
      jobWeekdayRate: 40,
      jobShiftDate: null,
      workerSkills: ["Personal care", "Mobility support"],
      workerAvailDays: [],
      workerMinPay: null,
      workerExpYears: null,
      distanceKm: null,
      travelRadiusKm: null,
    });
    expect(score).toBeGreaterThanOrEqual(35);
    expect(reasons.some((r) => r.includes("2 of 2"))).toBe(true);
  });

  it("awards availability bonus when worker available on shift day", () => {
    const monday = new Date("2026-03-23");
    expect(monday.getDay()).toBe(1);
    const { score } = computeCompatibility({
      jobTags: new Set(),
      jobWeekdayRate: 40,
      jobShiftDate: monday,
      workerSkills: [],
      workerAvailDays: ["Monday", "Wednesday"],
      workerMinPay: null,
      workerExpYears: null,
      distanceKm: null,
      travelRadiusKm: null,
    });
    expect(score).toBeGreaterThanOrEqual(35 + 25);
  });

  it("gives no availability bonus when worker unavailable on shift day", () => {
    const monday = new Date("2026-03-23");
    const { score: withAvail } = computeCompatibility({
      jobTags: new Set(),
      jobWeekdayRate: 40,
      jobShiftDate: monday,
      workerSkills: [],
      workerAvailDays: ["Monday"],
      workerMinPay: null,
      workerExpYears: null,
      distanceKm: null,
      travelRadiusKm: null,
    });
    const { score: withoutAvail } = computeCompatibility({
      jobTags: new Set(),
      jobWeekdayRate: 40,
      jobShiftDate: monday,
      workerSkills: [],
      workerAvailDays: ["Friday"],
      workerMinPay: null,
      workerExpYears: null,
      distanceKm: null,
      travelRadiusKm: null,
    });
    expect(withAvail).toBeGreaterThan(withoutAvail);
  });

  it("does not exceed 100", () => {
    const { score } = computeCompatibility({
      jobTags: new Set(["A", "B", "C"]),
      jobWeekdayRate: 40,
      jobShiftDate: new Date("2026-03-23"),
      workerSkills: ["A", "B", "C"],
      workerAvailDays: ["Monday"],
      workerMinPay: null,
      workerExpYears: 10,
      distanceKm: 1,
      travelRadiusKm: 50,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it("excludes proximity when worker is beyond travel radius", () => {
    const { score: inside } = computeCompatibility({
      jobTags: new Set(),
      jobWeekdayRate: 40,
      jobShiftDate: null,
      workerSkills: [],
      workerAvailDays: [],
      workerMinPay: null,
      workerExpYears: null,
      distanceKm: 10,
      travelRadiusKm: 20,
    });
    const { score: outside } = computeCompatibility({
      jobTags: new Set(),
      jobWeekdayRate: 40,
      jobShiftDate: null,
      workerSkills: [],
      workerAvailDays: [],
      workerMinPay: null,
      workerExpYears: null,
      distanceKm: 100,
      travelRadiusKm: 20,
    });
    expect(inside).toBeGreaterThan(outside);
  });
});
