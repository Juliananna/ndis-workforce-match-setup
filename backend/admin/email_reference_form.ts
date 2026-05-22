import { api, APIError } from "encore.dev/api";
import db from "../db";
import { computeScore } from "./reference_check";
import type { ReferenceCheckScores, ReferenceCheckResult } from "./reference_check";

export interface EmailReferenceFormData {
  token: string;
  refereeName: string;
  refereeTitle: string;
  refereeOrganisation: string;
  workerName: string;
  requestId: string;
  referenceId: string;
  expiresAt: Date;
  alreadyCompleted: boolean;
}

export const publicGetEmailReferenceForm = api<{ token: string }, EmailReferenceFormData>(
  { expose: true, auth: false, method: "GET", path: "/public/reference-form/:token" },
  async (req) => {
    const row = await db.queryRow<{
      id: string;
      reference_id: string;
      status: string;
      expires_at: Date;
      referee_name: string;
      referee_title: string;
      referee_organisation: string;
      worker_name: string;
    }>`
      SELECT
        err.id,
        err.reference_id,
        err.status,
        err.expires_at,
        wr.referee_name,
        wr.referee_title,
        wr.referee_organisation,
        w.name AS worker_name
      FROM email_reference_requests err
      JOIN worker_references wr ON wr.id = err.reference_id
      JOIN workers w ON w.worker_id = wr.worker_id
      WHERE err.token = ${req.token}
    `;

    if (!row) throw APIError.notFound("reference form not found");

    if (row.status === "Expired" || new Date(row.expires_at) < new Date()) {
      throw APIError.failedPrecondition("This reference link has expired");
    }

    if (row.status === "Cancelled") {
      throw APIError.failedPrecondition("This reference request has been cancelled");
    }

    return {
      token: req.token,
      refereeName: row.referee_name,
      refereeTitle: row.referee_title,
      refereeOrganisation: row.referee_organisation,
      workerName: row.worker_name,
      requestId: row.id,
      referenceId: row.reference_id,
      expiresAt: row.expires_at,
      alreadyCompleted: row.status === "Completed",
    };
  }
);

export interface SubmitEmailReferenceFormRequest {
  token: string;
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

export interface SubmitEmailReferenceFormResponse {
  check: ReferenceCheckResult;
}

export const publicSubmitEmailReferenceForm = api<SubmitEmailReferenceFormRequest, SubmitEmailReferenceFormResponse>(
  { expose: true, auth: false, method: "POST", path: "/public/reference-form/:token/submit" },
  async (req) => {
    const request = await db.queryRow<{
      id: string;
      reference_id: string;
      status: string;
      expires_at: Date;
    }>`
      SELECT id, reference_id, status, expires_at
      FROM email_reference_requests
      WHERE token = ${req.token}
    `;

    if (!request) throw APIError.notFound("reference form not found");
    if (request.status === "Completed") throw APIError.failedPrecondition("This reference has already been submitted");
    if (request.status !== "Pending") throw APIError.failedPrecondition("This reference link is no longer active");
    if (new Date(request.expires_at) < new Date()) throw APIError.failedPrecondition("This reference link has expired");

    if (!req.conductedBy?.trim()) throw APIError.invalidArgument("conductedBy is required");
    if (!req.relationship?.trim()) throw APIError.invalidArgument("relationship is required");
    if (!req.capacity?.trim()) throw APIError.invalidArgument("capacity is required");
    if (!req.employmentDates?.trim()) throw APIError.invalidArgument("employmentDates is required");
    if (!req.reasonForLeaving?.trim()) throw APIError.invalidArgument("reasonForLeaving is required");
    if (!req.strengths?.trim()) throw APIError.invalidArgument("strengths is required");
    if (!req.developmentAreas?.trim()) throw APIError.invalidArgument("developmentAreas is required");

    const SCORE_FIELDS: (keyof typeof req.scores)[] = [
      "workPerformance", "reliability", "punctuality", "professionalism",
      "qualityOfCare", "documentation", "teamwork", "initiative", "concerns", "rehire",
    ];
    for (const key of SCORE_FIELDS) {
      if (req.scores[key] === undefined || req.scores[key] === null) {
        throw APIError.invalidArgument(`score ${key} is required`);
      }
    }

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
      total_score: number; risk_level: string; recommendation: string; method: string; created_at: Date;
    }>`
      INSERT INTO reference_checks (
        reference_id, conducted_by, relationship, capacity, employment_dates, reason_for_leaving,
        score_work_performance, score_reliability, score_punctuality, score_professionalism,
        score_quality_of_care, score_documentation, score_teamwork, score_initiative,
        score_concerns, score_rehire,
        strengths, development_areas, additional_comments,
        total_score, risk_level, recommendation, method
      ) VALUES (
        ${request.reference_id}, ${req.conductedBy.trim() || req.token}, ${req.relationship}, ${req.capacity},
        ${req.employmentDates}, ${req.reasonForLeaving},
        ${req.scores.workPerformance}, ${req.scores.reliability}, ${req.scores.punctuality},
        ${req.scores.professionalism}, ${req.scores.qualityOfCare}, ${req.scores.documentation},
        ${req.scores.teamwork}, ${req.scores.initiative},
        ${req.scores.concerns}, ${req.scores.rehire},
        ${req.strengths}, ${req.developmentAreas}, ${req.additionalComments},
        ${totalScore}, ${riskLevel}, ${recommendation}, 'email'
      )
      RETURNING *
    `;

    if (!row) throw APIError.internal("failed to save reference check");

    await db.exec`
      UPDATE worker_references SET status = 'Verified', updated_at = NOW()
      WHERE id = ${request.reference_id}
    `;

    await db.exec`
      UPDATE email_reference_requests
      SET status = 'Completed', completed_at = NOW(), updated_at = NOW()
      WHERE id = ${request.id}
    `;

    return {
      check: {
        id: row.id,
        referenceId: row.reference_id,
        conductedBy: row.conducted_by,
        conductedAt: row.conducted_at,
        relationship: row.relationship,
        capacity: row.capacity,
        employmentDates: row.employment_dates,
        reasonForLeaving: row.reason_for_leaving,
        scores: {
          workPerformance: row.score_work_performance,
          reliability: row.score_reliability,
          punctuality: row.score_punctuality,
          professionalism: row.score_professionalism,
          qualityOfCare: row.score_quality_of_care,
          documentation: row.score_documentation,
          teamwork: row.score_teamwork,
          initiative: row.score_initiative,
          concerns: row.score_concerns,
          rehire: row.score_rehire,
        },
        strengths: row.strengths,
        developmentAreas: row.development_areas,
        additionalComments: row.additional_comments,
        totalScore: row.total_score,
        riskLevel: row.risk_level as ReferenceCheckResult["riskLevel"],
        recommendation: row.recommendation as ReferenceCheckResult["recommendation"],
        method: "email" as const,
        createdAt: row.created_at,
      },
    };
  }
);
