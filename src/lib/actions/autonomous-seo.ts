"use server";

/**
 * Autonomous SEO Optimization
 * One-click full SEO optimization for a store using all available features
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { crawlSite, saveCrawlResults, getCrawlResults } from "@/lib/actions/site-crawler";
import { generateImprovementsFromCrawl } from "@/lib/actions/crawl-to-improvements";
import { bulkApplyImprovements } from "@/lib/actions/apply-improvements";

export interface AutoSEOProgress {
  stage: string;
  progress: number;
  message: string;
  details?: string;
  error?: string;
}

export interface AutoSEOResult {
  success: boolean;
  summary: {
    pagesScanned: number;
    issuesFound: number;
    improvementsGenerated: number;
    improvementsApplied: number;
    improvementsFailed: number;
    duration: number;
  };
  stages: {
    crawl: { success: boolean; pagesScanned: number; error?: string };
    analysis: { success: boolean; issuesFound: number; error?: string };
    improvements: { success: boolean; generated: number; error?: string };
    apply: { success: boolean; applied: number; failed: number; errors?: string[] };
  };
  error?: string;
}

/**
 * Run full autonomous SEO optimization on a store.
 * This function:
 * 1. Crawls the entire site
 * 2. Analyzes all pages for SEO issues
 * 3. Generates AI-powered improvements
 * 4. Automatically applies safe improvements to WordPress
 */
