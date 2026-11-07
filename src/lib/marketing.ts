import "server-only";

/**
 * Ad performance for the marketing dashboard, normalised across platforms so the
 * page never has to know which API a row came from. A provider either returns the
 * shared shape or says why it has nothing: missing credentials are an ordinary
 * state here, not a failure, because the tokens arrive after this ships.
 */

// Meta keeps each version ~2 years; v26.0 is current (introduced July 2026).
const META_API = "https://graph.facebook.com/v26.0";
// Google retires versions about every 4 months, far faster than Meta. Check this
// against the Google Ads release notes when the developer token is approved.
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v21";

export type Platform = "meta" | "google";

export type Metrics = {
  spend: number;
  impressions: number;
  clicks: number;
  viewContent: number;
  addToCart: number;
  checkout: number;
  purchases: number;
  revenue: number;
};

export type Campaign = Metrics & { id: string; name: string };

export type Report =
  | { platform: Platform; status: "ok"; campaigns: Campaign[]; totals: Metrics; funnel: boolean }
  // "off" is missing credentials and "error" is a call that failed; the dashboard
  // shows them differently because only one of the two is anyone's fault.
  | { platform: Platform; status: "off" | "error"; reason: string };

export const PLATFORM_LABEL: Record<Platform, string> = { meta: "Meta", google: "Google" };

// Validated with the dataviz palette checker against the #fbfcf8 surface:
// protan ΔE 32.3, tritan 29.3, both >= 3:1 contrast. Blue/amber is the
// colourblind-safe axis; the brand lime fails the lightness band as a data mark.
export const PLATFORM_COLOR: Record<Platform, string> = { meta: "#2563eb", google: "#d97706" };

const ZERO: Metrics = {
  spend: 0, impressions: 0, clicks: 0,
  viewContent: 0, addToCart: 0, checkout: 0, purchases: 0, revenue: 0,
};

const METRIC_KEYS = Object.keys(ZERO) as (keyof Metrics)[];

export function sumMetrics(rows: Metrics[]): Metrics {
  return rows.reduce<Metrics>((acc, row) => {
    for (const k of METRIC_KEYS) acc[k] += row[k] || 0;
    return acc;
  }, { ...ZERO });
}

/** Return on ad spend, or null when nothing was spent (so the page shows "-" not Infinity). */
export function roas(m: Metrics): number | null {
  return m.spend > 0 ? m.revenue / m.spend : null;
}

/**
 * `days` back from today, inclusive, as the YYYY-MM-DD string both APIs take.
 * Each platform reports in its own ad-account timezone, so the edges of the
 * range are theirs to decide; we only ask for the same calendar days.
 */
export function dateRange(days: number): { since: string; until: string } {
  const until = new Date();
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { since: iso(since), until: iso(until) };
}

const num = (v: unknown) => Number(v ?? 0) || 0;

// --- Meta (Marketing API insights) ---

type MetaAction = { action_type?: string; value?: string };
type MetaRow = {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
};

/**
 * Meta reports the same conversion under several action types - `purchase`,
 * `omni_purchase` and `offsite_conversion.fb_pixel_purchase` all describe one
 * sale - so summing every match would multiply the count. Take the website
 * pixel's figure, and only fall back to the generic one when it is absent.
 */
function pickAction(actions: MetaAction[], event: string): number {
  const pixel = actions.find((a) => a.action_type === `offsite_conversion.fb_pixel_${event}`);
  return num((pixel ?? actions.find((a) => a.action_type === event))?.value);
}

function toMetaCampaign(row: MetaRow): Campaign {
  const actions = row.actions ?? [];
  return {
    id: row.campaign_id ?? "",
    name: row.campaign_name ?? "Unnamed campaign",
    spend: num(row.spend),
    impressions: num(row.impressions),
    clicks: num(row.clicks),
    viewContent: pickAction(actions, "view_content"),
    addToCart: pickAction(actions, "add_to_cart"),
    checkout: pickAction(actions, "initiate_checkout"),
    purchases: pickAction(actions, "purchase"),
    revenue: pickAction(row.action_values ?? [], "purchase"),
  };
}

