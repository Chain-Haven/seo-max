"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSerpClient } from "@/lib/serp/client";
import type {
  TrackedKeyword,
  KeywordRankingHistory,
  KeywordAlert,
  AlertHistoryItem,
  RankCheckResult,
  CompetitorRank,
} from "@/lib/serp/types";

// Get all tracked keywords for a store
export async function getTrackedKeywords(
  storeId: string
): Promise<{ data: TrackedKeyword[] | null; error: string | null }> {
  const supabase = await createClient();

  // Get keywords with latest ranking
  const { data: keywords, error } = await supabase
    .from("tracked_keywords")
    .select(`
      *,
      keyword_rankings (
        position,
        previous_position,
        url,
        featured_snippet,
        checked_at
      )
    `)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  // Transform to our type with latest ranking
  const transformedKeywords: TrackedKeyword[] = (keywords || []).map((kw) => {
    const rankings = (kw.keyword_rankings as Array<{
      position: number | null;
      previous_position: number | null;
      url: string | null;
      featured_snippet: boolean;
      checked_at: string;
    }>) || [];
    
    // Sort by checked_at desc and get latest
    rankings.sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());
    const latest = rankings[0];

    return {
      id: kw.id,
      storeId: kw.store_id,
      keyword: kw.keyword,
      location: kw.location,
      language: kw.language,
      device: kw.device,
      searchEngine: kw.search_engine,
      isActive: kw.is_active,
      createdAt: kw.created_at,
      updatedAt: kw.updated_at,
      currentPosition: latest?.position ?? null,
      previousPosition: latest?.previous_position ?? null,
      change: latest ? (latest.previous_position || 0) - (latest.position || 0) : 0,
      url: latest?.url ?? null,
      featuredSnippet: latest?.featured_snippet ?? false,
      lastChecked: latest?.checked_at,
    };
  });

  return { data: transformedKeywords, error: null };
}

// Add a new keyword to track
export async function addTrackedKeyword(
  storeId: string,
  data: {
    keyword: string;
    location?: string;
    device?: "desktop" | "mobile";
    searchEngine?: "google" | "bing";
  }
): Promise<{ data: TrackedKeyword | null; error: string | null }> {
  const supabase = await createClient();

  const { data: keyword, error } = await supabase
    .from("tracked_keywords")
    .insert({
      store_id: storeId,
      keyword: data.keyword,
      location: data.location || "United States",
      device: data.device || "desktop",
      search_engine: data.searchEngine || "google",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "This keyword is already being tracked" };
    }
    return { data: null, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}/rankings`);
  return {
    data: {
      id: keyword.id,
      storeId: keyword.store_id,
      keyword: keyword.keyword,
      location: keyword.location,
      language: keyword.language,
      device: keyword.device,
      searchEngine: keyword.search_engine,
      isActive: keyword.is_active,
      createdAt: keyword.created_at,
      updatedAt: keyword.updated_at,
    },
    error: null,
  };
}

// Remove a tracked keyword
export async function removeTrackedKeyword(
  storeId: string,
  keywordId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tracked_keywords")
    .delete()
    .eq("id", keywordId)
    .eq("store_id", storeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}/rankings`);
  return { success: true, error: null };
}

// Bulk add keywords
export async function bulkAddKeywords(
  storeId: string,
  keywords: string[]
): Promise<{ added: number; errors: string[] }> {
  const supabase = await createClient();
  let added = 0;
  const errors: string[] = [];

  for (const keyword of keywords) {
    const trimmed = keyword.trim();
    if (!trimmed) continue;

    const { error } = await supabase.from("tracked_keywords").insert({
      store_id: storeId,
      keyword: trimmed,
    });

    if (error) {
      if (error.code === "23505") {
        errors.push(`"${trimmed}" already tracked`);
      } else {
        errors.push(`Failed to add "${trimmed}"`);
      }
    } else {
      added++;
    }
  }

  revalidatePath(`/dashboard/stores/${storeId}/rankings`);
  return { added, errors };
}

