import { describe, it, expect } from "vitest";

type OfferStatus = "Pending" | "Accepted" | "Declined" | "Negotiating" | "Cancelled";

const workerAllowedStatuses: OfferStatus[] = ["Pending", "Negotiating"];
const employerCancellableStatuses: OfferStatus[] = ["Pending", "Negotiating", "Accepted"];
const employerNegotiatingStatuses: OfferStatus[] = ["Negotiating"];

function canWorkerRespond(status: OfferStatus): boolean {
  return workerAllowedStatuses.includes(status);
}

function canEmployerCancel(status: OfferStatus): boolean {
  return employerCancellableStatuses.includes(status);
}

function canEmployerNegotiate(status: OfferStatus): boolean {
  return employerNegotiatingStatuses.includes(status);
}

function workerTransition(status: OfferStatus, action: "accept" | "decline" | "propose_rate"): OfferStatus {
  if (!canWorkerRespond(status)) throw new Error(`Cannot respond to offer with status '${status}'`);
  if (action === "accept") return "Accepted";
  if (action === "decline") return "Declined";
  return "Negotiating";
}

function employerTransition(status: OfferStatus, action: "accept_rate" | "counter_rate" | "cancel"): OfferStatus {
  if (action === "cancel") {
    if (!canEmployerCancel(status)) throw new Error(`Cannot cancel offer with status '${status}'`);
    return "Cancelled";
  }
  if (!canEmployerNegotiate(status)) throw new Error(`Can only accept_rate/counter_rate when Negotiating`);
  if (action === "accept_rate") return "Accepted";
  return "Negotiating";
}

describe("Worker offer state transitions", () => {
  it("accepts a Pending offer", () => {
    expect(workerTransition("Pending", "accept")).toBe("Accepted");
  });

  it("declines a Pending offer", () => {
    expect(workerTransition("Pending", "decline")).toBe("Declined");
  });

  it("proposes rate on a Pending offer -> Negotiating", () => {
    expect(workerTransition("Pending", "propose_rate")).toBe("Negotiating");
  });

  it("can respond to Negotiating offer", () => {
    expect(workerTransition("Negotiating", "accept")).toBe("Accepted");
  });

  it("cannot respond to an Accepted offer", () => {
    expect(() => workerTransition("Accepted", "accept")).toThrow();
  });

  it("cannot respond to a Declined offer", () => {
    expect(() => workerTransition("Declined", "accept")).toThrow();
  });

  it("cannot respond to a Cancelled offer", () => {
    expect(() => workerTransition("Cancelled", "accept")).toThrow();
  });
});

describe("Employer offer state transitions", () => {
  it("accepts a worker's proposed rate", () => {
    expect(employerTransition("Negotiating", "accept_rate")).toBe("Accepted");
  });

  it("counters a worker's proposed rate", () => {
    expect(employerTransition("Negotiating", "counter_rate")).toBe("Negotiating");
  });

  it("cancels a Pending offer", () => {
    expect(employerTransition("Pending", "cancel")).toBe("Cancelled");
  });

  it("cancels a Negotiating offer", () => {
    expect(employerTransition("Negotiating", "cancel")).toBe("Cancelled");
  });

  it("cancels an Accepted offer", () => {
    expect(employerTransition("Accepted", "cancel")).toBe("Cancelled");
  });

  it("cannot accept_rate when Pending", () => {
    expect(() => employerTransition("Pending", "accept_rate")).toThrow();
  });

  it("cannot cancel a Declined offer", () => {
    expect(() => employerTransition("Declined", "cancel")).toThrow();
  });

  it("cannot cancel an already-Cancelled offer", () => {
    expect(() => employerTransition("Cancelled", "cancel")).toThrow();
  });
});

describe("Document access control logic", () => {
  it("employer can access documents only when offer is Accepted", () => {
    const hasAccess = (offerStatus: OfferStatus) => offerStatus === "Accepted";
    expect(hasAccess("Accepted")).toBe(true);
    expect(hasAccess("Pending")).toBe(false);
    expect(hasAccess("Negotiating")).toBe(false);
    expect(hasAccess("Declined")).toBe(false);
    expect(hasAccess("Cancelled")).toBe(false);
  });
});