async function fetchMeta(since: string, until: string): Promise<Report> {
  const token = process.env.META_ADS_TOKEN;
  const account = process.env.META_AD_ACCOUNT_ID;
  if (!token || !account) {
    return { platform: "meta", status: "off", reason: "Add META_ADS_TOKEN and META_AD_ACCOUNT_ID." };
  }

  const act = account.startsWith("act_") ? account : `act_${account}`;
  const query = new URLSearchParams({
    level: "campaign",
    fields: "campaign_id,campaign_name,spend,impressions,clicks,actions,action_values",
    time_range: JSON.stringify({ since, until }),
    limit: "500",
  });

  try {
    // The token goes in the header, never the query string, so it cannot be
    // captured by anything that logs request URLs.
    const res = await fetch(`${META_API}/${act}/insights?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = await res.json();
    if (!res.ok) return { platform: "meta", status: "error", reason: body?.error?.message ?? `Meta API returned ${res.status}.` };
    const campaigns: Campaign[] = (body?.data ?? []).map(toMetaCampaign);
    return { platform: "meta", status: "ok", campaigns, totals: sumMetrics(campaigns), funnel: true };
  } catch {
    return { platform: "meta", status: "error", reason: "Couldn't reach the Meta API." };
  }
}

// --- Google (Ads API, GAQL) ---

type GoogleRow = {
  campaign?: { id?: string; name?: string };
  metrics?: { costMicros?: string; impressions?: string; clicks?: string; conversions?: number; conversionsValue?: number };
};

async function googleAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json())?.access_token ?? null;
}

async function fetchGoogle(since: string, until: string): Promise<Report> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, "");
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  if (!developerToken || !customerId || !clientId || !clientSecret || !refreshToken) {
    return { platform: "google", status: "off", reason: "Add GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID and the OAuth client id, secret and refresh token." };
  }

  // ponytail: campaign-level totals only. Splitting conversions into the funnel
  // steps needs segments.conversion_action, which repeats each campaign's cost on
  // every segment row and would inflate spend. Add it as a second query if the
  // per-step breakdown is ever wanted here.
  const gaql = `SELECT campaign.id, campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}'`;

  try {
    const accessToken = await googleAccessToken(clientId, clientSecret, refreshToken);
    if (!accessToken) return { platform: "google", status: "error", reason: "Google refused the refresh token." };

    const managerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, "");
    const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
        ...(managerId ? { "login-customer-id": managerId } : {}),
      },
      body: JSON.stringify({ query: gaql }),
      cache: "no-store",
    });
    const body = await res.json();
    if (!res.ok) return { platform: "google", status: "error", reason: body?.error?.message ?? `Google Ads API returned ${res.status}.` };

    const campaigns: Campaign[] = (body?.results ?? []).map((row: GoogleRow) => ({
      id: row.campaign?.id ?? "",
      name: row.campaign?.name ?? "Unnamed campaign",
      // Google quotes cost in micros (millionths of the account currency).
      spend: num(row.metrics?.costMicros) / 1e6,
      impressions: num(row.metrics?.impressions),
      clicks: num(row.metrics?.clicks),
      viewContent: 0,
      addToCart: 0,
      checkout: 0,
      purchases: num(row.metrics?.conversions),
      revenue: num(row.metrics?.conversionsValue),
    }));
    return { platform: "google", status: "ok", campaigns, totals: sumMetrics(campaigns), funnel: false };
  } catch {
    return { platform: "google", status: "error", reason: "Couldn't reach the Google Ads API." };
  }
}

/** Both platforms for the last `days` days. One slow API never blocks the other. */
export function getReports(days: number): Promise<Report[]> {
  const { since, until } = dateRange(days);
  return Promise.all([fetchMeta(since, until), fetchGoogle(since, until)]);
}
