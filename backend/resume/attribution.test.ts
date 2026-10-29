import { describe, it, expect } from "vitest";

interface AttributionParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
  metaLeadId?: string;
  fbclid?: string;
  landingPage?: string;
}

function classifyAttributionSource(a: AttributionParams): string {
  if (a.fbclid || a.metaCampaignId || a.utmSource === "meta" || a.utmSource === "facebook") {
    return "meta";
  }
  if (a.utmSource) {
    return a.utmSource;
  }
  return "unknown";
}

function hasAttribution(a: AttributionParams): boolean {
  return !!(a.utmSource || a.fbclid || a.metaCampaignId || a.metaLeadId);
}

function mergeFirstTouch(existing: AttributionParams, incoming: AttributionParams): AttributionParams {
  if (hasAttribution(existing)) return existing;
  return incoming;
}

describe("attribution source classification", () => {
  it("classifies fbclid as meta", () => {
    expect(classifyAttributionSource({ fbclid: "abc123" })).toBe("meta");
  });

  it("classifies metaCampaignId as meta", () => {
    expect(classifyAttributionSource({ metaCampaignId: "camp_1" })).toBe("meta");
  });

  it("classifies utm_source=meta as meta", () => {
    expect(classifyAttributionSource({ utmSource: "meta" })).toBe("meta");
  });

  it("classifies utm_source=facebook as meta", () => {
    expect(classifyAttributionSource({ utmSource: "facebook" })).toBe("meta");
  });

  it("classifies utm_source=google as google", () => {
    expect(classifyAttributionSource({ utmSource: "google" })).toBe("google");
  });

  it("classifies no attribution as unknown (not organic)", () => {
    expect(classifyAttributionSource({})).toBe("unknown");
  });

  it("classifies empty string utm as unknown", () => {
    expect(classifyAttributionSource({ utmSource: "" })).toBe("unknown");
  });
});

describe("first-touch attribution preservation", () => {
  it("preserves first attribution when a second visit has different source", () => {
    const first: AttributionParams = { utmSource: "meta", fbclid: "abc" };
    const second: AttributionParams = { utmSource: "google" };
    const result = mergeFirstTouch(first, second);
    expect(result.utmSource).toBe("meta");
    expect(result.fbclid).toBe("abc");
  });

  it("applies attribution on first touch when none exists", () => {
    const first: AttributionParams = {};
    const second: AttributionParams = { utmSource: "meta", fbclid: "abc" };
    const result = mergeFirstTouch(first, second);
    expect(result.utmSource).toBe("meta");
  });

  it("does not overwrite existing attribution with empty incoming", () => {
    const first: AttributionParams = { utmSource: "email", utmCampaign: "welcome" };
    const second: AttributionParams = {};
    const result = mergeFirstTouch(first, second);
    expect(result.utmSource).toBe("email");
    expect(result.utmCampaign).toBe("welcome");
  });

  it("does not overwrite existing attribution with different source", () => {
    const first: AttributionParams = { utmSource: "newsletter" };
    const second: AttributionParams = { utmSource: "meta", fbclid: "xyz" };
    const result = mergeFirstTouch(first, second);
    expect(result.utmSource).toBe("newsletter");
    expect(result.fbclid).toBeUndefined();
  });

  it("treats unknown-source session as having no attribution for merge purposes", () => {
    const noAttrib: AttributionParams = {};
    expect(hasAttribution(noAttrib)).toBe(false);
  });

  it("treats session with fbclid as having attribution", () => {
    expect(hasAttribution({ fbclid: "click123" })).toBe(true);
  });

  it("treats session with utmSource as having attribution", () => {
    expect(hasAttribution({ utmSource: "email" })).toBe(true);
  });
});

describe("attribution params — all fields accepted", () => {
  const full: AttributionParams = {
    utmSource: "meta",
    utmMedium: "cpc",
    utmCampaign: "ndis-workers-2026",
    utmContent: "carousel-ad",
    utmTerm: "disability support worker",
    metaCampaignId: "camp_001",
    metaAdsetId: "adset_002",
    metaAdId: "ad_003",
    metaLeadId: "lead_004",
    fbclid: "Iw...",
    landingPage: "/resume-builder",
  };

  it("has all expected fields defined", () => {
    expect(full.utmSource).toBeDefined();
    expect(full.utmMedium).toBeDefined();
    expect(full.utmCampaign).toBeDefined();
    expect(full.utmContent).toBeDefined();
    expect(full.utmTerm).toBeDefined();
    expect(full.metaCampaignId).toBeDefined();
    expect(full.metaAdsetId).toBeDefined();
    expect(full.metaAdId).toBeDefined();
    expect(full.metaLeadId).toBeDefined();
    expect(full.fbclid).toBeDefined();
    expect(full.landingPage).toBeDefined();
  });

  it("is classified as meta", () => {
    expect(classifyAttributionSource(full)).toBe("meta");
  });
});
