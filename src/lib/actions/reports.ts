"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getGSCPerformanceData } from "./analytics";
import { getRankingSummary, getTrackedKeywords } from "./rank-tracking";
import { getBacklinkStats } from "./backlinks";

export interface SEOReport {
  id: string;
  storeId: string;
  reportType: "weekly" | "monthly" | "custom";
  periodStart: string;
  periodEnd: string;
  reportData: ReportData;
  pdfUrl: string | null;
  sentTo: string[];
  sentAt: string | null;
  createdAt: string;
}

export interface ReportData {
  storeName: string;
  storeUrl: string;
  period: string;
  summary: {
    overallScore: number;
    trafficChange: number;
    rankingsChange: number;
    contentPublished: number;
  };
  traffic: {
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
    topQueries: Array<{ query: string; clicks: number; impressions: number }>;
    topPages: Array<{ page: string; clicks: number; impressions: number }>;
  };
  rankings: {
    totalKeywords: number;
    avgPosition: number;
    top10: number;
    improved: number;
    declined: number;
    topKeywords: Array<{ keyword: string; position: number; change: number }>;
  };
  backlinks: {
    total: number;
    gained: number;
    lost: number;
    avgDa: number;
  };
  content: {
    productsOptimized: number;
    pagesOptimized: number;
    blogPostsPublished: number;
  };
  recommendations: string[];
}

