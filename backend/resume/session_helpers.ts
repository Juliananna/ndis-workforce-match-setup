import type { ResumeSession, ScoreBreakdown } from "./types";

export function rowToSession(row: Record<string, any>): ResumeSession {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    stepCompleted: row.step_completed,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    suburb: row.suburb,
    state: row.state,
    postcode: row.postcode,
    travelRadiusKm: row.travel_radius_km,
    targetRole: row.target_role,
    experienceLevel: row.experience_level,
    experienceYears: row.experience_years,
    supportSettings: row.support_settings ?? [],
    supportTasks: row.support_tasks ?? [],
    supportStyle: row.support_style,
    capabilityStories: row.capability_stories ?? [],
    availability: row.availability ?? [],
    driversLicence: row.drivers_licence ?? false,
    ownVehicle: row.own_vehicle ?? false,
    languages: row.languages ?? [],
    workHistory: row.work_history ?? [],
    qualifications: row.qualifications ?? [],
    training: row.training ?? [],
    checks: row.checks ?? [],
    ndisScreeningNumber: row.ndis_screening_number,
    resumeStrengthScore: row.resume_strength_score,
    scoreBreakdown: row.score_breakdown ?? null,
    aiSummary: row.ai_summary,
    aiBullets: row.ai_bullets ?? [],
    aiBio: row.ai_bio,
    aiSearchCard: row.ai_search_card,
    aiInterviewPrompts: row.ai_interview_prompts ?? [],
    convertedWorkerId: row.converted_worker_id,
  };
}

export function computeScore(session: ResumeSession, docCount: number, refereeCount: number): {
  total: number;
  breakdown: ScoreBreakdown;
} {
  const identity = scoreIdentity(session);
  const experience = scoreExperience(session);
  const qualifications = scoreQualifications(session);
  const checks = scoreChecks(session);
  const availability = scoreAvailability(session);
  const capabilities = scoreCapabilities(session);
  const referees = Math.min(refereeCount * 15, 30);
  const documents = Math.min(docCount * 8, 24);

  const total = Math.min(
    identity + experience + qualifications + checks + availability + capabilities + referees + documents,
    100
  );

  return {
    total,
    breakdown: { identity, experience, qualifications, checks, availability, capabilities, referees, documents },
  };
}

function scoreIdentity(s: ResumeSession): number {
  let score = 0;
  if (s.firstName) score += 2;
  if (s.lastName) score += 2;
  if (s.phone) score += 2;
  if (s.suburb) score += 2;
  if (s.state) score += 1;
  if (s.travelRadiusKm) score += 1;
  return Math.min(score, 10);
}

function scoreExperience(s: ResumeSession): number {
  let score = 0;
  if (s.experienceLevel) score += 3;
  if (s.experienceYears !== null) score += 2;
  if (s.workHistory.length >= 1) score += 5;
  if (s.workHistory.length >= 2) score += 3;
  if (s.supportSettings.length > 0) score += 2;
  if (s.supportTasks.length >= 3) score += 3;
  return Math.min(score, 18);
}

function scoreQualifications(s: ResumeSession): number {
  let score = 0;
  if (s.qualifications.length >= 1) score += 5;
  if (s.qualifications.length >= 2) score += 3;
  if (s.training.length >= 1) score += 4;
  return Math.min(score, 12);
}

function scoreChecks(s: ResumeSession): number {
  let score = 0;
  const checkTypes = s.checks.map((c) => c.type);
  if (checkTypes.includes("NDIS Worker Screening")) score += 6;
  if (checkTypes.includes("Police Check")) score += 3;
  if (checkTypes.includes("Working with Children")) score += 3;
  if (checkTypes.includes("First Aid")) score += 2;
  if (s.ndisScreeningNumber) score += 2;
  return Math.min(score, 16);
}

function scoreAvailability(s: ResumeSession): number {
  let score = 0;
  if (s.availability.length > 0) score += 3;
  if (s.availability.length >= 3) score += 2;
  if (s.driversLicence) score += 2;
  if (s.ownVehicle) score += 1;
  return Math.min(score, 8);
}

function scoreCapabilities(s: ResumeSession): number {
  let score = 0;
  if (s.supportStyle) score += 2;
  if (s.capabilityStories.length >= 1) score += 4;
  if (s.capabilityStories.length >= 2) score += 4;
  return Math.min(score, 10);
}
