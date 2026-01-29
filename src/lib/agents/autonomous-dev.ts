/**
 * Autonomous Development Agent
 * An AI agent that can analyze the codebase, identify improvements,
 * generate code changes, and commit them to GitHub.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  getFileContents,
  getRepositoryTree,
  createMultiFileCommit,
  getRecentCommits,
} from "@/lib/integrations/github";
import { createServiceClient } from "@/lib/supabase/server";

const OPUS_MODEL = "claude-opus-4-20250514";

interface AgentTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

interface FileChange {
  path: string;
  content: string;
  action: "create" | "update";
}

interface AgentResult {
  success: boolean;
  summary: string;
  filesChanged: string[];
  commitSha?: string;
  error?: string;
}

interface UserFeedback {
  id: string;
  feedback_type: string;
  content: string;
  created_at: string;
}

// Define the tools available to the agent
const AGENT_TOOLS: AgentTool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file from the codebase",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path relative to the repository root (e.g., 'src/lib/utils.ts')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description: "List all files in the repository to understand the codebase structure",
    input_schema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Optional filter pattern (e.g., 'src/components' to only list files in that directory)",
        },
      },
      required: [],
    },
  },
  {
    name: "write_file",
    description: "Write or update a file in the codebase. The agent should use this to make code changes.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path relative to the repository root",
        },
        content: {
          type: "string",
          description: "The full content to write to the file",
        },
        action: {
          type: "string",
          enum: ["create", "update"],
          description: "Whether to create a new file or update an existing one",
        },
      },
      required: ["path", "content", "action"],
    },
  },
  {
    name: "commit_changes",
    description: "Commit all staged file changes to the repository. Call this after making all necessary changes.",
    input_schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The commit message describing the changes",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "get_recent_commits",
    description: "Get recent commits to understand what changes have been made recently",
    input_schema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of commits to retrieve (default: 10)",
        },
      },
      required: [],
    },
  },
];

const SYSTEM_PROMPT = `You are an autonomous development agent for SEO Max, an SEO optimization platform built with Next.js, TypeScript, and Supabase.

Your job is to analyze the codebase and user feedback, identify improvements, and implement them. You have tools to read files, write files, and commit changes to GitHub.

## Your Capabilities
- Read and understand TypeScript/React code
- Identify bugs, performance issues, and improvement opportunities
- Write clean, well-tested code
- Make commits with clear messages

## Guidelines
1. **Safety First**: Never modify authentication, billing, or security-related code without explicit instruction
2. **Small Changes**: Make focused, incremental changes. Don't refactor entire files unless necessary.
3. **Test Awareness**: If you add new functionality, consider if tests are needed
4. **Code Style**: Match the existing code style in the repository
5. **Documentation**: Add comments for complex logic

## Restrictions
- Do NOT modify files in: src/lib/api/auth.ts, src/lib/billing/, .env files
- Do NOT delete files
- Maximum 10 files per commit
- Changes should be backward compatible

## Process
1. First, list files to understand the structure
2. Read relevant files to understand the context
3. Identify the specific improvement to make
4. Make the changes using write_file
5. Commit with a clear message

When analyzing feedback, prioritize:
1. Bug fixes (highest priority)
2. Performance improvements
3. UX improvements
4. New features (only if specifically requested)

Always explain your reasoning before making changes.`;

export class AutonomousDevelopmentAgent {
  private client: Anthropic;
  private stagedChanges: Map<string, FileChange>;
  private maxFilesPerCommit: number;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.stagedChanges = new Map();
    this.maxFilesPerCommit = 10;
  }

  /**
   * Run the agent with given context and task.
   */
  async run(task: string, feedback: UserFeedback[] = []): Promise<AgentResult> {
    this.stagedChanges.clear();

    // Build context with feedback
    let contextPrompt = task;
    if (feedback.length > 0) {
      contextPrompt += "\n\n## Recent User Feedback\n";
      feedback.forEach((f, i) => {
        contextPrompt += `${i + 1}. [${f.feedback_type}] ${f.content}\n`;
      });
    }

    try {
      // Run agent loop with tool use
      const result = await this.runAgentLoop(contextPrompt);
      return result;
    } catch (error) {
      console.error("Agent error:", error);
      return {
        success: false,
        summary: "Agent encountered an error",
        filesChanged: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async runAgentLoop(task: string): Promise<AgentResult> {
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: task },
    ];

    let iterations = 0;
    const maxIterations = 20; // Safety limit
    let lastSummary = "";
    const allFilesChanged: string[] = [];

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.client.messages.create({
        model: OPUS_MODEL,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools: AGENT_TOOLS as Anthropic.Tool[],
        messages,
      });

      // Check if we're done
      if (response.stop_reason === "end_turn") {
        // Extract final summary from text response
        const textBlock = response.content.find((b) => b.type === "text");
        if (textBlock && textBlock.type === "text") {
          lastSummary = textBlock.text;
        }
        break;
      }

      // Process tool uses
      if (response.stop_reason === "tool_use") {
        const toolResults: Anthropic.MessageParam = {
          role: "user",
          content: [],
        };

        for (const block of response.content) {
          if (block.type === "tool_use") {
            const result = await this.executeTool(block.name, block.input as Record<string, unknown>);

            if (block.name === "commit_changes" && result.includes("committed")) {
              allFilesChanged.push(...Array.from(this.stagedChanges.keys()));
            }

            (toolResults.content as Anthropic.ToolResultBlockParam[]).push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          }
        }

        // Add assistant response and tool results to messages
        messages.push({ role: "assistant", content: response.content });
        messages.push(toolResults);
      }
    }

    return {
      success: allFilesChanged.length > 0 || lastSummary.includes("no changes needed"),
      summary: lastSummary,
      filesChanged: allFilesChanged,
    };
  }

  private async executeTool(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
      case "read_file": {
        const path = input.path as string;
        const result = await getFileContents(path);
        if (!result.success) {
          return `Error reading file: ${result.error}`;
        }
        return result.content || "";
      }

      case "list_files": {
        const filter = input.filter as string | undefined;
        const result = await getRepositoryTree();
        if (!result.success) {
          return `Error listing files: ${result.error}`;
        }
        let files = result.files || [];
        if (filter) {
          files = files.filter((f) => f.includes(filter));
        }
        // Limit output size
        if (files.length > 200) {
          files = files.slice(0, 200);
          return files.join("\n") + "\n... (truncated, use filter for specific directories)";
        }
        return files.join("\n");
      }

      case "write_file": {
        const path = input.path as string;
        const content = input.content as string;
        const action = input.action as "create" | "update";

        // Check restrictions
        if (this.isRestrictedPath(path)) {
          return `Error: Cannot modify restricted file: ${path}`;
        }

        // Check limit
        if (this.stagedChanges.size >= this.maxFilesPerCommit && !this.stagedChanges.has(path)) {
          return `Error: Maximum ${this.maxFilesPerCommit} files per commit reached`;
        }

        this.stagedChanges.set(path, { path, content, action });
        return `File staged for ${action}: ${path}`;
      }

      case "commit_changes": {
        const message = input.message as string;

        if (this.stagedChanges.size === 0) {
          return "No changes staged to commit";
        }

        const files = Array.from(this.stagedChanges.values()).map((f) => ({
          path: f.path,
          content: f.content,
        }));

        const result = await createMultiFileCommit(files, `[auto] ${message}`);

        if (!result.success) {
          return `Error committing changes: ${result.error}`;
        }

        const changedFiles = Array.from(this.stagedChanges.keys());
        this.stagedChanges.clear();

        // Log the autonomous change
        await this.logAutonomousChange(message, changedFiles, result.commitSha);

        return `Successfully committed ${changedFiles.length} file(s): ${result.commitSha}\nFiles: ${changedFiles.join(", ")}`;
      }

      case "get_recent_commits": {
        const count = (input.count as number) || 10;
        const result = await getRecentCommits("main", count);
        if (!result.success) {
          return `Error getting commits: ${result.error}`;
        }
        return (result.commits || [])
          .map((c) => `${c.sha.slice(0, 7)} - ${c.message.split("\n")[0]}`)
          .join("\n");
      }

      default:
        return `Unknown tool: ${name}`;
    }
  }

  private isRestrictedPath(path: string): boolean {
    const restricted = [
      "src/lib/api/auth.ts",
      "src/lib/billing/",
      ".env",
      ".env.local",
      ".env.production",
      "package.json", // Prevent dependency changes
      "package-lock.json",
    ];
    return restricted.some((r) => path.includes(r));
  }

  private async logAutonomousChange(
    message: string,
    files: string[],
    commitSha?: string
  ): Promise<void> {
    try {
      const supabase = await createServiceClient();
      await supabase.from("autonomous_changes").insert({
        commit_message: message,
        files_changed: files,
        commit_sha: commitSha,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to log autonomous change:", err);
    }
  }
}

/**
 * Get pending user feedback for the agent to consider.
 */
export async function getPendingFeedback(limit = 20): Promise<UserFeedback[]> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("user_feedback")
      .select("id, feedback_type, content, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching feedback:", error);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Mark feedback as addressed after the agent processes it.
 */
export async function markFeedbackAddressed(feedbackIds: string[]): Promise<void> {
  if (feedbackIds.length === 0) return;

  try {
    const supabase = await createServiceClient();
    await supabase
      .from("user_feedback")
      .update({ status: "addressed", addressed_at: new Date().toISOString() })
      .in("id", feedbackIds);
  } catch (err) {
    console.error("Error marking feedback addressed:", err);
  }
}
