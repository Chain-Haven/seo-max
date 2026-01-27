"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  analyzeCompetitorGaps,
  findRankingGaps,
  identifyContentGaps,
  type GapAnalysisResult,
  type CompetitorKeywordGap,
} from "@/lib/seo/competitor-gap";
import {
  calculateTrafficValue,
  estimateImprovementValue,
  calculateSEOROI,
  type TrafficValueEstimate,
} from "@/lib/seo/traffic-value";
import {
  generateContentBrief,
  briefToOutlineText,
  analyzeContentAgainstBrief,
  type ContentBrief,
} from "@/lib/seo/content-brief";
import {
  detectCannibalization,
  analyzeCanibalizationWithAI,
  getResolutionSuggestions,
  type CannibalizationReport,
  type CannibalizationIssue,
} from "@/lib/seo/cannibalization";

// ==================== COMPETITOR GAP ANALYSIS ====================

export async function analyzeCompetitorGapsAction(
  storeId: string,
  competitors: string[]
): Promise<{ data: GapAnalysisResult | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    // Get your tracked keywords with positions
    const { data: keywords } = await supabase
      .from("tracked_keywords")
      .select("keyword, current_position")
      .eq("store_id", storeId)
      .not("current_position", "is", null);
    
    const yourKeywords = (keywords || []).map((k) => ({
      keyword: k.keyword,
      position: k.current_position,
    }));
    
    // Get your domain
    const { data: store } = await supabase
      .from("stores")
      .select("url")
      .eq("id", storeId)
      .single();
    
    const yourDomain = store?.url || "";
    
    const result = await analyzeCompetitorGaps(yourDomain, competitors, yourKeywords);
    
    // Save gaps to database
    const serviceClient = await createServiceClient();
    
    for (const gap of result.allGaps.slice(0, 100)) {
      await serviceClient.from("competitor_keyword_gaps").upsert({
        store_id: storeId,
        competitor_domain: competitors[0],
        keyword: gap.keyword,
        competitor_position: gap.competitorPosition,
        your_position: gap.yourPosition,
        search_volume: gap.searchVolume,
        keyword_difficulty: gap.keywordDifficulty,
        opportunity_score: gap.opportunityScore,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "store_id,keyword",
      });
    }
    
    revalidatePath(`/dashboard/stores/${storeId}/competitors`);
    
    return { data: result, error: null };
  } catch (error) {
    console.error("Competitor gap analysis error:", error);
    return { data: null, error: "Failed to analyze competitor gaps" };
  }
}

export async function getCompetitorGaps(
  storeId: string
): Promise<{ data: CompetitorKeywordGap[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const { data, error } = await supabase
      .from("competitor_keyword_gaps")
      .select("*")
      .eq("store_id", storeId)
      .order("opportunity_score", { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    const gaps: CompetitorKeywordGap[] = (data || []).map((row) => ({
      keyword: row.keyword,
      competitorPosition: row.competitor_position,
      yourPosition: row.your_position,
      searchVolume: row.search_volume,
      keywordDifficulty: row.keyword_difficulty,
      opportunityScore: row.opportunity_score,
      priority: row.opportunity_score >= 70 && row.keyword_difficulty <= 50 ? "high" :
                row.opportunity_score >= 50 ? "medium" : "low",
    }));
    
    return { data: gaps, error: null };
  } catch (error) {
    console.error("Get competitor gaps error:", error);
    return { data: null, error: "Failed to get competitor gaps" };
  }
}

// ==================== TRAFFIC VALUE ====================

export async function calculateTrafficValueAction(
  storeId: string
): Promise<{ data: TrafficValueEstimate | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    // Get tracked keywords with positions and volumes
    const { data: keywords } = await supabase
      .from("tracked_keywords")
      .select("keyword, current_position, search_volume")
      .eq("store_id", storeId)
      .not("current_position", "is", null)
      .lte("current_position", 100);
    
    if (!keywords || keywords.length === 0) {
      return { data: null, error: "No tracked keywords with positions" };
    }
    
    const keywordData = keywords.map((k) => ({
      keyword: k.keyword,
      position: k.current_position,
      searchVolume: k.search_volume || 100,
    }));
    
    const estimate = calculateTrafficValue(keywordData);
    
    // Save monthly estimate
    const serviceClient = await createServiceClient();
    const currentMonth = new Date().toISOString().substring(0, 7) + "-01";
    
    await serviceClient.from("traffic_value").upsert({
      store_id: storeId,
      month: currentMonth,
      organic_sessions: estimate.totalMonthlyTraffic,
      estimated_value: estimate.estimatedMonthlyValue,
      top_keywords: estimate.topKeywordsByValue.slice(0, 10),
      calculation_details: {
        valueByIntent: estimate.valueByIntent,
        recommendations: estimate.recommendations,
      },
    }, {
      onConflict: "store_id,month",
    });
    
    return { data: estimate, error: null };
  } catch (error) {
    console.error("Traffic value calculation error:", error);
    return { data: null, error: "Failed to calculate traffic value" };
  }
}

export async function getTrafficValueHistory(
  storeId: string
): Promise<{
  data: Array<{ month: string; traffic: number; value: number }> | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const { data, error } = await supabase
      .from("traffic_value")
      .select("month, organic_sessions, estimated_value")
      .eq("store_id", storeId)
      .order("month", { ascending: true })
      .limit(12);
    
    if (error) throw error;
    
    const history = (data || []).map((row) => ({
      month: row.month,
      traffic: row.organic_sessions,
      value: row.estimated_value,
    }));
    
    return { data: history, error: null };
  } catch (error) {
    console.error("Get traffic value history error:", error);
    return { data: null, error: "Failed to get traffic value history" };
  }
}

