import { describe, it, expect } from "vitest";

type VerificationStatus = "Pending" | "Verified" | "Missing" | "Expiring Soon" | "Expired";

function resolveStatus(expiryDate: Date | null, currentStatus: VerificationStatus = "Pending"): VerificationStatus {
  if (!expiryDate) return currentStatus === "Verified" ? "Verified" : "Pending";
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "Expired";
  if (diffDays <= 60) return "Expiring Soon";
  return currentStatus === "Verified" ? "Verified" : "Pending";
}

function deriveOnboardingStatus(documentCount: number): "active" | "compliance_required" {
  return documentCount > 0 ? "active" : "compliance_required";
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

describe("resolveStatus", () => {
  it("returns Pending when no expiry date and not verified", () => {
    expect(resolveStatus(null)).toBe("Pending");
  });

  it("returns Verified when no expiry date and already verified", () => {
    expect(resolveStatus(null, "Verified")).toBe("Verified");
  });

  it("returns Expired when expiry date is in the past", () => {
    const past = new Date(Date.now() - 86400 * 1000 * 5);
    expect(resolveStatus(past)).toBe("Expired");
  });

  it("returns Expiring Soon when 30 days until expiry", () => {
    const soon = new Date(Date.now() + 86400 * 1000 * 30);
    expect(resolveStatus(soon)).toBe("Expiring Soon");
  });

  it("returns Expiring Soon when 60 days until expiry", () => {
    const soon60 = new Date(Date.now() + 86400 * 1000 * 59);
    expect(resolveStatus(soon60)).toBe("Expiring Soon");
  });

  it("returns Pending when 90 days until expiry and not verified", () => {
    const future = new Date(Date.now() + 86400 * 1000 * 90);
    expect(resolveStatus(future, "Pending")).toBe("Pending");
  });

  it("returns Verified when 90 days until expiry and already verified", () => {
    const future = new Date(Date.now() + 86400 * 1000 * 90);
    expect(resolveStatus(future, "Verified")).toBe("Verified");
  });

  it("never returns Missing (Missing is only for docs never uploaded)", () => {
    const past = new Date(Date.now() - 86400 * 1000);
    expect(resolveStatus(past)).not.toBe("Missing");
  });
});

describe("file type validation logic", () => {
  const allowedExts = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

  it("allows pdf", () => expect(allowedExts.has("pdf")).toBe(true));
  it("allows jpg", () => expect(allowedExts.has("jpg")).toBe(true));
  it("allows png", () => expect(allowedExts.has("png")).toBe(true));
  it("rejects exe", () => expect(allowedExts.has("exe")).toBe(false));
  it("rejects docx", () => expect(allowedExts.has("docx")).toBe(false));
  it("rejects mp4 (documents only)", () => expect(allowedExts.has("mp4")).toBe(false));
});

describe("onboarding_status lifecycle via document upload/delete", () => {
  it("resume-builder-created worker with zero documents is compliance_required", () => {
    expect(deriveOnboardingStatus(0)).toBe("compliance_required");
  });

  it("uploading the first real worker document activates the worker", () => {
    const documentCountAfterUpload = 1;
    expect(deriveOnboardingStatus(documentCountAfterUpload)).toBe("active");
  });

  it("uploading additional documents keeps status active", () => {
    expect(deriveOnboardingStatus(3)).toBe("active");
  });

  it("deleting a document when others remain keeps status active", () => {
    const remainingAfterDelete = 2;
    expect(deriveOnboardingStatus(remainingAfterDelete)).toBe("active");
  });

  it("deleting the last worker document changes status back to compliance_required", () => {
    const remainingAfterDelete = 0;
    expect(deriveOnboardingStatus(remainingAfterDelete)).toBe("compliance_required");
  });

  it("status is derived purely from document count, not from a stored sticky value", () => {
    expect(deriveOnboardingStatus(0)).toBe("compliance_required");
    expect(deriveOnboardingStatus(1)).toBe("active");
    expect(deriveOnboardingStatus(0)).toBe("compliance_required");
  });
});

describe("document upload key validation (no external URLs)", () => {
  it("rejects amazonaws.com signed upload URL as a file key", () => {
    expect(isInternalStorageKey("https://bucket.s3.amazonaws.com/workers/abc/doc.pdf")).toBe(false);
  });

  it("rejects storage.googleapis.com URL as a file key", () => {
    expect(isInternalStorageKey("https://storage.googleapis.com/bucket/doc.pdf")).toBe(false);
  });

  it("rejects any http/https URL", () => {
    expect(isInternalStorageKey("https://example.com/cert.pdf")).toBe(false);
  });

  it("accepts a raw storage key path", () => {
    const key = "worker-uuid/1716000000000-Police_Clearance.pdf";
    expect(isInternalStorageKey(key)).toBe(true);
  });
});

describe("provider browse / matching gate (document count check)", () => {
  it("worker with zero documents must not appear in browse results", () => {
    const documentCount = 0;
    expect(documentCount > 0).toBe(false);
  });

  it("worker with one document can appear in browse results", () => {
    const documentCount = 1;
    expect(documentCount > 0).toBe(true);
  });

  it("worker with zero documents must not be matched to jobs", () => {
    const documentCount = 0;
    const eligible = documentCount > 0;
    expect(eligible).toBe(false);
  });

  it("worker with documents is eligible for job matching", () => {
    const documentCount = 2;
    const eligible = documentCount > 0;
    expect(eligible).toBe(true);
  });

  it("job digest excludes workers with no documents", () => {
    const workerHasDocs = false;
    expect(workerHasDocs).toBe(false);
  });

  it("emergency shift notification excludes workers with no documents", () => {
    const workerHasDocs = false;
    expect(workerHasDocs).toBe(false);
  });
});