export async function runAutonomousSEO(
  storeId: string,
  options: {
    applyImprovements?: boolean; // If true, automatically applies improvements
    maxPagesToScan?: number;
    priorityThreshold?: "all" | "high" | "high_medium"; // Which priority improvements to apply
  } = {}
): Promise<AutoSEOResult> {
  const startTime = Date.now();
  const {
    applyImprovements = true,
    maxPagesToScan = 100,
    priorityThreshold = "high_medium",
  } = options;

  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const result: AutoSEOResult = {
    success: false,
    summary: {
      pagesScanned: 0,
      issuesFound: 0,
      improvementsGenerated: 0,
      improvementsApplied: 0,
      improvementsFailed: 0,
      duration: 0,
    },
    stages: {
      crawl: { success: false, pagesScanned: 0 },
      analysis: { success: false, issuesFound: 0 },
      improvements: { success: false, generated: 0 },
      apply: { success: false, applied: 0, failed: 0 },
    },
  };

  try {
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      result.error = "Not authenticated";
      return result;
    }

    // Get store details
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, url, name, status")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      result.error = "Store not found";
      return result;
    }

    if (store.status !== "connected") {
      result.error = "Store not connected. Please connect the WordPress plugin first.";
      return result;
    }

    // Create autonomous SEO run record
    const { data: seoRun, error: runError } = await serviceClient
      .from("autonomous_seo_runs")
      .insert({
        store_id: storeId,
        status: "running",
        started_at: new Date().toISOString(),
        options: { applyImprovements, maxPagesToScan, priorityThreshold },
      })
      .select()
      .single();

    if (runError) {
      console.error("Failed to create SEO run record:", runError);
      // Continue anyway
    }

    const runId = seoRun?.id;

    // Helper to update progress
    const updateProgress = async (stage: string, progress: number, message: string) => {
      if (runId) {
        await serviceClient
          .from("autonomous_seo_runs")
          .update({
            current_stage: stage,
            progress,
            last_message: message,
          })
          .eq("id", runId);
      }
      console.log(`[AutoSEO] ${stage}: ${message} (${progress}%)`);
    };

    // ==================== STAGE 1: CRAWL ====================
    await updateProgress("crawl", 5, "Starting site crawl...");

    try {
      // Create a new crawl
      const { data: crawl, error: crawlCreateError } = await serviceClient
        .from("site_crawls")
        .insert({
          store_id: storeId,
          status: "running",
          started_at: new Date().toISOString(),
          pages_found: 0,
          pages_crawled: 0,
        })
        .select()
        .single();

      if (crawlCreateError || !crawl) {
        throw new Error("Failed to create crawl record");
      }

      await updateProgress("crawl", 10, "Crawling site pages...");

      // Perform the crawl
      const crawlResult = await crawlSite(store.url, {
        maxPages: maxPagesToScan,
        respectRobots: true,
        timeout: 30000,
      });

      if (crawlResult.pages.length === 0) {
        throw new Error("No pages found during crawl");
      }

      await updateProgress("crawl", 30, `Found ${crawlResult.pages.length} pages, saving results...`);

      // Save crawl results
      await saveCrawlResults(storeId, crawl.id, crawlResult);

      // Update crawl status
      await serviceClient
        .from("site_crawls")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          pages_found: crawlResult.summary.totalPages,
          pages_crawled: crawlResult.pages.length,
        })
        .eq("id", crawl.id);

      result.stages.crawl = {
        success: true,
        pagesScanned: crawlResult.pages.length,
      };
      result.summary.pagesScanned = crawlResult.pages.length;

      await updateProgress("crawl", 40, `Crawl complete: ${crawlResult.pages.length} pages scanned`);

      // ==================== STAGE 2: ANALYSIS ====================
      await updateProgress("analysis", 45, "Analyzing pages for SEO issues...");

      // Generate improvements from crawl
      const improvementResult = await generateImprovementsFromCrawl(storeId, crawl.id);

      if (improvementResult.error) {
        console.warn("Improvement generation had errors:", improvementResult.error);
      }

      result.stages.improvements = {
        success: true,
        generated: improvementResult.count,
      };
      result.summary.improvementsGenerated = improvementResult.count;

      await updateProgress("analysis", 60, `Generated ${improvementResult.count} improvement suggestions`);

      // Get issue counts for summary
      const { count: issueCount } = await serviceClient
        .from("seo_improvements")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", "pending");

      result.stages.analysis = {
        success: true,
        issuesFound: issueCount || improvementResult.count,
      };
      result.summary.issuesFound = issueCount || improvementResult.count;

      // ==================== STAGE 3: APPLY IMPROVEMENTS ====================
      if (applyImprovements && improvementResult.count > 0) {
        await updateProgress("apply", 65, "Preparing to apply improvements...");

        // Get improvements to apply based on priority threshold
        let priorityFilter: string[] = [];
        switch (priorityThreshold) {
          case "high":
            priorityFilter = ["high"];
            break;
          case "high_medium":
            priorityFilter = ["high", "medium"];
            break;
          case "all":
            priorityFilter = ["high", "medium", "low"];
            break;
        }

        // Get safe-to-apply improvements
        // Safe improvements are ones that can be automatically applied without risk
        const safeTypes = [
          "missing_title",
          "missing_description",
          "missing_h1",
          "images_missing_alt",
          "missing_og_title",
          "missing_og_description",
          "missing_product_schema",
          "missing_article_schema",
          "missing_faq_schema",
          "missing_author_info",
        ];

        const { data: improvementsToApply } = await serviceClient
          .from("seo_improvements")
          .select("id, improvement_type, priority")
          .eq("store_id", storeId)
          .eq("status", "pending")
          .in("priority", priorityFilter)
          .in("improvement_type", safeTypes)
          .limit(50); // Limit to prevent timeout

        if (improvementsToApply && improvementsToApply.length > 0) {
          await updateProgress(
            "apply",
            70,
            `Applying ${improvementsToApply.length} safe improvements...`
          );

          const improvementIds = improvementsToApply.map((i) => i.id);
          const applyResult = await bulkApplyImprovements(storeId, improvementIds);

          result.stages.apply = {
            success: applyResult.applied > 0,
            applied: applyResult.applied,
            failed: applyResult.failed,
            errors: applyResult.errors.length > 0 ? applyResult.errors : undefined,
          };
          result.summary.improvementsApplied = applyResult.applied;
          result.summary.improvementsFailed = applyResult.failed;

          await updateProgress(
            "apply",
            90,
            `Applied ${applyResult.applied} improvements (${applyResult.failed} failed)`
          );
        } else {
          result.stages.apply = {
            success: true,
            applied: 0,
            failed: 0,
          };
          await updateProgress("apply", 90, "No safe improvements to apply automatically");
        }
      } else {
        result.stages.apply = {
          success: true,
          applied: 0,
          failed: 0,
        };
        await updateProgress("apply", 90, "Skipped automatic application");
      }

      // ==================== COMPLETE ====================
      result.success = true;
      result.summary.duration = Date.now() - startTime;

      // Update run record
      if (runId) {
        await serviceClient
          .from("autonomous_seo_runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            result: result,
          })
          .eq("id", runId);
      }

      await updateProgress("complete", 100, "Autonomous SEO optimization complete!");

      revalidatePath(`/dashboard/stores/${storeId}`);
      revalidatePath(`/dashboard/stores/${storeId}/improvements`);
      revalidatePath(`/dashboard/stores/${storeId}/audit`);

      return result;
    } catch (crawlError) {
      result.stages.crawl.error =
        crawlError instanceof Error ? crawlError.message : "Crawl failed";
      throw crawlError;
    }
  } catch (error) {
    console.error("Autonomous SEO error:", error);
    result.error = error instanceof Error ? error.message : "Unknown error";
    result.summary.duration = Date.now() - startTime;
    return result;
  }
}