// Check ranking for a single keyword
export async function checkKeywordRanking(
  storeId: string,
  keywordId: string
): Promise<{ data: RankCheckResult | null; error: string | null }> {
  const supabase = await createClient();

  // Get keyword details
  const { data: keyword, error: kwError } = await supabase
    .from("tracked_keywords")
    .select("*")
    .eq("id", keywordId)
    .eq("store_id", storeId)
    .single();

  if (kwError || !keyword) {
    return { data: null, error: "Keyword not found" };
  }

  // Get store domain
  const { data: store } = await supabase
    .from("stores")
    .select("url")
    .eq("id", storeId)
    .single();

  if (!store?.url) {
    return { data: null, error: "Store URL not configured" };
  }

  const domain = new URL(store.url).hostname.replace("www.", "");

  // Get previous ranking
  const { data: prevRanking } = await supabase
    .from("keyword_rankings")
    .select("position")
    .eq("tracked_keyword_id", keywordId)
    .order("checked_at", { ascending: false })
    .limit(1)
    .single();

  const previousPosition = prevRanking?.position ?? null;

  // Check current ranking
  const serpClient = getSerpClient();
  const serpResult = await serpClient.checkRanking(keyword.keyword, domain, {
    location: keyword.location,
    device: keyword.device,
    searchEngine: keyword.search_engine,
  });

  // Find our position
  const ourResult = serpClient.findDomainPosition(serpResult.results, domain);
  const currentPosition = ourResult?.position ?? null;

  // Get competitor positions (top 10)
  const competitors: CompetitorRank[] = serpResult.results
    .filter((r) => r.position <= 10 && r.domain !== domain)
    .map((r) => ({
      domain: r.domain,
      position: r.position,
      url: r.url,
      title: r.title,
    }));

  // Save ranking to database
  await supabase.from("keyword_rankings").insert({
    tracked_keyword_id: keywordId,
    position: currentPosition,
    previous_position: previousPosition,
    url: ourResult?.url,
    title: ourResult?.title,
    snippet: ourResult?.snippet,
    featured_snippet: serpResult.features.featuredSnippet?.domain === domain,
    people_also_ask: serpResult.features.peopleAlsoAsk.length > 0,
    local_pack: serpResult.features.localPack,
    search_volume: serpResult.searchVolume,
  });

  // Save competitor data
  for (const comp of competitors) {
    await supabase.from("competitor_keywords").upsert({
      tracked_keyword_id: keywordId,
      competitor_domain: comp.domain,
      position: comp.position,
      url: comp.url,
      title: comp.title,
      checked_at: new Date().toISOString(),
    });
  }

  // Check for alerts
  await checkAndCreateAlerts(storeId, keywordId, keyword.keyword, previousPosition, currentPosition);

  revalidatePath(`/dashboard/stores/${storeId}/rankings`);

  return {
    data: {
      keyword: keyword.keyword,
      position: currentPosition,
      previousPosition,
      change: previousPosition && currentPosition ? previousPosition - currentPosition : 0,
      url: ourResult?.url ?? null,
      title: ourResult?.title ?? null,
      snippet: ourResult?.snippet ?? null,
      featuredSnippet: serpResult.features.featuredSnippet?.domain === domain,
      peopleAlsoAsk: serpResult.features.peopleAlsoAsk.length > 0,
      localPack: serpResult.features.localPack,
      competitors,
    },
    error: null,
  };
}

// Bulk check rankings for all keywords
export async function checkAllKeywordRankings(
  storeId: string
): Promise<{ checked: number; errors: number }> {
  const { data: keywords } = await getTrackedKeywords(storeId);
  if (!keywords) return { checked: 0, errors: 0 };

  let checked = 0;
  let errors = 0;

  for (const kw of keywords) {
    const result = await checkKeywordRanking(storeId, kw.id);
    if (result.error) {
      errors++;
    } else {
      checked++;
    }
  }

  return { checked, errors };
}

