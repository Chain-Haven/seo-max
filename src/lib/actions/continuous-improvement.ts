"use server";

/**
 * Continuous Improvement System
 * Automatically detects, prioritizes, and implements improvements to the platform
 */

import { createServiceClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";
import {
  AutonomousDevelopmentAgent,
  getPendingFeedback,
  markFeedbackAddressed,
} from "@/lib/agents/autonomous-dev";

// ============================================================
// TYPES
// ============================================================

export interface ImprovementTask {
  id: string;
  type: "bug_fix" | "performance" | "security" | "ux" | "feature" | "code_quality" | "seo";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  detectedBy: "error_log" | "user_feedback" | "ai_analysis" | "performance_monitor" | "security_scan";
  targetFiles?: string[];
  estimatedEffort: "quick" | "moderate" | "significant";
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  createdAt: string;
  completedAt?: string;
  commitSha?: string;
  error?: string;
}

export interface ImprovementLog {
  id: string;
  taskId?: string;
  action: "detected" | "started" | "completed" | "failed" | "skipped";
  details: string;
  timestamp: string;
}

export interface SystemHealthMetrics {
  errorRate: number;
  avgResponseTime: number;
  userSatisfaction: number;
  codeQualityScore: number;
  securityScore: number;
  lastImprovement: string | null;
  pendingTasks: number;
  completedToday: number;
}

// ============================================================
// IMPROVEMENT DETECTION
// ============================================================

/**
 * Analyze error logs and detect issues
 */
export async function analyzeErrorLogs(): Promise<ImprovementTask[]> {
  const supabase = await createServiceClient();
  const tasks: ImprovementTask[] = [];

  try {
    // Get recent error logs (if table exists)
    const { data: errors } = await supabase
      .from("error_logs")
      .select("*")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (!errors || errors.length === 0) {
      return tasks;
    }

    // Group errors by type/message
    const errorGroups = new Map<string, typeof errors>();
    for (const error of errors) {
      const key = `${error.error_type}:${error.message?.substring(0, 100)}`;
      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key)!.push(error);
    }

    // Create tasks for recurring errors
    for (const [key, group] of errorGroups) {
      if (group.length >= 3) {
        tasks.push({
          id: crypto.randomUUID(),
          type: "bug_fix",
          priority: group.length >= 10 ? "critical" : group.length >= 5 ? "high" : "medium",
          title: `Fix recurring error: ${key.split(":")[0]}`,
          description: `Error occurred ${group.length} times in the last 24 hours.\nMessage: ${group[0].message}\nStack: ${group[0].stack_trace?.substring(0, 500)}`,
          detectedBy: "error_log",
          targetFiles: group[0].file_path ? [group[0].file_path] : undefined,
          estimatedEffort: "moderate",
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("[ContinuousImprovement] Error log analysis failed:", error);
  }

  return tasks;
}

/**
 * Analyze performance metrics and detect issues
 */
export async function analyzePerformance(): Promise<ImprovementTask[]> {
  const supabase = await createServiceClient();
  const tasks: ImprovementTask[] = [];

  try {
    // Get performance metrics
    const { data: metrics } = await supabase
      .from("performance_metrics")
      .select("*")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("response_time", { ascending: false })
      .limit(100);

    if (!metrics || metrics.length === 0) {
      return tasks;
    }

    // Identify slow endpoints
    const slowEndpoints = metrics.filter((m) => m.response_time > 3000); // > 3 seconds
    const endpointCounts = new Map<string, number>();

    for (const metric of slowEndpoints) {
      const key = metric.endpoint;
      endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1);
    }

    for (const [endpoint, count] of endpointCounts) {
      if (count >= 5) {
        tasks.push({
          id: crypto.randomUUID(),
          type: "performance",
          priority: count >= 20 ? "high" : "medium",
          title: `Optimize slow endpoint: ${endpoint}`,
          description: `Endpoint had ${count} slow responses (>3s) in the last 24 hours. Consider caching, query optimization, or code refactoring.`,
          detectedBy: "performance_monitor",
          estimatedEffort: "moderate",
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("[ContinuousImprovement] Performance analysis failed:", error);
  }

  return tasks;
}

/**
 * AI-powered code analysis to detect improvement opportunities
 */
export async function analyzeCodeQuality(): Promise<ImprovementTask[]> {
  const ai = getAIProvider();
  const tasks: ImprovementTask[] = [];

  try {
    // Get recent changes to analyze
    const supabase = await createServiceClient();
    const { data: recentChanges } = await supabase
      .from("autonomous_changes")
      .select("files_changed")
      .order("created_at", { ascending: false })
      .limit(5);

    // Identify areas that haven't been improved recently
    const analysisPrompt = `As a senior software architect, identify 3 high-impact improvements for an SEO optimization platform.

The platform is built with:
- Next.js 16 with App Router
- TypeScript
- Supabase for database
- React Server Components
- AI integrations (OpenAI, Anthropic)

Recent focus areas (avoid duplicating these):
${recentChanges?.map((c) => c.files_changed?.join(", ")).join("\n") || "None"}

Suggest improvements in these categories:
1. Performance optimization
2. User experience
3. Code maintainability
4. SEO capabilities
5. Error handling

For each suggestion, provide:
- Type: performance, ux, code_quality, feature, or security
- Priority: critical, high, medium, or low
- Title: Clear, actionable title
- Description: What to improve and why
- Estimated effort: quick (< 1 hour), moderate (1-4 hours), or significant (> 4 hours)
- Target files or areas (if known)

Return as JSON array:
[{
  "type": "performance",
  "priority": "high",
  "title": "Title here",
  "description": "Description here",
  "effort": "moderate",
  "targetArea": "src/components/"
}]`;

    const response = await ai.generateText(analysisPrompt, { maxTokens: 1500 });
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      for (const suggestion of suggestions) {
        tasks.push({
          id: crypto.randomUUID(),
          type: suggestion.type,
          priority: suggestion.priority,
          title: suggestion.title,
          description: suggestion.description,
          detectedBy: "ai_analysis",
          targetFiles: suggestion.targetArea ? [suggestion.targetArea] : undefined,
          estimatedEffort: suggestion.effort,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("[ContinuousImprovement] Code analysis failed:", error);
  }

  return tasks;
}

/**
 * Convert user feedback into improvement tasks
 */
export async function analyzeFeedback(): Promise<ImprovementTask[]> {
  const feedback = await getPendingFeedback(20);
  const tasks: ImprovementTask[] = [];

  for (const item of feedback) {
    const type = item.feedback_type === "bug" ? "bug_fix" 
      : item.feedback_type === "feature" ? "feature"
      : item.feedback_type === "performance" ? "performance"
      : "ux";

    const priority = item.feedback_type === "bug" ? "high" : "medium";

    tasks.push({
      id: crypto.randomUUID(),
      type,
      priority,
      title: `User feedback: ${item.content.substring(0, 60)}...`,
      description: item.content,
      detectedBy: "user_feedback",
      estimatedEffort: "moderate",
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }

  return tasks;
}

// ============================================================
// IMPROVEMENT QUEUE MANAGEMENT
// ============================================================

/**
 * Get all pending improvement tasks
 */
export async function getImprovementQueue(): Promise<{
  data: ImprovementTask[] | null;
  error: string | null;
}> {
  const supabase = await createServiceClient();

  try {
    const { data, error } = await supabase
      .from("improvement_tasks")
      .select("*")
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: true });

    if (error) throw error;

    const tasks: ImprovementTask[] = (data || []).map((row) => ({
      id: row.id,
      type: row.task_type,
      priority: row.priority,
      title: row.title,
      description: row.description,
      detectedBy: row.detected_by,
      targetFiles: row.target_files,
      estimatedEffort: row.estimated_effort,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      commitSha: row.commit_sha,
      error: row.error,
    }));

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return { data: tasks, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Add tasks to the improvement queue
 */
export async function addToQueue(
  tasks: ImprovementTask[]
): Promise<{ success: boolean; added: number; error?: string }> {
  const supabase = await createServiceClient();

  try {
    // Check for duplicates
    const { data: existing } = await supabase
      .from("improvement_tasks")
      .select("title")
      .in("status", ["pending", "in_progress"]);

    const existingTitles = new Set((existing || []).map((e) => e.title));
    const newTasks = tasks.filter((t) => !existingTitles.has(t.title));

    if (newTasks.length === 0) {
      return { success: true, added: 0 };
    }

    const { error } = await supabase.from("improvement_tasks").insert(
      newTasks.map((task) => ({
        id: task.id,
        task_type: task.type,
        priority: task.priority,
        title: task.title,
        description: task.description,
        detected_by: task.detectedBy,
        target_files: task.targetFiles,
        estimated_effort: task.estimatedEffort,
        status: task.status,
        created_at: task.createdAt,
      }))
    );

    if (error) throw error;

    return { success: true, added: newTasks.length };
  } catch (error) {
    return {
      success: false,
      added: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: ImprovementTask["status"],
  details?: { commitSha?: string; error?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceClient();

  try {
    const updateData: Record<string, unknown> = { status };

    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }
    if (details?.commitSha) {
      updateData.commit_sha = details.commitSha;
    }
    if (details?.error) {
      updateData.error = details.error;
    }

    const { error } = await supabase
      .from("improvement_tasks")
      .update(updateData)
      .eq("id", taskId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================
// AUTONOMOUS EXECUTION
// ============================================================

/**
 * Run the continuous improvement cycle
 */
export async function runImprovementCycle(options: {
  maxTasks?: number;
  types?: ImprovementTask["type"][];
  minPriority?: ImprovementTask["priority"];
} = {}): Promise<{
  success: boolean;
  tasksDetected: number;
  tasksExecuted: number;
  tasksCompleted: number;
  details: Array<{
    task: string;
    status: "completed" | "failed" | "skipped";
    commitSha?: string;
    error?: string;
  }>;
}> {
  const maxTasks = options.maxTasks || 3;
  const results: Array<{
    task: string;
    status: "completed" | "failed" | "skipped";
    commitSha?: string;
    error?: string;
  }> = [];

  console.log("[ContinuousImprovement] Starting improvement cycle...");

  try {
    // 1. Detect new improvement opportunities
    console.log("[ContinuousImprovement] Detecting improvements...");
    
    const [errorTasks, perfTasks, codeTasks, feedbackTasks] = await Promise.all([
      analyzeErrorLogs(),
      analyzePerformance(),
      analyzeCodeQuality(),
      analyzeFeedback(),
    ]);

    const allTasks = [...errorTasks, ...perfTasks, ...codeTasks, ...feedbackTasks];
    console.log(`[ContinuousImprovement] Detected ${allTasks.length} improvement opportunities`);

    // 2. Add to queue (deduped)
    if (allTasks.length > 0) {
      const addResult = await addToQueue(allTasks);
      console.log(`[ContinuousImprovement] Added ${addResult.added} new tasks to queue`);
    }

    // 3. Get prioritized queue
    const { data: queue } = await getImprovementQueue();
    if (!queue || queue.length === 0) {
      console.log("[ContinuousImprovement] No tasks in queue");
      return {
        success: true,
        tasksDetected: allTasks.length,
        tasksExecuted: 0,
        tasksCompleted: 0,
        details: [],
      };
    }

    // 4. Filter by options
    let filteredQueue = queue;
    if (options.types) {
      filteredQueue = filteredQueue.filter((t) => options.types!.includes(t.type));
    }
    if (options.minPriority) {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const minOrder = priorityOrder[options.minPriority];
      filteredQueue = filteredQueue.filter(
        (t) => priorityOrder[t.priority] <= minOrder
      );
    }

    // 5. Execute top tasks
    const tasksToExecute = filteredQueue.slice(0, maxTasks);
    console.log(`[ContinuousImprovement] Executing ${tasksToExecute.length} tasks`);

    const agent = new AutonomousDevelopmentAgent();
    let tasksCompleted = 0;

    for (const task of tasksToExecute) {
      console.log(`[ContinuousImprovement] Working on: ${task.title}`);
      
      await updateTaskStatus(task.id, "in_progress");

      // Build task prompt for the agent
      const taskPrompt = `## Improvement Task

**Type:** ${task.type}
**Priority:** ${task.priority}
**Title:** ${task.title}

**Description:**
${task.description}

${task.targetFiles ? `**Target Files/Areas:** ${task.targetFiles.join(", ")}` : ""}

**Instructions:**
1. Analyze the relevant code
2. Implement the improvement
3. Ensure no breaking changes
4. Test the changes if possible
5. Commit with a clear message

Be thorough but focused. Make only the necessary changes.`;

      try {
        const result = await agent.run(taskPrompt);

        if (result.success && result.filesChanged.length > 0) {
          await updateTaskStatus(task.id, "completed", {
            commitSha: result.commitSha,
          });
          tasksCompleted++;
          results.push({
            task: task.title,
            status: "completed",
            commitSha: result.commitSha,
          });
          console.log(`[ContinuousImprovement] Completed: ${task.title}`);
        } else if (result.summary.toLowerCase().includes("no changes needed")) {
          await updateTaskStatus(task.id, "skipped");
          results.push({
            task: task.title,
            status: "skipped",
          });
          console.log(`[ContinuousImprovement] Skipped (no changes needed): ${task.title}`);
        } else {
          await updateTaskStatus(task.id, "failed", {
            error: result.error || "No changes made",
          });
          results.push({
            task: task.title,
            status: "failed",
            error: result.error || "No changes made",
          });
          console.log(`[ContinuousImprovement] Failed: ${task.title}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        await updateTaskStatus(task.id, "failed", { error: errorMsg });
        results.push({
          task: task.title,
          status: "failed",
          error: errorMsg,
        });
        console.error(`[ContinuousImprovement] Error on ${task.title}:`, error);
      }

      // Small delay between tasks
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 6. Mark related feedback as addressed
    const feedback = await getPendingFeedback();
    if (tasksCompleted > 0 && feedback.length > 0) {
      await markFeedbackAddressed(feedback.slice(0, tasksCompleted).map((f) => f.id));
    }

    console.log(`[ContinuousImprovement] Cycle complete. ${tasksCompleted}/${tasksToExecute.length} tasks completed`);

    return {
      success: true,
      tasksDetected: allTasks.length,
      tasksExecuted: tasksToExecute.length,
      tasksCompleted,
      details: results,
    };
  } catch (error) {
    console.error("[ContinuousImprovement] Cycle error:", error);
    return {
      success: false,
      tasksDetected: 0,
      tasksExecuted: 0,
      tasksCompleted: 0,
      details: results,
    };
  }
}

// ============================================================
// HEALTH METRICS
// ============================================================

/**
 * Get system health metrics for the autonomous improvement system
 */
export async function getSystemHealth(): Promise<{
  data: SystemHealthMetrics | null;
  error: string | null;
}> {
  const supabase = await createServiceClient();

  try {
    // Get error rate (last 24h)
    const { count: errorCount } = await supabase
      .from("error_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Get pending tasks
    const { count: pendingCount } = await supabase
      .from("improvement_tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Get completed today
    const { count: completedToday } = await supabase
      .from("improvement_tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    // Get last improvement
    const { data: lastChange } = await supabase
      .from("autonomous_changes")
      .select("created_at, commit_message")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      data: {
        errorRate: errorCount || 0,
        avgResponseTime: 0, // Would need actual metrics
        userSatisfaction: 0, // Would need feedback analysis
        codeQualityScore: 85, // Placeholder
        securityScore: 90, // Placeholder
        lastImprovement: lastChange?.created_at || null,
        pendingTasks: pendingCount || 0,
        completedToday: completedToday || 0,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get improvement history
 */
export async function getImprovementHistory(limit: number = 50): Promise<{
  data: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    completedAt: string | null;
    commitSha: string | null;
  }> | null;
  error: string | null;
}> {
  const supabase = await createServiceClient();

  try {
    const { data, error } = await supabase
      .from("improvement_tasks")
      .select("id, task_type, title, status, completed_at, commit_sha")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      data: (data || []).map((row) => ({
        id: row.id,
        type: row.task_type,
        title: row.title,
        status: row.status,
        completedAt: row.completed_at,
        commitSha: row.commit_sha,
      })),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
