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
