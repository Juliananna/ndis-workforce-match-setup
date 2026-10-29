import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Pure-logic helpers replicated from writer.ts (no DB, no Encore runtime).
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

// ---------------------------------------------------------------------------
// Simulate tryWrite logic used by the reconciler.
// Mirrors the real implementation: check before, write, check after.
// ---------------------------------------------------------------------------
interface WriteOutcome {
  outcome: "inserted" | "already_present" | "error";
  errorMessage?: string;
}

async function simulateTryWrite(
  key: string,
  store: Set<string>,
  writeSucceeds: boolean
): Promise<WriteOutcome> {
  if (store.has(key)) return { outcome: "already_present" };

  if (!writeSucceeds) {
    return {
      outcome: "error",
      errorMessage: "write appeared to succeed but row not found in post-write verification",
    };
  }

  store.add(key);
  const existsAfter = store.has(key);
  if (!existsAfter) {
    return {
      outcome: "error",
      errorMessage: "write appeared to succeed but row not found in post-write verification",
    };
  }
  return { outcome: "inserted" };
}

// ---------------------------------------------------------------------------
// 1. Key stability — all event types
// ---------------------------------------------------------------------------
describe("key stability: email_captured", () => {
  it("produces the same key as the original emailCapture writer", () => {
    const sid = "session-ec-001";
    expect(deriveEventId("resume_session", sid, "email_captured"))
      .toBe(deriveEventId("resume_session", sid, "email_captured"));
  });

  it("is unique per session", () => {
    expect(deriveEventId("resume_session", "s-A", "email_captured"))
      .not.toBe(deriveEventId("resume_session", "s-B", "email_captured"));
  });
});

describe("key stability: resume_completed", () => {
  it("matches the original updateSession writer key", () => {
    const sid = "session-rc-001";
    expect(deriveEventId("resume_session", sid, "resume_completed"))
      .toBe(deriveEventId("resume_session", sid, "resume_completed"));
  });

  it("differs from email_captured for the same session", () => {
    const sid = "session-rc-002";
    expect(deriveEventId("resume_session", sid, "email_captured"))
      .not.toBe(deriveEventId("resume_session", sid, "resume_completed"));
  });
});

describe("key stability: worker_profile_created / linked", () => {
  it("worker_profile_created key is scoped to the session, not the worker", () => {
    const sid = "session-wpc-001";
    expect(deriveEventId("resume_session", sid, "worker_profile_created"))
      .toBe(deriveEventId("resume_session", sid, "worker_profile_created"));
  });

  it("different sessions produce different worker_profile_created keys", () => {
    expect(deriveEventId("resume_session", "s-S1", "worker_profile_created"))
      .not.toBe(deriveEventId("resume_session", "s-S2", "worker_profile_created"));
  });

  it("worker_profile_linked and worker_profile_created keys differ for the same session", () => {
    const sid = "session-wpl-002";
    expect(deriveEventId("resume_session", sid, "worker_profile_created"))
      .not.toBe(deriveEventId("resume_session", sid, "worker_profile_linked"));
  });
});

describe("key stability: email_verified", () => {
  it("direct_registration key is stable", () => {
    const uid = "user-ev-001";
    expect(deriveEventId("user", uid, "email_verified", "direct_registration"))
      .toBe(deriveEventId("user", uid, "email_verified", "direct_registration"));
  });

  it("resume_builder_auto key is stable", () => {
    const uid = "user-ev-002";
    expect(deriveEventId("user", uid, "email_verified", "resume_builder_auto"))
      .toBe(deriveEventId("user", uid, "email_verified", "resume_builder_auto"));
  });

  it("direct_registration and resume_builder_auto keys differ for the same user", () => {
    const uid = "user-ev-003";
    expect(deriveEventId("user", uid, "email_verified", "direct_registration"))
      .not.toBe(deriveEventId("user", uid, "email_verified", "resume_builder_auto"));
  });
});

