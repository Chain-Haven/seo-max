import { NextResponse } from "next/server";
import { runDailySEOAudit } from "@/lib/actions/daily-seo-audit";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max

/**
 * Daily SEO Audit Cron Job
 * Runs automatically via Vercel cron at 6 AM UTC daily
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Starting daily SEO audit...");

  try {
    const result = await runDailySEOAudit();

    if (result.success) {
      console.log(`[Cron] Daily audit complete. ${result.results.length} stores audited.`);
      
      // Summary stats
      const totalAlerts = result.results.reduce((sum, r) => sum + r.alerts.length, 0);
      const avgScore = result.results.length > 0
        ? Math.round(result.results.reduce((sum, r) => sum + r.healthScore, 0) / result.results.length)
        : 0;

      return NextResponse.json({
        success: true,
        summary: {
          storesAudited: result.results.length,
          totalAlerts,
          averageScore: avgScore,
          timestamp: new Date().toISOString(),
        },
        results: result.results.map((r) => ({
          store: r.storeName,
          score: r.healthScore,
          change: r.scoreChange,
          alerts: r.alerts.length,
        })),
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Cron] Daily audit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
