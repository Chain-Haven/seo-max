"use server";

/**
 * Competitor Monitoring System
 * Track competitor rankings and alert when they outrank you
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { searchSerpApi } from "./seo-apis";
import { getAIProvider } from "@/lib/ai/provider";

export interface TrackedCompetitor {
  id: string;
  storeId: string;
  domain: string;
  name: string;
  keywords: string[];
  lastChecked: string | null;
  avgPosition: number | null;
  commonKeywords: number;
}

export interface CompetitorRankingAlert {
  id: string;
  competitorDomain: string;
  keyword: string;
  yourPosition: number | null;
  competitorPosition: number;
  change: "overtook" | "gained" | "lost";
  createdAt: string;
}

export interface CompetitorAnalysis {
  competitor: TrackedCompetitor;
  rankings: Array<{
    keyword: string;
    yourPosition: number | null;
    competitorPosition: number | null;
    gap: number;
  }>;
  contentGaps: string[];
  backlinks: {
    estimatedCount: number;
    topSources: string[];
  };
  strengths: string[];
  weaknesses: string[];
}

/**
 * Add a competitor to track
 */
export async function addTrackedCompetitor(
  storeId: string,
  competitorDomain: string,
  competitorName?: string
): Promise<{ success: boolean; competitor?: TrackedCompetitor; error?: string }> {
  const supabase = await createClient();

  // Clean domain
  const domain = competitorDomain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  // Check if already tracked
  const { data: existing } = await supabase
    .from("tracked_competitors")
    .select("id")
    .eq("store_id", storeId)
    .eq("domain", domain)
    .single();

  if (existing) {
    return { success: false, error: "Competitor already tracked" };
  }

  const { data, error } = await supabase
    .from("tracked_competitors")
    .insert({
      store_id: storeId,
      domain,
      name: competitorName || domain,
      keywords: [],
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    competitor: {
      id: data.id,
      storeId: data.store_id,
      domain: data.domain,
      name: data.name,
      keywords: data.keywords || [],
      lastChecked: data.last_checked,
      avgPosition: data.avg_position,
      commonKeywords: data.common_keywords || 0,
    },
  };
}

/**
 * Get tracked competitors for a store
 */
export async function getTrackedCompetitors(
  storeId: string
): Promise<{ data: TrackedCompetitor[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tracked_competitors")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((row) => ({
      id: row.id,
      storeId: row.store_id,
      domain: row.domain,
      name: row.name,
      keywords: row.keywords || [],
      lastChecked: row.last_checked,
      avgPosition: row.avg_position,
      commonKeywords: row.common_keywords || 0,
    })),
    error: null,
  };
}

/**
 * Check competitor rankings for all tracked keywords
 */
