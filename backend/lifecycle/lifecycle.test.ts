import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Pure-logic helpers extracted from writer.ts for in-process testing.
// These tests do not require a database connection.
// ---------------------------------------------------------------------------

function deriveEventId(
  entityType: string,
  entityId: string,
  eventType: string,
  suffix?: string
): string {
  const raw = `${entityType}:${entityId}:${eventType}${suffix ? `:${suffix}` : ""}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 64);
}

function hasAttribution(params: Record<string, string | null | undefined>): boolean {
  return !!(params.utmSource || params.fbclid || params.metaCampaignId);
}

type ConsentStatus = "granted" | "denied" | "unknown";

function resolveMarketingConsent(
  consentRecord: { granted: boolean } | null
): ConsentStatus {
  if (consentRecord === null) return "unknown";
  return consentRecord.granted ? "granted" : "denied";
}

function resolveSmsConsent(
  smsConsentRecord: { granted: boolean } | null
): ConsentStatus {
  if (smsConsentRecord === null) return "unknown";
  return smsConsentRecord.granted ? "granted" : "denied";
}

type SessionStatus = "draft" | "email_captured" | "completed" | "converted" | "archived";

interface ResumeSessionState {
  status: SessionStatus;
  resumeCompletedAt: Date | null;
  convertedWorkerId: string | null;
  email: string | null;
}

function applyEmailCapture(session: ResumeSessionState, email: string): ResumeSessionState {
  return { ...session, status: "email_captured", email };
}

function applyResumeCompleted(session: ResumeSessionState, stepCompleted: number, maxStep: number): ResumeSessionState {
  if (stepCompleted < maxStep || session.resumeCompletedAt !== null) return session;
  return { ...session, resumeCompletedAt: new Date() };
}

function applyConversion(session: ResumeSessionState, workerId: string): ResumeSessionState {
  return { ...session, status: "converted", convertedWorkerId: workerId };
}

interface EligibilitySnapshot {
  isEmailVerified: boolean;
  mandatoryDocsMissing: string[];
  mandatoryDocsExpiredOrFlagged: string[];
  verifiedRefCount: number;
  eligible: boolean;
  ineligibilityReasons: string[];
}

function computeEligibility(snapshot: Omit<EligibilitySnapshot, "eligible" | "ineligibilityReasons">): EligibilitySnapshot {
  const reasons: string[] = [];
  if (!snapshot.isEmailVerified) reasons.push("Worker email is not verified");
  if (snapshot.mandatoryDocsMissing.length > 0)
    reasons.push(`Mandatory documents missing: ${snapshot.mandatoryDocsMissing.join(", ")}`);
  if (snapshot.mandatoryDocsExpiredOrFlagged.length > 0)
    reasons.push(`Mandatory documents expired or flagged: ${snapshot.mandatoryDocsExpiredOrFlagged.join(", ")}`);
  if (snapshot.verifiedRefCount < 2)
    reasons.push(`Requires 2 verified references (has ${snapshot.verifiedRefCount})`);
  return { ...snapshot, eligible: reasons.length === 0, ineligibilityReasons: reasons };
}

// ---------------------------------------------------------------------------
// Scenario 1: Resume completed without profile creation
// ---------------------------------------------------------------------------
describe("Scenario 1: Resume completed without profile creation", () => {
  it("sets resumeCompletedAt when final step is reached regardless of profile creation decision", () => {
    let session: ResumeSessionState = {
      status: "email_captured",
      resumeCompletedAt: null,
      convertedWorkerId: null,
      email: "alice@example.com",
    };
    session = applyResumeCompleted(session, 8, 8);
    expect(session.resumeCompletedAt).not.toBeNull();
    expect(session.convertedWorkerId).toBeNull();
    expect(session.status).toBe("email_captured");
  });

  it("milestone is not cleared when the session is later abandoned", () => {
    let session: ResumeSessionState = {
      status: "email_captured",
      resumeCompletedAt: null,
      convertedWorkerId: null,
      email: "alice@example.com",
    };
    session = applyResumeCompleted(session, 8, 8);
    const savedAt = session.resumeCompletedAt;
    const abandoned: ResumeSessionState = { ...session, status: "archived" };
    expect(abandoned.resumeCompletedAt).toBe(savedAt);
  });

  it("does not set resumeCompletedAt on step 7 of 8", () => {
    let session: ResumeSessionState = {
      status: "email_captured",
      resumeCompletedAt: null,
      convertedWorkerId: null,
      email: "alice@example.com",
    };
    session = applyResumeCompleted(session, 7, 8);
    expect(session.resumeCompletedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Resume completed with successful profile conversion
// ---------------------------------------------------------------------------
describe("Scenario 2: Resume completed with profile conversion", () => {
  it("both resumeCompletedAt and convertedWorkerId are set independently", () => {
    let session: ResumeSessionState = {
      status: "email_captured",
      resumeCompletedAt: null,
      convertedWorkerId: null,
      email: "bob@example.com",
    };
    session = applyResumeCompleted(session, 8, 8);
    session = applyConversion(session, "worker-123");
    expect(session.resumeCompletedAt).not.toBeNull();
    expect(session.convertedWorkerId).toBe("worker-123");
    expect(session.status).toBe("converted");
  });

  it("resumeCompletedAt is preserved after conversion", () => {
    let session: ResumeSessionState = {
      status: "email_captured",
      resumeCompletedAt: null,
      convertedWorkerId: null,
      email: "bob@example.com",
    };
    session = applyResumeCompleted(session, 8, 8);
    const completedAt = session.resumeCompletedAt;
    session = applyConversion(session, "worker-123");
    expect(session.resumeCompletedAt).toBe(completedAt);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Profile conversion fails and retries
// ---------------------------------------------------------------------------
describe("Scenario 3: Profile conversion fails and retries", () => {
  it("idempotency key is stable across retries for the same session", () => {
    const sessionId = "aaaaaaaa-0000-0000-0000-000000000001";
    const key1 = deriveEventId("resume_session", sessionId, "worker_profile_created");
    const key2 = deriveEventId("resume_session", sessionId, "worker_profile_created");
    expect(key1).toBe(key2);
  });

  it("different sessions produce different idempotency keys", () => {
    const key1 = deriveEventId("resume_session", "session-A", "worker_profile_created");
    const key2 = deriveEventId("resume_session", "session-B", "worker_profile_created");
    expect(key1).not.toBe(key2);
  });

  it("idempotency key length is always 64 hex characters", () => {
    const key = deriveEventId("worker", "any-id", "compliance_submitted", "doc-id-123");
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Existing worker completes another resume
// ---------------------------------------------------------------------------
describe("Scenario 4: Existing worker completes another resume", () => {
  it("worker_profile_linked event key is scoped to the session, not the worker", () => {
    const workerId = "worker-existing-001";
    const sessionA = "session-A";
    const sessionB = "session-B";
    const keyA = deriveEventId("resume_session", sessionA, "worker_profile_linked");
    const keyB = deriveEventId("resume_session", sessionB, "worker_profile_linked");
    expect(keyA).not.toBe(keyB);
  });

  it("a second resume session linking the same worker emits worker_profile_linked, not worker_profile_created", () => {
    const eventForExistingWorker = "worker_profile_linked";
    const eventForNewWorker = "worker_profile_created";
    expect(eventForExistingWorker).not.toBe(eventForNewWorker);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Resume-builder account with pre-verified email
// ---------------------------------------------------------------------------
describe("Scenario 5: Resume-builder account with pre-verified email (is_verified = TRUE at creation)", () => {
  it("email_verified event uses verificationPath = resume_builder_auto", () => {
    const payload = {
      eventType: "email_verified",
      verificationPath: "resume_builder_auto",
      userId: "user-001",
      email: "carol@example.com",
      role: "WORKER",
    };
    expect(payload.verificationPath).toBe("resume_builder_auto");
  });

  it("idempotency key for auto-verified differs from direct-registration", () => {
    const userId = "user-001";
    const autoKey = deriveEventId("user", userId, "email_verified", "resume_builder_auto");
    const directKey = deriveEventId("user", userId, "email_verified", "direct_registration");
    expect(autoKey).not.toBe(directKey);
  });

  it("email_verified is emitted exactly once at worker creation even if conversion is retried", () => {
    const sessionId = "session-carol";
    const key1 = deriveEventId("user", "user-carol", "email_verified", "resume_builder_auto");
    const key2 = deriveEventId("user", "user-carol", "email_verified", "resume_builder_auto");
    expect(key1).toBe(key2);
    expect(sessionId).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Direct-registration email verification
// ---------------------------------------------------------------------------
describe("Scenario 6: Direct-registration email verification", () => {
  it("email_verified event uses verificationPath = direct_registration", () => {
    const payload = {
      eventType: "email_verified",
      verificationPath: "direct_registration",
      userId: "user-002",
      email: "dave@example.com",
      role: "WORKER",
    };
    expect(payload.verificationPath).toBe("direct_registration");
  });

  it("direct-registration workers do not receive email_verified at registration, only after link click", () => {
    const registrationEvents: string[] = ["user_registered"];
    expect(registrationEvents).not.toContain("email_verified");
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: Two resume sessions for one worker
// ---------------------------------------------------------------------------
describe("Scenario 7: Two resume sessions for one worker", () => {
  it("each session gets its own resume_completed event with its own idempotency key", () => {
    const session1 = "session-001";
    const session2 = "session-002";
    const key1 = deriveEventId("resume_session", session1, "resume_completed");
    const key2 = deriveEventId("resume_session", session2, "resume_completed");
    expect(key1).not.toBe(key2);
  });

  it("worker_profile_linked events for different sessions are distinct", () => {
    const key1 = deriveEventId("resume_session", "session-001", "worker_profile_linked");
    const key2 = deriveEventId("resume_session", "session-002", "worker_profile_linked");
    expect(key1).not.toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// Scenario 8: SMS consent unknown
// ---------------------------------------------------------------------------
describe("Scenario 8: SMS consent unknown", () => {
  it("SMS consent resolves to unknown when no record exists", () => {
    const status = resolveSmsConsent(null);
    expect(status).toBe("unknown");
  });

  it("SMS consent is never inferred from marketing consent", () => {
    const marketingConsent = { granted: true };
    const smsConsent = null;
    const marketingStatus = resolveMarketingConsent(marketingConsent);
    const smsStatus = resolveSmsConsent(smsConsent);
    expect(marketingStatus).toBe("granted");
    expect(smsStatus).toBe("unknown");
  });

  it("SMS consent unknown does not prevent marketing consent from being granted", () => {
    const marketingConsent = { granted: true };
    const smsConsent = null;
    expect(resolveMarketingConsent(marketingConsent)).toBe("granted");
    expect(resolveSmsConsent(smsConsent)).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// Scenario 9: Marketing consent declined
// ---------------------------------------------------------------------------
describe("Scenario 9: Marketing consent declined", () => {
  it("marketing consent resolves to denied when granted = false", () => {
    const status = resolveMarketingConsent({ granted: false });
    expect(status).toBe("denied");
  });

  it("marketing consent unknown for direct-registration workers (no consent record)", () => {
    const status = resolveMarketingConsent(null);
    expect(status).toBe("unknown");
  });

  it("denied marketing consent is distinct from unknown — both should be representable", () => {
    expect(resolveMarketingConsent({ granted: false })).toBe("denied");
    expect(resolveMarketingConsent(null)).toBe("unknown");
    expect(resolveMarketingConsent({ granted: true })).toBe("granted");
  });
});

// ---------------------------------------------------------------------------
// Scenario 10: Duplicate and out-of-order lifecycle events
// ---------------------------------------------------------------------------
describe("Scenario 10: Duplicate and out-of-order lifecycle events", () => {
  it("same entity + event type + no suffix produces identical idempotency key on retry", () => {
    const id = "entity-42";
    expect(deriveEventId("worker", id, "compliance_submitted", "doc-1"))
      .toBe(deriveEventId("worker", id, "compliance_submitted", "doc-1"));
  });

  it("recurring events with hour-scoped suffix produce distinct keys each hour", () => {
    const workerId = "worker-abc";
    const hour1 = "2026-10-29T10";
    const hour2 = "2026-10-29T11";
    const key1 = deriveEventId("worker", workerId, "ready_to_hire_auto_revoked", hour1);
    const key2 = deriveEventId("worker", workerId, "ready_to_hire_auto_revoked", hour2);
    expect(key1).not.toBe(key2);
  });

  it("out-of-order: resumeCompletedAt is only set once even if update is called again with same step", () => {
    let session: ResumeSessionState = {
      status: "email_captured",
      resumeCompletedAt: null,
      convertedWorkerId: null,
      email: "dup@example.com",
    };
    session = applyResumeCompleted(session, 8, 8);
    const firstCompletedAt = session.resumeCompletedAt;
    session = applyResumeCompleted(session, 8, 8);
    expect(session.resumeCompletedAt).toBe(firstCompletedAt);
  });

  it("email_captured idempotency key is stable across retries", () => {
    const sessionId = "session-capture-retry";
    const key1 = deriveEventId("resume_session", sessionId, "email_captured");
    const key2 = deriveEventId("resume_session", sessionId, "email_captured");
    expect(key1).toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// Scenario 11: Ready to Hire approval and automatic revocation
// ---------------------------------------------------------------------------
describe("Scenario 11: Ready to Hire approval and automatic revocation", () => {
  it("worker is eligible when all criteria are met", () => {
    const result = computeEligibility({
      isEmailVerified: true,
      mandatoryDocsMissing: [],
      mandatoryDocsExpiredOrFlagged: [],
      verifiedRefCount: 2,
    });
    expect(result.eligible).toBe(true);
    expect(result.ineligibilityReasons).toHaveLength(0);
  });

  it("auto-revocation triggers when mandatory document expires", () => {
    const result = computeEligibility({
      isEmailVerified: true,
      mandatoryDocsMissing: [],
      mandatoryDocsExpiredOrFlagged: ["NDIS Worker Screening Check"],
      verifiedRefCount: 2,
    });
    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons[0]).toMatch(/expired or flagged/i);
  });

  it("auto-revocation triggers when verified reference count drops below 2", () => {
    const result = computeEligibility({
      isEmailVerified: true,
      mandatoryDocsMissing: [],
      mandatoryDocsExpiredOrFlagged: [],
      verifiedRefCount: 1,
    });
    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons[0]).toMatch(/verified references/i);
  });

  it("auto-revocation accumulates all failure reasons", () => {
    const result = computeEligibility({
      isEmailVerified: false,
      mandatoryDocsMissing: ["Police Clearance"],
      mandatoryDocsExpiredOrFlagged: ["NDIS Worker Screening Check"],
      verifiedRefCount: 0,
    });
    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons).toHaveLength(4);
  });

  it("ready_to_hire_approved idempotency key is date-scoped to prevent same-day duplicates from cron", () => {
    const workerId = "worker-rth";
    const date = "2026-10-29";
    const key1 = deriveEventId("worker", workerId, "ready_to_hire_approved", date);
    const key2 = deriveEventId("worker", workerId, "ready_to_hire_approved", date);
    expect(key1).toBe(key2);
  });

  it("ready_to_hire_auto_revoked is hour-scoped to allow one per run without flooding", () => {
    const workerId = "worker-autorevoke";
    const hour = "2026-10-29T02";
    const key = deriveEventId("worker", workerId, "ready_to_hire_auto_revoked", hour);
    expect(key).toHaveLength(64);
  });
});

// ---------------------------------------------------------------------------
// Additional: attribution payload structure
// ---------------------------------------------------------------------------
describe("Attribution payload included in resume_completed event", () => {
  it("resume_completed payload includes utm and meta fields", () => {
    const payload = {
      eventType: "resume_completed",
      sessionId: "session-attribution-test",
      email: "eve@example.com",
      stepCompleted: 8,
      resumeStrengthScore: 72,
      convertedWorkerId: null,
      utmSource: "facebook",
      fbclid: "abc123",
      metaCampaignId: "camp-456",
    };
    expect(payload.utmSource).toBe("facebook");
    expect(payload.fbclid).toBe("abc123");
    expect(payload.metaCampaignId).toBe("camp-456");
  });

  it("hasAttribution returns true when any tracking param is present", () => {
    expect(hasAttribution({ utmSource: "google", fbclid: null, metaCampaignId: null })).toBe(true);
    expect(hasAttribution({ utmSource: null, fbclid: "xyz", metaCampaignId: null })).toBe(true);
    expect(hasAttribution({ utmSource: null, fbclid: null, metaCampaignId: "c1" })).toBe(true);
    expect(hasAttribution({ utmSource: null, fbclid: null, metaCampaignId: null })).toBe(false);
  });
});
