"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface ApplyResult {
  success: boolean;
  error?: string;
}

/**
 * Apply an SEO improvement to the WordPress site via the plugin webhook.
 * This sends the improvement data to the WordPress site which then applies the changes.
 */
export async function applyImprovementToWordPress(
  storeId: string,
  improvementId: string
): Promise<ApplyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const serviceClient = await createServiceClient();

  try {
    // Get the improvement
    const { data: improvement, error: improvementError } = await serviceClient
      .from("seo_improvements")
      .select("*")
      .eq("id", improvementId)
      .eq("store_id", storeId)
      .single();

    if (improvementError || !improvement) {
      return { success: false, error: "Improvement not found" };
    }

    if (improvement.status === "applied") {
      return { success: false, error: "Improvement already applied" };
    }

    // Get store details and API key
    const { data: store, error: storeError } = await serviceClient
      .from("stores")
      .select("url, connection_config")
      .eq("id", storeId)
      .single();

    if (storeError || !store?.url) {
      return { success: false, error: "Store not found or missing URL" };
    }

    // Get an API key for this store
    const { data: apiKey, error: apiKeyError } = await serviceClient
      .from("api_keys")
      .select("id")
      .eq("store_id", storeId)
      .limit(1)
      .single();

    if (apiKeyError || !apiKey) {
      return { success: false, error: "No API key found for store" };
    }

    // Build the improvement payload based on type
    const payload = buildImprovementPayload(improvement);

    // Send to WordPress plugin
    const webhookUrl = `${store.url}/wp-json/seo-max/v1/apply-improvement`;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        improvement_id: improvementId,
        improvement_type: improvement.improvement_type,
        entity_type: improvement.entity_type,
        entity_id: improvement.entity_id,
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("WordPress apply failed:", response.status, errorText);
      return {
        success: false,
        error: `WordPress returned ${response.status}: ${errorText.substring(0, 100)}`,
      };
    }

    // Mark improvement as applied
    await serviceClient
      .from("seo_improvements")
      .update({
        status: "applied",
        applied_at: new Date().toISOString(),
      })
      .eq("id", improvementId);

    revalidatePath(`/dashboard/stores/${storeId}/improvements`);

    return { success: true };
  } catch (error) {
    console.error("applyImprovementToWordPress error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to apply improvement",
    };
  }
}

/**
 * Build the payload to send to WordPress based on improvement type.
 */
function buildImprovementPayload(improvement: Record<string, unknown>): Record<string, unknown> {
  const suggestedValue = improvement.suggested_value as Record<string, unknown> | null;

  switch (improvement.improvement_type) {
    case "missing_title":
      return {
        action: "update_meta",
        field: "title",
        value: suggestedValue?.recommendation || "",
      };

    case "missing_description":
      return {
        action: "update_meta",
        field: "meta_description",
        value: suggestedValue?.recommendation || "",
      };

    case "thin_content":
      return {
        action: "expand_content",
        content: suggestedValue?.content || "",
        added_sections: suggestedValue?.addedSections || [],
      };

    case "missing_h1":
    case "duplicate_h1":
      return {
        action: "update_heading",
        recommendation: suggestedValue?.recommendation || "",
      };

    case "images_missing_alt":
      return {
        action: "update_images",
        recommendation: suggestedValue?.recommendation || "",
      };

    case "content_freshness":
      return {
        action: "update_content",
        content: suggestedValue?.content || "",
        summary: suggestedValue?.summary || "",
      };

    case "faq_generation":
      return {
        action: "add_faq",
        faq_items: suggestedValue?.faqItems || [],
      };

    case "image_optimization":
      return {
        action: "update_image_alt",
        alt_text: suggestedValue?.altText || "",
        image_url: suggestedValue?.imageUrl || "",
      };

    default:
      return {
        action: "generic_improvement",
        suggested_value: suggestedValue,
      };
  }
}

/**
 * Bulk apply multiple improvements to WordPress.
 */
export async function bulkApplyImprovements(
  storeId: string,
  improvementIds: string[]
): Promise<{ applied: number; failed: number; errors: string[] }> {
  const results = { applied: 0, failed: 0, errors: [] as string[] };

  for (const id of improvementIds) {
    const result = await applyImprovementToWordPress(storeId, id);
    if (result.success) {
      results.applied++;
    } else {
      results.failed++;
      if (result.error) {
        results.errors.push(`${id}: ${result.error}`);
      }
    }

    // Small delay between applies
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Dismiss an improvement (mark as dismissed, won't be suggested again).
 */
export async function dismissImprovement(
  storeId: string,
  improvementId: string
): Promise<ApplyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const serviceClient = await createServiceClient();

  try {
    await serviceClient
      .from("seo_improvements")
      .update({
        status: "dismissed",
        dismissed_at: new Date().toISOString(),
      })
      .eq("id", improvementId)
      .eq("store_id", storeId);

    revalidatePath(`/dashboard/stores/${storeId}/improvements`);

    return { success: true };
  } catch (error) {
    console.error("dismissImprovement error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to dismiss",
    };
  }
}
