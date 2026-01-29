"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchCoreWebVitals, evaluateWebVitals, getPerformanceOpportunities } from "@/lib/seo/core-web-vitals";
import { checkLocalRanking, checkNAPConsistency } from "@/lib/seo/local-seo-enhanced";
import { detectOrphanPagesAction } from "@/lib/actions/comprehensive-seo";

// ==================== CORE WEB VITALS ====================

export async function checkCoreWebVitals(
  storeId: string,
  url: string,
  device: "mobile" | "desktop" = "mobile"
): Promise<{
  data: {
    score: number;
    vitals: { lcp: number; fid: number; cls: number };
    recommendations: string[];
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    // Get API key
    const { data: store } = await supabase
      .from("stores")
      .select("google_pagespeed_key")
      .eq("id", storeId)
      .single();

    const vitals = await fetchCoreWebVitals(url, device, store?.google_pagespeed_key || undefined);

    if (!vitals) {
      return { data: null, error: "Failed to fetch Core Web Vitals" };
    }

    const evaluation = evaluateWebVitals(vitals);

    // Save to database
    const serviceClient = await createServiceClient();
    await serviceClient.from("core_web_vitals_history").insert({
      store_id: storeId,
      url,
      device,
      lcp: vitals.lcp,
      fid: vitals.fid,
      cls: vitals.cls,
      ttfb: vitals.ttfb,
      fcp: vitals.fcp,
      inp: vitals.inp,
      overall_score: evaluation.scores.overall,
    });

    revalidatePath(`/dashboard/stores/${storeId}/speed`);

    return {
      data: {
        score: evaluation.performanceScore,
        vitals: { lcp: vitals.lcp ?? 0, fid: vitals.fid ?? 0, cls: vitals.cls ?? 0 },
        recommendations: evaluation.recommendations,
      },
      error: null,
    };
  } catch (error) {
    console.error("Core Web Vitals check error:", error);
    return { data: null, error: "Failed to check Core Web Vitals" };
  }
}

export async function getCoreWebVitalsHistory(
  storeId: string,
  url: string,
  days: number = 30
): Promise<{
  data: Array<{
    date: string;
    lcp: number;
    fid: number;
    cls: number;
    score: string;
  }> | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("core_web_vitals_history")
      .select("*")
      .eq("store_id", storeId)
      .eq("url", url)
      .gte("checked_at", startDate)
      .order("checked_at", { ascending: true });

    if (error) throw error;

    const history = (data || []).map((row) => ({
      date: row.checked_at,
      lcp: row.lcp,
      fid: row.fid,
      cls: row.cls,
      score: row.overall_score,
    }));

    return { data: history, error: null };
  } catch (error) {
    console.error("Get CWV history error:", error);
    return { data: null, error: "Failed to get history" };
  }
}

// ==================== LOCAL RANKINGS ====================

export async function trackLocalRanking(
  storeId: string,
  keyword: string,
  location: string
): Promise<{ data: { position: number | null; inMapPack: boolean } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data: store } = await supabase.from("stores").select("url").eq("id", storeId).single();

    const ranking = await checkLocalRanking(keyword, location, store?.url || "");

    // Save to database
    const serviceClient = await createServiceClient();
    await serviceClient.from("local_rankings").insert({
      store_id: storeId,
      keyword,
      location,
      position: ranking.position,
      in_map_pack: ranking.inMapPack,
      map_pack_position: ranking.mapPackPosition,
      local_pack_visible: ranking.localPackVisible,
      competitor_count: ranking.competitors.length,
    });

    revalidatePath(`/dashboard/stores/${storeId}/local`);

    return {
      data: {
        position: ranking.position,
        inMapPack: ranking.inMapPack,
      },
      error: null,
    };
  } catch (error) {
    console.error("Local ranking error:", error);
    return { data: null, error: "Failed to track local ranking" };
  }
}

// ==================== PERFORMANCE OPPORTUNITIES ====================

export async function getPerformanceOpportunitiesAction(
  storeId: string,
  url: string
): Promise<{
  data: Array<{ title: string; description: string; savings: number; priority: string }> | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data: store } = await supabase
      .from("stores")
      .select("google_pagespeed_key")
      .eq("id", storeId)
      .single();

    const opportunities = await getPerformanceOpportunities(url, "mobile", store?.google_pagespeed_key || undefined);

    return { data: opportunities, error: null };
  } catch (error) {
    console.error("Performance opportunities error:", error);
    return { data: null, error: "Failed to get opportunities" };
  }
}