// Generate SEO Report
export async function generateSEOReport(
  storeId: string,
  options: {
    type?: "weekly" | "monthly" | "custom";
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<{ data: SEOReport | null; error: string | null }> {
  const supabase = await createClient();

  // Get store info
  const { data: store } = await supabase
    .from("stores")
    .select("name, url")
    .eq("id", storeId)
    .single();

  if (!store) {
    return { data: null, error: "Store not found" };
  }

  // Calculate date range
  const endDate = options.endDate ? new Date(options.endDate) : new Date();
  const startDate = options.startDate
    ? new Date(options.startDate)
    : new Date(endDate.getTime() - (options.type === "weekly" ? 7 : 30) * 24 * 60 * 60 * 1000);

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

  // Gather all data
  const [gscData, rankingsSummary, keywordsResult, backlinkStats] = await Promise.all([
    getGSCPerformanceData(storeId, days),
    getRankingSummary(storeId),
    getTrackedKeywords(storeId),
    getBacklinkStats(storeId),
  ]);

  // Get content stats
  const [productStats, pageStats, blogStats] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId)
      .not("seo_meta_title", "is", null),
    supabase
      .from("pages")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId)
      .not("seo_meta_title", "is", null),
    supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("created_at", startDate.toISOString()),
  ]);

  // Build report data
  const reportData: ReportData = {
    storeName: store.name,
    storeUrl: store.url || "",
    period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    summary: {
      overallScore: calculateOverallScore(gscData.data, rankingsSummary.data, backlinkStats.data),
      trafficChange: calculateTrafficChange(gscData.data?.dates || []),
      rankingsChange: rankingsSummary.data?.improved
        ? rankingsSummary.data.improved - rankingsSummary.data.declined
        : 0,
      contentPublished: blogStats.count || 0,
    },
    traffic: {
      totalClicks: gscData.data?.totals.clicks || 0,
      totalImpressions: gscData.data?.totals.impressions || 0,
      avgCtr: Math.round((gscData.data?.totals.ctr || 0) * 10000) / 100,
      avgPosition: Math.round((gscData.data?.totals.position || 0) * 10) / 10,
      topQueries: (gscData.data?.queries || []).slice(0, 10).map((q) => ({
        query: q.keys[0],
        clicks: q.clicks,
        impressions: q.impressions,
      })),
      topPages: (gscData.data?.pages || []).slice(0, 10).map((p) => ({
        page: p.keys[0],
        clicks: p.clicks,
        impressions: p.impressions,
      })),
    },
    rankings: {
      totalKeywords: rankingsSummary.data?.totalKeywords || 0,
      avgPosition: rankingsSummary.data?.avgPosition || 0,
      top10: rankingsSummary.data?.top10 || 0,
      improved: rankingsSummary.data?.improved || 0,
      declined: rankingsSummary.data?.declined || 0,
      topKeywords: (keywordsResult.data || [])
        .filter((k) => k.currentPosition)
        .sort((a, b) => (a.currentPosition || 100) - (b.currentPosition || 100))
        .slice(0, 10)
        .map((k) => ({
          keyword: k.keyword,
          position: k.currentPosition || 0,
          change: k.change || 0,
        })),
    },
    backlinks: {
      total: backlinkStats.data?.totalBacklinks || 0,
      gained: backlinkStats.data?.gainedThisMonth || 0,
      lost: backlinkStats.data?.lostThisMonth || 0,
      avgDa: backlinkStats.data?.avgDomainAuthority || 0,
    },
    content: {
      productsOptimized: productStats.count || 0,
      pagesOptimized: pageStats.count || 0,
      blogPostsPublished: blogStats.count || 0,
    },
    recommendations: generateRecommendations(gscData.data, rankingsSummary.data, backlinkStats.data),
  };

  // Save report to database
  const { data: report, error } = await supabase
    .from("seo_reports")
    .insert({
      store_id: storeId,
      report_type: options.type || "monthly",
      period_start: startDate.toISOString().split("T")[0],
      period_end: endDate.toISOString().split("T")[0],
      report_data: reportData,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}/reports`);
  return {
    data: {
      id: report.id,
      storeId: report.store_id,
      reportType: report.report_type,
      periodStart: report.period_start,
      periodEnd: report.period_end,
      reportData: report.report_data,
      pdfUrl: report.pdf_url,
      sentTo: report.sent_to || [],
      sentAt: report.sent_at,
      createdAt: report.created_at,
    },
    error: null,
  };
}

// Get reports list
export async function getReports(
  storeId: string,
  limit: number = 20
): Promise<{ data: SEOReport[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("seo_reports")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((r) => ({
      id: r.id,
      storeId: r.store_id,
      reportType: r.report_type,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      reportData: r.report_data,
      pdfUrl: r.pdf_url,
      sentTo: r.sent_to || [],
      sentAt: r.sent_at,
      createdAt: r.created_at,
    })),
    error: null,
  };
}

// Get single report
export async function getReport(
  reportId: string
): Promise<{ data: SEOReport | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("seo_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      id: data.id,
      storeId: data.store_id,
      reportType: data.report_type,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      reportData: data.report_data,
      pdfUrl: data.pdf_url,
      sentTo: data.sent_to || [],
      sentAt: data.sent_at,
      createdAt: data.created_at,
    },
    error: null,
  };
}

// Send report via email
export async function sendReport(
  reportId: string,
  emails: string[]
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // In production, integrate with email service (Resend, SendGrid, etc.)
  // For now, just update the sent status

  const { error } = await supabase
    .from("seo_reports")
    .update({
      sent_to: emails,
      sent_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Helper: Calculate overall SEO score
function calculateOverallScore(
  gscData: Awaited<ReturnType<typeof getGSCPerformanceData>>["data"],
  rankings: Awaited<ReturnType<typeof getRankingSummary>>["data"],
  backlinks: Awaited<ReturnType<typeof getBacklinkStats>>["data"]
): number {
  let score = 50; // Base score

  // Traffic factor (up to 20 points)
  if (gscData?.totals.clicks) {
    score += Math.min(20, gscData.totals.clicks / 100);
  }

  // Rankings factor (up to 15 points)
  if (rankings?.top10) {
    score += Math.min(15, rankings.top10 * 2);
  }

  // Position improvement factor (up to 10 points)
  if (rankings?.improved) {
    score += Math.min(10, rankings.improved);
  }

  // Backlinks factor (up to 5 points)
  if (backlinks?.totalBacklinks) {
    score += Math.min(5, backlinks.totalBacklinks / 10);
  }

  return Math.min(100, Math.round(score));
}

// Helper: Calculate traffic change
function calculateTrafficChange(
  dates: Array<{ keys: string[]; clicks: number }>
): number {
  if (dates.length < 14) return 0;

  const mid = Math.floor(dates.length / 2);
  const firstHalf = dates.slice(0, mid);
  const secondHalf = dates.slice(mid);

  const firstSum = firstHalf.reduce((sum, d) => sum + d.clicks, 0);
  const secondSum = secondHalf.reduce((sum, d) => sum + d.clicks, 0);

  if (firstSum === 0) return secondSum > 0 ? 100 : 0;
  return Math.round(((secondSum - firstSum) / firstSum) * 100);
}

// Helper: Generate recommendations
function generateRecommendations(
  gscData: Awaited<ReturnType<typeof getGSCPerformanceData>>["data"],
  rankings: Awaited<ReturnType<typeof getRankingSummary>>["data"],
  backlinks: Awaited<ReturnType<typeof getBacklinkStats>>["data"]
): string[] {
  const recommendations: string[] = [];

  // CTR recommendations
  if (gscData?.totals.ctr && gscData.totals.ctr < 0.03) {
    recommendations.push(
      "Your click-through rate is below average. Consider improving meta titles and descriptions to make them more compelling."
    );
  }

  // Rankings recommendations
  if (rankings?.declined && rankings.declined > rankings.improved) {
    recommendations.push(
      "More keywords declined than improved. Review affected pages and update content to maintain rankings."
    );
  }

  if (rankings?.notRanking && rankings.notRanking > rankings.totalKeywords * 0.3) {
    recommendations.push(
      "Over 30% of tracked keywords are not ranking. Focus on creating content targeting these keywords."
    );
  }

  // Backlinks recommendations
  if (backlinks?.lostThisMonth && backlinks.lostThisMonth > backlinks.gainedThisMonth) {
    recommendations.push(
      "You lost more backlinks than you gained. Consider outreach campaigns to build new quality backlinks."
    );
  }

  if (backlinks?.avgDomainAuthority && backlinks.avgDomainAuthority < 30) {
    recommendations.push(
      "Average domain authority of backlinks is low. Focus on acquiring links from higher authority sites."
    );
  }

  // Content recommendations
  recommendations.push(
    "Continue publishing blog content regularly to maintain freshness signals and target new keywords."
  );

  return recommendations.slice(0, 5);
}