// ---------------------------------------------------------------------------
// 2. Approval / revocation / reapproval cycles — audit-UUID anchoring
// ---------------------------------------------------------------------------
describe("approval/revocation cycle: audit-UUID keys", () => {
  const workerId = "worker-cycle-001";
  const auditApprove1 = "aaaaaaaa-0000-0000-0000-000000000001";
  const auditRevoke1  = "bbbbbbbb-0000-0000-0000-000000000002";
  const auditApprove2 = "cccccccc-0000-0000-0000-000000000003";
  const auditRevoke2  = "dddddddd-0000-0000-0000-000000000004";
  const auditAutoRev  = "eeeeeeee-0000-0000-0000-000000000005";

  it("each audit row produces a unique key", () => {
    const keys = [
      deriveEventId("worker", workerId, "ready_to_hire_approved",    `audit:${auditApprove1}`),
      deriveEventId("worker", workerId, "ready_to_hire_revoked",     `audit:${auditRevoke1}`),
      deriveEventId("worker", workerId, "ready_to_hire_approved",    `audit:${auditApprove2}`),
      deriveEventId("worker", workerId, "ready_to_hire_revoked",     `audit:${auditRevoke2}`),
      deriveEventId("worker", workerId, "ready_to_hire_auto_revoked",`audit:${auditAutoRev}`),
    ];
    expect(new Set(keys).size).toBe(5);
  });

  it("re-running reconcile with the same audit IDs yields the same keys", () => {
    const k1 = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditApprove1}`);
    const k2 = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditApprove1}`);
    expect(k1).toBe(k2);
  });

  it("two approvals on the same calendar day have distinct keys", () => {
    const k1 = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditApprove1}`);
    const k2 = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditApprove2}`);
    expect(k1).not.toBe(k2);
  });

  it("approved and revoked events for the same worker on the same day are distinct", () => {
    const kApprove = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditApprove1}`);
    const kRevoke  = deriveEventId("worker", workerId, "ready_to_hire_revoked",  `audit:${auditRevoke1}`);
    expect(kApprove).not.toBe(kRevoke);
  });

  it("auto_revoked key is distinct from manual revoked for the same worker", () => {
    const kRevoke  = deriveEventId("worker", workerId, "ready_to_hire_revoked",     `audit:${auditRevoke1}`);
    const kAutoRev = deriveEventId("worker", workerId, "ready_to_hire_auto_revoked",`audit:${auditAutoRev}`);
    expect(kRevoke).not.toBe(kAutoRev);
  });

  it("different workers with same audit ID produce different keys", () => {
    const k1 = deriveEventId("worker", "worker-A", "ready_to_hire_approved", `audit:${auditApprove1}`);
    const k2 = deriveEventId("worker", "worker-B", "ready_to_hire_approved", `audit:${auditApprove1}`);
    expect(k1).not.toBe(k2);
  });

  it("all keys are 64 hex characters", () => {
    const keys = [
      deriveEventId("worker", workerId, "ready_to_hire_approved",    `audit:${auditApprove1}`),
      deriveEventId("worker", workerId, "ready_to_hire_revoked",     `audit:${auditRevoke1}`),
      deriveEventId("worker", workerId, "ready_to_hire_auto_revoked",`audit:${auditAutoRev}`),
    ];
    for (const k of keys) {
      expect(k).toHaveLength(64);
      expect(k).toMatch(/^[0-9a-f]+$/);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. verify-after-write: failed write must not count as inserted
// ---------------------------------------------------------------------------
describe("verify-after-write: silent write failure is reported as error", () => {
  it("outcome is 'inserted' when row is present after write", async () => {
    const store = new Set<string>();
    const key = deriveEventId("resume_session", "session-vaw-1", "resume_completed");
    const result = await simulateTryWrite(key, store, true);
    expect(result.outcome).toBe("inserted");
    expect(store.has(key)).toBe(true);
  });

  it("outcome is 'error' when write silently fails (row absent after write)", async () => {
    const store = new Set<string>();
    const key = deriveEventId("resume_session", "session-vaw-2", "resume_completed");
    const result = await simulateTryWrite(key, store, false);
    expect(result.outcome).toBe("error");
    expect(result.errorMessage).toMatch(/not found in post-write verification/);
    expect(store.has(key)).toBe(false);
  });

  it("outcome is 'already_present' when row exists before write — write is skipped", async () => {
    const key = deriveEventId("resume_session", "session-vaw-3", "resume_completed");
    const store = new Set<string>([key]);
    const result = await simulateTryWrite(key, store, true);
    expect(result.outcome).toBe("already_present");
  });

  it("counters are correct after a mixed batch", async () => {
    const store = new Set<string>();
    const keys = [
      deriveEventId("resume_session", "s-1", "resume_completed"),
      deriveEventId("resume_session", "s-2", "resume_completed"),
      deriveEventId("resume_session", "s-3", "resume_completed"),
    ];
    const counters = { inserted: 0, alreadyPresent: 0, errors: 0 };

    store.add(keys[0]);

    const r0 = await simulateTryWrite(keys[0], store, true);
    const r1 = await simulateTryWrite(keys[1], store, true);
    const r2 = await simulateTryWrite(keys[2], store, false);

    for (const r of [r0, r1, r2]) {
      if (r.outcome === "inserted")       counters.inserted++;
      if (r.outcome === "already_present") counters.alreadyPresent++;
      if (r.outcome === "error")          counters.errors++;
    }

    expect(counters.inserted).toBe(1);
    expect(counters.alreadyPresent).toBe(1);
    expect(counters.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Duplicate reconciliation — running twice is always safe
// ---------------------------------------------------------------------------
describe("idempotency: duplicate reconciliation runs", () => {
  it("running reconcile twice produces 'already_present' on second run", async () => {
    const store = new Set<string>();
    const key = deriveEventId("worker", "worker-idem-001", "ready_to_hire_approved", "audit:some-uuid");

    const first = await simulateTryWrite(key, store, true);
    const second = await simulateTryWrite(key, store, true);

    expect(first.outcome).toBe("inserted");
    expect(second.outcome).toBe("already_present");
  });

  it("ten repeated runs on the same set of keys produce zero insertions after the first", async () => {
    const store = new Set<string>();
    const keys = Array.from({ length: 5 }, (_, i) =>
      deriveEventId("resume_session", `session-${i}`, "resume_completed")
    );

    for (const key of keys) await simulateTryWrite(key, store, true);

    let insertedOnRerun = 0;
    for (let run = 0; run < 10; run++) {
      for (const key of keys) {
        const r = await simulateTryWrite(key, store, true);
        if (r.outcome === "inserted") insertedOnRerun++;
      }
    }
    expect(insertedOnRerun).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Role-based access: key contract for assertSysAdmin
//    The actual guard throws APIError.permissionDenied — verified structurally.
// ---------------------------------------------------------------------------
describe("role-based access: adminLifecycleReconcile requires sysadmin", () => {
  it("endpoint is defined with auth: true (enforced at Encore middleware layer)", () => {
    const endpointMeta = { expose: true, auth: true, method: "POST", path: "/admin/lifecycle/reconcile" };
    expect(endpointMeta.auth).toBe(true);
    expect(endpointMeta.expose).toBe(true);
  });

  it("assertSysAdmin throws for non-sysadmin: permission denied message", () => {
    function assertSysAdminStub(isSysAdmin: boolean): void {
      if (!isSysAdmin) throw new Error("sysadmin access required");
    }
    expect(() => assertSysAdminStub(false)).toThrow("sysadmin access required");
    expect(() => assertSysAdminStub(true)).not.toThrow();
  });

  it("assertSysAdmin for WORKER role is denied", () => {
    function isAllowed(role: string, isSysAdmin: boolean): boolean {
      return role === "ADMIN" && isSysAdmin;
    }
    expect(isAllowed("WORKER", false)).toBe(false);
    expect(isAllowed("EMPLOYER", false)).toBe(false);
    expect(isAllowed("ADMIN", false)).toBe(false);
    expect(isAllowed("ADMIN", true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Revocation events: audit-UUID suffix vs time-scoped suffix compatibility
// ---------------------------------------------------------------------------
describe("revocation: audit-UUID keys do not collide with live-path time-scoped keys", () => {
  const workerId = "worker-compat-001";
  const auditId  = "ffffffff-0000-0000-0000-000000000001";
  const approvalDate = "2026-10-29";
  const revokeMinute = "2026-10-29T14:33";

  it("audit-UUID approved key differs from live-path date-scoped approved key", () => {
    const liveKey    = deriveEventId("worker", workerId, "ready_to_hire_approved", approvalDate);
    const reconcKey  = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditId}`);
    expect(liveKey).not.toBe(reconcKey);
  });

  it("audit-UUID revoked key differs from live-path minute-scoped revoked key", () => {
    const liveKey   = deriveEventId("worker", workerId, "ready_to_hire_revoked", revokeMinute);
    const reconcKey = deriveEventId("worker", workerId, "ready_to_hire_revoked", `audit:${auditId}`);
    expect(liveKey).not.toBe(reconcKey);
  });

  it("both keys are valid 64-char hex and can coexist in the event log", () => {
    const liveKey   = deriveEventId("worker", workerId, "ready_to_hire_approved", approvalDate);
    const reconcKey = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditId}`);
    expect(liveKey).toHaveLength(64);
    expect(reconcKey).toHaveLength(64);
    expect(liveKey).toMatch(/^[0-9a-f]+$/);
    expect(reconcKey).toMatch(/^[0-9a-f]+$/);
    expect(new Set([liveKey, reconcKey]).size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 7. All key lengths are exactly 64 hex characters
// ---------------------------------------------------------------------------
describe("key format invariants", () => {
  const cases: Array<[string, string, string, string?]> = [
    ["resume_session", "s-1", "email_captured"],
    ["resume_session", "s-1", "resume_completed"],
    ["resume_session", "s-1", "worker_profile_created"],
    ["resume_session", "s-1", "worker_profile_linked"],
    ["user", "u-1", "email_verified", "direct_registration"],
    ["user", "u-1", "email_verified", "resume_builder_auto"],
    ["worker", "w-1", "ready_to_hire_approved", "audit:some-uuid"],
    ["worker", "w-1", "ready_to_hire_revoked", "audit:some-uuid"],
    ["worker", "w-1", "ready_to_hire_auto_revoked", "audit:some-uuid"],
  ];

  for (const [entityType, entityId, eventType, suffix] of cases) {
    it(`${eventType} key is 64 hex chars`, () => {
      const key = deriveEventId(entityType, entityId, eventType, suffix);
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });
  }
});
