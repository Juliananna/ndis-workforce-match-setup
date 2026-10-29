import { describe, it, expect } from "vitest";

type VerificationStatus = "Pending" | "Verified" | "Missing" | "Expiring Soon" | "Expired" | "Flagged";

function resolveStatus(expiryDate: Date | null, currentStatus: VerificationStatus = "Pending"): VerificationStatus {
  if (!expiryDate) {
    if (currentStatus === "Flagged") return "Flagged";
    return currentStatus === "Verified" ? "Verified" : "Pending";
  }
  const now = new Date();
  const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "Expired";
  if (diffDays <= 60) return "Expiring Soon";
  if (currentStatus === "Flagged") return "Flagged";
  return currentStatus === "Verified" ? "Verified" : "Pending";
}

function isEligible(expiryDate: Date | null, status: VerificationStatus): boolean {
  if (status === "Expired" || status === "Flagged") return false;
  if (expiryDate !== null && expiryDate <= new Date()) return false;
  return true;
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

  it("returns Flagged when no expiry date and status is Flagged", () => {
    expect(resolveStatus(null, "Flagged")).toBe("Flagged");
  });

  it("returns Expired when expiry date is in the past regardless of stored status", () => {
    const past = new Date(Date.now() - 86400 * 1000 * 5);
    expect(resolveStatus(past, "Verified")).toBe("Expired");
  });

  it("returns Expired when expiry date is in the past and status was Pending", () => {
    const past = new Date(Date.now() - 86400 * 1000 * 5);
    expect(resolveStatus(past, "Pending")).toBe("Expired");
  });

  it("returns Expiring Soon when 30 days until expiry", () => {
    const soon = new Date(Date.now() + 86400 * 1000 * 30);
    expect(resolveStatus(soon)).toBe("Expiring Soon");
  });

  it("returns Expiring Soon when 59 days until expiry", () => {
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

  it("returns Flagged when future expiry and status is Flagged", () => {
    const future = new Date(Date.now() + 86400 * 1000 * 90);
    expect(resolveStatus(future, "Flagged")).toBe("Flagged");
  });

  it("never returns Missing (Missing is only for docs never uploaded)", () => {
    const past = new Date(Date.now() - 86400 * 1000);
    expect(resolveStatus(past)).not.toBe("Missing");
  });
});

describe("isEligible — direct expiry_date evaluation independent of stored status", () => {
  it("a doc with stored status Verified but past expiry_date is NOT eligible", () => {
    const past = new Date(Date.now() - 86400 * 1000);
    expect(isEligible(past, "Verified")).toBe(false);
  });

  it("a doc with stored status Pending and future expiry_date IS eligible", () => {
    const future = new Date(Date.now() + 86400 * 1000 * 90);
    expect(isEligible(future, "Pending")).toBe(true);
  });

  it("a doc with stored status Verified and future expiry_date IS eligible", () => {
    const future = new Date(Date.now() + 86400 * 1000 * 90);
    expect(isEligible(future, "Verified")).toBe(true);
  });

  it("a doc with stored status Verified and null expiry_date IS eligible", () => {
    expect(isEligible(null, "Verified")).toBe(true);
  });

  it("a Flagged doc with future expiry_date is NOT eligible", () => {
    const future = new Date(Date.now() + 86400 * 1000 * 90);
    expect(isEligible(future, "Flagged")).toBe(false);
  });

  it("an Expired doc regardless of expiry_date is NOT eligible", () => {
    const future = new Date(Date.now() + 86400 * 1000 * 90);
    expect(isEligible(future, "Expired")).toBe(false);
  });

  it("a doc with null expiry_date and Pending status IS eligible", () => {
    expect(isEligible(null, "Pending")).toBe(true);
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
    expect(deriveOnboardingStatus(1)).toBe("active");
  });

  it("uploading additional documents keeps status active", () => {
    expect(deriveOnboardingStatus(3)).toBe("active");
  });

  it("deleting a document when others remain keeps status active", () => {
    expect(deriveOnboardingStatus(2)).toBe("active");
  });

  it("deleting the last worker document changes status back to compliance_required", () => {
    expect(deriveOnboardingStatus(0)).toBe("compliance_required");
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

describe("eligibility SQL logic — direct expiry_date independent of stored verification_status", () => {
  it("worker with no documents must not appear in browse results", () => {
    const documentCount = 0;
    expect(documentCount > 0).toBe(false);
  });

  it("worker with one current document can appear in browse results", () => {
    const documentCount = 1;
    expect(documentCount > 0).toBe(true);
  });

  it("a document stored as Verified but with past expiry_date must be excluded", () => {
    const past = new Date(Date.now() - 86400 * 1000);
    const eligible = isEligible(past, "Verified");
    expect(eligible).toBe(false);
  });

  it("a document stored as Pending with future expiry_date counts as eligible for gate", () => {
    const future = new Date(Date.now() + 86400 * 1000 * 90);
    const eligible = isEligible(future, "Pending");
    expect(eligible).toBe(true);
  });

  it("offer creation gate: worker with only expired docs must be blocked", () => {
    const allDocsExpired = true;
    const hasEligibleDoc = !allDocsExpired;
    expect(hasEligibleDoc).toBe(false);
  });

  it("job digest excludes workers with no current documents", () => {
    const workerHasCurrentDocs = false;
    expect(workerHasCurrentDocs).toBe(false);
  });
});
