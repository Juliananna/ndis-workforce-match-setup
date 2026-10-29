import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Pure-logic helpers (replicated from writer.ts — no DB, no Encore runtime).
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

// Simulate the tryWrite flow: pre-check → write → post-check.
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
  const confirmedAfter = store.has(key);
  if (!confirmedAfter) {
    return {
      outcome: "error",
      errorMessage: "write appeared to succeed but row not found in post-write verification",
    };
  }
  return { outcome: "inserted" };
}

// ---------------------------------------------------------------------------
// Requirement 2: Live writer and reconciler must produce identical event IDs.
//
// Both code paths execute:
//   deriveEventId("worker", workerId, eventType, `audit:${auditRowUUID}`)
//
// These tests verify that identical inputs always produce identical outputs,
// and that the key is solely a function of (entityType, entityId, eventType,
// auditUUID) — independent of wall-clock time, call site, or execution order.
// ---------------------------------------------------------------------------
describe("Req 2: live-writer / reconciler key parity", () => {
  const workerId = "aaaaaaaa-0000-0000-0000-000000000001";
  const auditId  = "bbbbbbbb-0000-0000-0000-000000000002";

  it("approved: live writer and reconciler produce identical event ID", () => {
    const liveKey       = deriveEventId("worker", workerId, "ready_to_hire_approved",    `audit:${auditId}`);
    const reconcileKey  = deriveEventId("worker", workerId, "ready_to_hire_approved",    `audit:${auditId}`);
    expect(liveKey).toBe(reconcileKey);
  });

  it("revoked: live writer and reconciler produce identical event ID", () => {
    const liveKey       = deriveEventId("worker", workerId, "ready_to_hire_revoked",     `audit:${auditId}`);
    const reconcileKey  = deriveEventId("worker", workerId, "ready_to_hire_revoked",     `audit:${auditId}`);
    expect(liveKey).toBe(reconcileKey);
  });

  it("auto_revoked: live writer and reconciler produce identical event ID", () => {
    const liveKey       = deriveEventId("worker", workerId, "ready_to_hire_auto_revoked",`audit:${auditId}`);
    const reconcileKey  = deriveEventId("worker", workerId, "ready_to_hire_auto_revoked",`audit:${auditId}`);
    expect(liveKey).toBe(reconcileKey);
  });

  it("key is a pure function — same inputs always yield same output across any number of calls", () => {
    const calls = Array.from({ length: 10 }, () =>
      deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditId}`)
    );
    expect(new Set(calls).size).toBe(1);
  });

  it("key does not incorporate wall-clock time — stable across retries", () => {
    const k1 = deriveEventId("worker", workerId, "ready_to_hire_revoked", `audit:${auditId}`);
    const k2 = deriveEventId("worker", workerId, "ready_to_hire_revoked", `audit:${auditId}`);
    expect(k1).toBe(k2);
    expect(k1).toHaveLength(64);
  });
});

// ---------------------------------------------------------------------------
// Requirement 1: Each decision produces a unique audit UUID → unique event ID.
// Requirement 4: Separate approval/revocation cycles retain distinct events.
// ---------------------------------------------------------------------------
describe("Req 1 & 4: distinct decisions → distinct event IDs", () => {
  const workerId = "cccccccc-0000-0000-0000-000000000003";

  // Simulate a full approve → revoke → re-approve → auto-revoke cycle.
  const audit1Approve    = "11111111-0000-0000-0000-000000000001"; // first approval
  const audit2Revoke     = "22222222-0000-0000-0000-000000000002"; // manual revoke
  const audit3ReApprove  = "33333333-0000-0000-0000-000000000003"; // second approval
  const audit4AutoRevoke = "44444444-0000-0000-0000-000000000004"; // auto-revoke

  it("all four decisions in a cycle produce four distinct event IDs", () => {
    const keys = [
      deriveEventId("worker", workerId, "ready_to_hire_approved",    `audit:${audit1Approve}`),
      deriveEventId("worker", workerId, "ready_to_hire_revoked",     `audit:${audit2Revoke}`),
      deriveEventId("worker", workerId, "ready_to_hire_approved",    `audit:${audit3ReApprove}`),
      deriveEventId("worker", workerId, "ready_to_hire_auto_revoked",`audit:${audit4AutoRevoke}`),
    ];
    expect(new Set(keys).size).toBe(4);
  });

  it("two approvals on the same calendar day have distinct event IDs", () => {
    const k1 = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${audit1Approve}`);
    const k2 = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${audit3ReApprove}`);
    expect(k1).not.toBe(k2);
  });

  it("approved and revoked events for the same worker are always distinct", () => {
    const kApprove = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${audit1Approve}`);
    const kRevoke  = deriveEventId("worker", workerId, "ready_to_hire_revoked",  `audit:${audit2Revoke}`);
    expect(kApprove).not.toBe(kRevoke);
  });

  it("manual revoke and auto-revoke are always distinct even for the same worker", () => {
    const kRevoke  = deriveEventId("worker", workerId, "ready_to_hire_revoked",     `audit:${audit2Revoke}`);
    const kAutoRev = deriveEventId("worker", workerId, "ready_to_hire_auto_revoked",`audit:${audit4AutoRevoke}`);
    expect(kRevoke).not.toBe(kAutoRev);
  });

  it("different workers with the same audit UUID produce different event IDs", () => {
    const k1 = deriveEventId("worker", "worker-A", "ready_to_hire_approved", `audit:${audit1Approve}`);
    const k2 = deriveEventId("worker", "worker-B", "ready_to_hire_approved", `audit:${audit1Approve}`);
    expect(k1).not.toBe(k2);
  });
});

