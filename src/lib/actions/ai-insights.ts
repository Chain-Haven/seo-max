"use server";

/**
 * AI Insights Hub
 * Aggregates data from all SEO APIs and provides intelligent 1-click improvements
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";
import {
  searchSerpApi,
  getDataForSEOKeywordData,
  getMozDomainMetrics,
  getAhrefsBacklinks,
  getAhrefsDomainMetrics,
  getSemrushKeywordOverview,
  calculateSEOHealthScore,
} from "./seo-apis";
import { crawlSite } from "@/lib/seo/site-crawler";

export interface APIDataSource {
  name: string;
  status: "connected" | "simulated" | "error";
  lastFetched: string | null;
  dataPoints: number;
}

export interface AggregatedInsight {
  id: string;
  type: "opportunity" | "issue" | "recommendation";
  priority: "critical" | "high" | "medium" | "low";
  category: "content" | "technical" | "backlinks" | "keywords" | "competitors";
  title: string;
  description: string;
  impact: string;
  effort: "quick" | "moderate" | "significant";
  sources: string[]; // Which APIs contributed to this insight
  actionable: boolean;
  autoFixAvailable: boolean;
  estimatedTrafficGain?: number;
}

export interface AIAnalysisResult {
  storeId: string;
  storeName: string;
  storeUrl: string;
  analyzedAt: string;
  
  // Data sources
  dataSources: APIDataSource[];
  
  // Aggregated metrics
  metrics: {
    domainAuthority: number;
    organicTraffic: number;
    totalBacklinks: number;
    referringDomains: number;
    trackedKeywords: number;
    avgPosition: number;
    healthScore: number;
  };
  
  // Insights
  insights: AggregatedInsight[];
  
  // Quick wins (things that can be fixed immediately)
  quickWins: Array<{
    id: string;
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    fixType: "meta" | "content" | "technical" | "schema";
    targetUrl?: string;
    currentValue?: string;
    suggestedValue?: string;
  }>;
  
  // Competitor gaps
  competitorGaps: Array<{
    keyword: string;
    yourPosition: number | null;
    competitorPosition: number;
    competitorDomain: string;
    searchVolume: number;
    difficulty: number;
    opportunity: string;
  }>;
}

/**
 * Fetch and aggregate data from all SEO APIs
 */
