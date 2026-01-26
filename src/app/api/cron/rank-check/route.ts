import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getSerpClient } from "@/lib/serp/client";

// Vercel Cron: runs daily at 6 AM UTC
// Add to vercel.json: { "crons": [{ "path": "/api/cron/rank-check", "schedule": "0 6 * * *" }] }

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const serpClient = getSerpClient();

  try {
    // Get all active stores
    const { data: stores } = await supabase
      .from("stores")
      .select("id, url")
      .eq("status", "active");

    if (!stores || stores.length === 0) {
      return NextResponse.json({ message: "No active stores" });
    }

    let totalChecked = 0;
    let totalErrors = 0;

    for (const store of stores) {
      if (!store.url) continue;

      const domain = new URL(store.url).hostname.replace("www.", "");

      // Get keywords for this store
      const { data: keywords } = await supabase
        .from("tracked_keywords")
        .select("*")
        .eq("store_id", store.id)
        .eq("is_active", true);

      if (!keywords || keywords.length === 0) continue;

      for (const keyword of keywords) {
        try {
          // Get previous ranking
          const { data: prevRanking } = await supabase
            .from("keyword_rankings")
            .select("position")
            .eq("tracked_keyword_id", keyword.id)
            .order("checked_at", { ascending: false })
            .limit(1)
            .single();

          const previousPosition = prevRanking?.position ?? null;

          // Check current ranking
          const serpResult = await serpClient.checkRanking(keyword.keyword, domain, {
            location: keyword.location,
            device: keyword.device,
            searchEngine: keyword.search_engine,
          });

          // Find our position
          const ourResult = serpClient.findDomainPosition(serpResult.results, domain);
          const currentPosition = ourResult?.position ?? null;

          // Save ranking
          await supabase.from("keyword_rankings").insert({
            tracked_keyword_id: keyword.id,
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

          // Check and create alerts
          await checkAlerts(supabase, store.id, keyword.id, keyword.keyword, previousPosition, currentPosition);

          totalChecked++;
        } catch (error) {
          console.error(`Error checking keyword ${keyword.keyword}:`, error);
          totalErrors++;
        }

        // Rate limiting - wait between checks
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      checked: totalChecked,
      errors: totalErrors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function checkAlerts(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  storeId: string,
  keywordId: string,
  keyword: string,
  oldPosition: number | null,
  newPosition: number | null
) {
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
