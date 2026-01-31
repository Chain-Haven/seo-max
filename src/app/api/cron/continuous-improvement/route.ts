import { NextResponse } from "next/server";
import { runImprovementCycle, getSystemHealth } from "@/lib/actions/continuous-improvement";

/**
 * Continuous Improvement Cron Job
 * Runs every 6 hours to detect and implement improvements
 * Configured in vercel.json with schedule: "0 * /6 * * *" (every 6 hours)
 */

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Starting continuous improvement cycle...");

  try {
    // Get current health to determine priority
    const { data: health } = await getSystemHealth();
    
    // Determine what types of improvements to focus on
    const types: ("bug_fix" | "performance" | "security" | "ux" | "feature" | "code_quality" | "seo")[] = [];
    
    // Always include bug fixes and security
    types.push("bug_fix", "security");
    
    // Include performance if error rate is high
    if (health && health.errorRate > 10) {
      types.push("performance");
    }
    
    // Include code quality and UX improvements
    types.push("code_quality", "ux");

    // Run the improvement cycle
    const result = await runImprovementCycle({
      maxTasks: 2, // Conservative limit for cron
      types,
      minPriority: "high", // Only high priority or above
    });

    console.log(`[Cron] Improvement cycle complete:
- Tasks detected: ${result.tasksDetected}
- Tasks executed: ${result.tasksExecuted}
- Tasks completed: ${result.tasksCompleted}`);

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      tasksDetected: result.tasksDetected,
      tasksExecuted: result.tasksExecuted,
      tasksCompleted: result.tasksCompleted,
      details: result.details,
    });
  } catch (error) {
    console.error("[Cron] Continuous improvement error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual trigger with options
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    
    const result = await runImprovementCycle({
      maxTasks: body.maxTasks || 5,
      types: body.types,
      minPriority: body.minPriority || "medium",
    });

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      tasksDetected: result.tasksDetected,
      tasksExecuted: result.tasksExecuted,
      tasksCompleted: result.tasksCompleted,
      details: result.details,
    });
  } catch (error) {
    console.error("[Manual] Continuous improvement error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
