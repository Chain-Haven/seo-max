"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type FeedbackType = "bug" | "feature" | "improvement" | "other";

interface SubmitFeedbackResult {
  success: boolean;
  error?: string;
}

/**
 * Submit user feedback that the autonomous dev agent can process.
 */
export async function submitFeedback(
  feedbackType: FeedbackType,
  content: string,
  storeId?: string
): Promise<SubmitFeedbackResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!content.trim()) {
    return { success: false, error: "Feedback content is required" };
  }

  if (content.length > 2000) {
    return { success: false, error: "Feedback must be under 2000 characters" };
  }

  const serviceClient = await createServiceClient();

  try {
    const { error } = await serviceClient.from("user_feedback").insert({
      user_id: user.id,
      store_id: storeId || null,
      feedback_type: feedbackType,
      content: content.trim(),
      status: "pending",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error submitting feedback:", error);
      return { success: false, error: "Failed to submit feedback" };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    console.error("submitFeedback error:", err);
    return { success: false, error: "Failed to submit feedback" };
  }
}

/**
 * Get feedback submitted by the current user.
 */
export async function getUserFeedback(): Promise<{
  data: Array<{
    id: string;
    feedbackType: string;
    content: string;
    status: string;
    createdAt: string;
  }> | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Not authenticated" };
  }

  try {
    const { data, error } = await supabase
      .from("user_feedback")
      .select("id, feedback_type, content, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: (data || []).map((f) => ({
        id: f.id,
        feedbackType: f.feedback_type,
        content: f.content,
        status: f.status,
        createdAt: f.created_at,
      })),
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to get feedback",
    };
  }
}