export async function aggregateAllAPIData(
  storeId: string
): Promise<{ data: AIAnalysisResult | null; error: string | null }> {
  const supabase = await createClient();
  
  try {
    // Get store info
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, url")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { data: null, error: "Store not found" };
    }

    const domain = new URL(store.url).hostname.replace("www.", "");
    const dataSources: APIDataSource[] = [];
    
    // Collect data from all APIs in parallel
    console.log("[AIInsights] Starting data aggregation for", store.name);

    const [
      healthResult,
      mozResult,
      ahrefsResult,
      keywordsResult,
    ] = await Promise.all([
      calculateSEOHealthScore(storeId),
      getMozDomainMetrics(domain),
      getAhrefsDomainMetrics(domain),
      getTrackedKeywordsData(storeId),
    ]);

    // Track data sources
    dataSources.push({
      name: "SEO Health",
      status: healthResult.data ? "connected" : "error",
      lastFetched: new Date().toISOString(),
      dataPoints: healthResult.data ? 5 : 0,
    });

    dataSources.push({
      name: "Moz",
      status: mozResult.data ? (process.env.MOZ_API_KEY ? "connected" : "simulated") : "error",
      lastFetched: new Date().toISOString(),
      dataPoints: mozResult.data ? 5 : 0,
    });

    dataSources.push({
      name: "Ahrefs",
      status: ahrefsResult.data ? (process.env.AHREFS_API_KEY ? "connected" : "simulated") : "error",
      lastFetched: new Date().toISOString(),
      dataPoints: ahrefsResult.data ? 6 : 0,
    });

    // Get tracked keywords and SERP data
    const { data: trackedKeywords } = await supabase
      .from("tracked_keywords")
      .select("keyword")
      .eq("store_id", storeId)
      .limit(10);

    let serpDataPoints = 0;
    const competitorGaps: AIAnalysisResult["competitorGaps"] = [];

    if (trackedKeywords && trackedKeywords.length > 0) {
      for (const kw of trackedKeywords.slice(0, 5)) {
        const serpResult = await searchSerpApi(kw.keyword, { storeId });
        if (serpResult.data) {
          serpDataPoints++;
          
          // Find competitor gaps
          const ourResult = serpResult.data.results.find(r => 
            r.domain.includes(domain)
          );
          const topCompetitor = serpResult.data.results.find(r => 
            !r.domain.includes(domain) && r.position <= 3
          );

          if (topCompetitor && (!ourResult || ourResult.position > topCompetitor.position)) {
            const kwData = await getDataForSEOKeywordData([kw.keyword]);
            const keywordMetrics = kwData.data?.[0];
            competitorGaps.push({
              keyword: kw.keyword,
              yourPosition: ourResult?.position || null,
              competitorPosition: topCompetitor.position,
              competitorDomain: topCompetitor.domain,
              searchVolume: keywordMetrics?.searchVolume || 1000,
              difficulty: keywordMetrics?.difficulty || 50,
              opportunity: ourResult 
                ? `Outrank ${topCompetitor.domain} to gain position ${topCompetitor.position}`
                : `Start ranking to compete with ${topCompetitor.domain}`,
            });
          }
        }
      }
    }

    dataSources.push({
      name: "SerpAPI",
      status: serpDataPoints > 0 ? (process.env.SERPAPI_API_KEY ? "connected" : "simulated") : "error",
      lastFetched: new Date().toISOString(),
      dataPoints: serpDataPoints,
    });

    dataSources.push({
      name: "DataForSEO",
      status: process.env.DATAFORSEO_LOGIN ? "connected" : "simulated",
      lastFetched: new Date().toISOString(),
      dataPoints: competitorGaps.length,
    });

    dataSources.push({
      name: "Semrush",
      status: process.env.SEMRUSH_API_KEY ? "connected" : "simulated",
      lastFetched: new Date().toISOString(),
      dataPoints: 0,
    });

    // Aggregate metrics
    const metrics = {
      domainAuthority: mozResult.data?.domainAuthority || ahrefsResult.data?.domainAuthority || 0,
      organicTraffic: ahrefsResult.data?.organicTraffic || 0,
      totalBacklinks: ahrefsResult.data?.totalBacklinks || mozResult.data?.totalBacklinks || 0,
      referringDomains: ahrefsResult.data?.referringDomains || mozResult.data?.referringDomains || 0,
      trackedKeywords: trackedKeywords?.length || 0,
      avgPosition: keywordsResult.avgPosition,
      healthScore: healthResult.data?.overall || 0,
    };

    // Generate insights using AI
    const insights = await generateAIInsights(
      store,
      metrics,
      healthResult.data,
      competitorGaps
    );

    // Generate quick wins
    const quickWins = await generateQuickWins(storeId, healthResult.data);

    return {
      data: {
        storeId,
        storeName: store.name,
        storeUrl: store.url,
        analyzedAt: new Date().toISOString(),
        dataSources,
        metrics,
        insights,
        quickWins,
        competitorGaps: competitorGaps.slice(0, 10),
      },
      error: null,
    };
  } catch (error) {
    console.error("[AIInsights] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function getTrackedKeywordsData(storeId: string) {
  const supabase = await createClient();
  
  const { data: rankings } = await supabase
    .from("keyword_rankings")
    .select("position")
    .eq("store_id", storeId)
    .not("position", "is", null);

  const avgPosition = rankings && rankings.length > 0
    ? Math.round(rankings.reduce((sum, r) => sum + (r.position || 0), 0) / rankings.length)
    : 0;

  return { avgPosition };
}

async function generateAIInsights(
  store: { name: string; url: string },
  metrics: AIAnalysisResult["metrics"],
  healthData: Awaited<ReturnType<typeof calculateSEOHealthScore>>["data"],
  competitorGaps: AIAnalysisResult["competitorGaps"]
): Promise<AggregatedInsight[]> {
  const insights: AggregatedInsight[] = [];
  const ai = getAIProvider();

  // Generate insights from health data
  if (healthData) {
    // Technical issues
    for (const issue of healthData.categories.technical.issues) {
      insights.push({
        id: crypto.randomUUID(),
        type: "issue",
        priority: "high",
        category: "technical",
        title: "Technical SEO Issue",
        description: issue,
        impact: "Can prevent pages from being indexed properly",
        effort: "moderate",
        sources: ["SEO Health"],
        actionable: true,
        autoFixAvailable: false,
      });
    }

    // Content issues
    for (const issue of healthData.categories.content.issues) {
      insights.push({
        id: crypto.randomUUID(),
        type: "issue",
        priority: "medium",
        category: "content",
        title: "Content Optimization Needed",
        description: issue,
        impact: "May reduce content quality signals to search engines",
        effort: "moderate",
        sources: ["SEO Health"],
        actionable: true,
        autoFixAvailable: true,
      });
    }

    // Backlink issues
    for (const issue of healthData.categories.backlinks.issues) {
      insights.push({
        id: crypto.randomUUID(),
        type: "issue",
        priority: "medium",
        category: "backlinks",
        title: "Backlink Profile Issue",
        description: issue,
        impact: "Affects domain authority and rankings",
        effort: "significant",
        sources: ["SEO Health", "Moz", "Ahrefs"],
        actionable: true,
        autoFixAvailable: false,
      });
    }
  }

  // Generate insights from competitor gaps
  if (competitorGaps.length > 0) {
    const topGaps = competitorGaps.slice(0, 3);
    for (const gap of topGaps) {
      insights.push({
        id: crypto.randomUUID(),
        type: "opportunity",
        priority: gap.searchVolume > 5000 ? "high" : "medium",
        category: "keywords",
        title: `Keyword Opportunity: "${gap.keyword}"`,
        description: `${gap.competitorDomain} ranks #${gap.competitorPosition}. ${
          gap.yourPosition ? `You rank #${gap.yourPosition}` : "You don't rank"
        }. Volume: ${gap.searchVolume}/mo`,
        impact: `Potential ${Math.round(gap.searchVolume * 0.3)} monthly visitors if you reach top 3`,
        effort: gap.difficulty > 60 ? "significant" : "moderate",
        sources: ["SerpAPI", "DataForSEO"],
        actionable: true,
        autoFixAvailable: true,
        estimatedTrafficGain: Math.round(gap.searchVolume * 0.3),
      });
    }
  }

  // Domain authority insight
  if (metrics.domainAuthority < 30) {
    insights.push({
      id: crypto.randomUUID(),
      type: "recommendation",
      priority: "high",
      category: "backlinks",
      title: "Low Domain Authority",
      description: `Your domain authority is ${metrics.domainAuthority}. Building quality backlinks will improve rankings across all keywords.`,
      impact: "Higher DA correlates with better rankings for all pages",
      effort: "significant",
      sources: ["Moz", "Ahrefs"],
      actionable: true,
      autoFixAvailable: false,
    });
  }

  // Use AI to generate additional strategic insights
  try {
    const aiPrompt = `Analyze this SEO data and provide 3 strategic insights:

Website: ${store.name} (${store.url})
Domain Authority: ${metrics.domainAuthority}
Organic Traffic: ${metrics.organicTraffic}
Backlinks: ${metrics.totalBacklinks}
Health Score: ${metrics.healthScore}/100
Avg Keyword Position: ${metrics.avgPosition || "Not tracking"}
Competitor Gaps: ${competitorGaps.length} keywords where competitors outrank us

Return JSON array:
[{
  "type": "opportunity|recommendation",
  "priority": "high|medium",
  "category": "content|technical|backlinks|keywords|competitors",
  "title": "Clear title",
  "description": "Detailed description",
  "impact": "Expected impact",
  "effort": "quick|moderate|significant"
}]`;

    const response = await ai.generateText(aiPrompt, { maxTokens: 800 });
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const aiInsights = JSON.parse(jsonMatch[0]);
      for (const insight of aiInsights) {
        insights.push({
          id: crypto.randomUUID(),
          ...insight,
          sources: ["AI Analysis"],
          actionable: true,
          autoFixAvailable: insight.category === "content",
        });
      }
    }
  } catch {
    // Skip AI insights if generation fails
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights.slice(0, 20);
}

async function generateQuickWins(
  storeId: string,
  healthData: Awaited<ReturnType<typeof calculateSEOHealthScore>>["data"]
): Promise<AIAnalysisResult["quickWins"]> {
  const supabase = await createClient();
  const quickWins: AIAnalysisResult["quickWins"] = [];

  // Get pages with issues
  const { data: pages } = await supabase
    .from("crawled_pages")
    .select("url, title, meta_description, meta_title")
    .eq("store_id", storeId)
    .limit(50);

  for (const page of pages || []) {
    // Missing or short meta title
    if (!page.meta_title || page.meta_title.length < 30) {
      quickWins.push({
        id: crypto.randomUUID(),
        title: "Missing/Short Meta Title",
        description: `Page "${page.title || page.url}" has ${
          page.meta_title ? "a short" : "no"
        } meta title`,
        impact: "high",
        fixType: "meta",
        targetUrl: page.url,
        currentValue: page.meta_title || "",
        suggestedValue: "",
      });
    }

    // Missing or short meta description
    if (!page.meta_description || page.meta_description.length < 100) {
      quickWins.push({
        id: crypto.randomUUID(),
        title: "Missing/Short Meta Description",
        description: `Page "${page.title || page.url}" needs a better meta description`,
        impact: "medium",
        fixType: "meta",
        targetUrl: page.url,
        currentValue: page.meta_description || "",
        suggestedValue: "",
      });
    }
  }

  // Get products with issues
  const { data: products } = await supabase
    .from("products")
    .select("id, name, meta_title, meta_description")
    .eq("store_id", storeId)
    .limit(50);

  for (const product of products || []) {
    if (!product.meta_title) {
      quickWins.push({
        id: crypto.randomUUID(),
        title: "Product Missing Meta Title",
        description: `Product "${product.name}" has no meta title`,
        impact: "high",
        fixType: "meta",
        currentValue: "",
        suggestedValue: product.name,
      });
    }

    if (!product.meta_description) {
      quickWins.push({
        id: crypto.randomUUID(),
        title: "Product Missing Meta Description",
        description: `Product "${product.name}" has no meta description`,
        impact: "medium",
        fixType: "meta",
        currentValue: "",
        suggestedValue: "",
      });
    }
  }

  return quickWins.slice(0, 20);
}

/**
 * Apply intelligent improvements based on AI analysis
 */
export async function applyIntelligentImprovements(
  storeId: string,
  options: {
    fixMetaTitles?: boolean;
    fixMetaDescriptions?: boolean;
    optimizeContent?: boolean;
    addSchemaMarkup?: boolean;
    targetInsightIds?: string[];
  } = {}
): Promise<{
  success: boolean;
  improvements: Array<{
    type: string;
    target: string;
    before: string;
    after: string;
    status: "applied" | "failed";
  }>;
  error?: string;
}> {
  const supabase = await createClient();
  const ai = getAIProvider();
  const improvements: Array<{
    type: string;
    target: string;
    before: string;
    after: string;
    status: "applied" | "failed";
  }> = [];

  try {
    // Get store info
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, url")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { success: false, improvements: [], error: "Store not found" };
    }

    console.log(`[AIImprovements] Starting for ${store.name}`);

    // Get aggregated data for context
    const { data: analysisData } = await aggregateAllAPIData(storeId);

    // Fix meta titles
    if (options.fixMetaTitles !== false) {
      const { data: pages } = await supabase
        .from("crawled_pages")
        .select("id, url, title, meta_title")
        .eq("store_id", storeId)
        .or("meta_title.is.null,meta_title.lt.30")
        .limit(20);

      for (const page of pages || []) {
        try {
          const prompt = `Generate an optimized meta title for this page:
URL: ${page.url}
Page Title: ${page.title}
Store: ${store.name}
${analysisData?.competitorGaps.length ? `Target Keywords: ${analysisData.competitorGaps.slice(0, 3).map(g => g.keyword).join(", ")}` : ""}

Requirements:
- 50-60 characters
- Include primary keyword naturally
- Compelling and click-worthy
- Include brand name if space allows

Return ONLY the meta title, nothing else.`;

          const response = await ai.generateText(prompt, { maxTokens: 100 });
          const newMetaTitle = response.content.trim().replace(/^["']|["']$/g, "");

          if (newMetaTitle && newMetaTitle.length >= 30 && newMetaTitle.length <= 70) {
            await supabase
              .from("crawled_pages")
              .update({ meta_title: newMetaTitle })
              .eq("id", page.id);

            improvements.push({
              type: "meta_title",
              target: page.url,
              before: page.meta_title || "(empty)",
              after: newMetaTitle,
              status: "applied",
            });
          }
        } catch {
          improvements.push({
            type: "meta_title",
            target: page.url,
            before: page.meta_title || "(empty)",
            after: "",
            status: "failed",
          });
        }
      }

      // Also fix product meta titles
      const { data: products } = await supabase
        .from("products")
        .select("id, name, meta_title, description")
        .eq("store_id", storeId)
        .is("meta_title", null)
        .limit(20);

      for (const product of products || []) {
        try {
          const prompt = `Generate an SEO-optimized meta title for this product:
Product: ${product.name}
Description: ${product.description?.substring(0, 200) || ""}
Store: ${store.name}

Requirements:
- 50-60 characters
- Include product name and key benefit
- Compelling for clicks

Return ONLY the meta title.`;

          const response = await ai.generateText(prompt, { maxTokens: 100 });
          const newMetaTitle = response.content.trim().replace(/^["']|["']$/g, "");

          if (newMetaTitle && newMetaTitle.length >= 30) {
            await supabase
              .from("products")
              .update({ meta_title: newMetaTitle })
              .eq("id", product.id);

            improvements.push({
              type: "product_meta_title",
              target: product.name,
              before: "(empty)",
              after: newMetaTitle,
              status: "applied",
            });
          }
        } catch {
          improvements.push({
            type: "product_meta_title",
            target: product.name,
            before: "(empty)",
            after: "",
            status: "failed",
          });
        }
      }
    }

    // Fix meta descriptions
    if (options.fixMetaDescriptions !== false) {
      const { data: pages } = await supabase
        .from("crawled_pages")
        .select("id, url, title, meta_description, content")
        .eq("store_id", storeId)
        .or("meta_description.is.null,meta_description.lt.100")
        .limit(20);

      for (const page of pages || []) {
        try {
          const prompt = `Generate an optimized meta description for this page:
URL: ${page.url}
Title: ${page.title}
Content Preview: ${page.content?.substring(0, 300) || ""}
Store: ${store.name}

Requirements:
- 150-160 characters
- Include call-to-action
- Mention key benefits
- Natural keyword inclusion

Return ONLY the meta description.`;

          const response = await ai.generateText(prompt, { maxTokens: 200 });
          const newMetaDesc = response.content.trim().replace(/^["']|["']$/g, "");

          if (newMetaDesc && newMetaDesc.length >= 100 && newMetaDesc.length <= 200) {
            await supabase
              .from("crawled_pages")
              .update({ meta_description: newMetaDesc })
              .eq("id", page.id);

            improvements.push({
              type: "meta_description",
              target: page.url,
              before: page.meta_description || "(empty)",
              after: newMetaDesc,
              status: "applied",
            });
          }
        } catch {
          improvements.push({
            type: "meta_description",
            target: page.url,
            before: page.meta_description || "(empty)",
            after: "",
            status: "failed",
          });
        }
      }

      // Also fix product meta descriptions
      const { data: products } = await supabase
        .from("products")
        .select("id, name, description, meta_description")
        .eq("store_id", storeId)
        .is("meta_description", null)
        .limit(20);

      for (const product of products || []) {
        try {
          const prompt = `Generate an SEO-optimized meta description for this product:
Product: ${product.name}
Description: ${product.description?.substring(0, 300) || ""}
Store: ${store.name}

Requirements:
- 150-160 characters
- Highlight key benefits
- Include call-to-action
- Compelling for clicks

Return ONLY the meta description.`;

          const response = await ai.generateText(prompt, { maxTokens: 200 });
          const newMetaDesc = response.content.trim().replace(/^["']|["']$/g, "");

          if (newMetaDesc && newMetaDesc.length >= 100) {
            await supabase
              .from("products")
              .update({ meta_description: newMetaDesc })
              .eq("id", product.id);

            improvements.push({
              type: "product_meta_description",
              target: product.name,
              before: "(empty)",
              after: newMetaDesc,
              status: "applied",
            });
          }
        } catch {
          improvements.push({
            type: "product_meta_description",
            target: product.name,
            before: "(empty)",
            after: "",
            status: "failed",
          });
        }
      }
    }

    // Push changes to WordPress if webhook is configured
    const { data: storeConfig } = await supabase
      .from("stores")
      .select("webhook_url, api_key")
      .eq("id", storeId)
      .single();

    if (storeConfig?.webhook_url && improvements.length > 0) {
      try {
        await fetch(storeConfig.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": storeConfig.api_key || "",
          },
          body: JSON.stringify({
            action: "bulk_update",
            improvements: improvements.filter(i => i.status === "applied"),
          }),
        });
        console.log(`[AIImprovements] Pushed ${improvements.length} changes to WordPress`);
      } catch {
        console.log("[AIImprovements] Failed to push to WordPress");
      }
    }

    console.log(`[AIImprovements] Completed. ${improvements.filter(i => i.status === "applied").length} improvements applied`);

    return {
      success: true,
      improvements,
    };
  } catch (error) {
    console.error("[AIImprovements] Error:", error);
    return {
      success: false,
      improvements,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get improvement suggestions without applying them
 */
export async function getImprovementSuggestions(
  storeId: string
): Promise<{
  data: Array<{
    type: string;
    target: string;
    currentValue: string;
    suggestedValue: string;
    reason: string;
    impact: "high" | "medium" | "low";
  }> | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const ai = getAIProvider();
  const suggestions: Array<{
    type: string;
    target: string;
    currentValue: string;
    suggestedValue: string;
    reason: string;
    impact: "high" | "medium" | "low";
  }> = [];

  try {
    // Get store
    const { data: store } = await supabase
      .from("stores")
      .select("name, url")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { data: null, error: "Store not found" };
    }

    // Get aggregated data
    const { data: analysisData } = await aggregateAllAPIData(storeId);
    const targetKeywords = analysisData?.competitorGaps.slice(0, 5).map(g => g.keyword) || [];

    // Get pages needing meta titles
    const { data: pages } = await supabase
      .from("crawled_pages")
      .select("url, title, meta_title, meta_description")
      .eq("store_id", storeId)
      .limit(30);

    for (const page of pages || []) {
      // Meta title suggestions
      if (!page.meta_title || page.meta_title.length < 40) {
        const prompt = `Generate SEO meta title for:
URL: ${page.url}
Title: ${page.title}
Target keywords: ${targetKeywords.join(", ")}
Requirements: 50-60 chars, include keyword naturally
Return ONLY the title.`;

        try {
          const response = await ai.generateText(prompt, { maxTokens: 80 });
          const suggested = response.content.trim().replace(/^["']|["']$/g, "");
          
          if (suggested.length >= 40 && suggested.length <= 70) {
            suggestions.push({
              type: "Meta Title",
              target: page.url,
              currentValue: page.meta_title || "(missing)",
              suggestedValue: suggested,
              reason: page.meta_title ? "Current title is too short" : "Meta title is missing",
              impact: "high",
            });
          }
        } catch {
          // Skip if generation fails
        }
      }

      // Meta description suggestions
      if (!page.meta_description || page.meta_description.length < 100) {
        const prompt = `Generate SEO meta description for:
URL: ${page.url}
Title: ${page.title}
Target keywords: ${targetKeywords.join(", ")}
Requirements: 150-160 chars, include CTA, mention benefits
Return ONLY the description.`;

        try {
          const response = await ai.generateText(prompt, { maxTokens: 180 });
          const suggested = response.content.trim().replace(/^["']|["']$/g, "");
          
          if (suggested.length >= 100 && suggested.length <= 180) {
            suggestions.push({
              type: "Meta Description",
              target: page.url,
              currentValue: page.meta_description || "(missing)",
              suggestedValue: suggested,
              reason: page.meta_description ? "Current description is too short" : "Meta description is missing",
              impact: "medium",
            });
          }
        } catch {
          // Skip if generation fails
        }
      }

      // Limit to 10 suggestions per type
      if (suggestions.filter(s => s.type === "Meta Title").length >= 10) break;
    }

    return { data: suggestions, error: null };
  } catch (error) {
    console.error("[ImprovementSuggestions] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