/**
 * Get the status of the latest autonomous SEO run for a store.
 */
export async function getLatestAutoSEOStatus(storeId: string): Promise<{
  data: {
    id: string;
    status: string;
    currentStage: string;
    progress: number;
    lastMessage: string;
    startedAt: string;
    completedAt?: string;
    result?: AutoSEOResult;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }

    const serviceClient = await createServiceClient();
    const { data, error } = await serviceClient
      .from("autonomous_seo_runs")
      .select("*")
      .eq("store_id", storeId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    return {
      data: {
        id: data.id,
        status: data.status,
        currentStage: data.current_stage || "pending",
        progress: data.progress || 0,
        lastMessage: data.last_message || "",
        startedAt: data.started_at,
        completedAt: data.completed_at,
        result: data.result,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error getting auto SEO status:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get history of autonomous SEO runs for a store.
 */
export async function getAutoSEOHistory(
  storeId: string,
  limit: number = 10
): Promise<{
  data: Array<{
    id: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    result?: AutoSEOResult;
  }>;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: "Not authenticated" };
    }

    const serviceClient = await createServiceClient();
    const { data, error } = await serviceClient
      .from("autonomous_seo_runs")
      .select("id, status, started_at, completed_at, result")
      .eq("store_id", storeId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: error.message };
    }

    return {
      data: (data || []).map((run) => ({
        id: run.id,
        status: run.status,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        result: run.result,
      })),
      error: null,
    };
  } catch (error) {
    console.error("Error getting auto SEO history:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Schedule autonomous SEO to run on a schedule.
 */
export async function scheduleAutoSEO(
  storeId: string,
  schedule: "daily" | "weekly" | "monthly" | "disabled"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const serviceClient = await createServiceClient();

    // Calculate next run time
    let nextRun: Date | null = null;
    if (schedule !== "disabled") {
      nextRun = new Date();
      switch (schedule) {
        case "daily":
          nextRun.setDate(nextRun.getDate() + 1);
          nextRun.setHours(3, 0, 0, 0); // 3 AM
          break;
        case "weekly":
          nextRun.setDate(nextRun.getDate() + 7);
          nextRun.setHours(3, 0, 0, 0);
          break;
        case "monthly":
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setHours(3, 0, 0, 0);
          break;
      }
    }

    await serviceClient.from("stores").update({
      auto_seo_schedule: schedule,
      auto_seo_next_run: nextRun?.toISOString() || null,
    }).eq("id", storeId);

    revalidatePath(`/dashboard/stores/${storeId}`);

    return { success: true };
  } catch (error) {
    console.error("Error scheduling auto SEO:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
