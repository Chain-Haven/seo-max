import { google } from "googleapis";

export interface GSCCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface GSCPerformanceData {
  query: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  keys: string[]; // For backward compatibility
}

export interface GSCCoverageIssue {
  issueType: string;
  severity: "error" | "warning";
  affectedPages: string[];
  exampleUrl: string;
}

export interface GSCSiteData {
  totalClicks: number;
  totalImpressions: number;
  avgCTR: number;
  avgPosition: number;
  topQueries: GSCPerformanceData[];
  topPages: GSCPerformanceData[];
  coverageIssues: GSCCoverageIssue[];
  indexedPages: number;
  validPages: number;
}

export class GoogleSearchConsoleClient {
  private oauth2Client;
  private searchConsole;
  
  constructor(credentials: GSCCredentials) {
    this.oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/gsc/callback`
    );
    
    if (credentials.accessToken) {
      this.oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });
    }
    
    this.searchConsole = google.searchconsole({ version: "v1", auth: this.oauth2Client });
  }
  
  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/webmasters.readonly",
        "https://www.googleapis.com/auth/webmasters",
      ],
      state,
      prompt: "consent",
    });
  }
  
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
    };
  }

  // Alias for backward compatibility
  async exchangeCodeForTokens(code: string) {
    return this.getTokens(code);
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return {
      accessToken: credentials.access_token!,
      expiresAt: new Date(credentials.expiry_date || Date.now() + 3600000),
    };
  }
  
  async listSites() {
    const response = await this.searchConsole.sites.list();
    return response.data.siteEntry || [];
  }

  // Alias for backward compatibility
  async getSites(accessToken?: string) {
    const sites = await this.listSites();
    return sites.map((s) => s.siteUrl || "");
  }

  // Helper methods for backward compatibility with analytics.ts
  async getTopQueries(accessToken: string, siteUrl: string, days: number) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.getPerformanceData(siteUrl, startDate, endDate, ["query"]);
  }

  async getTopPages(accessToken: string, siteUrl: string, days: number) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.getPerformanceData(siteUrl, startDate, endDate, ["page"]);
  }

  async getPerformanceByDate(accessToken: string, siteUrl: string, days: number) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.getPerformanceData(siteUrl, startDate, endDate, ["date"]);
  }

  async getPerformanceByCountry(accessToken: string, siteUrl: string, days: number) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.getPerformanceData(siteUrl, startDate, endDate, ["country"]);
  }

  async getPerformanceByDevice(accessToken: string, siteUrl: string, days: number) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.getPerformanceData(siteUrl, startDate, endDate, ["device"]);
  }
  
  async getPerformanceData(
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = ["query"]
  ): Promise<GSCPerformanceData[]> {
    try {
      const response = await this.searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions,
          rowLimit: 1000,
        },
      });
      
      return (response.data.rows || []).map((row) => ({
        query: dimensions.includes("query") ? row.keys?.[dimensions.indexOf("query")] || "" : "",
        page: dimensions.includes("page") ? row.keys?.[dimensions.indexOf("page")] || undefined : undefined,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
        keys: row.keys || [], // Preserve for backward compatibility
      }));
    } catch (error) {
      console.error("GSC performance data error:", error);
      return [];
    }
  }
  
  async getCoverageStatus(siteUrl: string) {
    try {
      const response = await this.searchConsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: siteUrl,
          siteUrl,
        },
      });
      
      return response.data;
    } catch (error) {
      console.error("GSC coverage error:", error);
      return null;
    }
  }
  
  async getSitemaps(siteUrl: string) {
    try {
      const response = await this.searchConsole.sitemaps.list({ siteUrl });
      return response.data.sitemap || [];
    } catch (error) {
      console.error("GSC sitemaps error:", error);
      return [];
    }
  }
  
  async submitSitemap(siteUrl: string, sitemapUrl: string) {
    try {
      await this.searchConsole.sitemaps.submit({
        siteUrl,
        feedpath: sitemapUrl,
      });
      return true;
    } catch (error) {
      console.error("GSC sitemap submission error:", error);
      return false;
    }
  }
}

export function createGSCClient(credentials?: GSCCredentials): GoogleSearchConsoleClient | null {
  const clientId = credentials?.clientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = credentials?.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  return new GoogleSearchConsoleClient({
    clientId,
    clientSecret,
    accessToken: credentials?.accessToken,
    refreshToken: credentials?.refreshToken,
  });
}

// Alias for backward compatibility
export const getGSCClient = createGSCClient;

// Type alias for backward compatibility
export type GSCPerformanceRow = GSCPerformanceData;

// Get GSC client for a specific store
export async function getGSCClientForStore(storeId: string): Promise<GoogleSearchConsoleClient> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  
  const { data: connection } = await supabase
    .from("gsc_connections")
    .select("*")
    .eq("store_id", storeId)
    .single();

  if (!connection) {
    throw new Error("GSC not connected");
  }

  const client = createGSCClient({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    accessToken: connection.access_token,
    refreshToken: connection.refresh_token,
  });

  if (!client) {
    throw new Error("Failed to create GSC client");
  }

  return client;
}

// Generate simulated GSC data for testing
export function generateSimulatedGSCData(days: number = 30): { dates: GSCPerformanceData[]; queries: GSCPerformanceData[]; pages: GSCPerformanceData[]; countries: GSCPerformanceData[]; devices: GSCPerformanceData[] } {
  const dates: GSCPerformanceData[] = [];
  const queries: GSCPerformanceData[] = [];
  const pages: GSCPerformanceData[] = [];
  const countries: GSCPerformanceData[] = [];
  const devices: GSCPerformanceData[] = [];

  const keywords = ["seo tools", "wordpress seo", "woocommerce optimization", "keyword research"];

  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    dates.push({
      query: date,
      keys: [date],
      clicks: Math.floor(Math.random() * 500) + 100,
      impressions: Math.floor(Math.random() * 5000) + 1000,
      ctr: Math.random() * 0.1,
      position: Math.random() * 20 + 1,
    });
  }

  for (const keyword of keywords) {
    queries.push({
      query: keyword,
      keys: [keyword],
      clicks: Math.floor(Math.random() * 100),
      impressions: Math.floor(Math.random() * 1000) + 100,
      ctr: Math.random() * 0.1,
      position: Math.random() * 20 + 1,
    });
  }

  pages.push({
    page: "/",
    query: "/",
    keys: ["/"],
    clicks: Math.floor(Math.random() * 200),
    impressions: Math.floor(Math.random() * 2000),
    ctr: Math.random() * 0.1,
    position: 5,
  });

  countries.push({
    query: "US",
    keys: ["US"],
    clicks: Math.floor(Math.random() * 400),
    impressions: Math.floor(Math.random() * 4000),
    ctr: Math.random() * 0.1,
    position: 10,
  });

  devices.push(
    {
      query: "MOBILE",
      keys: ["MOBILE"],
      clicks: Math.floor(Math.random() * 300),
      impressions: Math.floor(Math.random() * 3000),
      ctr: Math.random() * 0.1,
      position: 8,
    },
    {
      query: "DESKTOP",
      keys: ["DESKTOP"],
      clicks: Math.floor(Math.random() * 200),
      impressions: Math.floor(Math.random() * 2000),
      ctr: Math.random() * 0.1,
      position: 12,
    }
  );

  return { dates, queries, pages, countries, devices };
}
