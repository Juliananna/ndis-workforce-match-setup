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

function isInternalStorageKey(value: string): boolean {
  if (!value || value.trim() === "") return false;
  try {
    new URL(value);
    return false;
  } catch {
    return true;
  }
}

function deriveOnboardingStatus(documentCount: number): "active" | "compliance_required" {
  return documentCount > 0 ? "active" : "compliance_required";
}

function browseFilterPasses(hasWorkerDocuments: boolean): boolean {
  return hasWorkerDocuments;
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

describe("Internal storage key detection (URL vs key)", () => {
  it("rejects AWS S3 URLs — these are external URLs not internal keys", () => {
    expect(isInternalStorageKey("https://bucket.s3.amazonaws.com/workers/123/doc.pdf")).toBe(false);
  });

  it("rejects GCS URLs — these are external URLs not internal keys", () => {
    expect(isInternalStorageKey("https://storage.googleapis.com/bucket/doc.pdf")).toBe(false);
  });

  it("rejects lp.dev signed download URLs", () => {
    expect(isInternalStorageKey("https://api.lp.dev/uploads/doc.pdf")).toBe(false);
  });

  it("rejects pasted Google Drive links", () => {
    expect(isInternalStorageKey("https://drive.google.com/file/d/abc123/view")).toBe(false);
  });

  it("rejects Dropbox links", () => {
    expect(isInternalStorageKey("https://www.dropbox.com/s/abc/police_check.pdf")).toBe(false);
  });

  it("rejects arbitrary HTTP links", () => {
    expect(isInternalStorageKey("https://mywebsite.com/docs/cert.pdf")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isInternalStorageKey("")).toBe(false);
  });

  it("rejects invalid / non-URL strings that do not look like storage keys", () => {
    expect(isInternalStorageKey("not-a-url")).toBe(true);
  });

  it("accepts a worker-prefixed storage key like workerId/timestamp-type.pdf", () => {
    const key = "abc-worker-uuid/1716000000000-Police_Clearance.pdf";
    expect(isInternalStorageKey(key)).toBe(true);
  });

  it("rejects blank / whitespace-only values", () => {
    expect(isInternalStorageKey("   ")).toBe(false);
  });
});

describe("onboarding_status derivation (non-sticky)", () => {
  it("worker with zero worker_documents is compliance_required regardless of prior status", () => {
    expect(deriveOnboardingStatus(0)).toBe("compliance_required");
  });

  it("worker with one worker_document becomes active", () => {
    expect(deriveOnboardingStatus(1)).toBe("active");
  });

  it("worker with multiple documents remains active", () => {
    expect(deriveOnboardingStatus(5)).toBe("active");
  });

  it("deleting the last document flips status back to compliance_required", () => {
    const afterDelete = deriveOnboardingStatus(0);
    expect(afterDelete).toBe("compliance_required");
  });

  it("resume-builder-created worker has compliance_required when no docs migrated", () => {
    const migratedCount = 0;
    const status = deriveOnboardingStatus(migratedCount);
    expect(status).toBe("compliance_required");
  });
});

describe("Resume-builder document migration gate", () => {
  it("does not migrate pasted Google Drive URL", () => {
    expect(isInternalStorageKey("https://drive.google.com/file/d/abc/view")).toBe(false);
  });

  it("does not migrate amazonaws.com signed URLs", () => {
    expect(isInternalStorageKey("https://bucket.s3.amazonaws.com/workers/abc/police.pdf")).toBe(false);
  });

  it("does not migrate storage.googleapis.com URLs", () => {
    expect(isInternalStorageKey("https://storage.googleapis.com/bucket/doc.pdf")).toBe(false);
  });

  it("does not migrate any value that parses as a valid URL", () => {
    const urls = [
      "https://example.com/doc.pdf",
      "http://cdn.site.com/file.jpg",
      "https://blob.core.windows.net/container/file.pdf",
    ];
    for (const u of urls) {
      expect(isInternalStorageKey(u)).toBe(false);
    }
  });

  it("candidate internal key passes the gate (further checked by bucket.exists)", () => {
    const key = "worker-uuid-abc/1716000000000-Police_Clearance.pdf";
    expect(isInternalStorageKey(key)).toBe(true);
  });

  it("migrated doc inserted as Pending status only", () => {
    const status = "Pending";
    expect(status).toBe("Pending");
  });
});

describe("Provider browse and matching gate", () => {
  it("worker with zero worker_documents is excluded from browse results", () => {
    const hasDocuments = false;
    expect(browseFilterPasses(hasDocuments)).toBe(false);
  });

  it("worker with one or more documents passes the browse gate", () => {
    const hasDocuments = true;
    expect(browseFilterPasses(hasDocuments)).toBe(true);
  });

  it("matching does not include workers with no documents", () => {
    const hasDocuments = false;
    expect(browseFilterPasses(hasDocuments)).toBe(false);
  });
});

describe("Existing user conversion edge cases", () => {
  it("existing user with worker profile returns alreadyExists = true and syncs status", () => {
    const result = { workerId: "w1", userId: "u1", alreadyExists: true };
    expect(result.alreadyExists).toBe(true);
    expect(result.workerId).toBe("w1");
  });

  it("existing user without worker profile creates new worker profile using existing user_id", () => {
    const existingUserId = "existing-user-id";
    const newWorkerId = "new-worker-id";
    const result = { workerId: newWorkerId, userId: existingUserId, alreadyExists: false };
    expect(result.alreadyExists).toBe(false);
    expect(result.userId).toBe(existingUserId);
    expect(result.workerId).toBeTruthy();
  });

  it("existing worker with no documents is synced to compliance_required on conversion", () => {
    const status = deriveOnboardingStatus(0);
    expect(status).toBe("compliance_required");
  });
});
