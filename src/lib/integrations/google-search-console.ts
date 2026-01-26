/**
 * Google Search Console Integration
 * Handles OAuth and data fetching from GSC API
 */

export interface GSCCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface GSCPerformanceRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCPerformanceData {
  rows: GSCPerformanceRow[];
  responseAggregationType: string;
}

export interface GSCQueryParams {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  startRow?: number;
}

const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleSearchConsoleClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(config?: { clientId?: string; clientSecret?: string }) {
    this.clientId = config?.clientId || process.env.GOOGLE_CLIENT_ID || "";
    this.clientSecret = config?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || "";
    this.redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`;
  }

  // Check if credentials are configured
  hasCredentials(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  // Generate OAuth URL for user authorization
  getAuthUrl(storeId: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      access_type: "offline",
      prompt: "consent",
      state: storeId,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<GSCCredentials> {
    const response = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<GSCCredentials> {
    const response = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  // Get list of sites in GSC
  async getSites(accessToken: string): Promise<string[]> {
    const response = await fetch(`${GSC_API_BASE}/sites`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to get sites: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.siteEntry || []).map((site: { siteUrl: string }) => site.siteUrl);
  }

  // Fetch search analytics data
  async getSearchAnalytics(
    accessToken: string,
    params: GSCQueryParams
  ): Promise<GSCPerformanceData> {
    const encodedSiteUrl = encodeURIComponent(params.siteUrl);
    const url = `${GSC_API_BASE}/sites/${encodedSiteUrl}/searchAnalytics/query`;

    const body = {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions || ["query", "page"],
      rowLimit: params.rowLimit || 1000,
      startRow: params.startRow || 0,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to get search analytics: ${response.statusText}`);
    }

    return response.json();
  }

  // Get top queries
  async getTopQueries(
    accessToken: string,
    siteUrl: string,
    days: number = 28
  ): Promise<GSCPerformanceRow[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await this.getSearchAnalytics(accessToken, {
      siteUrl,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      dimensions: ["query"],
      rowLimit: 100,
    });

    return data.rows || [];
  }

  // Get top pages
  async getTopPages(
    accessToken: string,
    siteUrl: string,
    days: number = 28
  ): Promise<GSCPerformanceRow[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await this.getSearchAnalytics(accessToken, {
      siteUrl,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      dimensions: ["page"],
      rowLimit: 100,
    });

    return data.rows || [];
  }

  // Get performance by date
  async getPerformanceByDate(
    accessToken: string,
    siteUrl: string,
    days: number = 28
  ): Promise<GSCPerformanceRow[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await this.getSearchAnalytics(accessToken, {
      siteUrl,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      dimensions: ["date"],
      rowLimit: days,
    });

    return data.rows || [];
  }

  // Get performance by country
  async getPerformanceByCountry(
    accessToken: string,
    siteUrl: string,
    days: number = 28
  ): Promise<GSCPerformanceRow[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await this.getSearchAnalytics(accessToken, {
      siteUrl,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      dimensions: ["country"],
      rowLimit: 50,
    });

    return data.rows || [];
  }

  // Get performance by device
  async getPerformanceByDevice(
    accessToken: string,
    siteUrl: string,
    days: number = 28
  ): Promise<GSCPerformanceRow[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await this.getSearchAnalytics(accessToken, {
      siteUrl,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      dimensions: ["device"],
      rowLimit: 10,
    });

    return data.rows || [];
  }
}

// Simulated GSC data for demo/development
export function generateSimulatedGSCData(days: number = 28): {
  queries: GSCPerformanceRow[];
  pages: GSCPerformanceRow[];
  dates: GSCPerformanceRow[];
  countries: GSCPerformanceRow[];
  devices: GSCPerformanceRow[];
} {
  const sampleQueries = [
    "buy leather boots online",
    "best winter jacket",
    "running shoes sale",
    "outdoor hiking gear",
    "waterproof backpack",
    "camping equipment",
    "fitness tracker watch",
    "wireless headphones",
    "yoga mat reviews",
    "protein powder organic",
  ];

  const samplePages = [
    "/products/leather-boots",
    "/products/winter-jacket",
    "/collections/running-shoes",
    "/blog/hiking-guide",
    "/products/backpack-waterproof",
    "/collections/camping",
    "/products/fitness-tracker",
    "/products/headphones",
    "/blog/yoga-beginners",
    "/products/protein-powder",
  ];

  const queries: GSCPerformanceRow[] = sampleQueries.map((query, i) => ({
    keys: [query],
    clicks: Math.floor(Math.random() * 500) + 50,
    impressions: Math.floor(Math.random() * 5000) + 500,
    ctr: Math.random() * 0.15 + 0.02,
    position: Math.random() * 30 + 1,
  }));

  const pages: GSCPerformanceRow[] = samplePages.map((page, i) => ({
    keys: [page],
    clicks: Math.floor(Math.random() * 300) + 30,
    impressions: Math.floor(Math.random() * 3000) + 300,
    ctr: Math.random() * 0.12 + 0.01,
    position: Math.random() * 25 + 1,
  }));

  const dates: GSCPerformanceRow[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push({
      keys: [date.toISOString().split("T")[0]],
      clicks: Math.floor(Math.random() * 200) + 50 + Math.sin(i / 7) * 30,
      impressions: Math.floor(Math.random() * 2000) + 500,
      ctr: Math.random() * 0.1 + 0.03,
      position: Math.random() * 5 + 12,
    });
  }

  const countries: GSCPerformanceRow[] = [
    { keys: ["usa"], clicks: 850, impressions: 12000, ctr: 0.071, position: 14.2 },
    { keys: ["gbr"], clicks: 320, impressions: 4500, ctr: 0.071, position: 15.8 },
    { keys: ["can"], clicks: 180, impressions: 2800, ctr: 0.064, position: 16.3 },
    { keys: ["aus"], clicks: 145, impressions: 2100, ctr: 0.069, position: 17.1 },
    { keys: ["deu"], clicks: 95, impressions: 1400, ctr: 0.068, position: 18.5 },
  ];

  const devices: GSCPerformanceRow[] = [
    { keys: ["MOBILE"], clicks: 980, impressions: 15000, ctr: 0.065, position: 15.2 },
    { keys: ["DESKTOP"], clicks: 520, impressions: 6500, ctr: 0.08, position: 13.8 },
    { keys: ["TABLET"], clicks: 90, impressions: 1200, ctr: 0.075, position: 16.1 },
  ];

  return { queries, pages, dates, countries, devices };
}

// Factory function - creates client with optional per-store credentials
export function getGSCClient(config?: { clientId?: string; clientSecret?: string }): GoogleSearchConsoleClient {
  return new GoogleSearchConsoleClient(config);
}

// Create client with credentials from store
export async function getGSCClientForStore(storeId: string): Promise<GoogleSearchConsoleClient> {
  // Import dynamically to avoid circular deps
  const { getEffectiveCredentials } = await import("@/lib/actions/api-credentials");
  const creds = await getEffectiveCredentials(storeId);
  
  return new GoogleSearchConsoleClient({
    clientId: creds.googleClientId || undefined,
    clientSecret: creds.googleClientSecret || undefined,
  });
}
