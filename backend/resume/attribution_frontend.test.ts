import { describe, it, expect, beforeEach } from "vitest";

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

function hasAttribution(a: AttributionParams): boolean {
  return !!(a.utmSource || a.fbclid || a.metaCampaignId || a.metaLeadId || a.utmMedium);
}

function parseFromSearch(search: string, pathname = "/resume-builder"): AttributionParams {
  const params = new URLSearchParams(search);
  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmContent: params.get("utm_content") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
    metaCampaignId: params.get("campaign_id") ?? undefined,
    metaAdsetId: params.get("adset_id") ?? undefined,
    metaAdId: params.get("ad_id") ?? undefined,
    metaLeadId: params.get("lead_id") ?? undefined,
    fbclid: params.get("fbclid") ?? undefined,
    landingPage: pathname,
  };
}

function mergeFirstTouch(
  stored: AttributionParams | null,
  incoming: AttributionParams
): AttributionParams {
  const alreadyStored = stored !== null && hasAttribution(stored);
  const hasIncoming = hasAttribution(incoming);
  if (hasIncoming && !alreadyStored) return incoming;
  if (alreadyStored) return stored!;
  return {};
}

describe("frontend attribution – URL parsing", () => {
  it("parses utm_source", () => {
    const r = parseFromSearch("?utm_source=meta");
    expect(r.utmSource).toBe("meta");
  });

  it("parses all five UTM params", () => {
    const r = parseFromSearch("?utm_source=google&utm_medium=cpc&utm_campaign=ndis&utm_content=ad1&utm_term=worker");
    expect(r.utmSource).toBe("google");
    expect(r.utmMedium).toBe("cpc");
    expect(r.utmCampaign).toBe("ndis");
    expect(r.utmContent).toBe("ad1");
    expect(r.utmTerm).toBe("worker");
  });

  it("parses fbclid", () => {
    const r = parseFromSearch("?fbclid=IwAR123abc");
    expect(r.fbclid).toBe("IwAR123abc");
  });

  it("parses Meta campaign_id, adset_id, ad_id, lead_id", () => {
    const r = parseFromSearch("?campaign_id=c1&adset_id=a1&ad_id=d1&lead_id=l1");
    expect(r.metaCampaignId).toBe("c1");
    expect(r.metaAdsetId).toBe("a1");
    expect(r.metaAdId).toBe("d1");
    expect(r.metaLeadId).toBe("l1");
  });

  it("records landing_page path", () => {
    const r = parseFromSearch("?utm_source=meta", "/resume-builder");
    expect(r.landingPage).toBe("/resume-builder");
  });

  it("returns undefined for missing params", () => {
    const r = parseFromSearch("?source=rto&rtoCode=ABC");
    expect(r.utmSource).toBeUndefined();
    expect(r.fbclid).toBeUndefined();
  });
});

describe("frontend attribution – hasAttribution", () => {
  it("is true when utmSource is set", () => {
    expect(hasAttribution({ utmSource: "meta" })).toBe(true);
  });

  it("is true when fbclid is set", () => {
    expect(hasAttribution({ fbclid: "abc" })).toBe(true);
  });

  it("is true when metaCampaignId is set", () => {
    expect(hasAttribution({ metaCampaignId: "c1" })).toBe(true);
  });

  it("is true when metaLeadId is set", () => {
    expect(hasAttribution({ metaLeadId: "l1" })).toBe(true);
  });

  it("is true when utmMedium is set", () => {
    expect(hasAttribution({ utmMedium: "cpc" })).toBe(true);
  });

  it("is false when only landingPage is set (not an attribution signal)", () => {
    expect(hasAttribution({ landingPage: "/resume-builder" })).toBe(false);
  });

  it("is false for empty object", () => {
    expect(hasAttribution({})).toBe(false);
  });
});

describe("frontend attribution – first-touch mergeFirstTouch", () => {
  it("returns incoming attribution when nothing stored", () => {
    const inc: AttributionParams = { utmSource: "meta", fbclid: "abc" };
    const result = mergeFirstTouch(null, inc);
    expect(result.utmSource).toBe("meta");
    expect(result.fbclid).toBe("abc");
  });

  it("preserves stored attribution when new incoming has different source", () => {
    const stored: AttributionParams = { utmSource: "meta", fbclid: "orig" };
    const inc: AttributionParams = { utmSource: "google" };
    const result = mergeFirstTouch(stored, inc);
    expect(result.utmSource).toBe("meta");
    expect(result.fbclid).toBe("orig");
  });

  it("preserves stored attribution when incoming URL has no params (simulates refresh)", () => {
    const stored: AttributionParams = { utmSource: "meta", utmCampaign: "ndis" };
    const inc: AttributionParams = {};
    const result = mergeFirstTouch(stored, inc);
    expect(result.utmSource).toBe("meta");
    expect(result.utmCampaign).toBe("ndis");
  });

  it("returns empty when both stored and incoming have no attribution", () => {
    const result = mergeFirstTouch(null, {});
    expect(Object.keys(result).length).toBe(0);
  });

  it("does not overwrite newsletter attribution with Meta source", () => {
    const stored: AttributionParams = { utmSource: "newsletter" };
    const inc: AttributionParams = { utmSource: "meta", fbclid: "xyz" };
    const result = mergeFirstTouch(stored, inc);
    expect(result.utmSource).toBe("newsletter");
    expect(result.fbclid).toBeUndefined();
  });

  it("applies first-touch when stored object has only landingPage (no real attribution)", () => {
    const stored: AttributionParams = { landingPage: "/resume-builder" };
    const inc: AttributionParams = { utmSource: "meta", fbclid: "click1" };
    const result = mergeFirstTouch(stored, inc);
    expect(result.utmSource).toBe("meta");
  });
});

describe("frontend attribution – createSession payload shape", () => {
  it("produces a flat attribution object that can be spread into createSession", () => {
    const attribution = parseFromSearch(
      "?utm_source=meta&fbclid=abc&campaign_id=c1&utm_campaign=ndis"
    );
    const payload = { attribution };
    expect(payload.attribution.utmSource).toBe("meta");
    expect(payload.attribution.fbclid).toBe("abc");
    expect(payload.attribution.metaCampaignId).toBe("c1");
    expect(payload.attribution.utmCampaign).toBe("ndis");
  });

  it("produces all eleven fields in the attribution type", () => {
    const full = parseFromSearch(
      "?utm_source=meta&utm_medium=cpc&utm_campaign=ndis&utm_content=ad1&utm_term=worker&fbclid=abc&campaign_id=c1&adset_id=a1&ad_id=d1&lead_id=l1",
      "/resume-builder"
    );
    expect(full.utmSource).toBeDefined();
    expect(full.utmMedium).toBeDefined();
    expect(full.utmCampaign).toBeDefined();
    expect(full.utmContent).toBeDefined();
    expect(full.utmTerm).toBeDefined();
    expect(full.fbclid).toBeDefined();
    expect(full.metaCampaignId).toBeDefined();
    expect(full.metaAdsetId).toBeDefined();
    expect(full.metaAdId).toBeDefined();
    expect(full.metaLeadId).toBeDefined();
    expect(full.landingPage).toBeDefined();
  });
});
