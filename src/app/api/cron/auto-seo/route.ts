import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runAutonomousSEO } from "@/lib/actions/autonomous-seo";

/**
 * Cron endpoint for scheduled autonomous SEO optimization.
 * Runs on schedule defined in vercel.json.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron Auto-SEO] Starting scheduled optimization check...");

  try {
    const serviceClient = await createServiceClient();

    // Find stores with scheduled auto SEO that are due
    const now = new Date();
    const { data: stores, error } = await serviceClient
      .from("stores")
      .select("id, name, auto_seo_schedule, auto_seo_next_run")
      .eq("status", "connected")
      .neq("auto_seo_schedule", "disabled")
      .lte("auto_seo_next_run", now.toISOString());

    if (error) {
      console.error("[Cron Auto-SEO] Error fetching stores:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!stores || stores.length === 0) {
      console.log("[Cron Auto-SEO] No stores due for optimization");
      return NextResponse.json({
        success: true,
        message: "No stores due for optimization",
        storesProcessed: 0,
      });
    }

    console.log(`[Cron Auto-SEO] Found ${stores.length} stores due for optimization`);

    const results = [];

    for (const store of stores) {
      console.log(`[Cron Auto-SEO] Running optimization for ${store.name} (${store.id})`);

      try {
        const result = await runAutonomousSEO(store.id, {
          applyImprovements: true,
          maxPagesToScan: 100,
          priorityThreshold: "high_medium",
        });

        results.push({
          storeId: store.id,
          storeName: store.name,
          success: result.success,
          summary: result.summary,
        });

        // Calculate next run time
        let nextRun = new Date();
        switch (store.auto_seo_schedule) {
          case "daily":
            nextRun.setDate(nextRun.getDate() + 1);
            nextRun.setHours(3, 0, 0, 0);
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

        // Update next run time
        await serviceClient
          .from("stores")
          .update({ auto_seo_next_run: nextRun.toISOString() })
          .eq("id", store.id);

        console.log(`[Cron Auto-SEO] Completed for ${store.name}, next run: ${nextRun.toISOString()}`);
      } catch (storeError) {
        console.error(`[Cron Auto-SEO] Error for ${store.name}:`, storeError);
        results.push({
          storeId: store.id,
          storeName: store.name,
          success: false,
          error: storeError instanceof Error ? storeError.message : "Unknown error",
        });
      }

      // Small delay between stores to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.log(`[Cron Auto-SEO] Completed. Processed ${results.length} stores.`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} stores`,
      storesProcessed: results.length,
      results,
    });
  } catch (error) {
    console.error("[Cron Auto-SEO] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 300; // 5 minutes max for cron
export const dynamic = "force-dynamic";
