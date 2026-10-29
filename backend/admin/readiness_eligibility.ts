import db from "../db";

export const MANDATORY_COMPLIANCE_DOC_TYPES = [
  "NDIS Worker Screening Check",
  "Police Clearance",
] as const;

export const REQUIRED_VERIFIED_REF_COUNT = 2;

export interface EligibilitySnapshot {
  isEmailVerified: boolean;
  eligibleDocCount: number;
  verifiedDocCount: number;
  flaggedDocCount: number;
  mandatoryDocsPresent: string[];
  mandatoryDocsMissing: string[];
  mandatoryDocsExpiredOrFlagged: string[];
  verifiedRefCount: number;
  eligible: boolean;
  ineligibilityReasons: string[];
}

export async function computeReadinessEligibility(
  workerId: string
): Promise<EligibilitySnapshot> {
  const workerRow = await db.queryRow<{
    user_id: string;
    is_verified: boolean;
  }>`
    SELECT w.user_id, u.is_verified
    FROM workers w
    JOIN users u ON u.user_id = w.user_id
    WHERE w.worker_id = ${workerId}
  `;

  if (!workerRow) {
    return {
      isEmailVerified: false,
      eligibleDocCount: 0,
      verifiedDocCount: 0,
      flaggedDocCount: 0,
      mandatoryDocsPresent: [],
      mandatoryDocsMissing: [...MANDATORY_COMPLIANCE_DOC_TYPES],
      mandatoryDocsExpiredOrFlagged: [],
      verifiedRefCount: 0,
      eligible: false,
      ineligibilityReasons: ["Worker record not found"],
    };
  }

  const docRows = await db.queryAll<{
    document_type: string;
    verification_status: string;
    expiry_date: Date | null;
  }>`
    SELECT document_type, verification_status, expiry_date
    FROM worker_documents
    WHERE worker_id = ${workerId}
  `;

  const now = new Date();

  const eligibleDocCount = docRows.filter(
    (d) =>
      d.verification_status !== "Expired" &&
      d.verification_status !== "Flagged" &&
      (d.expiry_date === null || d.expiry_date > now)
  ).length;

  const verifiedDocCount = docRows.filter(
    (d) =>
      d.verification_status === "Verified" &&
      (d.expiry_date === null || d.expiry_date > now)
  ).length;

  const flaggedDocCount = docRows.filter(
    (d) => d.verification_status === "Flagged"
  ).length;

  const mandatoryDocsPresent: string[] = [];
  const mandatoryDocsMissing: string[] = [];
  const mandatoryDocsExpiredOrFlagged: string[] = [];

  for (const mandatoryType of MANDATORY_COMPLIANCE_DOC_TYPES) {
    const matching = docRows.filter((d) => d.document_type === mandatoryType);
    if (matching.length === 0) {
      mandatoryDocsMissing.push(mandatoryType);
      continue;
    }
    const hasValid = matching.some(
      (d) =>
        d.verification_status === "Verified" &&
        (d.expiry_date === null || d.expiry_date > now)
    );
    if (hasValid) {
      mandatoryDocsPresent.push(mandatoryType);
    } else {
      mandatoryDocsExpiredOrFlagged.push(mandatoryType);
    }
  }

  const refRow = await db.queryRow<{ verified_count: number }>`
    SELECT COUNT(*)::int AS verified_count
    FROM worker_references
    WHERE worker_id = ${workerId}
      AND status = 'Verified'
  `;
  const verifiedRefCount = refRow?.verified_count ?? 0;

  const ineligibilityReasons: string[] = [];

  if (!workerRow.is_verified) {
    ineligibilityReasons.push("Worker email is not verified");
  }
  if (mandatoryDocsMissing.length > 0) {
    ineligibilityReasons.push(
      `Mandatory compliance documents not uploaded: ${mandatoryDocsMissing.join(", ")}`
    );
  }
  if (mandatoryDocsExpiredOrFlagged.length > 0) {
    ineligibilityReasons.push(
      `Mandatory compliance documents expired or flagged: ${mandatoryDocsExpiredOrFlagged.join(", ")}`
    );
  }
  if (verifiedRefCount < REQUIRED_VERIFIED_REF_COUNT) {
    ineligibilityReasons.push(
      `Requires ${REQUIRED_VERIFIED_REF_COUNT} verified professional references (has ${verifiedRefCount})`
    );
  }

  const eligible = ineligibilityReasons.length === 0;

  return {
    isEmailVerified: workerRow.is_verified,
    eligibleDocCount,
    verifiedDocCount,
    flaggedDocCount,
    mandatoryDocsPresent,
    mandatoryDocsMissing,
    mandatoryDocsExpiredOrFlagged,
    verifiedRefCount,
    eligible,
    ineligibilityReasons,
  };
}