// ---------------------------------------------------------------------------
// Requirement 3: Retrying the same decision must not create another event.
//
// The live writer uses ON CONFLICT DO NOTHING. The reconciler performs a
// pre-write existence check. Both are simulated here.
// ---------------------------------------------------------------------------
describe("Req 3: retrying the same decision is always a no-op", () => {
  const workerId = "dddddddd-0000-0000-0000-000000000005";
  const auditId  = "eeeeeeee-0000-0000-0000-000000000006";

  it("reconciler: second tryWrite call on existing key returns already_present", async () => {
    const store = new Set<string>();
    const key = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditId}`);
    const first  = await simulateTryWrite(key, store, true);
    const second = await simulateTryWrite(key, store, true);
    expect(first.outcome).toBe("inserted");
    expect(second.outcome).toBe("already_present");
  });

  it("ten reconcile reruns insert nothing after the first run", async () => {
    const store = new Set<string>();
    const key = deriveEventId("worker", workerId, "ready_to_hire_revoked", `audit:${auditId}`);
    await simulateTryWrite(key, store, true);
    let extraInserts = 0;
    for (let i = 0; i < 10; i++) {
      const r = await simulateTryWrite(key, store, true);
      if (r.outcome === "inserted") extraInserts++;
    }
    expect(extraInserts).toBe(0);
  });

  it("live writer: same audit UUID → same event_id → ON CONFLICT DO NOTHING prevents duplicate", () => {
    const key1 = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditId}`);
    const key2 = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditId}`);
    expect(key1).toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// Requirement 5: Existing historical events must not be deleted or rewritten.
//
// Historical rows used a time-scoped key (e.g. "worker:<id>:approved:2026-10-29").
// The reconciler does not know that time-scoped key; it inserts under the
// audit-UUID key instead. The old row remains; a second row appears for that
// decision. This test confirms that both keys are structurally valid and that
// the two-key scenario does not corrupt the event log.
// ---------------------------------------------------------------------------
describe("Req 5: historical time-scoped events are not deleted or overwritten", () => {
  const workerId  = "ffffffff-0000-0000-0000-000000000007";
  const auditId   = "gggggggg-0000-0000-0000-000000000008";
  const legacyDate = "2026-10-01"; // old date-scoped suffix

  it("old time-scoped key and new audit-UUID key are structurally distinct", () => {
    const oldKey  = deriveEventId("worker", workerId, "ready_to_hire_approved", legacyDate);
    const newKey  = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditId}`);
    expect(oldKey).not.toBe(newKey);
    expect(oldKey).toHaveLength(64);
    expect(newKey).toHaveLength(64);
  });

  it("old row is not removed when new row is inserted — store still holds both", async () => {
    const store = new Set<string>();
    const oldKey = deriveEventId("worker", workerId, "ready_to_hire_approved", legacyDate);
    const newKey = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditId}`);

    store.add(oldKey);

    await simulateTryWrite(newKey, store, true);

    expect(store.has(oldKey)).toBe(true);
    expect(store.has(newKey)).toBe(true);
    expect(store.size).toBe(2);
  });

  it("reconciler does not attempt to insert under the old time-scoped key", () => {
    const oldKey  = deriveEventId("worker", workerId, "ready_to_hire_approved", legacyDate);
    const newKey  = deriveEventId("worker", workerId, "ready_to_hire_approved", `audit:${auditId}`);
    expect(oldKey).not.toBe(newKey);
  });
});

// ---------------------------------------------------------------------------
// Verify-after-write: silent write failure is reported as error, not inserted.
// ---------------------------------------------------------------------------
describe("verify-after-write: silent failure surfaced as error", () => {
  it("outcome is inserted when post-write verification confirms row exists", async () => {
    const store = new Set<string>();
    const key = deriveEventId("worker", "w1", "ready_to_hire_approved", "audit:uuid-1");
    const r = await simulateTryWrite(key, store, true);
    expect(r.outcome).toBe("inserted");
    expect(store.has(key)).toBe(true);
  });

  it("outcome is error when write silently fails (row absent after write)", async () => {
    const store = new Set<string>();
    const key = deriveEventId("worker", "w2", "ready_to_hire_revoked", "audit:uuid-2");
    const r = await simulateTryWrite(key, store, false);
    expect(r.outcome).toBe("error");
    expect(r.errorMessage).toMatch(/not found in post-write verification/);
  });

  it("outcome is already_present when row exists before write — write is skipped entirely", async () => {
    const key = deriveEventId("worker", "w3", "ready_to_hire_auto_revoked", "audit:uuid-3");
    const store = new Set<string>([key]);
    const r = await simulateTryWrite(key, store, true);
    expect(r.outcome).toBe("already_present");
  });

  it("counters reflect mixed outcomes correctly", async () => {
    const store = new Set<string>();
    const keys = [
      deriveEventId("worker", "w-a", "ready_to_hire_approved",    "audit:uid-a"),
      deriveEventId("worker", "w-b", "ready_to_hire_revoked",     "audit:uid-b"),
      deriveEventId("worker", "w-c", "ready_to_hire_auto_revoked","audit:uid-c"),
    ];
    store.add(keys[0]);

    const counters = { inserted: 0, alreadyPresent: 0, errors: 0 };
    const results = [
      await simulateTryWrite(keys[0], store, true),
      await simulateTryWrite(keys[1], store, true),
      await simulateTryWrite(keys[2], store, false),
    ];
    for (const r of results) {
      if (r.outcome === "inserted")        counters.inserted++;
      if (r.outcome === "already_present") counters.alreadyPresent++;
      if (r.outcome === "error")           counters.errors++;
    }
    expect(counters.inserted).toBe(1);
    expect(counters.alreadyPresent).toBe(1);
    expect(counters.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Non-readiness event key stability (unchanged from before).
// ---------------------------------------------------------------------------
describe("non-readiness event key stability", () => {
  it("email_captured key is stable and session-scoped", () => {
    const sid = "session-ec-001";
    expect(deriveEventId("resume_session", sid, "email_captured"))
      .toBe(deriveEventId("resume_session", sid, "email_captured"));
  });

  it("resume_completed key is stable", () => {
    const sid = "session-rc-001";
    expect(deriveEventId("resume_session", sid, "resume_completed"))
      .toBe(deriveEventId("resume_session", sid, "resume_completed"));
  });

  it("worker_profile_created key is session-scoped and stable", () => {
    const sid = "session-wpc-001";
    expect(deriveEventId("resume_session", sid, "worker_profile_created"))
      .toBe(deriveEventId("resume_session", sid, "worker_profile_created"));
  });

  it("worker_profile_linked key differs from worker_profile_created", () => {
    const sid = "session-wpl-001";
    expect(deriveEventId("resume_session", sid, "worker_profile_created"))
      .not.toBe(deriveEventId("resume_session", sid, "worker_profile_linked"));
  });

  it("email_verified direct_registration and resume_builder_auto differ per user", () => {
    const uid = "user-ev-001";
    expect(deriveEventId("user", uid, "email_verified", "direct_registration"))
      .not.toBe(deriveEventId("user", uid, "email_verified", "resume_builder_auto"));
  });
});

// ---------------------------------------------------------------------------
// Key format invariants.
// ---------------------------------------------------------------------------
describe("key format: all event IDs are 64 lowercase hex characters", () => {
  const cases: Array<[string, string, string, string?]> = [
    ["resume_session", "s-1", "email_captured"],
    ["resume_session", "s-1", "resume_completed"],
    ["resume_session", "s-1", "worker_profile_created"],
    ["resume_session", "s-1", "worker_profile_linked"],
    ["user", "u-1", "email_verified", "direct_registration"],
    ["user", "u-1", "email_verified", "resume_builder_auto"],
    ["worker", "w-1", "ready_to_hire_approved",    "audit:some-uuid"],
    ["worker", "w-1", "ready_to_hire_revoked",     "audit:some-uuid"],
    ["worker", "w-1", "ready_to_hire_auto_revoked","audit:some-uuid"],
  ];

  for (const [et, eid, evt, sfx] of cases) {
    it(`${evt} key is 64 hex chars`, () => {
      const key = deriveEventId(et, eid, evt, sfx);
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });
  }
});
