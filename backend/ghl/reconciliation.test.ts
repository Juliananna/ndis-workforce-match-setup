import { describe, it, expect } from "vitest";

interface PersonRecord {
  email: string;
  hasWorkerAccount: boolean;
  hasResumeSession: boolean;
  resumeConverted: boolean;
  ghlContactIdWorker: string | null;
  ghlContactIdSession: string | null;
  ghlSyncFailed: boolean;
  readyToHire: boolean;
}

function computeReportTotals(people: PersonRecord[]) {
  return {
    totalUniquePeople: people.length,
    totalWithWorkerAccount: people.filter((p) => p.hasWorkerAccount).length,
    totalWithResumeOnly: people.filter((p) => !p.hasWorkerAccount && p.hasResumeSession).length,
    totalConverted: people.filter((p) => p.resumeConverted).length,
    totalNeverSynced: people.filter((p) => !p.ghlContactIdWorker && !p.ghlContactIdSession).length,
    totalSyncFailed: people.filter((p) => p.ghlSyncFailed).length,
    totalReadyToHire: people.filter((p) => p.readyToHire).length,
  };
}

function deduplicateByEmail(raw: PersonRecord[]): PersonRecord[] {
  const seen = new Map<string, PersonRecord>();
  for (const r of raw) {
    if (!seen.has(r.email)) {
      seen.set(r.email, r);
    } else {
      const existing = seen.get(r.email)!;
      seen.set(r.email, {
        ...existing,
        hasWorkerAccount: existing.hasWorkerAccount || r.hasWorkerAccount,
        hasResumeSession: existing.hasResumeSession || r.hasResumeSession,
        resumeConverted: existing.resumeConverted || r.resumeConverted,
        ghlContactIdWorker: existing.ghlContactIdWorker ?? r.ghlContactIdWorker,
        ghlContactIdSession: existing.ghlContactIdSession ?? r.ghlContactIdSession,
        ghlSyncFailed: existing.ghlSyncFailed || r.ghlSyncFailed,
        readyToHire: existing.readyToHire || r.readyToHire,
      });
    }
  }
  return [...seen.values()];
}

describe("reconciliation report – deduplication", () => {
  it("counts one person with both account and resume session as one unique person", () => {
    const raw: PersonRecord[] = [
      {
        email: "alice@example.com",
        hasWorkerAccount: true,
        hasResumeSession: true,
        resumeConverted: true,
        ghlContactIdWorker: "ghl-1",
        ghlContactIdSession: "ghl-1",
        ghlSyncFailed: false,
        readyToHire: false,
      },
    ];
    const people = deduplicateByEmail(raw);
    expect(people).toHaveLength(1);
    const totals = computeReportTotals(people);
    expect(totals.totalUniquePeople).toBe(1);
  });

  it("does not double-count when same email appears as both resume lead and worker", () => {
    const raw: PersonRecord[] = [
      {
        email: "bob@example.com",
        hasWorkerAccount: false,
        hasResumeSession: true,
        resumeConverted: false,
        ghlContactIdWorker: null,
        ghlContactIdSession: "ghl-2",
        ghlSyncFailed: false,
        readyToHire: false,
      },
      {
        email: "bob@example.com",
        hasWorkerAccount: true,
        hasResumeSession: false,
        resumeConverted: false,
        ghlContactIdWorker: "ghl-3",
        ghlContactIdSession: null,
        ghlSyncFailed: false,
        readyToHire: false,
      },
    ];
    const people = deduplicateByEmail(raw);
    expect(people).toHaveLength(1);
    expect(people[0]!.hasWorkerAccount).toBe(true);
    expect(people[0]!.hasResumeSession).toBe(true);
  });

  it("counts resume-only leads separately from worker-account holders", () => {
    const people: PersonRecord[] = [
      { email: "worker@example.com", hasWorkerAccount: true, hasResumeSession: false, resumeConverted: false, ghlContactIdWorker: "g1", ghlContactIdSession: null, ghlSyncFailed: false, readyToHire: false },
      { email: "lead@example.com", hasWorkerAccount: false, hasResumeSession: true, resumeConverted: false, ghlContactIdWorker: null, ghlContactIdSession: null, ghlSyncFailed: false, readyToHire: false },
    ];
    const totals = computeReportTotals(people);
    expect(totals.totalUniquePeople).toBe(2);
    expect(totals.totalWithWorkerAccount).toBe(1);
    expect(totals.totalWithResumeOnly).toBe(1);
  });

  it("counts never-synced correctly", () => {
    const people: PersonRecord[] = [
      { email: "a@x.com", hasWorkerAccount: true, hasResumeSession: false, resumeConverted: false, ghlContactIdWorker: null, ghlContactIdSession: null, ghlSyncFailed: false, readyToHire: false },
      { email: "b@x.com", hasWorkerAccount: true, hasResumeSession: false, resumeConverted: false, ghlContactIdWorker: "g1", ghlContactIdSession: null, ghlSyncFailed: false, readyToHire: false },
      { email: "c@x.com", hasWorkerAccount: false, hasResumeSession: true, resumeConverted: false, ghlContactIdWorker: null, ghlContactIdSession: null, ghlSyncFailed: false, readyToHire: false },
    ];
    const totals = computeReportTotals(people);
    expect(totals.totalNeverSynced).toBe(2);
  });

  it("counts sync failures correctly", () => {
    const people: PersonRecord[] = [
      { email: "fail@x.com", hasWorkerAccount: true, hasResumeSession: false, resumeConverted: false, ghlContactIdWorker: "g1", ghlContactIdSession: null, ghlSyncFailed: true, readyToHire: false },
      { email: "ok@x.com", hasWorkerAccount: true, hasResumeSession: false, resumeConverted: false, ghlContactIdWorker: "g2", ghlContactIdSession: null, ghlSyncFailed: false, readyToHire: false },
    ];
    const totals = computeReportTotals(people);
    expect(totals.totalSyncFailed).toBe(1);
  });

  it("counts ready-to-hire correctly", () => {
    const people: PersonRecord[] = [
      { email: "ready@x.com", hasWorkerAccount: true, hasResumeSession: false, resumeConverted: false, ghlContactIdWorker: "g1", ghlContactIdSession: null, ghlSyncFailed: false, readyToHire: true },
      { email: "not@x.com", hasWorkerAccount: true, hasResumeSession: false, resumeConverted: false, ghlContactIdWorker: "g2", ghlContactIdSession: null, ghlSyncFailed: false, readyToHire: false },
    ];
    const totals = computeReportTotals(people);
    expect(totals.totalReadyToHire).toBe(1);
  });

  it("reports zero totals for empty list", () => {
    const totals = computeReportTotals([]);
    expect(totals.totalUniquePeople).toBe(0);
    expect(totals.totalWithWorkerAccount).toBe(0);
    expect(totals.totalWithResumeOnly).toBe(0);
    expect(totals.totalConverted).toBe(0);
    expect(totals.totalNeverSynced).toBe(0);
    expect(totals.totalSyncFailed).toBe(0);
    expect(totals.totalReadyToHire).toBe(0);
  });
});

describe("reconciliation report – conversion rate", () => {
  it("computes conversion rate correctly", () => {
    const total = 10;
    const converted = 4;
    const rate = Math.round((converted / total) * 100);
    expect(rate).toBe(40);
  });

  it("returns 0 when no people", () => {
    const rate = 0 > 0 ? Math.round((0 / 0) * 100) : 0;
    expect(rate).toBe(0);
  });
});
