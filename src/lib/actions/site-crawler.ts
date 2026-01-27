"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { crawlSite, quickHealthCheck, type CrawlResult, type CrawlSummary } from "@/lib/seo/site-crawler";

// Start a new site crawl
export async function startSiteCrawl(
  storeId: string,
  siteUrl: string,
  maxPages: number = 100
): Promise<{ crawlId: string | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { crawlId: null, error: "Not authenticated" };
    }
    
    const serviceClient = await createServiceClient();
    
    // Create crawl record
    const { data: crawl, error: crawlError } = await serviceClient
      .from("site_crawls")
      .insert({
        store_id: storeId,
        status: "running",
        pages_total: maxPages,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (crawlError) throw crawlError;
    
    // Run crawl in background (in production, this would be a queue job)
    crawlSite(siteUrl, {
      maxPages,
      onPageCrawled: async (result) => {
        // Save each page result
        await serviceClient.from("crawled_pages").insert({
          crawl_id: crawl.id,
          store_id: storeId,
          url: result.url,
          status_code: result.statusCode,
          title: result.title,
          meta_description: result.metaDescription,
          h1_tags: result.h1Tags,
          h2_tags: result.h2Tags,
          word_count: result.wordCount,
          internal_links: result.internalLinks,
          external_links: result.externalLinks,
          images_total: result.imagesTotal,
          images_missing_alt: result.imagesMissingAlt,
          canonical_url: result.canonicalUrl,
          has_robots_noindex: result.hasRobotsNoindex,
          has_robots_nofollow: result.hasRobotsNofollow,
          load_time_ms: result.loadTimeMs,
          issues: result.issues,
        });
        
        // Update crawl progress
        await serviceClient
          .from("site_crawls")
          .update({ pages_crawled: result.statusCode ? 1 : 0 })
          .eq("id", crawl.id);
      },
    }).then(async ({ summary }) => {
      // Update crawl as completed
      await serviceClient
        .from("site_crawls")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          summary,
        })
        .eq("id", crawl.id);
      
      revalidatePath(`/dashboard/stores/${storeId}/audit`);
    }).catch(async (error) => {
      console.error("Crawl error:", error);
      await serviceClient
        .from("site_crawls")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", crawl.id);
    });
    
    return { crawlId: crawl.id, error: null };
  } catch (error) {
    console.error("Start crawl error:", error);
    return { crawlId: null, error: "Failed to start crawl" };
  }
}

// Get crawl status
export async function getCrawlStatus(
  crawlId: string
): Promise<{
  data: {
    id: string;
    status: string;
    pagesCrawled: number;
    pagesTotal: number;
    startedAt: string;
    completedAt: string | null;
    summary: CrawlSummary | null;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const { data, error } = await supabase
      .from("site_crawls")
      .select("*")
      .eq("id", crawlId)
      .single();
    
    if (error) throw error;
    
    return {
      data: {
        id: data.id,
        status: data.status,
        pagesCrawled: data.pages_crawled || 0,
        pagesTotal: data.pages_total || 0,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        summary: data.summary,
      },
      error: null,
    };
  } catch (error) {
    console.error("Get crawl status error:", error);
    return { data: null, error: "Failed to get crawl status" };
  }
}

// Get crawl results
export async function getCrawlResults(
  crawlId: string
): Promise<{ data: CrawlResult[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const { data, error } = await supabase
      .from("crawled_pages")
      .select("*")
      .eq("crawl_id", crawlId)
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    
    const results: CrawlResult[] = (data || []).map((row) => ({
      url: row.url,
      statusCode: row.status_code || 0,
      title: row.title,
      metaDescription: row.meta_description,
      h1Tags: row.h1_tags || [],
      h2Tags: row.h2_tags || [],
      wordCount: row.word_count || 0,
      internalLinks: row.internal_links || 0,
      externalLinks: row.external_links || 0,
      imagesTotal: row.images_total || 0,
      imagesMissingAlt: row.images_missing_alt || 0,
      canonicalUrl: row.canonical_url,
      hasRobotsNoindex: row.has_robots_noindex || false,
      hasRobotsNofollow: row.has_robots_nofollow || false,
      loadTimeMs: row.load_time_ms || 0,
      issues: row.issues || [],
    }));
    
    return { data: results, error: null };
  } catch (error) {
    console.error("Get crawl results error:", error);
    return { data: null, error: "Failed to get crawl results" };
  }
}

