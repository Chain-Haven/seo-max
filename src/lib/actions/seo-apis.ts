"use server";

/**
 * SEO API Integrations
 * Support for SerpAPI, DataForSEO, Ahrefs, Moz, and Semrush
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveCredentials } from "./api-credentials";

// ============================================================
// TYPES
// ============================================================

export interface SerpResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  domain: string;
}

export interface SerpAnalysisResult {
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  cpc: number | null;
  results: SerpResult[];
  featuredSnippet: {
    exists: boolean;
    type?: string;
    content?: string;
  };
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  localPack: boolean;
  imageCarousel: boolean;
  videoCarousel: boolean;
  knowledgePanel: boolean;
  timestamp: string;
}

export interface BacklinkData {
  url: string;
  anchorText: string;
  domainAuthority: number;
  pageAuthority: number;
  dofollow: boolean;
  firstSeen: string;
  lastSeen: string;
  sourceUrl: string;
  sourceDomain: string;
}

export interface DomainMetrics {
  domainAuthority: number;
  pageAuthority: number;
  totalBacklinks: number;
  referringDomains: number;
  organicTraffic: number | null;
  organicKeywords: number | null;
  spamScore: number;
}

export interface CompetitorData {
  domain: string;
  metrics: DomainMetrics;
  commonKeywords: number;
  keywordGap: number;
  trafficShare: number;
}

// ============================================================
// SERPAPI INTEGRATION
// ============================================================

export async function searchSerpApi(
  keyword: string,
  options: {
    location?: string;
    device?: "desktop" | "mobile";
    country?: string;
    storeId?: string;
  } = {}
): Promise<{ data: SerpAnalysisResult | null; error: string | null }> {
  let apiKey: string | null = null;

  // Get API key from store credentials or env
  if (options.storeId) {
    const creds = await getEffectiveCredentials(options.storeId);
    apiKey = creds.serpApiKey;
  }
  apiKey = apiKey || process.env.SERP_API_KEY || null;

  if (!apiKey) {
    // Return simulated data for demo
    return {
      data: generateSimulatedSerpData(keyword),
      error: null,
    };
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      q: keyword,
      engine: "google",
      location: options.location || "United States",
      device: options.device || "desktop",
      gl: options.country || "us",
      hl: "en",
    });

    const response = await fetch(`https://serpapi.com/search?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { data: null, error: errorData.error || "SerpAPI request failed" };
    }

    const data = await response.json();

    // Parse results
    const results: SerpResult[] = (data.organic_results || []).slice(0, 20).map(
      (r: {
        position: number;
        title: string;
        link: string;
        snippet: string;
      }) => ({
        position: r.position,
        title: r.title,
        link: r.link,
        snippet: r.snippet,
        domain: new URL(r.link).hostname,
      })
    );

    const serpAnalysis: SerpAnalysisResult = {
      keyword,
      searchVolume: data.search_information?.total_results || null,
      difficulty: null, // SerpAPI doesn't provide this directly
      cpc: null,
      results,
      featuredSnippet: {
        exists: !!data.answer_box || !!data.featured_snippet,
        type: data.answer_box?.type || data.featured_snippet?.type,
        content:
          data.answer_box?.answer ||
          data.answer_box?.snippet ||
          data.featured_snippet?.snippet,
      },
      peopleAlsoAsk: (data.related_questions || []).map(
        (q: { question: string }) => q.question
      ),
      relatedSearches: (data.related_searches || []).map(
        (s: { query: string }) => s.query
      ),
      localPack: !!data.local_results,
      imageCarousel: !!data.inline_images,
      videoCarousel: !!data.inline_videos,
      knowledgePanel: !!data.knowledge_graph,
      timestamp: new Date().toISOString(),
    };

    return { data: serpAnalysis, error: null };
  } catch (error) {
    console.error("[SerpAPI] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "SerpAPI request failed",
    };
  }
}

// ============================================================
// DATAFORSEO INTEGRATION
// ============================================================

export async function getDataForSEOKeywordData(
  keywords: string[],
  options: {
    location?: string;
    language?: string;
  } = {}
): Promise<{
  data: Array<{
    keyword: string;
    searchVolume: number;
    cpc: number;
    competition: number;
    difficulty: number;
  }> | null;
  error: string | null;
}> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    // Return simulated data
    return {
      data: keywords.map((keyword) => ({
        keyword,
        searchVolume: Math.floor(Math.random() * 10000) + 100,
        cpc: Math.random() * 5 + 0.5,
        competition: Math.random(),
        difficulty: Math.floor(Math.random() * 100),
      })),
      error: null,
    };
  }

  try {
    const auth = Buffer.from(`${login}:${password}`).toString("base64");

    const response = await fetch(
      "https://api.dataforseo.com/v3/keywords_data/google/search_volume/live",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keywords,
            location_name: options.location || "United States",
            language_name: options.language || "English",
          },
        ]),
      }
    );

    if (!response.ok) {
      return { data: null, error: "DataForSEO request failed" };
    }

    const result = await response.json();

    if (result.tasks?.[0]?.result) {
      const data = result.tasks[0].result.map(
        (item: {
          keyword: string;
          search_volume: number;
          cpc: number;
          competition: number;
          keyword_difficulty: number;
        }) => ({
          keyword: item.keyword,
          searchVolume: item.search_volume || 0,
          cpc: item.cpc || 0,
          competition: item.competition || 0,
          difficulty: item.keyword_difficulty || 0,
        })
      );
      return { data, error: null };
    }

    return { data: null, error: "No data returned" };
  } catch (error) {
    console.error("[DataForSEO] Error:", error);
    return { data: null, error: "DataForSEO request failed" };
  }
}

export async function getDataForSEOCompetitors(
  domain: string,
  options: {
    location?: string;
    limit?: number;
  } = {}
): Promise<{
  data: CompetitorData[] | null;
  error: string | null;
}> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    // Return simulated data
    return {
      data: generateSimulatedCompetitors(domain),
      error: null,
    };
  }

  try {
    const auth = Buffer.from(`${login}:${password}`).toString("base64");

    const response = await fetch(
      "https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            target: domain,
            location_name: options.location || "United States",
            language_name: "English",
            limit: options.limit || 10,
          },
        ]),
      }
    );

    if (!response.ok) {
      return { data: null, error: "DataForSEO request failed" };
    }

    const result = await response.json();

    if (result.tasks?.[0]?.result?.[0]?.items) {
      const data: CompetitorData[] = result.tasks[0].result[0].items.map(
        (item: {
          domain: string;
          avg_position: number;
          intersections: number;
          full_domain_metrics: {
            organic: {
              pos_1: number;
              count: number;
              etv: number;
            };
          };
        }) => ({
          domain: item.domain,
          metrics: {
            domainAuthority: Math.round((1 / (item.avg_position || 10)) * 100),
            pageAuthority: 0,
            totalBacklinks: 0,
            referringDomains: 0,
            organicTraffic: item.full_domain_metrics?.organic?.etv || null,
            organicKeywords: item.full_domain_metrics?.organic?.count || null,
            spamScore: 0,
          },
          commonKeywords: item.intersections || 0,
          keywordGap: 0,
          trafficShare: 0,
        })
      );
      return { data, error: null };
    }

    return { data: null, error: "No competitors found" };
  } catch (error) {
    console.error("[DataForSEO] Competitors error:", error);
    return { data: null, error: "DataForSEO request failed" };
  }
}

// ============================================================
// MOZ API INTEGRATION
// ============================================================

export async function getMozDomainMetrics(
  domain: string
): Promise<{ data: DomainMetrics | null; error: string | null }> {
  const accessId = process.env.MOZ_ACCESS_ID;
  const secretKey = process.env.MOZ_SECRET_KEY;

  if (!accessId || !secretKey) {
    // Return simulated data
    return {
      data: generateSimulatedDomainMetrics(domain),
      error: null,
    };
  }

  try {
    const expires = Math.floor(Date.now() / 1000) + 300;
    const crypto = await import("crypto");
    const signature = crypto
      .createHmac("sha1", secretKey)
      .update(`${accessId}\n${expires}`)
      .digest("base64");

    const response = await fetch(
      `https://lsapi.seomoz.com/v2/url_metrics?site=${encodeURIComponent(
        domain
      )}&AccessID=${accessId}&Expires=${expires}&Signature=${encodeURIComponent(
        signature
      )}`,
      { method: "GET" }
    );

    if (!response.ok) {
      return { data: null, error: "Moz API request failed" };
    }

    const result = await response.json();

    return {
      data: {
        domainAuthority: result.domain_authority || 0,
        pageAuthority: result.page_authority || 0,
        totalBacklinks: result.links || 0,
        referringDomains: result.root_domains_to_root_domain || 0,
        organicTraffic: null,
        organicKeywords: null,
        spamScore: result.spam_score || 0,
      },
      error: null,
    };
  } catch (error) {
    console.error("[Moz] Error:", error);
    return { data: null, error: "Moz API request failed" };
  }
}

// ============================================================
// AHREFS API INTEGRATION
// ============================================================

export async function getAhrefsBacklinks(
  domain: string,
  options: {
    limit?: number;
    mode?: "domain" | "exact" | "prefix";
  } = {}
): Promise<{ data: BacklinkData[] | null; error: string | null }> {
  const apiKey = process.env.AHREFS_API_KEY;

  if (!apiKey) {
    // Return simulated data
    return {
      data: generateSimulatedBacklinks(domain, options.limit || 50),
      error: null,
    };
  }

  try {
    const response = await fetch(
      `https://api.ahrefs.com/v3/site-explorer/backlinks?target=${encodeURIComponent(
        domain
      )}&mode=${options.mode || "domain"}&limit=${options.limit || 50}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return { data: null, error: "Ahrefs API request failed" };
    }

    const result = await response.json();

    const backlinks: BacklinkData[] = (result.backlinks || []).map(
      (bl: {
        url_to: string;
        anchor: string;
        domain_rating: number;
        url_rating: number;
        is_dofollow: boolean;
        first_seen: string;
        last_seen: string;
        url_from: string;
      }) => ({
        url: bl.url_to,
        anchorText: bl.anchor || "",
        domainAuthority: bl.domain_rating || 0,
        pageAuthority: bl.url_rating || 0,
        dofollow: bl.is_dofollow !== false,
        firstSeen: bl.first_seen,
        lastSeen: bl.last_seen,
        sourceUrl: bl.url_from,
        sourceDomain: new URL(bl.url_from).hostname,
      })
    );

    return { data: backlinks, error: null };
  } catch (error) {
    console.error("[Ahrefs] Error:", error);
    return { data: null, error: "Ahrefs API request failed" };
  }
}

export async function getAhrefsDomainMetrics(
  domain: string
): Promise<{ data: DomainMetrics | null; error: string | null }> {
  const apiKey = process.env.AHREFS_API_KEY;

  if (!apiKey) {
    return {
      data: generateSimulatedDomainMetrics(domain),
      error: null,
    };
  }

  try {
    const response = await fetch(
      `https://api.ahrefs.com/v3/site-explorer/domain-rating?target=${encodeURIComponent(
        domain
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return { data: null, error: "Ahrefs API request failed" };
    }

    const result = await response.json();

    return {
      data: {
        domainAuthority: result.domain_rating || 0,
        pageAuthority: 0,
        totalBacklinks: result.backlinks || 0,
        referringDomains: result.referring_domains || 0,
        organicTraffic: result.organic_traffic || null,
        organicKeywords: result.organic_keywords || null,
        spamScore: 0,
      },
      error: null,
    };
  } catch (error) {
    console.error("[Ahrefs] Domain metrics error:", error);
    return { data: null, error: "Ahrefs API request failed" };
  }
}

// ============================================================
// SEMRUSH API INTEGRATION
// ============================================================

export async function getSemrushKeywordOverview(
  keywords: string[],
  options: {
    database?: string;
  } = {}
): Promise<{
  data: Array<{
    keyword: string;
    searchVolume: number;
    cpc: number;
    competition: number;
    difficulty: number;
    trend: number[];
  }> | null;
  error: string | null;
}> {
  const apiKey = process.env.SEMRUSH_API_KEY;

  if (!apiKey) {
    // Return simulated data
    return {
      data: keywords.map((keyword) => ({
        keyword,
        searchVolume: Math.floor(Math.random() * 10000) + 100,
        cpc: Math.random() * 5 + 0.5,
        competition: Math.random(),
        difficulty: Math.floor(Math.random() * 100),
        trend: Array(12)
          .fill(0)
          .map(() => Math.random()),
      })),
      error: null,
    };
  }

  try {
    const database = options.database || "us";
    const keywordList = keywords.join(";");

    const response = await fetch(
      `https://api.semrush.com/?type=phrase_all&key=${apiKey}&phrase=${encodeURIComponent(
        keywordList
      )}&database=${database}&export_columns=Ph,Nq,Cp,Co,Nr,Td`,
      { method: "GET" }
    );

    if (!response.ok) {
      return { data: null, error: "Semrush API request failed" };
    }

    const text = await response.text();
    const lines = text.trim().split("\n");

    // Skip header
    const data = lines.slice(1).map((line) => {
      const [keyword, volume, cpc, competition, results, trend] =
        line.split(";");
      return {
        keyword,
        searchVolume: parseInt(volume) || 0,
        cpc: parseFloat(cpc) || 0,
        competition: parseFloat(competition) || 0,
        difficulty: Math.round(parseFloat(competition) * 100) || 0,
        trend: trend
          ? trend.split(",").map((t) => parseFloat(t))
          : Array(12).fill(0),
      };
    });

    return { data, error: null };
  } catch (error) {
    console.error("[Semrush] Error:", error);
    return { data: null, error: "Semrush API request failed" };
  }
}

// ============================================================
// SEO HEALTH SCORE
// ============================================================

export interface SEOHealthScore {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  categories: {
    technical: { score: number; issues: string[]; passed: string[] };
    content: { score: number; issues: string[]; passed: string[] };
    backlinks: { score: number; issues: string[]; passed: string[] };
    rankings: { score: number; issues: string[]; passed: string[] };
    speed: { score: number; issues: string[]; passed: string[] };
  };
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    category: string;
    issue: string;
    fix: string;
    impact: string;
  }>;
  lastChecked: string;
}

export async function calculateSEOHealthScore(
  storeId: string
): Promise<{ data: SEOHealthScore | null; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get store data
    const { data: store } = await supabase
      .from("stores")
      .select("url, status")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { data: null, error: "Store not found" };
    }

    // Get latest crawl
    const { data: crawl } = await supabase
      .from("site_crawls")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    // Get crawled pages with issues
    const { data: pages } = await supabase
      .from("crawled_pages")
      .select("issues, status_code, meta_description, title, images_missing_alt")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(100);

    // Get backlinks
    const { data: backlinks } = await supabase
      .from("backlinks")
      .select("domain_authority, status, is_dofollow")
      .eq("store_id", storeId);

    // Get keyword rankings
    const { data: rankings } = await supabase
      .from("keyword_rankings")
      .select("position")
      .eq("store_id", storeId)
      .order("checked_at", { ascending: false })
      .limit(50);

    // Calculate scores
    const technicalScore = calculateTechnicalScore(pages || []);
    const contentScore = calculateContentScore(pages || []);
    const backlinkScore = calculateBacklinkScore(backlinks || []);
    const rankingScore = calculateRankingScore(rankings || []);
    const speedScore = crawl?.pages_with_issues
      ? Math.max(0, 100 - crawl.pages_with_issues * 2)
      : 70;

    const overall = Math.round(
      technicalScore.score * 0.25 +
        contentScore.score * 0.25 +
        backlinkScore.score * 0.2 +
        rankingScore.score * 0.2 +
        speedScore * 0.1
    );

    const grade =
      overall >= 90
        ? "A"
        : overall >= 80
        ? "B"
        : overall >= 70
        ? "C"
        : overall >= 60
        ? "D"
        : "F";

    // Generate recommendations
    const recommendations = generateRecommendations({
      technical: technicalScore,
      content: contentScore,
      backlinks: backlinkScore,
      rankings: rankingScore,
      speed: { score: speedScore, issues: [] },
    });

    const healthScore: SEOHealthScore = {
      overall,
      grade,
      categories: {
        technical: technicalScore,
        content: contentScore,
        backlinks: backlinkScore,
        rankings: rankingScore,
        speed: { score: speedScore, issues: [], passed: ["Site loads"] },
      },
      recommendations,
      lastChecked: new Date().toISOString(),
    };

    return { data: healthScore, error: null };
  } catch (error) {
    console.error("[SEO Health] Error:", error);
    return { data: null, error: "Failed to calculate SEO health score" };
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateTechnicalScore(
  pages: Array<{
    issues?: string[];
    status_code?: number;
    meta_description?: string;
    title?: string;
  }>
): { score: number; issues: string[]; passed: string[] } {
  const issues: string[] = [];
  const passed: string[] = [];
  let score = 100;

  // Check for 404s
  const error404s = pages.filter((p) => p.status_code === 404).length;
  if (error404s > 0) {
    issues.push(`${error404s} pages return 404 errors`);
    score -= error404s * 5;
  } else {
    passed.push("No 404 errors");
  }

  // Check for missing meta descriptions
  const missingMeta = pages.filter(
    (p) => !p.meta_description || p.meta_description.length < 50
  ).length;
  if (missingMeta > 0) {
    issues.push(`${missingMeta} pages missing/short meta descriptions`);
    score -= missingMeta * 2;
  } else {
    passed.push("All pages have meta descriptions");
  }

  // Check for missing titles
  const missingTitles = pages.filter((p) => !p.title || p.title.length < 10).length;
  if (missingTitles > 0) {
    issues.push(`${missingTitles} pages missing/short titles`);
    score -= missingTitles * 3;
  } else {
    passed.push("All pages have titles");
  }

  return { score: Math.max(0, score), issues, passed };
}

function calculateContentScore(
  pages: Array<{
    issues?: string[];
    images_missing_alt?: number;
  }>
): { score: number; issues: string[]; passed: string[] } {
  const issues: string[] = [];
  const passed: string[] = [];
  let score = 100;

  // Check for images missing alt
  const totalMissingAlt = pages.reduce(
    (sum, p) => sum + (p.images_missing_alt || 0),
    0
  );
  if (totalMissingAlt > 0) {
    issues.push(`${totalMissingAlt} images missing alt text`);
    score -= Math.min(30, totalMissingAlt);
  } else {
    passed.push("All images have alt text");
  }

  // Check page issues
  const pagesWithIssues = pages.filter(
    (p) => p.issues && p.issues.length > 0
  ).length;
  if (pagesWithIssues > 0) {
    issues.push(`${pagesWithIssues} pages have SEO issues`);
    score -= pagesWithIssues * 2;
  } else {
    passed.push("No content issues detected");
  }

  return { score: Math.max(0, score), issues, passed };
}

function calculateBacklinkScore(
  backlinks: Array<{
    domain_authority?: number;
    status?: string;
    is_dofollow?: boolean;
  }>
): { score: number; issues: string[]; passed: string[] } {
  const issues: string[] = [];
  const passed: string[] = [];

  if (backlinks.length === 0) {
    return { score: 30, issues: ["No backlinks tracked"], passed: [] };
  }

  let score = 70;

  // Check backlink quality
  const avgDA =
    backlinks.reduce((sum, bl) => sum + (bl.domain_authority || 0), 0) /
    backlinks.length;
  if (avgDA >= 40) {
    score += 15;
    passed.push("Good average domain authority");
  } else if (avgDA < 20) {
    issues.push("Low average domain authority");
    score -= 10;
  }

  // Check dofollow ratio
  const dofollowRatio =
    backlinks.filter((bl) => bl.is_dofollow).length / backlinks.length;
  if (dofollowRatio >= 0.7) {
    score += 15;
    passed.push("Good dofollow ratio");
  } else if (dofollowRatio < 0.5) {
    issues.push("Low dofollow ratio");
    score -= 10;
  }

  // Check for lost backlinks
  const lostBacklinks = backlinks.filter((bl) => bl.status === "lost").length;
  if (lostBacklinks > 0) {
    issues.push(`${lostBacklinks} backlinks lost recently`);
    score -= lostBacklinks * 2;
  }

  return { score: Math.max(0, Math.min(100, score)), issues, passed };
}

function calculateRankingScore(
  rankings: Array<{ position?: number }>
): { score: number; issues: string[]; passed: string[] } {
  const issues: string[] = [];
  const passed: string[] = [];

  if (rankings.length === 0) {
    return { score: 50, issues: ["No keywords tracked"], passed: [] };
  }

  const positions = rankings.map((r) => r.position || 100);
  const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;

  // Calculate score based on average position
  let score = Math.max(0, 100 - avgPosition * 2);

  // Bonus for top 10 rankings
  const top10 = positions.filter((p) => p <= 10).length;
  if (top10 > 0) {
    passed.push(`${top10} keywords in top 10`);
    score += top10 * 2;
  }

  // Penalty for poor rankings
  const below50 = positions.filter((p) => p > 50).length;
  if (below50 > rankings.length / 2) {
    issues.push("Most keywords ranking below position 50");
    score -= 10;
  }

  return { score: Math.max(0, Math.min(100, score)), issues, passed };
}

function generateRecommendations(categories: {
  technical: { score: number; issues: string[] };
  content: { score: number; issues: string[] };
  backlinks: { score: number; issues: string[] };
  rankings: { score: number; issues: string[] };
  speed: { score: number; issues: string[] };
}): SEOHealthScore["recommendations"] {
  const recommendations: SEOHealthScore["recommendations"] = [];

  // Technical recommendations
  if (categories.technical.score < 80) {
    categories.technical.issues.forEach((issue) => {
      recommendations.push({
        priority: categories.technical.score < 60 ? "high" : "medium",
        category: "Technical SEO",
        issue,
        fix: getTechnicalFix(issue),
        impact: "Improves crawlability and indexing",
      });
    });
  }

  // Content recommendations
  if (categories.content.score < 80) {
    categories.content.issues.forEach((issue) => {
      recommendations.push({
        priority: "medium",
        category: "Content",
        issue,
        fix: getContentFix(issue),
        impact: "Improves user experience and relevance signals",
      });
    });
  }

  // Backlink recommendations
  if (categories.backlinks.score < 70) {
    recommendations.push({
      priority: categories.backlinks.score < 50 ? "high" : "medium",
      category: "Backlinks",
      issue: "Backlink profile needs improvement",
      fix: "Focus on acquiring high-quality backlinks from relevant domains",
      impact: "Increases domain authority and rankings",
    });
  }

  // Ranking recommendations
  if (categories.rankings.score < 70) {
    recommendations.push({
      priority: "high",
      category: "Rankings",
      issue: "Keyword rankings need improvement",
      fix: "Optimize content for target keywords and build topical authority",
      impact: "Increases organic traffic",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations.slice(0, 10);
}

function getTechnicalFix(issue: string): string {
  if (issue.includes("404")) return "Fix broken links or set up proper redirects";
  if (issue.includes("meta description"))
    return "Add unique, compelling meta descriptions (150-160 chars)";
  if (issue.includes("title")) return "Add descriptive titles with target keywords";
  return "Review and fix technical SEO issues";
}

function getContentFix(issue: string): string {
  if (issue.includes("alt text")) return "Add descriptive alt text to all images";
  if (issue.includes("issues")) return "Review content quality and optimize for SEO";
  return "Improve content quality and relevance";
}

// ============================================================
// SIMULATED DATA GENERATORS
// ============================================================

function generateSimulatedSerpData(keyword: string): SerpAnalysisResult {
  const competitors = [
    "example.com",
    "competitor1.com",
    "competitor2.com",
    "wikipedia.org",
    "amazon.com",
  ];

  return {
    keyword,
    searchVolume: Math.floor(Math.random() * 50000) + 1000,
    difficulty: Math.floor(Math.random() * 100),
    cpc: Math.random() * 10,
    results: Array(10)
      .fill(null)
      .map((_, i) => ({
        position: i + 1,
        title: `${keyword} - Top Result ${i + 1}`,
        link: `https://${competitors[i % competitors.length]}/page-${i + 1}`,
        snippet: `This is a sample snippet about ${keyword}. Learn more about this topic and discover helpful information.`,
        domain: competitors[i % competitors.length],
      })),
    featuredSnippet: {
      exists: Math.random() > 0.5,
      type: "paragraph",
      content: `Featured snippet about ${keyword}`,
    },
    peopleAlsoAsk: [
      `What is ${keyword}?`,
      `How to ${keyword}?`,
      `Why is ${keyword} important?`,
      `Best ${keyword} practices`,
    ],
    relatedSearches: [
      `${keyword} guide`,
      `${keyword} tips`,
      `${keyword} examples`,
      `${keyword} tools`,
    ],
    localPack: Math.random() > 0.7,
    imageCarousel: Math.random() > 0.5,
    videoCarousel: Math.random() > 0.6,
    knowledgePanel: Math.random() > 0.8,
    timestamp: new Date().toISOString(),
  };
}

function generateSimulatedCompetitors(domain: string): CompetitorData[] {
  const competitors = [
    "competitor1.com",
    "competitor2.com",
    "competitor3.com",
    "industry-leader.com",
    "local-rival.com",
  ];

  return competitors.map((comp) => ({
    domain: comp,
    metrics: {
      domainAuthority: Math.floor(Math.random() * 60) + 20,
      pageAuthority: Math.floor(Math.random() * 50) + 30,
      totalBacklinks: Math.floor(Math.random() * 100000) + 1000,
      referringDomains: Math.floor(Math.random() * 5000) + 100,
      organicTraffic: Math.floor(Math.random() * 500000) + 10000,
      organicKeywords: Math.floor(Math.random() * 10000) + 500,
      spamScore: Math.floor(Math.random() * 20),
    },
    commonKeywords: Math.floor(Math.random() * 500) + 50,
    keywordGap: Math.floor(Math.random() * 1000) + 100,
    trafficShare: Math.random() * 0.3,
  }));
}

function generateSimulatedDomainMetrics(domain: string): DomainMetrics {
  return {
    domainAuthority: Math.floor(Math.random() * 60) + 20,
    pageAuthority: Math.floor(Math.random() * 50) + 30,
    totalBacklinks: Math.floor(Math.random() * 50000) + 500,
    referringDomains: Math.floor(Math.random() * 2000) + 50,
    organicTraffic: Math.floor(Math.random() * 100000) + 1000,
    organicKeywords: Math.floor(Math.random() * 5000) + 100,
    spamScore: Math.floor(Math.random() * 15),
  };
}

function generateSimulatedBacklinks(domain: string, limit: number): BacklinkData[] {
  const sources = [
    "blog.example.com",
    "news.site.com",
    "directory.org",
    "forum.community.com",
    "review-site.com",
  ];

  return Array(Math.min(limit, 50))
    .fill(null)
    .map((_, i) => ({
      url: `https://${domain}/page-${i + 1}`,
      anchorText: `anchor text ${i + 1}`,
      domainAuthority: Math.floor(Math.random() * 80) + 10,
      pageAuthority: Math.floor(Math.random() * 70) + 20,
      dofollow: Math.random() > 0.3,
      firstSeen: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      lastSeen: new Date().toISOString(),
      sourceUrl: `https://${sources[i % sources.length]}/article-${i}`,
      sourceDomain: sources[i % sources.length],
    }));
}
