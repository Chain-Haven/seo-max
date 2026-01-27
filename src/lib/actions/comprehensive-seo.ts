"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateSchema } from "@/lib/seo/schema-validator";
import { generateRobotsTxt, getDefaultWooCommerceRobotsTxt, validateRobotsTxt } from "@/lib/seo/robots-txt-manager";
import { generateGoogleShoppingFeed, validateProductFeed, type ProductFeedItem } from "@/lib/seo/shopping-feed";
import { detectOrphanPages, detectRedirectChains, analyzeInternalLinkDistribution } from "@/lib/seo/link-analysis";
import { optimizeContent } from "@/lib/seo/realtime-content-optimizer";

// ==================== SCHEMA VALIDATION ====================

export async function validateEntitySchema(
  storeId: string,
  entityType: "product" | "page" | "blog_post",
  entityId: string,
  schemaData: unknown
): Promise<{ data: { isValid: boolean; errors: string[]; warnings: string[] } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const schemaType = (schemaData as Record<string, unknown>)["@type"] as string;
    const validation = validateSchema(schemaType, schemaData);

    // Save validation results
    const serviceClient = await createServiceClient();
    
    // Combine errors and warnings
    const allIssues = [
      ...validation.errors.map((e) => ({ field: e.field, message: e.message, severity: e.severity })),
      ...validation.warnings.map((w) => ({ field: w.field, message: w.message, recommendation: w.recommendation })),
    ];
    
    await serviceClient.from("schema_validations").insert({
      store_id: storeId,
      entity_type: entityType,
      entity_id: entityId,
      schema_type: schemaType,
      schema_data: schemaData,
      is_valid: validation.isValid,
      validation_errors: allIssues,
    });

    revalidatePath(`/dashboard/stores/${storeId}/schema`);

    return {
      data: {
        isValid: validation.isValid,
        errors: validation.errors.map((e) => e.message),
        warnings: validation.warnings.map((w) => w.message),
      },
      error: null,
    };
  } catch (error) {
    console.error("Schema validation error:", error);
    return { data: null, error: "Failed to validate schema" };
  }
}

// ==================== ROBOTS.TXT ====================

export async function generateRobotsTxtAction(
  storeId: string
): Promise<{ data: string | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data: store } = await supabase.from("stores").select("url, platform").eq("id", storeId).single();
    if (!store) return { data: null, error: "Store not found" };

    const config = getDefaultWooCommerceRobotsTxt(store.url);
    const content = generateRobotsTxt(config, store.platform as "woocommerce");

    // Save to database
    const serviceClient = await createServiceClient();
    await serviceClient.from("robots_txt_config").upsert({
      store_id: storeId,
      content,
      is_active: true,
    }, { onConflict: "store_id" });

    revalidatePath(`/dashboard/stores/${storeId}/robots`);

    return { data: content, error: null };
  } catch (error) {
    console.error("Robots.txt generation error:", error);
    return { data: null, error: "Failed to generate robots.txt" };
  }
}

export async function validateRobotsTxtAction(
  content: string
): Promise<{ data: { isValid: boolean; errors: string[]; warnings: string[]; suggestions: string[] } | null; error: string | null }> {
  try {
    const validation = validateRobotsTxt(content);
    return { data: validation, error: null };
  } catch {
    return { data: null, error: "Validation failed" };
  }
}

// ==================== SHOPPING FEED ====================

export async function generateShoppingFeedAction(
  storeId: string
): Promise<{ data: { feedUrl: string; productCount: number; errors: number } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    // Get products
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .limit(10000);

    if (!products || products.length === 0) {
      return { data: null, error: "No products found" };
    }

    // Convert to feed items
    const feedItems: ProductFeedItem[] = products.map((p) => ({
      id: p.external_id,
      title: p.name,
      description: p.meta_description || p.description || "",
      link: `https://example.com/product/${p.external_id}`,
      imageLink: ((p.images as unknown[]) || [])[0] as string || "",
      price: "0.00 USD", // Would come from WooCommerce
      availability: "in stock",
    }));

    // Validate
    const validationErrors = validateProductFeed(feedItems);

    // Generate XML
    const { data: store } = await supabase.from("stores").select("name, url").eq("id", storeId).single();
    const xmlFeed = generateGoogleShoppingFeed(feedItems, {
      title: `${store?.name} Products`,
      link: store?.url || "",
      description: `Product feed for ${store?.name}`,
    });

    // Save feed
    const serviceClient = await createServiceClient();
    const { data: feed } = await serviceClient.from("shopping_feeds").upsert({
      store_id: storeId,
      feed_type: "google_shopping",
      product_count: feedItems.length,
      validation_errors: validationErrors,
      last_generated_at: new Date().toISOString(),
    }, { onConflict: "store_id,feed_type" }).select().single();

    // In production, save XML to storage and return URL
    const feedUrl = `/api/feeds/${storeId}/shopping.xml`;

    revalidatePath(`/dashboard/stores/${storeId}/feeds`);

    return {
      data: {
        feedUrl,
        productCount: feedItems.length,
        errors: validationErrors.filter((e) => e.severity === "error").length,
      },
      error: null,
    };
  } catch (error) {
    console.error("Shopping feed generation error:", error);
    return { data: null, error: "Failed to generate shopping feed" };
  }
}

// ==================== ORPHAN PAGES ====================