export async function checkCompetitorRankings(
  storeId: string,
  competitorId: string
): Promise<{
  success: boolean;
  alerts: CompetitorRankingAlert[];
  error?: string;
}> {
  const supabase = await createClient();
  const alerts: CompetitorRankingAlert[] = [];

  try {
    // Get store
    const { data: store } = await supabase
      .from("stores")
      .select("url")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { success: false, alerts: [], error: "Store not found" };
    }

    const storeDomain = new URL(store.url).hostname.replace("www.", "");

    // Get competitor
    const { data: competitor } = await supabase
      .from("tracked_competitors")
      .select("*")
      .eq("id", competitorId)
      .single();

    if (!competitor) {
      return { success: false, alerts: [], error: "Competitor not found" };
    }

    // Get tracked keywords
    const { data: keywords } = await supabase
      .from("tracked_keywords")
      .select("keyword")
      .eq("store_id", storeId)
      .limit(20);

    if (!keywords || keywords.length === 0) {
      return { success: false, alerts: [], error: "No keywords to track" };
    }

    // Check each keyword
    for (const { keyword } of keywords) {
      const { data: serpData } = await searchSerpApi(keyword, { storeId });

      if (!serpData) continue;

      // Find positions
      const ourResult = serpData.results.find((r) =>
        r.domain.includes(storeDomain)
      );
      const competitorResult = serpData.results.find((r) =>
        r.domain.includes(competitor.domain)
      );

      const ourPosition = ourResult?.position || null;
      const competitorPosition = competitorResult?.position || null;

      // Store ranking data
      await supabase.from("competitor_rankings").insert({
        competitor_id: competitorId,
        keyword,
        our_position: ourPosition,
        competitor_position: competitorPosition,
      });

      // Check for alerts
      if (competitorPosition && ourPosition) {
        // Competitor overtook us
        if (competitorPosition < ourPosition) {
          alerts.push({
            id: crypto.randomUUID(),
            competitorDomain: competitor.domain,
            keyword,
            yourPosition: ourPosition,
            competitorPosition,
            change: "overtook",
            createdAt: new Date().toISOString(),
          });
        }
      } else if (competitorPosition && !ourPosition) {
        // Competitor ranks, we don't
        alerts.push({
          id: crypto.randomUUID(),
          competitorDomain: competitor.domain,
          keyword,
          yourPosition: null,
          competitorPosition,
          change: "gained",
          createdAt: new Date().toISOString(),
        });
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Update competitor last checked
    await supabase
      .from("tracked_competitors")
      .update({
        last_checked: new Date().toISOString(),
        common_keywords: keywords.length,
      })
      .eq("id", competitorId);

    // Save alerts
    if (alerts.length > 0) {
      await supabase.from("competitor_alerts").insert(
        alerts.map((alert) => ({
          store_id: storeId,
          competitor_id: competitorId,
          keyword: alert.keyword,
          your_position: alert.yourPosition,
          competitor_position: alert.competitorPosition,
          change_type: alert.change,
        }))
      );
    }

    return { success: true, alerts };
  } catch (error) {
    console.error("[CompetitorMonitoring] Error:", error);
    return {
      success: false,
      alerts: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Analyze a competitor in depth
 */
export async function analyzeCompetitor(
  storeId: string,
  competitorDomain: string
): Promise<{ data: CompetitorAnalysis | null; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get store
    const { data: store } = await supabase
      .from("stores")
      .select("url")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { data: null, error: "Store not found" };
    }

    // Get tracked keywords
    const { data: keywords } = await supabase
      .from("tracked_keywords")
      .select("keyword")
      .eq("store_id", storeId)
      .limit(10);

    // Analyze rankings for each keyword
    const rankings: CompetitorAnalysis["rankings"] = [];
    const storeDomain = new URL(store.url).hostname.replace("www.", "");

    for (const { keyword } of keywords || []) {
      const { data: serpData } = await searchSerpApi(keyword, { storeId });

      if (serpData) {
        const ourResult = serpData.results.find((r) =>
          r.domain.includes(storeDomain)
        );
        const competitorResult = serpData.results.find((r) =>
          r.domain.includes(competitorDomain)
        );

        rankings.push({
          keyword,
          yourPosition: ourResult?.position || null,
          competitorPosition: competitorResult?.position || null,
          gap: (ourResult?.position || 100) - (competitorResult?.position || 100),
        });
      }
    }

    // Use AI to analyze content gaps and strategies
    const ai = getAIProvider();
    const analysisPrompt = `Analyze this competitor for SEO opportunities:

Competitor: ${competitorDomain}
Our domain: ${storeDomain}

Keyword rankings comparison:
${rankings.map((r) => `- ${r.keyword}: Us #${r.yourPosition || "N/A"}, Them #${r.competitorPosition || "N/A"}`).join("\n")}

Provide analysis in JSON format:
{
  "contentGaps": ["topics we should cover that they rank for"],
  "backlinks": {
    "estimatedCount": 5000,
    "topSources": ["likely link sources based on industry"]
  },
  "strengths": ["their SEO strengths"],
  "weaknesses": ["their SEO weaknesses we can exploit"]
}`;

    let analysisData = {
      contentGaps: [] as string[],
      backlinks: { estimatedCount: 1000, topSources: [] as string[] },
      strengths: [] as string[],
      weaknesses: [] as string[],
    };

    try {
      const aiResponse = await ai.generateText(analysisPrompt, { maxTokens: 1000 });
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Use defaults
    }

    // Get or create competitor record
    let { data: competitor } = await supabase
      .from("tracked_competitors")
      .select("*")
      .eq("store_id", storeId)
      .eq("domain", competitorDomain)
      .single();

    if (!competitor) {
      const { data: newCompetitor } = await supabase
        .from("tracked_competitors")
        .insert({
          store_id: storeId,
          domain: competitorDomain,
          name: competitorDomain,
        })
        .select()
        .single();
      competitor = newCompetitor;
    }

    return {
      data: {
        competitor: {
          id: competitor?.id || "",
          storeId,
          domain: competitorDomain,
          name: competitor?.name || competitorDomain,
          keywords: [],
          lastChecked: competitor?.last_checked || null,
          avgPosition: null,
          commonKeywords: rankings.length,
        },
        rankings,
        contentGaps: analysisData.contentGaps,
        backlinks: analysisData.backlinks,
        strengths: analysisData.strengths,
        weaknesses: analysisData.weaknesses,
      },
      error: null,
    };
  } catch (error) {
    console.error("[CompetitorAnalysis] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get competitor alerts
 */
export async function getCompetitorAlerts(
  storeId: string,
  limit: number = 50
): Promise<{ data: CompetitorRankingAlert[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitor_alerts")
    .select(
      `
      *,
      tracked_competitors (domain, name)
    `
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((row) => ({
      id: row.id,
      competitorDomain: (row.tracked_competitors as { domain: string })?.domain || "",
      keyword: row.keyword,
      yourPosition: row.your_position,
      competitorPosition: row.competitor_position,
      change: row.change_type,
      createdAt: row.created_at,
    })),
    error: null,
  };
}
