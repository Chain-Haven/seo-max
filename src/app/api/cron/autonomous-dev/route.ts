import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  AutonomousDevelopmentAgent,
  getPendingFeedback,
  markFeedbackAddressed,
} from "@/lib/agents/autonomous-dev";

// Vercel Cron: runs weekly on Sunday at 2 AM UTC
// Configured in vercel.json: { "path": "/api/cron/autonomous-dev", "schedule": "0 2 * * 0" }

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max

// Rate limiting: only run once per day maximum
const MIN_HOURS_BETWEEN_RUNS = 24;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if we should skip (rate limiting)
  const supabase = await createServiceClient();

  try {
    // Check last run time
    const { data: lastRun } = await supabase
      .from("autonomous_changes")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRun) {
      const hoursSinceLastRun =
        (Date.now() - new Date(lastRun.created_at).getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastRun < MIN_HOURS_BETWEEN_RUNS) {
        return NextResponse.json({
          success: true,
          message: `Skipping: last run was ${Math.round(hoursSinceLastRun)} hours ago`,
          skipped: true,
        });
      }
    }

    // Get pending user feedback
    const feedback = await getPendingFeedback(10);

    // Build the task for the agent
    let task = `Analyze the SEO Max codebase and identify improvements to make.

Focus on:
1. Any bugs or errors that need fixing
2. Performance optimizations
3. Code quality improvements
4. UX enhancements

`;

    if (feedback.length > 0) {
      task += `There is user feedback to consider. Prioritize addressing the feedback items.`;
    } else {
      task += `No specific user feedback at this time. Look for general improvements:
- Check for any console errors or warnings in the code
- Look for opportunities to improve error handling
- Identify any TypeScript type issues
- Find places where code could be simplified`;
    }

    // Run the agent
    const agent = new AutonomousDevelopmentAgent();
    const result = await agent.run(task, feedback);

    // Mark feedback as addressed if we made changes related to it
    if (result.success && result.filesChanged.length > 0 && feedback.length > 0) {
      await markFeedbackAddressed(feedback.map((f) => f.id));
    }

    // Log the run
    await supabase.from("autonomous_changes").insert({
      commit_message: result.summary.slice(0, 500),
      files_changed: result.filesChanged,
      commit_sha: result.commitSha,
      feedback_processed: feedback.length,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: result.success,
      summary: result.summary,
      filesChanged: result.filesChanged,
      commitSha: result.commitSha,
      feedbackProcessed: feedback.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Autonomous dev cron error:", error);

    // Log the error
    await supabase.from("autonomous_changes").insert({
      commit_message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      files_changed: [],
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to manually trigger the autonomous dev agent.
 * Useful for testing or urgent improvements.
 */
export async function POST(request: Request) {
  // Verify admin authorization (you may want to add proper admin auth here)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const customTask = body.task as string | undefined;

    const feedback = await getPendingFeedback(10);

    const task =
      customTask ||
      `Analyze the SEO Max codebase and make improvements. Focus on any pending feedback and general code quality.`;

    const agent = new AutonomousDevelopmentAgent();
    const result = await agent.run(task, feedback);

    if (result.success && result.filesChanged.length > 0 && feedback.length > 0) {
      await markFeedbackAddressed(feedback.map((f) => f.id));
    }

    return NextResponse.json({
      success: result.success,
      summary: result.summary,
      filesChanged: result.filesChanged,
      commitSha: result.commitSha,
      feedbackProcessed: feedback.length,
    });
  } catch (error) {
    console.error("Manual autonomous dev error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