export async function detectOrphanPagesAction(
  storeId: string
): Promise<{ data: Array<{ url: string; title: string; suggestedLinks: string[] }> | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    // Get crawled pages
    const { data: crawls } = await supabase
      .from("site_crawls")
      .select("id")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!crawls || crawls.length === 0) {
      return { data: null, error: "No crawl data available. Run a site audit first." };
    }

    const { data: pages } = await supabase
      .from("crawled_pages")
      .select("url, title, word_count")
      .eq("crawl_id", crawls[0].id);

    // Simplified orphan detection (pages with 0 internal links)
    const allPages = (pages || []).map((p) => ({
      url: p.url,
      title: p.title,
      wordCount: p.word_count || 0,
      lastModified: new Date(),
    }));

    const orphans = await detectOrphanPages(allPages, [], undefined, undefined);

    // Save to database
    const serviceClient = await createServiceClient();
    for (const orphan of orphans.slice(0, 100)) {
      await serviceClient.from("orphan_pages").upsert({
        store_id: storeId,
        url: orphan.url,
        title: orphan.title,
        word_count: orphan.wordCount,
        internal_links_in: 0,
        is_important: orphan.hasTraffic || orphan.hasRankings,
        suggested_links: orphan.suggestedLinksFrom,
        status: "orphaned",
      }, { onConflict: "store_id,url" });
    }

    revalidatePath(`/dashboard/stores/${storeId}/orphans`);

    return {
      data: orphans.slice(0, 50).map((o) => ({
        url: o.url,
        title: o.title || "Untitled",
        suggestedLinks: o.suggestedLinksFrom,
      })),
      error: null,
    };
  } catch (error) {
    console.error("Orphan pages detection error:", error);
    return { data: null, error: "Failed to detect orphan pages" };
  }
}

// ==================== REDIRECT CHAINS ====================

export async function detectRedirectChainsAction(
  storeId: string
): Promise<{ data: Array<{ sourceUrl: string; chain: string[]; recommendation: string }> | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    // Get redirects
    const { data: redirects } = await supabase
      .from("redirects")
      .select("source_url, target_url")
      .eq("store_id", storeId)
      .eq("is_active", true);

    if (!redirects || redirects.length === 0) {
      return { data: [], error: null };
    }

    const { data: store } = await supabase.from("stores").select("url").eq("id", storeId).single();
    const chains = await detectRedirectChains(store?.url || "", redirects.map((r) => r.source_url));

    // Save to database
    const serviceClient = await createServiceClient();
    for (const chain of chains) {
      await serviceClient.from("redirect_chains").insert({
        store_id: storeId,
        source_url: chain.sourceUrl,
        chain: chain.chain,
        chain_length: chain.chain.length,
        is_problematic: chain.isProblematic,
        recommendation: chain.recommendation,
      });
    }

    revalidatePath(`/dashboard/stores/${storeId}/redirects`);

    return {
      data: chains.map((c) => ({
        sourceUrl: c.sourceUrl,
        chain: c.chain,
        recommendation: c.recommendation,
      })),
      error: null,
    };
  } catch (error) {
    console.error("Redirect chains detection error:", error);
    return { data: null, error: "Failed to detect redirect chains" };
  }
}

// ==================== REAL-TIME CONTENT OPTIMIZATION ====================

export async function optimizeContentRealtime(
  storeId: string,
  content: string,
  metadata: { title?: string; description?: string; focusKeyword?: string }
): Promise<{ data: { score: number; suggestions: Array<{ type: string; message: string }> } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const result = optimizeContent(content, metadata);

    // Save session
    const serviceClient = await createServiceClient();
    await serviceClient.from("content_optimization_sessions").insert({
      store_id: storeId,
      entity_type: "blog_post",
      focus_keyword: metadata.focusKeyword,
      content_snapshot: content.substring(0, 1000),
      score: result.score,
      suggestions: result.suggestions,
      readability_score: result.readability.score,
      keyword_density: result.keywordAnalysis.keywordDensity,
    });

    return {
      data: {
        score: result.score,
        suggestions: result.suggestions.map((s) => ({
          type: s.type,
          message: s.message,
        })),
      },
      error: null,
    };
  } catch (error) {
    console.error("Content optimization error:", error);
    return { data: null, error: "Failed to optimize content" };
  }
}

// ==================== BULK OPERATIONS ====================

export async function createBulkOperation(
  storeId: string,
  operationType: "meta_update" | "redirect_create" | "alt_text_generation",
  targetIds: string[],
  operationData: Record<string, unknown>
): Promise<{ data: { operationId: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const serviceClient = await createServiceClient();
    const { data: operation, error: opError } = await serviceClient
      .from("bulk_operations")
      .insert({
        store_id: storeId,
        operation_type: operationType,
        target_count: targetIds.length,
        operation_data: { ...operationData, targetIds },
        status: "pending",
        created_by: user.id,
      })
      .select()
      .single();

    if (opError) throw opError;

    revalidatePath(`/dashboard/stores/${storeId}/bulk`);

    return { data: { operationId: operation.id }, error: null };
  } catch (error) {
    console.error("Bulk operation creation error:", error);
    return { data: null, error: "Failed to create bulk operation" };
  }
}

export async function processBulkOperation(operationId: string): Promise<void> {
  // This would be processed by a background worker
  // For now, just update status
  const serviceClient = await createServiceClient();
  await serviceClient
    .from("bulk_operations")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .eq("id", operationId);
}