export async function calculateImprovementROI(
  storeId: string,
  keyword: string,
  currentPosition: number,
  targetPosition: number,
  searchVolume: number
): Promise<{
  data: {
    currentMonthlyValue: number;
    potentialMonthlyValue: number;
    additionalMonthlyValue: number;
    annualValueIncrease: number;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const estimate = estimateImprovementValue(
      keyword,
      currentPosition,
      targetPosition,
      searchVolume
    );
    
    return { data: estimate, error: null };
  } catch (error) {
    console.error("Improvement ROI calculation error:", error);
    return { data: null, error: "Failed to calculate ROI" };
  }
}

// ==================== CONTENT BRIEF ====================

export async function generateContentBriefAction(
  storeId: string,
  targetKeyword: string,
  productId?: string
): Promise<{ data: ContentBrief | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    // Get product info if provided
    let productInfo;
    if (productId) {
      const { data: product } = await supabase
        .from("products")
        .select("name, category, description")
        .eq("id", productId)
        .single();
      
      if (product) {
        productInfo = {
          name: product.name,
          category: product.category || "General",
          description: product.description || "",
        };
      }
    }
    
    // Get existing content for internal linking
    const { data: existingContent } = await supabase
      .from("blog_posts")
      .select("title, id")
      .eq("store_id", storeId)
      .eq("status", "published")
      .limit(20);
    
    const brief = await generateContentBrief(targetKeyword, {
      productInfo,
      existingContent: existingContent?.map((c) => ({
        title: c.title,
        url: `/blog/${c.id}`,
      })),
    });
    
    // Save brief
    const serviceClient = await createServiceClient();
    
    const { data: savedBrief, error: saveError } = await serviceClient
      .from("content_briefs")
      .insert({
        store_id: storeId,
        target_keyword: targetKeyword,
        title_suggestions: brief.titleSuggestions,
        recommended_word_count: brief.recommendedWordCount.max,
        outline: brief.outline,
        competitor_analysis: brief.competitorInsights,
        questions_to_answer: brief.questionsToAnswer,
        entities_to_include: brief.entitiesToInclude,
        internal_links_to_add: brief.internalLinksToAdd,
        serp_analysis: brief.serpFeatures,
        status: "ready",
      })
      .select()
      .single();
    
    if (saveError) throw saveError;
    
    revalidatePath(`/dashboard/stores/${storeId}/briefs`);
    
    return { data: brief, error: null };
  } catch (error) {
    console.error("Content brief generation error:", error);
    return { data: null, error: "Failed to generate content brief" };
  }
}

