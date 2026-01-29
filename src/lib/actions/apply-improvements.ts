"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface ApplyResult {
  success: boolean;
  error?: string;
}

// #region agent log helper
function debugLog(data: Record<string, unknown>) {
  console.log("[DEBUG]", JSON.stringify({ ...data, timestamp: Date.now() }));
}
// #endregion

/**
 * Apply an SEO improvement to the WordPress site via the plugin webhook.
 * This sends the improvement data to the WordPress site which then applies the changes.
 */
export async function applyImprovementToWordPress(
  storeId: string,
  improvementId: string
): Promise<ApplyResult> {
  // #region agent log
  debugLog({location:'apply-improvements.ts:applyImprovementToWordPress',message:'Function called',data:{storeId,improvementId},hypothesisId:'C'});
  // #endregion
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

    // #region agent log
    debugLog({location:'apply-improvements.ts:applyImprovementToWordPress',message:'Sending webhook to WordPress',data:{webhookUrl,improvementType:improvement.improvement_type},hypothesisId:'C'});
    // #endregion

    // Get the full API key for authentication
    const { data: apiKeyData } = await serviceClient
      .from("api_keys")
      .select("key_hash")
      .eq("id", apiKey.id)
      .single();

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Include API key ID for WordPress to verify
        "X-SEO-Max-Key-ID": apiKey.id,
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

    // #region agent log
    debugLog({location:'apply-improvements.ts:applyImprovementToWordPress',message:'WordPress response received',data:{status:response.status,ok:response.ok},hypothesisId:'C'});
    // #endregion

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("WordPress apply failed:", response.status, errorText);
      // #region agent log
      debugLog({location:'apply-improvements.ts:applyImprovementToWordPress',message:'WordPress apply failed',data:{status:response.status,errorText:errorText.substring(0,200)},hypothesisId:'C'});
      // #endregion
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
  const currentValue = improvement.current_value as Record<string, unknown> | null;

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

    case "stale_content":
    case "content_freshness":
      return {
        action: "update_content",
        content: suggestedValue?.content || "",
        summary: suggestedValue?.summary || "",
      };

    case "missing_faq_schema":
    case "faq_generation":
      return {
        action: "add_faq",
        faq_items: suggestedValue?.faqItems || [],
      };

    case "missing_product_schema":
    case "missing_article_schema":
      return {
        action: "add_schema",
        schema_type: improvement.improvement_type.replace("missing_", "").replace("_schema", ""),
        schema_json: suggestedValue?.schemaJson || {},
      };

    case "internal_linking":
      return {
        action: "add_internal_link",
        target_url: currentValue?.targetUrl || "",
        anchor_text: suggestedValue?.anchorText || "",
      };

    case "broken_external_link":
      return {
        action: "fix_broken_link",
        broken_url: currentValue?.brokenLink || "",
        replacement_url: suggestedValue?.replacementUrl || null,
      };

    case "url_optimization":
      return {
        action: "optimize_url",
        new_slug: suggestedValue?.newSlug || "",
      };

    case "missing_og_title":
    case "missing_og_image":
    case "missing_og_description":
      return {
        action: "add_open_graph",
        og_title: currentValue?.ogTitle || suggestedValue?.ogTitle || null,
        og_description: currentValue?.ogDescription || suggestedValue?.ogDescription || null,
        og_image: currentValue?.ogImage || suggestedValue?.ogImage || null,
      };

    case "unoptimized_images":
    case "images_no_lazy_loading":
      return {
        action: "optimize_images",
        image_updates: suggestedValue?.imageUpdates || [],
      };

    case "missing_author_info":
      return {
        action: "add_author_info",
        author_name: suggestedValue?.authorName || "",
        author_url: suggestedValue?.authorUrl || null,
      };

    case "missing_mobile_viewport":
      return {
        action: "update_viewport",
      };

    case "redirect_chain":
      return {
        action: "generic_improvement",
        suggested_value: suggestedValue,
        recommendation: suggestedValue?.recommendation || "Fix redirect chain manually",
      };

    case "duplicate_content":
    case "keyword_cannibalization":
    case "orphan_page":
    case "external_link_quality":
    case "core_web_vitals":
    case "sitemap_validation":
    case "not_https":
    case "keyword_suggestion":
      // These require manual review or complex actions
      return {
        action: "generic_improvement",
        suggested_value: suggestedValue,
        recommendation: suggestedValue?.recommendation || "",
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
