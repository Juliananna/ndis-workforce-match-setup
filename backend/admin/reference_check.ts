import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";
import type { ReferenceStatus } from "../workers/references";

export interface ReferenceCheckScores {
  workPerformance: number;
  reliability: number;
  punctuality: number;
  professionalism: number;
  qualityOfCare: number;
  documentation: number;
  teamwork: number;
  initiative: number;
  concerns: number;
  rehire: number;
}

export interface SubmitReferenceCheckRequest {
  referenceId: string;
  conductedBy: string;
  relationship: string;
  capacity: string;
  employmentDates: string;
  reasonForLeaving: string;
  scores: ReferenceCheckScores;
  strengths: string;
  developmentAreas: string;
  additionalComments: string;
}

export type RiskLevel = "HIGH_RISK" | "CAUTION" | "STRONG" | "EXCEPTIONAL";
export type Recommendation = "Hire" | "Hire with Caution" | "Do Not Hire";

export interface ReferenceCheckResult {
  id: string;
  referenceId: string;
  conductedBy: string;
  conductedAt: Date;
  relationship: string;
  capacity: string;
  employmentDates: string;
  reasonForLeaving: string;
  scores: ReferenceCheckScores;
  strengths: string;
  developmentAreas: string;
  additionalComments: string;
  totalScore: number;
  riskLevel: RiskLevel;
  recommendation: Recommendation;
  createdAt: Date;
}

const WEIGHTS = {
  workPerformance: 2,
  reliability: 2,
  punctuality: 1,
  professionalism: 2,
  qualityOfCare: 3,
  documentation: 1,
  teamwork: 1,
  initiative: 1,
  concerns: 3,
  rehire: 4,
};

export function computeScore(scores: ReferenceCheckScores): {
  totalScore: number;
  riskLevel: RiskLevel;
  recommendation: Recommendation;
} {
  const totalScore =
    scores.workPerformance * WEIGHTS.workPerformance +
    scores.reliability * WEIGHTS.reliability +
    scores.punctuality * WEIGHTS.punctuality +
    scores.professionalism * WEIGHTS.professionalism +
    scores.qualityOfCare * WEIGHTS.qualityOfCare +
    scores.documentation * WEIGHTS.documentation +
    scores.teamwork * WEIGHTS.teamwork +
    scores.initiative * WEIGHTS.initiative +
    scores.concerns * WEIGHTS.concerns +
    scores.rehire * WEIGHTS.rehire;

  const isHighRisk = totalScore < 60 || scores.rehire <= 2 || scores.concerns <= 2;
  const isCaution = !isHighRisk && totalScore <= 75;
  const isExceptional = !isHighRisk && !isCaution && totalScore > 90 && scores.concerns === 5 && scores.rehire >= 4;

  const riskLevel: RiskLevel = isHighRisk
    ? "HIGH_RISK"
    : isCaution
    ? "CAUTION"
    : isExceptional
    ? "EXCEPTIONAL"
    : "STRONG";

  const recommendation: Recommendation = isHighRisk
    ? "Do Not Hire"
    : isCaution
    ? "Hire with Caution"
    : "Hire";

  return { totalScore, riskLevel, recommendation };
}

function mapRow(r: {
  id: string; reference_id: string; conducted_by: string; conducted_at: Date;
  relationship: string; capacity: string; employment_dates: string; reason_for_leaving: string;
  score_work_performance: number; score_reliability: number; score_punctuality: number;
  score_professionalism: number; score_quality_of_care: number; score_documentation: number;
  score_teamwork: number; score_initiative: number; score_concerns: number; score_rehire: number;
  strengths: string; development_areas: string; additional_comments: string;
  total_score: number; risk_level: string; recommendation: string; created_at: Date;
}): ReferenceCheckResult {
  return {
    id: r.id,
    referenceId: r.reference_id,
    conductedBy: r.conducted_by,
    conductedAt: r.conducted_at,
    relationship: r.relationship,
    capacity: r.capacity,
    employmentDates: r.employment_dates,
    reasonForLeaving: r.reason_for_leaving,
    scores: {
      workPerformance: r.score_work_performance,
      reliability: r.score_reliability,
      punctuality: r.score_punctuality,
      professionalism: r.score_professionalism,
      qualityOfCare: r.score_quality_of_care,
      documentation: r.score_documentation,
      teamwork: r.score_teamwork,
      initiative: r.score_initiative,
      concerns: r.score_concerns,
      rehire: r.score_rehire,
    },
    strengths: r.strengths,
    developmentAreas: r.development_areas,
    additionalComments: r.additional_comments,
    totalScore: r.total_score,
    riskLevel: r.risk_level as RiskLevel,
    recommendation: r.recommendation as Recommendation,
    createdAt: r.created_at,
  };
}

