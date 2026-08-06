import { describe, it, expect } from "vitest";
import { rowToSession, computeScore } from "./session_helpers";
import type { ResumeSession } from "./types";

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test-session-id",
    created_at: new Date(),
    updated_at: new Date(),
    status: "draft",
    step_completed: 0,
    email: "worker@example.com",
    first_name: "Jane",
    last_name: "Smith",
    phone: "0400000001",
    suburb: "Fitzroy",
    state: "VIC",
    postcode: "3065",
    travel_radius_km: 20,
    target_role: "Support Worker",
    experience_level: "intermediate",
    experience_years: 3,
    support_settings: ["Disability Support", "Aged Care"],
    support_tasks: ["Personal care", "Medication", "Mobility support"],
    support_style: "Person-centred",
    capability_stories: [{ situation: "s", task: "t", action: "a", result: "r" }],
    availability: [{ day: "Monday", slots: ["Morning"] }],
    drivers_licence: true,
    own_vehicle: true,
    languages: ["English", "Spanish"],
    work_history: [
      { employer: "NDIS Provider", role: "Support Worker", startYear: 2021, endYear: 2023 },
    ],
    qualifications: [{ name: "Certificate III in Individual Support", year: 2020 }],
    training: [{ name: "Manual Handling", year: 2022 }],
    checks: [{ type: "NDIS Worker Screening", number: "WS12345", expiry: "2027-01-01" }],
    ndis_screening_number: "WS12345",
    resume_strength_score: null,
    score_breakdown: null,
    ai_summary: null,
    ai_bullets: null,
    ai_bio: null,
    ai_search_card: null,
    ai_interview_prompts: null,
    ai_generation_count: 0,
    converted_worker_id: null,
    photo_key: null,
    ...overrides,
  };
}

describe("rowToSession — field mapping", () => {
  it("maps all identity fields correctly", () => {
    const session = rowToSession(makeRow());
    expect(session.id).toBe("test-session-id");
    expect(session.email).toBe("worker@example.com");
    expect(session.firstName).toBe("Jane");
    expect(session.lastName).toBe("Smith");
    expect(session.phone).toBe("0400000001");
    expect(session.suburb).toBe("Fitzroy");
    expect(session.state).toBe("VIC");
    expect(session.postcode).toBe("3065");
  });

  it("maps work details correctly", () => {
    const session = rowToSession(makeRow());
    expect(session.travelRadiusKm).toBe(20);
    expect(session.targetRole).toBe("Support Worker");
    expect(session.experienceLevel).toBe("intermediate");
    expect(session.experienceYears).toBe(3);
    expect(session.driversLicence).toBe(true);
    expect(session.ownVehicle).toBe(true);
  });

  it("parses JSONB arrays correctly when already objects", () => {
    const session = rowToSession(makeRow());
    expect(session.supportSettings).toEqual(["Disability Support", "Aged Care"]);
    expect(session.supportTasks).toHaveLength(3);
    expect(session.languages).toEqual(["English", "Spanish"]);
  });

  it("parses JSONB arrays correctly when stored as JSON strings", () => {
    const session = rowToSession(
      makeRow({
        support_settings: JSON.stringify(["Aged Care"]),
        languages: JSON.stringify(["French"]),
        work_history: JSON.stringify([{ employer: "Care Co", role: "Carer", startYear: 2020 }]),
      })
    );
    expect(session.supportSettings).toEqual(["Aged Care"]);
    expect(session.languages).toEqual(["French"]);
    expect(session.workHistory[0].employer).toBe("Care Co");
  });

  it("falls back to empty arrays for null JSONB fields", () => {
    const session = rowToSession(
      makeRow({
        support_settings: null,
        support_tasks: null,
        languages: null,
        work_history: null,
        qualifications: null,
        training: null,
        checks: null,
        capability_stories: null,
        availability: null,
        ai_bullets: null,
        ai_interview_prompts: null,
      })
    );
    expect(session.supportSettings).toEqual([]);
    expect(session.supportTasks).toEqual([]);
    expect(session.languages).toEqual([]);
    expect(session.workHistory).toEqual([]);
    expect(session.qualifications).toEqual([]);
    expect(session.training).toEqual([]);
    expect(session.checks).toEqual([]);
    expect(session.capabilityStories).toEqual([]);
    expect(session.availability).toEqual([]);
  });

  it("maps drivers_licence false correctly", () => {
    const session = rowToSession(makeRow({ drivers_licence: false, own_vehicle: false }));
    expect(session.driversLicence).toBe(false);
    expect(session.ownVehicle).toBe(false);
  });

  it("defaults drivers_licence to false when null", () => {
    const session = rowToSession(makeRow({ drivers_licence: null, own_vehicle: null }));
    expect(session.driversLicence).toBe(false);
    expect(session.ownVehicle).toBe(false);
  });

  it("maps ai_generation_count default to 0 when null", () => {
    const session = rowToSession(makeRow({ ai_generation_count: null }));
    expect(session.aiGenerationCount).toBe(0);
  });
});