// Get ranking history for a keyword
export async function getKeywordRankingHistory(
  keywordId: string,
  days: number = 30
): Promise<{ data: KeywordRankingHistory[] | null; error: string | null }> {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("keyword_rankings")
    .select("*")
    .eq("tracked_keyword_id", keywordId)
    .gte("checked_at", startDate.toISOString())
    .order("checked_at", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  const history: KeywordRankingHistory[] = (data || []).map((r) => ({
    id: r.id,
    trackedKeywordId: r.tracked_keyword_id,
    position: r.position,
    previousPosition: r.previous_position,
    url: r.url,
    title: r.title,
    snippet: r.snippet,
    featuredSnippet: r.featured_snippet,
    peopleAlsoAsk: r.people_also_ask,
    localPack: r.local_pack,
    searchVolume: r.search_volume,
    checkedAt: r.checked_at,
  }));

  return { data: history, error: null };
}

// Get competitor data for a keyword
export async function getCompetitorRankings(
  keywordId: string
): Promise<{ data: CompetitorRank[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitor_keywords")
    .select("*")
    .eq("tracked_keyword_id", keywordId)
    .order("position", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  const competitors: CompetitorRank[] = (data || []).map((c) => ({
    domain: c.competitor_domain,
    position: c.position,
    url: c.url,
    title: c.title,
  }));

  return { data: competitors, error: null };
}

// Alert Management
export async function getKeywordAlerts(
  storeId: string
): Promise<{ data: KeywordAlert[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("keyword_alerts")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const alerts: KeywordAlert[] = (data || []).map((a) => ({
    id: a.id,
    storeId: a.store_id,
    alertType: a.alert_type,
    threshold: a.threshold,
    emailNotification: a.email_notification,
    isActive: a.is_active,
  }));

  return { data: alerts, error: null };
}

export async function createKeywordAlert(
  storeId: string,
  data: {
    alertType: KeywordAlert["alertType"];
    threshold?: number;
    emailNotification?: boolean;
  }
): Promise<{ data: KeywordAlert | null; error: string | null }> {
  const supabase = await createClient();

  const { data: alert, error } = await supabase
    .from("keyword_alerts")
    .insert({
      store_id: storeId,
      alert_type: data.alertType,
      threshold: data.threshold || 5,
      email_notification: data.emailNotification ?? true,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      id: alert.id,
      storeId: alert.store_id,
      alertType: alert.alert_type,
      threshold: alert.threshold,
      emailNotification: alert.email_notification,
      isActive: alert.is_active,
    },
    error: null,
  };
}

export async function deleteKeywordAlert(
  alertId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("keyword_alerts")
    .delete()
    .eq("id", alertId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Get alert history
export async function getAlertHistory(
  storeId: string,
  limit: number = 50
): Promise<{ data: AlertHistoryItem[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("keyword_alert_history")
    .select(`
      *,
      keyword_alerts!inner (store_id),
      tracked_keywords (keyword)
    `)
    .eq("keyword_alerts.store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }

  const history: AlertHistoryItem[] = (data || []).map((h) => ({
    id: h.id,
    alertId: h.alert_id,
    trackedKeywordId: h.tracked_keyword_id,
    keyword: (h.tracked_keywords as { keyword: string })?.keyword,
    oldPosition: h.old_position,
    newPosition: h.new_position,
    message: h.message,
    isRead: h.is_read,
    createdAt: h.created_at,
  }));

  return { data: history, error: null };
}

// Helper to check and create alerts
async function checkAndCreateAlerts(
  storeId: string,
  keywordId: string,
  keyword: string,
  oldPosition: number | null,
  newPosition: number | null
): Promise<void> {
  const supabase = await createServiceClient();

  // Get active alerts for this store
  const { data: alerts } = await supabase
    .from("keyword_alerts")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true);

  if (!alerts || alerts.length === 0) return;

  for (const alert of alerts) {
    let shouldAlert = false;
    let message = "";

    switch (alert.alert_type) {
      case "rank_drop":
        if (oldPosition && newPosition && newPosition - oldPosition >= alert.threshold) {
          shouldAlert = true;
          message = `"${keyword}" dropped ${newPosition - oldPosition} positions (${oldPosition} → ${newPosition})`;
        }
        break;
      case "rank_gain":
        if (oldPosition && newPosition && oldPosition - newPosition >= alert.threshold) {
          shouldAlert = true;
          message = `"${keyword}" gained ${oldPosition - newPosition} positions (${oldPosition} → ${newPosition})`;
        }
        break;
      case "lost_top_10":
        if (oldPosition && oldPosition <= 10 && (!newPosition || newPosition > 10)) {
          shouldAlert = true;
          message = `"${keyword}" dropped out of top 10 (was #${oldPosition})`;
        }
        break;
      case "entered_top_10":
        if (newPosition && newPosition <= 10 && (!oldPosition || oldPosition > 10)) {
          shouldAlert = true;
          message = `"${keyword}" entered top 10 at #${newPosition}`;
        }
        break;
      case "lost_first_page":
        if (oldPosition && oldPosition <= 10 && (!newPosition || newPosition > 100)) {
          shouldAlert = true;
          message = `"${keyword}" is no longer ranking (was #${oldPosition})`;
        }
        break;
      case "new_ranking":
        if (!oldPosition && newPosition) {
          shouldAlert = true;
          message = `"${keyword}" started ranking at #${newPosition}`;
        }
        break;
    }

    if (shouldAlert) {
      await supabase.from("keyword_alert_history").insert({
        alert_id: alert.id,
        tracked_keyword_id: keywordId,
        old_position: oldPosition,
        new_position: newPosition,
        message,
      });
    }
  }
}

// Get ranking summary stats
export async function getRankingSummary(storeId: string): Promise<{
  data: {
    totalKeywords: number;
    avgPosition: number;
    top3: number;
    top10: number;
    top100: number;
    notRanking: number;
    improved: number;
    declined: number;
    unchanged: number;
  } | null;
  error: string | null;
}> {
  const { data: keywords, error } = await getTrackedKeywords(storeId);

  if (error || !keywords) {
    return { data: null, error };
  }

  const positions = keywords.map((k) => k.currentPosition).filter((p): p is number => p !== null);
  const avgPosition = positions.length > 0 
    ? Math.round(positions.reduce((a, b) => a + b, 0) / positions.length)
    : 0;

  return {
    data: {
      totalKeywords: keywords.length,
      avgPosition,
      top3: keywords.filter((k) => k.currentPosition && k.currentPosition <= 3).length,
      top10: keywords.filter((k) => k.currentPosition && k.currentPosition <= 10).length,
      top100: keywords.filter((k) => k.currentPosition && k.currentPosition <= 100).length,
      notRanking: keywords.filter((k) => k.currentPosition === null).length,
      improved: keywords.filter((k) => (k.change || 0) > 0).length,
      declined: keywords.filter((k) => (k.change || 0) < 0).length,
      unchanged: keywords.filter((k) => (k.change || 0) === 0 && k.currentPosition !== null).length,
    },
    error: null,
  };
}