export const adminSubmitReferenceCheck = api<SubmitReferenceCheckRequest, ReferenceCheckResult>(
  { expose: true, auth: true, method: "POST", path: "/admin/references/:referenceId/check" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const ref = await db.queryRow<{ id: string }>`
      SELECT id FROM worker_references WHERE id = ${req.referenceId}
    `;
    if (!ref) throw APIError.notFound("reference not found");

    for (const [key, val] of Object.entries(req.scores)) {
      if (!Number.isInteger(val) || val < 1 || val > 5) {
        throw APIError.invalidArgument(`score ${key} must be between 1 and 5`);
      }
    }

    const { totalScore, riskLevel, recommendation } = computeScore(req.scores);

    const row = await db.queryRow<{
      id: string; reference_id: string; conducted_by: string; conducted_at: Date;
      relationship: string; capacity: string; employment_dates: string; reason_for_leaving: string;
      score_work_performance: number; score_reliability: number; score_punctuality: number;
      score_professionalism: number; score_quality_of_care: number; score_documentation: number;
      score_teamwork: number; score_initiative: number; score_concerns: number; score_rehire: number;
      strengths: string; development_areas: string; additional_comments: string;
      total_score: number; risk_level: string; recommendation: string; created_at: Date;
    }>`
      INSERT INTO reference_checks (
        reference_id, conducted_by, relationship, capacity, employment_dates, reason_for_leaving,
        score_work_performance, score_reliability, score_punctuality, score_professionalism,
        score_quality_of_care, score_documentation, score_teamwork, score_initiative,
        score_concerns, score_rehire,
        strengths, development_areas, additional_comments,
        total_score, risk_level, recommendation
      ) VALUES (
        ${req.referenceId}, ${req.conductedBy}, ${req.relationship}, ${req.capacity},
        ${req.employmentDates}, ${req.reasonForLeaving},
        ${req.scores.workPerformance}, ${req.scores.reliability}, ${req.scores.punctuality},
        ${req.scores.professionalism}, ${req.scores.qualityOfCare}, ${req.scores.documentation},
        ${req.scores.teamwork}, ${req.scores.initiative},
        ${req.scores.concerns}, ${req.scores.rehire},
        ${req.strengths}, ${req.developmentAreas}, ${req.additionalComments},
        ${totalScore}, ${riskLevel}, ${recommendation}
      )
      RETURNING *
    `;

    if (!row) throw APIError.internal("failed to save reference check");

    await db.exec`
      UPDATE worker_references
      SET status = 'Verified', updated_at = NOW()
      WHERE id = ${req.referenceId}
    `;

    return mapRow(row);
  }
);

export interface GetReferenceCheckRequest {
  referenceId: string;
}

export interface GetReferenceCheckResponse {
  check: ReferenceCheckResult | null;
}

export const adminGetReferenceCheck = api<GetReferenceCheckRequest, GetReferenceCheckResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/references/:referenceId/check" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const row = await db.queryRow<{
      id: string; reference_id: string; conducted_by: string; conducted_at: Date;
      relationship: string; capacity: string; employment_dates: string; reason_for_leaving: string;
      score_work_performance: number; score_reliability: number; score_punctuality: number;
      score_professionalism: number; score_quality_of_care: number; score_documentation: number;
      score_teamwork: number; score_initiative: number; score_concerns: number; score_rehire: number;
      strengths: string; development_areas: string; additional_comments: string;
      total_score: number; risk_level: string; recommendation: string; created_at: Date;
    }>`
      SELECT * FROM reference_checks WHERE reference_id = ${req.referenceId}
      ORDER BY created_at DESC LIMIT 1
    `;

    return { check: row ? mapRow(row) : null };
  }
);
