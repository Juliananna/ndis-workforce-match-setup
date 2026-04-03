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
  level: "low" | "medium" | "high" | "verified";
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

    if (score <= 49) {
      level = "low";
      levelLabel = "Getting Started";
      visibilityLabel = "Your profile is not visible to most providers yet. Complete your profile to start getting matched.";
      tierName = "Getting Started";
      offersUnlocked = false;
    } else if (score <= 79) {
      level = "medium";
      levelLabel = "In Progress";
      visibilityLabel = "You're visible, but not prioritised. Verified workers are chosen first.";
      tierName = "In Progress";
      offersUnlocked = false;
    } else if (score <= 99) {
      level = "high";
      levelLabel = "Priority Profile";
      visibilityLabel = "You're now prioritised by providers. Complete your final steps to become fully verified.";
      tierName = "Priority Profile";
      offersUnlocked = true;
    } else {
      level = "verified";
      levelLabel = "Verified Worker ✅";
      visibilityLabel = "Your profile is fully verified and trusted by providers.";
      tierName = "Verified Worker";
      offersUnlocked = true;
    }

    return { score, pillars, level, levelLabel, visibilityLabel, tierName, offersUnlocked };
  }
);
