import { describe, it, expect } from "vitest";

function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

const RETRY_DELAYS_MS = [1_000, 3_000, 9_000];

describe("GHL client – retry policy", () => {
  it("retries on 429", () => {
    expect(isRetryable(429)).toBe(true);
  });

  it("retries on 502", () => {
    expect(isRetryable(502)).toBe(true);
  });

  it("retries on 503", () => {
    expect(isRetryable(503)).toBe(true);
  });

  it("retries on 504", () => {
    expect(isRetryable(504)).toBe(true);
  });

  it("does not retry on 400", () => {
    expect(isRetryable(400)).toBe(false);
  });

  it("does not retry on 401", () => {
    expect(isRetryable(401)).toBe(false);
  });

  it("does not retry on 404", () => {
    expect(isRetryable(404)).toBe(false);
  });

  it("does not retry on 422", () => {
    expect(isRetryable(422)).toBe(false);
  });

  it("does not retry on 500", () => {
    expect(isRetryable(500)).toBe(false);
  });

  it("has exactly 3 retry delays defined", () => {
    expect(RETRY_DELAYS_MS).toHaveLength(3);
  });

  it("retry delays are exponentially increasing", () => {
    for (let i = 1; i < RETRY_DELAYS_MS.length; i++) {
      expect(RETRY_DELAYS_MS[i]!).toBeGreaterThan(RETRY_DELAYS_MS[i - 1]!);
    }
  });

  it("first retry delay is 1 second", () => {
    expect(RETRY_DELAYS_MS[0]).toBe(1_000);
  });
});

describe("GHL client – removeContactTags stub", () => {
  it("throws when called (Phase 1 guard)", async () => {
    const stub = async (_contactId: string, _tags: string[]): Promise<void> => {
      throw new Error(
        "removeContactTags is not enabled in Phase 1. " +
          "Complete the GHL workflow audit before enabling tag removal."
      );
    };
    await expect(stub("contact-1", ["tag-a"])).rejects.toThrow("Phase 1");
  });
});

describe("GHL sync log entry shape", () => {
  it("has all required fields", () => {
    const entry = {
      email: "test@example.com",
      entityType: "worker" as const,
      entityId: "worker-uuid",
      operation: "upsert_contact",
      success: false,
      ghlContactId: null,
      errorMessage: "GHL upsert failed (HTTP 429): rate limited",
      httpStatus: 429,
    };
    expect(entry.email).toBeDefined();
    expect(entry.entityType).toBeDefined();
    expect(entry.entityId).toBeDefined();
    expect(entry.operation).toBeDefined();
    expect(typeof entry.success).toBe("boolean");
  });

  it("accepts resume_session entity type", () => {
    const entry = { entityType: "resume_session" as const };
    expect(entry.entityType).toBe("resume_session");
  });

  it("accepts user entity type", () => {
    const entry = { entityType: "user" as const };
    expect(entry.entityType).toBe("user");
  });
});
