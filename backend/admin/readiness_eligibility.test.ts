import { describe, it, expect } from "vitest";
import {
  computeReadinessEligibility,
  MANDATORY_COMPLIANCE_DOC_TYPES,
  REQUIRED_VERIFIED_REF_COUNT,
} from "./readiness_eligibility";

const MANDATORY_TYPES = [...MANDATORY_COMPLIANCE_DOC_TYPES];

describe("readiness_eligibility – constants", () => {
  it("requires NDIS Worker Screening Check", () => {
    expect(MANDATORY_TYPES).toContain("NDIS Worker Screening Check");
  });

  it("requires Police Clearance", () => {
    expect(MANDATORY_TYPES).toContain("Police Clearance");
  });

  it("requires exactly 2 verified references", () => {
    expect(REQUIRED_VERIFIED_REF_COUNT).toBe(2);
  });
});

describe("computeReadinessEligibility – unit logic", () => {
  it("returns ineligible when worker not found", async () => {
    const result = await computeReadinessEligibility("00000000-0000-0000-0000-000000000000");
    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons.length).toBeGreaterThan(0);
  });
});

describe("readiness eligibility – business rules (unit)", () => {
  function makeSnapshot(overrides: Partial<{
    isEmailVerified: boolean;
    mandatoryDocsMissing: string[];
    mandatoryDocsExpiredOrFlagged: string[];
    verifiedRefCount: number;
  }> = {}) {
    const {
      isEmailVerified = true,
      mandatoryDocsMissing = [],
      mandatoryDocsExpiredOrFlagged = [],
      verifiedRefCount = 2,
    } = overrides;

    const ineligibilityReasons: string[] = [];
    if (!isEmailVerified) ineligibilityReasons.push("Worker email is not verified");
    if (mandatoryDocsMissing.length > 0)
      ineligibilityReasons.push(`Mandatory compliance documents not uploaded: ${mandatoryDocsMissing.join(", ")}`);
    if (mandatoryDocsExpiredOrFlagged.length > 0)
      ineligibilityReasons.push(`Mandatory compliance documents expired or flagged: ${mandatoryDocsExpiredOrFlagged.join(", ")}`);
    if (verifiedRefCount < REQUIRED_VERIFIED_REF_COUNT)
      ineligibilityReasons.push(`Requires ${REQUIRED_VERIFIED_REF_COUNT} verified professional references (has ${verifiedRefCount})`);

    return { eligible: ineligibilityReasons.length === 0, ineligibilityReasons };
  }

  it("is eligible when all conditions met", () => {
    const { eligible, ineligibilityReasons } = makeSnapshot();
    expect(eligible).toBe(true);
    expect(ineligibilityReasons).toHaveLength(0);
  });

  it("is ineligible when email not verified", () => {
    const { eligible, ineligibilityReasons } = makeSnapshot({ isEmailVerified: false });
    expect(eligible).toBe(false);
    expect(ineligibilityReasons.some((r) => r.includes("email"))).toBe(true);
  });

  it("is ineligible when mandatory doc missing", () => {
    const { eligible, ineligibilityReasons } = makeSnapshot({
      mandatoryDocsMissing: ["NDIS Worker Screening Check"],
    });
    expect(eligible).toBe(false);
    expect(ineligibilityReasons.some((r) => r.includes("NDIS Worker Screening Check"))).toBe(true);
  });

  it("is ineligible when mandatory doc is expired or flagged", () => {
    const { eligible, ineligibilityReasons } = makeSnapshot({
      mandatoryDocsExpiredOrFlagged: ["Police Clearance"],
    });
    expect(eligible).toBe(false);
    expect(ineligibilityReasons.some((r) => r.includes("Police Clearance"))).toBe(true);
  });

  it("is ineligible with only 1 verified reference", () => {
    const { eligible, ineligibilityReasons } = makeSnapshot({ verifiedRefCount: 1 });
    expect(eligible).toBe(false);
    expect(ineligibilityReasons.some((r) => r.includes("verified professional references"))).toBe(true);
  });

  it("is ineligible with 0 verified references", () => {
    const { eligible } = makeSnapshot({ verifiedRefCount: 0 });
    expect(eligible).toBe(false);
  });

  it("is ineligible on multiple failures and lists all reasons", () => {
    const { eligible, ineligibilityReasons } = makeSnapshot({
      isEmailVerified: false,
      mandatoryDocsMissing: ["Police Clearance"],
      verifiedRefCount: 0,
    });
    expect(eligible).toBe(false);
    expect(ineligibilityReasons.length).toBe(3);
  });

  it("does not report mandatory docs missing when both are present and valid", () => {
    const { eligible, ineligibilityReasons } = makeSnapshot({
      mandatoryDocsMissing: [],
      mandatoryDocsExpiredOrFlagged: [],
    });
    expect(eligible).toBe(true);
    expect(ineligibilityReasons.some((r) => r.includes("not uploaded"))).toBe(false);
  });
});
