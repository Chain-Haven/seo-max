"use server";

/**
 * Daily SEO Audit System
 * Automatically audits all stores and generates alerts
 */

import { createServiceClient } from "@/lib/supabase/server";
import { crawlSite } from "@/lib/seo/site-crawler";
import { calculateSEOHealthScore } from "./seo-apis";

export interface SEOAlert {
  id: string;
  storeId: string;
  type: "critical" | "warning" | "info";
  category: "technical" | "content" | "rankings" | "backlinks" | "speed";
  title: string;
  description: string;
  metric?: {
    previous: number;
    current: number;
    change: number;
  };
  createdAt: string;
  acknowledged: boolean;
}

export interface DailyAuditResult {
  storeId: string;
  storeName: string;
  healthScore: number;
  previousScore: number | null;
  scoreChange: number;
  alerts: SEOAlert[];
  issuesFound: number;
  issuesFixed: number;
  timestamp: string;
}

/**
 * Run daily SEO audit for all active stores
 */
export async function runDailySEOAudit(): Promise<{
  success: boolean;
  results: DailyAuditResult[];
  error?: string;
}> {
  const serviceClient = await createServiceClient();
  const results: DailyAuditResult[] = [];

  try {
    // Get all connected stores
    const { data: stores, error: storesError } = await serviceClient
      .from("stores")
      .select("id, name, url, organization_id")
      .eq("status", "connected");

    if (storesError || !stores) {
      return { success: false, results: [], error: "Failed to fetch stores" };
    }

    console.log(`[DailyAudit] Starting audit for ${stores.length} stores`);

    for (const store of stores) {
      try {
        console.log(`[DailyAudit] Auditing ${store.name}...`);

        // Get previous audit score
        const { data: previousAudit } = await serviceClient
          .from("seo_audits")
          .select("health_score")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const previousScore = previousAudit?.health_score || null;

        // Calculate current health score
        const { data: healthData } = await calculateSEOHealthScore(store.id);
        const currentScore = healthData?.overall || 0;
        const scoreChange = previousScore ? currentScore - previousScore : 0;

        // Generate alerts based on analysis
        const alerts = await generateAlerts(
          store.id,
          store.name,
          healthData,
          previousScore,
          serviceClient
        );

        // Save audit result
        await serviceClient.from("seo_audits").insert({
          store_id: store.id,
          health_score: currentScore,
          previous_score: previousScore,
          score_change: scoreChange,
          alerts_count: alerts.length,
          categories: healthData?.categories || {},
          recommendations: healthData?.recommendations || [],
        });

        // Save alerts
        if (alerts.length > 0) {
          await serviceClient.from("seo_alerts").insert(
            alerts.map((alert) => ({
              store_id: store.id,
              type: alert.type,
              category: alert.category,
              title: alert.title,
              description: alert.description,
              metric_previous: alert.metric?.previous,
              metric_current: alert.metric?.current,
              metric_change: alert.metric?.change,
            }))
          );
        }

        results.push({
          storeId: store.id,
          storeName: store.name,
          healthScore: currentScore,
          previousScore,
          scoreChange,
          alerts,
          issuesFound: healthData?.recommendations.length || 0,
          issuesFixed: 0,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `[DailyAudit] ${store.name}: Score ${currentScore} (${
            scoreChange >= 0 ? "+" : ""
          }${scoreChange}), ${alerts.length} alerts`
        );
      } catch (storeError) {
        console.error(`[DailyAudit] Error auditing ${store.name}:`, storeError);
      }
    }

    console.log(`[DailyAudit] Completed. ${results.length} stores audited.`);
    return { success: true, results };
  } catch (error) {
    console.error("[DailyAudit] Error:", error);
    return {
      success: false,
      results,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate alerts based on audit findings
 */
async function generateAlerts(
  storeId: string,
  storeName: string,
  healthData: Awaited<ReturnType<typeof calculateSEOHealthScore>>["data"],
  previousScore: number | null,
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>
): Promise<SEOAlert[]> {
  const alerts: SEOAlert[] = [];

  if (!healthData) return alerts;

  // Score drop alert
  if (previousScore && healthData.overall < previousScore - 10) {
    alerts.push({
      id: crypto.randomUUID(),
      storeId,
      type: "critical",
      category: "technical",
      title: "Significant SEO Score Drop",
      description: `${storeName}'s SEO score dropped from ${previousScore} to ${healthData.overall}`,
      metric: {
        previous: previousScore,
        current: healthData.overall,
        change: healthData.overall - previousScore,
      },
      createdAt: new Date().toISOString(),
      acknowledged: false,
    });
  }

  // Technical issues
  if (healthData.categories.technical.score < 60) {
    alerts.push({
      id: crypto.randomUUID(),
      storeId,
      type: "critical",
      category: "technical",
      title: "Technical SEO Issues Detected",
      description: healthData.categories.technical.issues.join("; ") || "Multiple technical issues found",
      createdAt: new Date().toISOString(),
      acknowledged: false,
    });
  }

  // Content issues
  if (healthData.categories.content.score < 60) {
    alerts.push({
      id: crypto.randomUUID(),
      storeId,
      type: "warning",
      category: "content",
      title: "Content Optimization Needed",
      description: healthData.categories.content.issues.join("; ") || "Content improvements recommended",
      createdAt: new Date().toISOString(),
      acknowledged: false,
    });
  }

  // Backlink issues
  if (healthData.categories.backlinks.score < 50) {
    alerts.push({
      id: crypto.randomUUID(),
      storeId,
      type: "warning",
      category: "backlinks",
      title: "Backlink Profile Needs Attention",
      description: healthData.categories.backlinks.issues.join("; ") || "Backlink improvements needed",
      createdAt: new Date().toISOString(),
      acknowledged: false,
    });
  }

  // Ranking alerts - check for drops
  const { data: recentRankings } = await serviceClient
    .from("keyword_rankings")
    .select("keyword, position")
    .eq("store_id", storeId)
    .order("checked_at", { ascending: false })
    .limit(20);

  const droppedKeywords = recentRankings?.filter(
    (r) => r.position && r.position > 20
  );
  if (droppedKeywords && droppedKeywords.length > 5) {
    alerts.push({
      id: crypto.randomUUID(),
      storeId,
      type: "warning",
      category: "rankings",
      title: "Multiple Keywords Ranking Poorly",
      description: `${droppedKeywords.length} keywords ranking below position 20`,
      createdAt: new Date().toISOString(),
      acknowledged: false,
    });
  }

  return alerts;
}

/**
 * Get recent alerts for a store
 */
export async function getStoreAlerts(
  storeId: string,
  options: { limit?: number; unacknowledgedOnly?: boolean } = {}
): Promise<{ data: SEOAlert[] | null; error: string | null }> {
  const serviceClient = await createServiceClient();

  let query = serviceClient
    .from("seo_alerts")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(options.limit || 50);

  if (options.unacknowledgedOnly) {
    query = query.eq("acknowledged", false);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  const alerts: SEOAlert[] = (data || []).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    type: row.type,
    category: row.category,
    title: row.title,
    description: row.description,
    metric: row.metric_current
      ? {
          previous: row.metric_previous,
          current: row.metric_current,
          change: row.metric_change,
        }
      : undefined,
    createdAt: row.created_at,
    acknowledged: row.acknowledged,
  }));

  return { data: alerts, error: null };
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: string
): Promise<{ success: boolean; error?: string }> {
  const serviceClient = await createServiceClient();

  const { error } = await serviceClient
    .from("seo_alerts")
    .update({ acknowledged: true })
    .eq("id", alertId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get audit history for a store
 */
export async function getAuditHistory(
  storeId: string,
  limit: number = 30
): Promise<{
  data: Array<{
    date: string;
    score: number;
    change: number;
    alertsCount: number;
  }> | null;
  error: string | null;
}> {
  const serviceClient = await createServiceClient();

  const { data, error } = await serviceClient
    .from("seo_audits")
    .select("created_at, health_score, score_change, alerts_count")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((row) => ({
      date: row.created_at,
      score: row.health_score,
      change: row.score_change || 0,
      alertsCount: row.alerts_count || 0,
    })),
    error: null,
  };
}
