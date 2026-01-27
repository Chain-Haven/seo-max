import { google } from "googleapis";

export interface GACredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface GAProperty {
  propertyId: string;
  displayName: string;
  websiteUrl?: string;
}

export interface GAPageData {
  pagePath: string;
  pageTitle?: string;
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions?: number;
  revenue?: number;
}

export interface GATrafficData {
  startDate: string;
  endDate: string;
  totalSessions: number;
  totalUsers: number;
  totalPageviews: number;
  avgBounceRate: number;
  avgSessionDuration: number;
  organicSessions: number;
  organicPercentage: number;
  topPages: GAPageData[];
  trafficBySource: Array<{
    source: string;
    medium: string;
    sessions: number;
    users: number;
  }>;
  dailyTrend: Array<{
    date: string;
    sessions: number;
    users: number;
    pageviews: number;
  }>;
}

export class GoogleAnalyticsClient {
  private oauth2Client;
  private analytics;
  private analyticsData;
  
  constructor(credentials: GACredentials) {
    this.oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/ga/callback`
    );
    
    if (credentials.accessToken) {
      this.oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });
    }
    
    this.analytics = google.analytics({ version: "v3", auth: this.oauth2Client });
    this.analyticsData = google.analyticsdata({ version: "v1beta", auth: this.oauth2Client });
  }
  
  // Get OAuth URL for user authorization
  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/analytics.readonly",
        "https://www.googleapis.com/auth/analytics",
      ],
      state,
      prompt: "consent",
    });
  }
  
  // Exchange authorization code for tokens
  async getTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    this.oauth2Client.setCredentials(tokens);
    
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
    };
  }
  
  // Refresh access token
  async refreshAccessToken(): Promise<string> {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials.access_token!;
  }
  
  // List available GA4 properties
  async listProperties(): Promise<GAProperty[]> {
    try {
      const admin = google.analyticsadmin({ version: "v1beta", auth: this.oauth2Client });
      
      const response = await admin.accountSummaries.list();
      const properties: GAProperty[] = [];
      
      for (const account of response.data.accountSummaries || []) {
        for (const property of account.propertySummaries || []) {
          if (property.property && property.displayName) {
            properties.push({
              propertyId: property.property.replace("properties/", ""),
              displayName: property.displayName,
            });
          }
        }
      }
      
      return properties;
    } catch (error) {
      console.error("Error listing GA properties:", error);
      return [];
    }
  }
  
  // Get traffic data for a GA4 property
  async getTrafficData(
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GATrafficData> {
    try {
      // Main metrics report
      const metricsResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
        },
      });
      
      const mainRow = metricsResponse.data.rows?.[0]?.metricValues || [];
      const totalSessions = parseInt(mainRow[0]?.value || "0");
      const totalUsers = parseInt(mainRow[1]?.value || "0");
      const totalPageviews = parseInt(mainRow[2]?.value || "0");
      const avgBounceRate = parseFloat(mainRow[3]?.value || "0") * 100;
      const avgSessionDuration = parseFloat(mainRow[4]?.value || "0");
      
      // Organic traffic
      const organicResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }],
          dimensionFilter: {
            filter: {
              fieldName: "sessionDefaultChannelGroup",
              stringFilter: {
                matchType: "EXACT",
                value: "Organic Search",
              },
            },
          },
        },
      });
      
      const organicSessions = parseInt(
        organicResponse.data.rows?.[0]?.metricValues?.[0]?.value || "0"
      );
      
      // Top pages
      const pagesResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "20",
        },
      });
      
      const topPages: GAPageData[] = (pagesResponse.data.rows || []).map((row) => ({
        pagePath: row.dimensionValues?.[0]?.value || "",
        pageTitle: row.dimensionValues?.[1]?.value || "",
        sessions: parseInt(row.metricValues?.[0]?.value || "0"),
        users: parseInt(row.metricValues?.[1]?.value || "0"),
        pageviews: parseInt(row.metricValues?.[2]?.value || "0"),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || "0") * 100,
        avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || "0"),
      }));
      
      // Traffic by source
      const sourceResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "10",
        },
      });
      
      const trafficBySource = (sourceResponse.data.rows || []).map((row) => ({
        source: row.dimensionValues?.[0]?.value || "",
        medium: row.dimensionValues?.[1]?.value || "",
        sessions: parseInt(row.metricValues?.[0]?.value || "0"),
        users: parseInt(row.metricValues?.[1]?.value || "0"),
      }));
      
      // Daily trend
      const trendResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        },
      });
      
      const dailyTrend = (trendResponse.data.rows || []).map((row) => {
        const dateStr = row.dimensionValues?.[0]?.value || "";
        return {
          date: `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`,
          sessions: parseInt(row.metricValues?.[0]?.value || "0"),
          users: parseInt(row.metricValues?.[1]?.value || "0"),
          pageviews: parseInt(row.metricValues?.[2]?.value || "0"),
        };
      });
      
      return {
        startDate,
        endDate,
        totalSessions,
        totalUsers,
        totalPageviews,
        avgBounceRate: Math.round(avgBounceRate * 10) / 10,
        avgSessionDuration: Math.round(avgSessionDuration),
        organicSessions,
        organicPercentage: totalSessions > 0 ? Math.round((organicSessions / totalSessions) * 100) : 0,
        topPages,
        trafficBySource,
        dailyTrend,
      };
    } catch (error) {
      console.error("Error fetching GA traffic data:", error);
      throw error;
    }
  }
  
  // Get page-level data with SEO metrics
  async getPageSEOData(
    propertyId: string,
    pagePath: string,
    startDate: string,
    endDate: string
  ): Promise<GAPageData & { organicSessions: number; organicBounceRate: number }> {
    try {
      // All traffic
      const allResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
          dimensionFilter: {
            filter: {
              fieldName: "pagePath",
              stringFilter: {
                matchType: "EXACT",
                value: pagePath,
              },
            },
          },
        },
      });
      
      // Organic traffic for this page
      const organicResponse = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "sessions" }, { name: "bounceRate" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                {
                  filter: {
                    fieldName: "pagePath",
                    stringFilter: { matchType: "EXACT", value: pagePath },
                  },
                },
                {
                  filter: {
                    fieldName: "sessionDefaultChannelGroup",
                    stringFilter: { matchType: "EXACT", value: "Organic Search" },
                  },
                },
              ],
            },
          },
        },
      });
      
      const allRow = allResponse.data.rows?.[0]?.metricValues || [];
      const organicRow = organicResponse.data.rows?.[0]?.metricValues || [];
      
      return {
        pagePath,
        sessions: parseInt(allRow[0]?.value || "0"),
        users: parseInt(allRow[1]?.value || "0"),
        pageviews: parseInt(allRow[2]?.value || "0"),
        bounceRate: parseFloat(allRow[3]?.value || "0") * 100,
        avgSessionDuration: parseFloat(allRow[4]?.value || "0"),
        organicSessions: parseInt(organicRow[0]?.value || "0"),
        organicBounceRate: parseFloat(organicRow[1]?.value || "0") * 100,
      };
    } catch (error) {
      console.error("Error fetching page SEO data:", error);
      throw error;
    }
  }
}

// Create client from environment or store credentials
export function createGAClient(credentials?: GACredentials): GoogleAnalyticsClient | null {
  const clientId = credentials?.clientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = credentials?.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  return new GoogleAnalyticsClient({
    clientId,
    clientSecret,
    accessToken: credentials?.accessToken,
    refreshToken: credentials?.refreshToken,
  });
}

// Get date range strings
export function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}
