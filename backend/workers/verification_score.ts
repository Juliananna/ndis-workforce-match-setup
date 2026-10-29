import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface VerificationPillar {
  key: string;
  label: string;
  points: number;
  earned: boolean;
  hint: string;
}

export interface VerificationScoreResponse {
  score: number;
  pillars: VerificationPillar[];
  level: "incomplete" | "in_progress" | "submission_ready" | "compliance_pending";
  levelLabel: string;
  visibilityLabel: string;
  tierName: string;
  offersUnlocked: boolean;
}

const ID_TYPES = [
  "Driver's Licence",
  "Passport / ID",
];

const CERT_TYPES = [
  "NDIS Worker Screening Check",
  "NDIS Worker Orientation Module",
  "NDIS Code of Conduct acknowledgement",
  "Infection Control Certificate",
  "First Aid Certificate",
  "CPR Certificate",
  "Certificate III / IV Disability",
  "Working With Children Check",
  "Police Clearance",
];

export const getVerificationScore = api<void, VerificationScoreResponse>(
  { expose: true, auth: true, method: "GET", path: "/workers/verification-score" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const worker = await db.queryRow<{
      worker_id: string;
      full_name: string | null;
      location: string | null;
      bio: string | null;
      experience_years: number | null;
      phone: string;
    }>`
      SELECT worker_id, full_name, location, bio, experience_years, phone
      FROM workers WHERE user_id = ${auth.userID}
    `;

    if (!worker) throw APIError.notFound("worker profile not found");

    const wid = worker.worker_id;

    const [availRow, refsRow, docsRows] = await Promise.all([
      db.queryRow<{ cnt: number }>`SELECT COUNT(*)::int AS cnt FROM worker_availability WHERE worker_id = ${wid}`,
      db.queryRow<{ cnt: number }>`SELECT COUNT(*)::int AS cnt FROM worker_references WHERE worker_id = ${wid}`,
      db.queryAll<{ document_type: string }>`SELECT document_type FROM worker_documents WHERE worker_id = ${wid}`,
    ]);

    const uploadedTypes = new Set(docsRows.map((d) => d.document_type));

    const profileDone =
      !!worker.full_name?.trim() &&
      !!worker.location?.trim() &&
      !!worker.bio?.trim() &&
      worker.experience_years !== null &&
      !!worker.phone?.trim();

    const idDone = ID_TYPES.some((t) => uploadedTypes.has(t));
    const certsDone = CERT_TYPES.some((t) => uploadedTypes.has(t));
    const referencesDone = (refsRow?.cnt ?? 0) > 0;
    const availabilityDone = (availRow?.cnt ?? 0) > 0;

    const pillars: VerificationPillar[] = [
      {
        key: "profile",
        label: "Profile Details",
        points: 20,
        earned: profileDone,
        hint: "Name, location, bio, experience & phone",
      },
      {
        key: "id",
        label: "ID Uploaded",
        points: 20,
        earned: idDone,
        hint: "Driver's licence or passport",
      },
      {
        key: "certifications",
        label: "Certifications",
        points: 20,
        earned: certsDone,
        hint: "NDIS, First Aid, Police Check, etc.",
      },
      {
        key: "references",
        label: "References Added",
        points: 20,
        earned: referencesDone,
        hint: "At least one professional reference",
      },
      {
        key: "availability",
        label: "Availability Set",
        points: 20,
        earned: availabilityDone,
        hint: "Days and times you're available to work",
      },
    ];

    const score = pillars.filter((p) => p.earned).reduce((sum, p) => sum + p.points, 0);

    let level: VerificationScoreResponse["level"];
    let levelLabel: string;
    let visibilityLabel: string;
    let tierName: string;
    let offersUnlocked: boolean;

    if (score <= 39) {
      level = "incomplete";
      levelLabel = "Profile Incomplete";
      visibilityLabel = "Complete your profile to become visible to employers and begin the compliance process.";
      tierName = "Profile Incomplete";
      offersUnlocked = false;
    } else if (score <= 59) {
      level = "in_progress";
      levelLabel = "Profile In Progress";
      visibilityLabel = "Keep going — complete your remaining profile sections to submit for compliance review.";
      tierName = "Profile In Progress";
      offersUnlocked = false;
    } else if (score <= 79) {
      level = "submission_ready";
      levelLabel = "Ready to Submit";
      visibilityLabel = "Your profile is looking good. Upload your compliance documents to begin the review process.";
      tierName = "Ready to Submit";
      offersUnlocked = false;
    } else {
      level = "compliance_pending";
      levelLabel = "Compliance Under Review";
      visibilityLabel = "Your profile is complete. Our compliance team will review your documents and references — we'll notify you when this is done.";
      tierName = "Compliance Under Review";
      offersUnlocked = false;
    }

    return { score, pillars, level, levelLabel, visibilityLabel, tierName, offersUnlocked };
  }
);