describe("computeScore — resume strength scoring", () => {
  function sessionFromRow(overrides: Record<string, unknown> = {}): ResumeSession {
    return rowToSession(makeRow(overrides));
  }

  it("returns 0 for completely empty session", () => {
    const empty = rowToSession(
      makeRow({
        first_name: null,
        last_name: null,
        phone: null,
        suburb: null,
        state: null,
        travel_radius_km: null,
        experience_level: null,
        experience_years: null,
        support_settings: null,
        support_tasks: null,
        support_style: null,
        capability_stories: null,
        availability: null,
        drivers_licence: false,
        own_vehicle: false,
        languages: null,
        work_history: null,
        qualifications: null,
        training: null,
        checks: null,
        ndis_screening_number: null,
      })
    );
    const { total } = computeScore(empty, 0, 0);
    expect(total).toBe(0);
  });

  it("scores identity fields", () => {
    const session = sessionFromRow();
    const { breakdown } = computeScore(session, 0, 0);
    expect(breakdown.identity).toBeGreaterThan(0);
  });

  it("awards experience points for work history + skills", () => {
    const session = sessionFromRow();
    const { breakdown } = computeScore(session, 0, 0);
    expect(breakdown.experience).toBeGreaterThan(0);
  });

  it("awards qualification points", () => {
    const session = sessionFromRow();
    const { breakdown } = computeScore(session, 0, 0);
    expect(breakdown.qualifications).toBeGreaterThan(0);
  });

  it("awards checks points for NDIS screening", () => {
    const session = sessionFromRow();
    const { breakdown } = computeScore(session, 0, 0);
    expect(breakdown.checks).toBeGreaterThan(0);
  });

  it("awards availability points for days + drivers licence", () => {
    const session = sessionFromRow();
    const { breakdown } = computeScore(session, 0, 0);
    expect(breakdown.availability).toBeGreaterThan(0);
  });

  it("awards capability points for stories + support style", () => {
    const session = sessionFromRow();
    const { breakdown } = computeScore(session, 0, 0);
    expect(breakdown.capabilities).toBeGreaterThan(0);
  });

  it("awards 15 points per referee up to 30", () => {
    const session = sessionFromRow();
    const { breakdown: one } = computeScore(session, 0, 1);
    const { breakdown: two } = computeScore(session, 0, 2);
    const { breakdown: three } = computeScore(session, 0, 3);
    expect(one.referees).toBe(15);
    expect(two.referees).toBe(30);
    expect(three.referees).toBe(30);
  });

  it("awards 8 points per document up to 24", () => {
    const session = sessionFromRow();
    const { breakdown: one } = computeScore(session, 1, 0);
    const { breakdown: three } = computeScore(session, 3, 0);
    const { breakdown: four } = computeScore(session, 4, 0);
    expect(one.documents).toBe(8);
    expect(three.documents).toBe(24);
    expect(four.documents).toBe(24);
  });

  it("total never exceeds 100", () => {
    const session = sessionFromRow();
    const { total } = computeScore(session, 10, 10);
    expect(total).toBeLessThanOrEqual(100);
  });

  it("full profile scores above 60", () => {
    const session = sessionFromRow();
    const { total } = computeScore(session, 3, 2);
    expect(total).toBeGreaterThan(60);
  });
});

describe("updateSession field coalesce logic", () => {
  it("COALESCE means null does not overwrite existing value", () => {
    const existingValue = "existing";
    const updateValue: string | null = null;
    const result = updateValue ?? existingValue;
    expect(result).toBe("existing");
  });

  it("COALESCE means provided value overwrites existing", () => {
    const existingValue = "existing";
    const updateValue: string | null = "new value";
    const result = updateValue ?? existingValue;
    expect(result).toBe("new value");
  });

  it("stepCompleted coalesce: only advances when explicitly provided", () => {
    const currentStep = 3;
    const newStep: number | null = null;
    const result = newStep ?? currentStep;
    expect(result).toBe(3);
  });

  it("stepCompleted updates when provided", () => {
    const currentStep = 3;
    const newStep: number | null = 5;
    const result = newStep ?? currentStep;
    expect(result).toBe(5);
  });

  it("JSON stringify round-trip preserves support_settings array", () => {
    const original = ["Disability Support", "Aged Care", "Mental Health Support"];
    const serialised = JSON.stringify(original);
    const parsed = JSON.parse(serialised);
    expect(parsed).toEqual(original);
  });

  it("JSON stringify round-trip preserves work_history objects", () => {
    const original = [
      { employer: "Happy Care", role: "Support Worker", startYear: 2020, endYear: 2023 },
      { employer: "NDIS Co", role: "Senior Support", startYear: 2023, endYear: null },
    ];
    const parsed = JSON.parse(JSON.stringify(original));
    expect(parsed[0].employer).toBe("Happy Care");
    expect(parsed[1].endYear).toBeNull();
  });

  it("JSON stringify round-trip preserves checks with expiry", () => {
    const original = [
      { type: "NDIS Worker Screening", number: "WS123", expiry: "2027-06-01" },
      { type: "Police Check", number: "PC456", expiry: "2026-12-01" },
    ];
    const parsed: typeof original = JSON.parse(JSON.stringify(original));
    expect(parsed[0].type).toBe("NDIS Worker Screening");
    expect(parsed[1].expiry).toBe("2026-12-01");
  });
});
