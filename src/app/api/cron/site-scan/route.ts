import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { triggerInitialCrawl } from "@/lib/actions/site-crawler";

// Vercel Cron: runs daily at 3 AM UTC
// Configured in vercel.json: { "path": "/api/cron/site-scan", "schedule": "0 3 * * *" }

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

const MAX_STORES_PER_RUN = 10; // Rate limit to avoid overload

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  try {
    // Get connected stores that haven't been scanned recently (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, name, url")
      .eq("status", "connected")
      .or(`last_scan_at.is.null,last_scan_at.lt.${oneDayAgo}`)
      .limit(MAX_STORES_PER_RUN);

    if (storesError) {
      console.error("Error fetching stores:", storesError);
      return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No stores need scanning",
        scanned: 0,
      });
    }

    const results: Array<{ storeId: string; storeName: string; success: boolean; error?: string }> = [];

    for (const store of stores) {
      try {
        // Trigger crawl (runs in background, generates improvements on completion)
        const { ok, error } = await triggerInitialCrawl(store.id);

        if (ok) {
          // Update last_scan_at timestamp
          await supabase
            .from("stores")
            .update({ last_scan_at: new Date().toISOString() })
            .eq("id", store.id);

          results.push({ storeId: store.id, storeName: store.name, success: true });
        } else {
          results.push({ storeId: store.id, storeName: store.name, success: false, error: error || "Unknown error" });
        }
      } catch (err) {
        console.error(`Error scanning store ${store.id}:`, err);
        results.push({
          storeId: store.id,
          storeName: store.name,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      // Rate limiting - wait 2 seconds between store scans to avoid overwhelming resources
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Scanned ${successCount} stores, ${failCount} failed`,
      scanned: successCount,
      failed: failCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Site scan cron error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
