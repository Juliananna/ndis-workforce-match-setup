export interface AttributionParams {
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

const STORAGE_KEY = "kh_attribution";

export function captureAttribution(): AttributionParams {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  const fromUrl: AttributionParams = {
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
    landingPage: window.location.pathname + (hash || ""),
  };

  const hasIncoming = !!(
    fromUrl.utmSource || fromUrl.fbclid || fromUrl.metaCampaignId ||
    fromUrl.metaLeadId || fromUrl.utmMedium
  );

  const stored = loadAttribution();
  const alreadyHasAttribution = !!(
    stored?.utmSource || stored?.fbclid || stored?.metaCampaignId ||
    stored?.metaLeadId || stored?.utmMedium
  );

  if (hasIncoming && !alreadyHasAttribution) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
    } catch {
    }
    return fromUrl;
  }

  if (alreadyHasAttribution) {
    return stored!;
  }

  return {};
}

export function loadAttribution(): AttributionParams | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AttributionParams;
  } catch {
    return null;
  }
}

export function getEffectiveAttribution(): AttributionParams {
  return loadAttribution() ?? {};
}
