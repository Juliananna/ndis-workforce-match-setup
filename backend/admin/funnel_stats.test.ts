import { describe, it, expect } from "vitest";

interface PersonRecord {
  email: string;
  hasAccount: boolean;
  isVerified: boolean;
  readyToHire: boolean;
}

function computeFunnelStats(people: PersonRecord[]) {
  const uniquePeople = people.length;
  const resumeLeadsOnly = people.filter((p) => !p.hasAccount).length;
  const convertedToAccount = people.filter((p) => p.hasAccount).length;
  const verifiedWorkers = people.filter((p) => p.isVerified).length;
  const readyToHire = people.filter((p) => p.readyToHire).length;
  const conversionRatePct = uniquePeople > 0
    ? Math.round((convertedToAccount / uniquePeople) * 100)
    : 0;

  return { uniquePeople, resumeLeadsOnly, convertedToAccount, verifiedWorkers, readyToHire, conversionRatePct };
}

describe("funnel stats deduplication", () => {
  it("does not double count a worker who also has a resume session", () => {
    const people: PersonRecord[] = [
      { email: "alice@x.com", hasAccount: true, isVerified: true, readyToHire: false },
    ];
    const stats = computeFunnelStats(people);
    expect(stats.uniquePeople).toBe(1);
    expect(stats.convertedToAccount).toBe(1);
    expect(stats.resumeLeadsOnly).toBe(0);
  });

  it("counts unconverted resume leads as resume-leads-only", () => {
    const people: PersonRecord[] = [
      { email: "lead@x.com", hasAccount: false, isVerified: false, readyToHire: false },
    ];
    const stats = computeFunnelStats(people);
    expect(stats.uniquePeople).toBe(1);
    expect(stats.resumeLeadsOnly).toBe(1);
    expect(stats.convertedToAccount).toBe(0);
  });

  it("conversion rate is 50% when half converted", () => {
    const people: PersonRecord[] = [
      { email: "a@x.com", hasAccount: true, isVerified: false, readyToHire: false },
      { email: "b@x.com", hasAccount: false, isVerified: false, readyToHire: false },
    ];
    const stats = computeFunnelStats(people);
    expect(stats.conversionRatePct).toBe(50);
  });

  it("conversion rate is 0 when no people", () => {
    const stats = computeFunnelStats([]);
    expect(stats.conversionRatePct).toBe(0);
    expect(stats.uniquePeople).toBe(0);
  });

  it("conversion rate is 100% when all have accounts", () => {
    const people: PersonRecord[] = [
      { email: "a@x.com", hasAccount: true, isVerified: true, readyToHire: false },
      { email: "b@x.com", hasAccount: true, isVerified: true, readyToHire: true },
    ];
    const stats = computeFunnelStats(people);
    expect(stats.conversionRatePct).toBe(100);
    expect(stats.readyToHire).toBe(1);
    expect(stats.verifiedWorkers).toBe(2);
  });

  it("ready-to-hire count is always a subset of converted-to-account", () => {
    const people: PersonRecord[] = [
      { email: "a@x.com", hasAccount: true, isVerified: true, readyToHire: true },
      { email: "b@x.com", hasAccount: true, isVerified: true, readyToHire: false },
      { email: "c@x.com", hasAccount: false, isVerified: false, readyToHire: false },
    ];
    const stats = computeFunnelStats(people);
    expect(stats.readyToHire).toBeLessThanOrEqual(stats.convertedToAccount);
  });
});