// Get latest crawl for store
export async function getLatestCrawl(
  storeId: string
): Promise<{
  data: {
    id: string;
    status: string;
    pagesCrawled: number;
    summary: CrawlSummary | null;
    completedAt: string | null;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const { data, error } = await supabase
      .from("site_crawls")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== "PGRST116") throw error;
    
    if (!data) {
      return { data: null, error: null };
    }
    
    return {
      data: {
        id: data.id,
        status: data.status,
        pagesCrawled: data.pages_crawled || 0,
        summary: data.summary,
        completedAt: data.completed_at,
      },
      error: null,
    };
  } catch (error) {
    console.error("Get latest crawl error:", error);
    return { data: null, error: "Failed to get latest crawl" };
  }
}

// Quick health check (homepage only)
export async function runQuickHealthCheck(
  storeId: string,
  siteUrl: string
): Promise<{
  data: {
    healthy: boolean;
    score: number;
    criticalIssues: Array<{ type: string; severity: string; message: string }>;
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
    
    const result = await quickHealthCheck(siteUrl);
    
    return { data: result, error: null };
  } catch (error) {
    console.error("Health check error:", error);
    return { data: null, error: "Failed to run health check" };
  }
}

// Get crawl history
export async function getCrawlHistory(
  storeId: string,
  limit: number = 10
): Promise<{
  data: Array<{
    id: string;
    status: string;
    pagesCrawled: number;
    criticalIssues: number;
    completedAt: string | null;
  }> | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const { data, error } = await supabase
      .from("site_crawls")
      .select("id, status, pages_crawled, summary, completed_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    const history = (data || []).map((row) => ({
      id: row.id,
      status: row.status,
      pagesCrawled: row.pages_crawled || 0,
      criticalIssues: (row.summary as CrawlSummary)?.criticalIssues || 0,
      completedAt: row.completed_at,
    }));
    
    return { data: history, error: null };
  } catch (error) {
    console.error("Get crawl history error:", error);
    return { data: null, error: "Failed to get crawl history" };
  }
}

// Get pages with specific issue type
export async function getPagesWithIssue(
  crawlId: string,
  issueType: string
): Promise<{ data: CrawlResult[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    
    const { data, error } = await supabase
      .from("crawled_pages")
      .select("*")
      .eq("crawl_id", crawlId)
      .contains("issues", [{ type: issueType }]);
    
    if (error) throw error;
    
    const results: CrawlResult[] = (data || []).map((row) => ({
      url: row.url,
      statusCode: row.status_code || 0,
      title: row.title,
      metaDescription: row.meta_description,
      h1Tags: row.h1_tags || [],
      h2Tags: row.h2_tags || [],
      wordCount: row.word_count || 0,
      internalLinks: row.internal_links || 0,
      externalLinks: row.external_links || 0,
      imagesTotal: row.images_total || 0,
      imagesMissingAlt: row.images_missing_alt || 0,
      canonicalUrl: row.canonical_url,
      hasRobotsNoindex: row.has_robots_noindex || false,
      hasRobotsNofollow: row.has_robots_nofollow || false,
      loadTimeMs: row.load_time_ms || 0,
      issues: row.issues || [],
    }));
    
    return { data: results, error: null };
  } catch (error) {
    console.error("Get pages with issue error:", error);
    return { data: null, error: "Failed to get pages" };
  }
}