export async function getContentBriefs(
  storeId: string
): Promise<{ data: ContentBrief[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const { data, error } = await supabase
      .from("content_briefs")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    const briefs: ContentBrief[] = (data || []).map((row) => ({
      targetKeyword: row.target_keyword,
      searchIntent: "informational",
      titleSuggestions: row.title_suggestions || [],
      metaDescriptionSuggestion: "",
      recommendedWordCount: { min: row.recommended_word_count * 0.8, max: row.recommended_word_count },
      outline: row.outline || [],
      questionsToAnswer: row.questions_to_answer || [],
      entitiesToInclude: row.entities_to_include || [],
      internalLinksToAdd: row.internal_links_to_add || [],
      competitorInsights: row.competitor_analysis || {},
      serpFeatures: row.serp_analysis || {},
      keywordVariations: [],
      estimatedDifficulty: 50,
      estimatedTrafficPotential: 500,
    }));
    
    return { data: briefs, error: null };
  } catch (error) {
    console.error("Get content briefs error:", error);
    return { data: null, error: "Failed to get content briefs" };
  }
}

// ==================== CANNIBALIZATION ====================

export async function detectCannibalizationAction(
  storeId: string
): Promise<{ data: CannibalizationReport | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    // Get all content
    const [productsResult, pagesResult, blogResult] = await Promise.all([
      supabase.from("products").select("id, name, meta_title, meta_description").eq("store_id", storeId),
      supabase.from("pages").select("id, title, meta_title, meta_description").eq("store_id", storeId),
      supabase.from("blog_posts").select("id, title, meta_title, meta_description").eq("store_id", storeId),
    ]);
    
    const pages = [
      ...(productsResult.data || []).map((p) => ({
        url: `/product/${p.id}`,
        title: p.name,
        source: "product" as const,
        targetKeyword: p.meta_title || p.name,
        keywords: [p.meta_title, p.name].filter(Boolean) as string[],
        metaDescription: p.meta_description,
      })),
      ...(pagesResult.data || []).map((p) => ({
        url: `/page/${p.id}`,
        title: p.title,
        source: "page" as const,
        targetKeyword: p.meta_title || p.title,
        keywords: [p.meta_title, p.title].filter(Boolean) as string[],
        metaDescription: p.meta_description,
      })),
      ...(blogResult.data || []).map((p) => ({
        url: `/blog/${p.id}`,
        title: p.title,
        source: "blog" as const,
        targetKeyword: p.meta_title || p.title,
        keywords: [p.meta_title, p.title].filter(Boolean) as string[],
        metaDescription: p.meta_description,
      })),
    ];
    
    const report = detectCannibalization(pages);
    
    // Save issues to database
    const serviceClient = await createServiceClient();
    
    for (const issue of report.issues) {
      await serviceClient.from("keyword_cannibalization").upsert({
        store_id: storeId,
        keyword: issue.keyword,
        competing_pages: issue.competingPages,
        severity: issue.severity,
        recommendation: issue.recommendation,
        status: "open",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "store_id,keyword",
      });
    }
    
    revalidatePath(`/dashboard/stores/${storeId}/cannibalization`);
    
    return { data: report, error: null };
  } catch (error) {
    console.error("Cannibalization detection error:", error);
    return { data: null, error: "Failed to detect cannibalization" };
  }
}

export async function getCannibalizationIssues(
  storeId: string
): Promise<{ data: CannibalizationIssue[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const { data, error } = await supabase
      .from("keyword_cannibalization")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "open")
      .order("severity", { ascending: true });
    
    if (error) throw error;
    
    const issues: CannibalizationIssue[] = (data || []).map((row) => ({
      keyword: row.keyword,
      competingPages: row.competing_pages || [],
      severity: row.severity,
      recommendation: row.recommendation,
      suggestedAction: "differentiate",
    }));
    
    return { data: issues, error: null };
  } catch (error) {
    console.error("Get cannibalization issues error:", error);
    return { data: null, error: "Failed to get cannibalization issues" };
  }
}

export async function resolveCannibalizationIssue(
  storeId: string,
  keyword: string,
  status: "resolved" | "ignored"
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    
    const { error } = await supabase
      .from("keyword_cannibalization")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .eq("keyword", keyword);
    
    if (error) throw error;
    
    revalidatePath(`/dashboard/stores/${storeId}/cannibalization`);
    
    return { success: true, error: null };
  } catch (error) {
    console.error("Resolve cannibalization error:", error);
    return { success: false, error: "Failed to resolve issue" };
  }
}
