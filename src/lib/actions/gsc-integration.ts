"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { GoogleSearchConsoleClient, createGSCClient } from "@/lib/integrations/google-search-console";

export async function getGSCAuthUrl(storeId: string): Promise<{ data: string | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const client = createGSCClient();
    if (!client) return { data: null, error: "GSC not configured" };

    const authUrl = client.getAuthUrl(storeId);
    return { data: authUrl, error: null };
  } catch (error) {
    return { data: null, error: "Failed to generate auth URL" };
  }
}

export async function syncGSCData(
  storeId: string,
  days: number = 30
): Promise<{ data: { synced: number } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    // Get connection
    const { data: connection } = await supabase
      .from("gsc_connections")
      .select("*")
      .eq("store_id", storeId)
      .single();

    if (!connection) {
      return { data: null, error: "GSC not connected" };
    }

    const client = createGSCClient({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
    });

    if (!client) return { data: null, error: "Failed to create client" };

    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Get performance data
    const data = await client.getPerformanceData(connection.site_url, startDate, endDate, ["query", "page", "date"]);

    // Save to database
    const serviceClient = await createServiceClient();
    
    for (const row of data) {
      await serviceClient.from("gsc_performance_data").upsert({
        store_id: storeId,
        date: startDate,
        query: row.query,
        page: row.page,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }, {
        onConflict: "store_id,date,query,page",
      });
    }

    // Update last sync
    await serviceClient
      .from("gsc_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    revalidatePath(`/dashboard/stores/${storeId}/analytics`);

    return { data: { synced: data.length }, error: null };
  } catch (error) {
    console.error("GSC sync error:", error);
    return { data: null, error: "Failed to sync GSC data" };
  }
}

export async function getGSCPerformanceData(
  storeId: string,
  days: number = 30
): Promise<{
  data: {
    totalClicks: number;
    totalImpressions: number;
    avgCTR: number;
    avgPosition: number;
    topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: performanceData } = await supabase
      .from("gsc_performance_data")
      .select("*")
      .eq("store_id", storeId)
      .gte("date", startDate);

    if (!performanceData || performanceData.length === 0) {
      return { data: null, error: "No GSC data available" };
    }

    const totalClicks = performanceData.reduce((sum, row) => sum + (row.clicks || 0), 0);
    const totalImpressions = performanceData.reduce((sum, row) => sum + (row.impressions || 0), 0);
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    // Aggregate by query
    const queryMap = new Map<string, { clicks: number; impressions: number; positions: number[] }>();
    
    for (const row of performanceData) {
      if (!row.query) continue;
      
      const existing = queryMap.get(row.query) || { clicks: 0, impressions: 0, positions: [] };
      existing.clicks += row.clicks || 0;
      existing.impressions += row.impressions || 0;
      existing.positions.push(row.position);
      queryMap.set(row.query, existing);
    }

    const topQueries = Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query,
        clicks: data.clicks,
        impressions: data.impressions,
        ctr: data.impressions > 0 ? data.clicks / data.impressions : 0,
        position: data.positions.reduce((a, b) => a + b, 0) / data.positions.length,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);

    const allPositions = performanceData.map((r) => r.position).filter((p): p is number => p !== null);
    const avgPosition = allPositions.length > 0 
      ? allPositions.reduce((a, b) => a + b, 0) / allPositions.length 
      : 0;

    return {
      data: {
        totalClicks,
        totalImpressions,
        avgCTR: Math.round(avgCTR * 1000) / 10,
        avgPosition: Math.round(avgPosition * 10) / 10,
        topQueries,
      },
      error: null,
    };
  } catch (error) {
    console.error("Get GSC data error:", error);
    return { data: null, error: "Failed to get GSC data" };
  }
}
