"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  researchKeyword,
  getKeywordSuggestions,
  getQuestionKeywords,
  analyzeSERP,
  clusterKeywords,
  type KeywordData,
  type KeywordSuggestion,
  type QuestionKeyword,
} from "@/lib/seo/keyword-research";
import { getEffectiveCredentials } from "./api-credentials";

// Research a single keyword
export async function researchKeywordAction(
  storeId: string,
  keyword: string
): Promise<{ data: KeywordData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    // Get API credentials
    const credentials = await getEffectiveCredentials(storeId);
    
    const data = await researchKeyword(keyword, {
      apiLogin: process.env.DATAFORSEO_LOGIN,
      apiPassword: process.env.DATAFORSEO_PASSWORD,
    });
    
    if (data) {
      // Save to database
      const serviceClient = await createServiceClient();
      await serviceClient.from("keyword_research").upsert({
        store_id: storeId,
        keyword: data.keyword,
        search_volume: data.searchVolume,
        keyword_difficulty: data.keywordDifficulty,
        cpc: data.cpc,
        competition: data.competition,
        trend_data: data.trend,
        search_intent: data.searchIntent,
        serp_features: data.serpFeatures,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: "store_id,keyword",
      });
      
      revalidatePath(`/dashboard/stores/${storeId}/keywords`);
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Keyword research error:", error);
    return { data: null, error: "Failed to research keyword" };
  }
}

// Get keyword suggestions
export async function getKeywordSuggestionsAction(
  storeId: string,
  seedKeyword: string,
  limit: number = 50
): Promise<{ data: KeywordSuggestion[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const suggestions = await getKeywordSuggestions(seedKeyword, {
      limit,
      apiLogin: process.env.DATAFORSEO_LOGIN,
      apiPassword: process.env.DATAFORSEO_PASSWORD,
    });
    
    return { data: suggestions, error: null };
  } catch (error) {
    console.error("Keyword suggestions error:", error);
    return { data: null, error: "Failed to get keyword suggestions" };
  }
}

// Get question keywords
export async function getQuestionKeywordsAction(
  storeId: string,
  topic: string
): Promise<{ data: QuestionKeyword[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const questions = await getQuestionKeywords(topic, {
      apiLogin: process.env.DATAFORSEO_LOGIN,
      apiPassword: process.env.DATAFORSEO_PASSWORD,
    });
    
    return { data: questions, error: null };
  } catch (error) {
    console.error("Question keywords error:", error);
    return { data: null, error: "Failed to get question keywords" };
  }
}

// Analyze SERP
export async function analyzeSERPAction(
  storeId: string,
  keyword: string
): Promise<{
  data: {
    serpFeatures: string[];
    topResults: Array<{ position: number; url: string; title: string; domain: string }>;
    difficulty: number;
    recommendations: string[];
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const analysis = await analyzeSERP(keyword, {
      apiLogin: process.env.DATAFORSEO_LOGIN,
      apiPassword: process.env.DATAFORSEO_PASSWORD,
    });
    
    return { data: analysis, error: null };
  } catch (error) {
    console.error("SERP analysis error:", error);
    return { data: null, error: "Failed to analyze SERP" };
  }
}

// Get saved keyword research
export async function getSavedKeywordResearch(
  storeId: string
): Promise<{ data: KeywordData[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const { data, error } = await supabase
      .from("keyword_research")
      .select("*")
      .eq("store_id", storeId)
      .order("search_volume", { ascending: false });
    
    if (error) throw error;
    
    const keywords: KeywordData[] = (data || []).map((row) => ({
      keyword: row.keyword,
      searchVolume: row.search_volume || 0,
      keywordDifficulty: row.keyword_difficulty || 0,
      cpc: row.cpc || 0,
      competition: row.competition || 0,
      trend: row.trend_data || [],
      searchIntent: row.search_intent || "informational",
      serpFeatures: row.serp_features || [],
    }));
    
    return { data: keywords, error: null };
  } catch (error) {
    console.error("Get saved keywords error:", error);
    return { data: null, error: "Failed to get saved keywords" };
  }
}

// Bulk research keywords
export async function bulkResearchKeywords(
  storeId: string,
  keywords: string[]
): Promise<{ data: KeywordData[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const results: KeywordData[] = [];
    
    // Process in batches of 10
    for (let i = 0; i < keywords.length; i += 10) {
      const batch = keywords.slice(i, i + 10);
      
      const batchResults = await Promise.all(
        batch.map((kw) => researchKeyword(kw, {
          apiLogin: process.env.DATAFORSEO_LOGIN,
          apiPassword: process.env.DATAFORSEO_PASSWORD,
        }))
      );
      
      results.push(...batchResults.filter((r): r is KeywordData => r !== null));
      
      // Rate limit between batches
      if (i + 10 < keywords.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    
    // Save all to database
    if (results.length > 0) {
      const serviceClient = await createServiceClient();
      
      await serviceClient.from("keyword_research").upsert(
        results.map((data) => ({
          store_id: storeId,
          keyword: data.keyword,
          search_volume: data.searchVolume,
          keyword_difficulty: data.keywordDifficulty,
          cpc: data.cpc,
          competition: data.competition,
          trend_data: data.trend,
          search_intent: data.searchIntent,
          serp_features: data.serpFeatures,
          last_updated: new Date().toISOString(),
        })),
        { onConflict: "store_id,keyword" }
      );
      
      revalidatePath(`/dashboard/stores/${storeId}/keywords`);
    }
    
    return { data: results, error: null };
  } catch (error) {
    console.error("Bulk keyword research error:", error);
    return { data: null, error: "Failed to research keywords" };
  }
}

// Cluster keywords
export async function clusterKeywordsAction(
  storeId: string,
  keywords: KeywordSuggestion[]
): Promise<{ data: Record<string, KeywordSuggestion[]> | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const clusters = await clusterKeywords(keywords);
    
    // Convert Map to object
    const result: Record<string, KeywordSuggestion[]> = {};
    for (const [key, value] of clusters) {
      result[key] = value;
    }
    
    return { data: result, error: null };
  } catch (error) {
    console.error("Keyword clustering error:", error);
    return { data: null, error: "Failed to cluster keywords" };
  }
}

// Delete keyword research entry
export async function deleteKeywordResearch(
  storeId: string,
  keyword: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    
    const { error } = await supabase
      .from("keyword_research")
      .delete()
      .eq("store_id", storeId)
      .eq("keyword", keyword);
    
    if (error) throw error;
    
    revalidatePath(`/dashboard/stores/${storeId}/keywords`);
    
    return { success: true, error: null };
  } catch (error) {
    console.error("Delete keyword error:", error);
    return { success: false, error: "Failed to delete keyword" };
  }
}
