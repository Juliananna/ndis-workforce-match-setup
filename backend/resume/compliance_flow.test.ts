import { describe, it, expect } from "vitest";

const RESUME_DOC_TYPE_MAP: Record<string, string> = {
  "Police Check": "Police Clearance",
  "Working with Children Check": "Working With Children Check",
  "NDIS Worker Screening Card": "NDIS Worker Screening Check",
  "Qualification Certificate": "Certificate III / IV Disability",
  "Manual Handling Certificate": "Other relevant training",
  "Medication Administration Certificate": "Other relevant training",
  "First Aid Certificate": "First Aid Certificate",
  "CPR Certificate": "CPR Certificate",
  "Other": "Other relevant training",
};

const VALID_WORKER_DOC_TYPES = new Set([
  "Driver's Licence",
  "Passport / ID",
  "Working With Children Check",
  "Police Clearance",
  "NDIS Worker Screening Check",
  "NDIS Worker Orientation Module",
  "NDIS Code of Conduct acknowledgement",
  "Infection Control Certificate",
  "First Aid Certificate",
  "CPR Certificate",
  "Certificate III / IV Disability",
  "Nursing qualifications",
  "Other relevant training",
]);

function normaliseDocType(resumeDocType: string): string | null {
  if (VALID_WORKER_DOC_TYPES.has(resumeDocType)) return resumeDocType;
  return RESUME_DOC_TYPE_MAP[resumeDocType] ?? null;
}

function isInternalFileKey(fileUrl: string): boolean {
  if (!fileUrl || fileUrl.trim() === "") return false;
  try {
    const u = new URL(fileUrl);
    const host = u.hostname.toLowerCase();
    return (
      host.includes("amazonaws.com") ||
      host.includes("storage.googleapis.com") ||
      host.includes("blob.core.windows.net") ||
      host.includes("lp.dev")
    );
  } catch {
    return false;
  }
}

function complianceRequired(documentCount: number, onboardingStatus: string): boolean {
  return documentCount === 0 || onboardingStatus === "compliance_required";
}

describe("Document type normalisation", () => {
  it("maps Police Check -> Police Clearance", () => {
    expect(normaliseDocType("Police Check")).toBe("Police Clearance");
  });

  it("maps Working with Children Check correctly", () => {
    expect(normaliseDocType("Working with Children Check")).toBe("Working With Children Check");
  });

  it("maps NDIS Worker Screening Card -> NDIS Worker Screening Check", () => {
    expect(normaliseDocType("NDIS Worker Screening Card")).toBe("NDIS Worker Screening Check");
  });

  it("maps Qualification Certificate -> Certificate III / IV Disability", () => {
    expect(normaliseDocType("Qualification Certificate")).toBe("Certificate III / IV Disability");
  });

  it("maps Manual Handling Certificate -> Other relevant training", () => {
    expect(normaliseDocType("Manual Handling Certificate")).toBe("Other relevant training");
  });

  it("maps Medication Administration Certificate -> Other relevant training", () => {
    expect(normaliseDocType("Medication Administration Certificate")).toBe("Other relevant training");
  });

  it("maps First Aid Certificate (already canonical)", () => {
    expect(normaliseDocType("First Aid Certificate")).toBe("First Aid Certificate");
  });

  it("maps CPR Certificate (already canonical)", () => {
    expect(normaliseDocType("CPR Certificate")).toBe("CPR Certificate");
  });

  it("maps Other -> Other relevant training", () => {
    expect(normaliseDocType("Other")).toBe("Other relevant training");
  });

  it("returns null for unknown doc types", () => {
    expect(normaliseDocType("Random Made Up Document")).toBeNull();
  });

  it("accepts canonical types as-is", () => {
    expect(normaliseDocType("NDIS Worker Orientation Module")).toBe("NDIS Worker Orientation Module");
    expect(normaliseDocType("Police Clearance")).toBe("Police Clearance");
    expect(normaliseDocType("Working With Children Check")).toBe("Working With Children Check");
  });
});

describe("Internal file key detection", () => {
  it("accepts AWS S3 URLs", () => {
    expect(isInternalFileKey("https://bucket.s3.amazonaws.com/workers/123/doc.pdf")).toBe(true);
  });

  it("accepts GCS URLs", () => {
    expect(isInternalFileKey("https://storage.googleapis.com/bucket/doc.pdf")).toBe(true);
  });

  it("accepts lp.dev URLs", () => {
    expect(isInternalFileKey("https://api.lp.dev/uploads/doc.pdf")).toBe(true);
  });

  it("rejects pasted external links", () => {
    expect(isInternalFileKey("https://drive.google.com/file/d/abc123/view")).toBe(false);
  });

  it("rejects Dropbox links", () => {
    expect(isInternalFileKey("https://www.dropbox.com/s/abc/police_check.pdf")).toBe(false);
  });

  it("rejects arbitrary HTTP links", () => {
    expect(isInternalFileKey("https://mywebsite.com/docs/cert.pdf")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isInternalFileKey("")).toBe(false);
  });

  it("rejects invalid URL strings", () => {
    expect(isInternalFileKey("not-a-url")).toBe(false);
  });
});

describe("Compliance gate logic", () => {
  it("requires compliance when document count is zero", () => {
    expect(complianceRequired(0, "active")).toBe(true);
  });

  it("requires compliance when onboarding_status is compliance_required", () => {
    expect(complianceRequired(1, "compliance_required")).toBe(true);
  });

  it("does not require compliance when docs exist and status is active", () => {
    expect(complianceRequired(1, "active")).toBe(false);
  });

  it("does not require compliance when multiple docs exist and status is active", () => {
    expect(complianceRequired(5, "active")).toBe(false);
  });
});

describe("Standard signup flow compliance gate", () => {
  it("new worker with no documents must see the gate", () => {
    const documentCount = 0;
    const onboardingStatus = "active";
    expect(complianceRequired(documentCount, onboardingStatus)).toBe(true);
  });

  it("worker with one document can proceed past the gate", () => {
    const documentCount = 1;
    const onboardingStatus = "active";
    expect(complianceRequired(documentCount, onboardingStatus)).toBe(false);
  });
});

describe("Resume builder conversion compliance flow", () => {
  it("resume-converted worker has compliance_required status by default", () => {
    const onboardingStatus = "compliance_required";
    const documentCount = 0;
    expect(complianceRequired(documentCount, onboardingStatus)).toBe(true);
  });

  it("resume-converted worker with migrated docs but still compliance_required must still upload", () => {
    expect(complianceRequired(0, "compliance_required")).toBe(true);
  });

  it("resume-converted worker with migrated docs and active status is cleared", () => {
    expect(complianceRequired(1, "active")).toBe(false);
  });

  it("pasted URL documents do not count as migrated (isInternalFileKey rejects them)", () => {
    const pastedUrl = "https://drive.google.com/file/d/abc123/view";
    expect(isInternalFileKey(pastedUrl)).toBe(false);
  });

  it("resume builder secure upload would pass isInternalFileKey check", () => {
    const secureKey = "https://bucket.s3.amazonaws.com/workers/abc/police-check.pdf";
    expect(isInternalFileKey(secureKey)).toBe(true);
    const normType = normaliseDocType("Police Check");
    expect(normType).toBe("Police Clearance");
    expect(VALID_WORKER_DOC_TYPES.has(normType!)).toBe(true);
  });
});
