"use server";

/**
 * Bulk Content Optimization
 * Auto-optimize all store content: products, pages, posts
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";
import { revalidatePath } from "next/cache";

export interface ContentItem {
  id: string;
  type: "product" | "page" | "post";
  title: string;
  url: string;
  metaTitle: string | null;
  metaDescription: string | null;
  seoScore: number;
  issues: string[];
  lastOptimized: string | null;
}

export interface OptimizationResult {
  id: string;
  type: string;
  title: string;
  success: boolean;
  changes: {
    metaTitle?: { old: string | null; new: string };
    metaDescription?: { old: string | null; new: string };
    title?: { old: string; new: string };
  };
  error?: string;
}

export interface BulkOptimizeResult {
  success: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  results: OptimizationResult[];
  error?: string;
}

/**
 * Get all content from a store that can be optimized
 */
export async function getOptimizableContent(
  storeId: string
): Promise<{ items: ContentItem[]; error?: string }> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { items: [], error: "Not authenticated" };
  }

  const items: ContentItem[] = [];

  // Get products
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, slug, description, meta_title, meta_description, updated_at")
    .eq("store_id", storeId)
    .order("name");

  if (!productsError && products) {
    for (const product of products) {
      const issues: string[] = [];
      let score = 100;

      // Check meta title
      if (!product.meta_title) {
        issues.push("Missing meta title");
        score -= 25;
      } else if (product.meta_title.length < 30) {
        issues.push("Meta title too short");
        score -= 10;
      } else if (product.meta_title.length > 60) {
        issues.push("Meta title too long");
        score -= 10;
      }

      // Check meta description
      if (!product.meta_description) {
        issues.push("Missing meta description");
        score -= 25;
      } else if (product.meta_description.length < 120) {
        issues.push("Meta description too short");
        score -= 10;
      } else if (product.meta_description.length > 160) {
        issues.push("Meta description too long");
        score -= 10;
      }

      // Check product name/title
      if (product.name && product.name.length < 10) {
        issues.push("Product title too short");
        score -= 10;
      }

      items.push({
        id: product.id,
        type: "product",
        title: product.name || "Untitled Product",
        url: `/product/${product.slug}`,
        metaTitle: product.meta_title,
        metaDescription: product.meta_description,
        seoScore: Math.max(0, score),
        issues,
        lastOptimized: null,
      });
    }
  }

  // Get pages
  const { data: pages, error: pagesError } = await supabase
    .from("pages")
    .select("id, title, slug, content, meta_title, meta_description, updated_at")
    .eq("store_id", storeId)
    .order("title");

  if (!pagesError && pages) {
    for (const page of pages) {
      const issues: string[] = [];
      let score = 100;

      if (!page.meta_title) {
        issues.push("Missing meta title");
        score -= 25;
      } else if (page.meta_title.length < 30 || page.meta_title.length > 60) {
        issues.push("Meta title length not optimal");
        score -= 10;
      }

      if (!page.meta_description) {
        issues.push("Missing meta description");
        score -= 25;
      } else if (page.meta_description.length < 120 || page.meta_description.length > 160) {
        issues.push("Meta description length not optimal");
        score -= 10;
      }

      items.push({
        id: page.id,
        type: "page",
        title: page.title || "Untitled Page",
        url: `/${page.slug}`,
        metaTitle: page.meta_title,
        metaDescription: page.meta_description,
        seoScore: Math.max(0, score),
        issues,
        lastOptimized: null,
      });
    }
  }

  // Get blog posts
  const { data: posts, error: postsError } = await supabase
    .from("blog_posts")
    .select("id, title, slug, content, meta_title, meta_description, updated_at")
    .eq("store_id", storeId)
    .order("title");

  if (!postsError && posts) {
    for (const post of posts) {
      const issues: string[] = [];
      let score = 100;

      if (!post.meta_title) {
        issues.push("Missing meta title");
        score -= 25;
      } else if (post.meta_title.length < 30 || post.meta_title.length > 60) {
        issues.push("Meta title length not optimal");
        score -= 10;
      }

      if (!post.meta_description) {
        issues.push("Missing meta description");
        score -= 25;
      } else if (post.meta_description.length < 120 || post.meta_description.length > 160) {
        issues.push("Meta description length not optimal");
        score -= 10;
      }

      items.push({
        id: post.id,
        type: "post",
        title: post.title || "Untitled Post",
        url: `/blog/${post.slug}`,
        metaTitle: post.meta_title,
        metaDescription: post.meta_description,
        seoScore: Math.max(0, score),
        issues,
        lastOptimized: null,
      });
    }
  }

  // Sort by score (worst first)
  items.sort((a, b) => a.seoScore - b.seoScore);

  return { items };
}

/**
 * Optimize a single content item
 */
async function optimizeContentItem(
  item: ContentItem,
  storeId: string,
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>
): Promise<OptimizationResult> {
  const ai = getAIProvider();
  const changes: OptimizationResult["changes"] = {};

  try {
    // Get content details for context
    let contentDetails = "";
    let tableName = "";
    
    if (item.type === "product") {
      const { data } = await serviceClient
        .from("products")
        .select("name, description, short_description, categories, price")
        .eq("id", item.id)
        .single();
      
      if (data) {
        contentDetails = `
Product Name: ${data.name}
Description: ${data.description || "No description"}
Short Description: ${data.short_description || "N/A"}
Categories: ${data.categories?.join(", ") || "N/A"}
Price: ${data.price || "N/A"}`;
      }
      tableName = "products";
    } else if (item.type === "page") {
      const { data } = await serviceClient
        .from("pages")
        .select("title, content")
        .eq("id", item.id)
        .single();
      
      if (data) {
        // Extract first 500 chars of content for context
        const contentPreview = data.content?.substring(0, 500) || "";
        contentDetails = `
Page Title: ${data.title}
Content Preview: ${contentPreview}`;
      }
      tableName = "pages";
    } else if (item.type === "post") {
      const { data } = await serviceClient
        .from("blog_posts")
        .select("title, content")
        .eq("id", item.id)
        .single();
      
      if (data) {
        const contentPreview = data.content?.substring(0, 500) || "";
        contentDetails = `
Blog Post Title: ${data.title}
Content Preview: ${contentPreview}`;
      }
      tableName = "blog_posts";
    }

    // Generate optimized meta title if missing or poor
    if (!item.metaTitle || item.metaTitle.length < 30 || item.metaTitle.length > 70) {
      const metaTitlePrompt = `Generate an SEO-optimized meta title for this ${item.type}:

${contentDetails}

Current meta title: ${item.metaTitle || "None"}

Requirements:
- Between 50-60 characters (optimal for search results)
- Include the main keyword naturally
- Make it compelling and click-worthy
- Include brand/site name at the end if space allows (use | or - as separator)

Return ONLY the meta title, nothing else.`;

      const metaTitleResult = await ai.generateText(metaTitlePrompt, {
        maxTokens: 100,
        temperature: 0.7,
      });

      const newMetaTitle = metaTitleResult.content.trim().replace(/^["']|["']$/g, "");
      if (newMetaTitle && newMetaTitle.length >= 30 && newMetaTitle.length <= 70) {
        changes.metaTitle = { old: item.metaTitle, new: newMetaTitle };
      }
    }

    // Generate optimized meta description if missing or poor
    if (!item.metaDescription || item.metaDescription.length < 100 || item.metaDescription.length > 170) {
      const metaDescPrompt = `Generate an SEO-optimized meta description for this ${item.type}:

${contentDetails}

Current meta description: ${item.metaDescription || "None"}

Requirements:
- Between 150-160 characters (optimal for search results)
- Include a clear value proposition
- Include a subtle call-to-action
- Include relevant keywords naturally
- Make it compelling and informative

Return ONLY the meta description, nothing else.`;

      const metaDescResult = await ai.generateText(metaDescPrompt, {
        maxTokens: 200,
        temperature: 0.7,
      });

      const newMetaDesc = metaDescResult.content.trim().replace(/^["']|["']$/g, "");
      if (newMetaDesc && newMetaDesc.length >= 100 && newMetaDesc.length <= 170) {
        changes.metaDescription = { old: item.metaDescription, new: newMetaDesc };
      }
    }

    // Apply changes to database
    if (Object.keys(changes).length > 0) {
      const updateData: Record<string, string> = {};
      if (changes.metaTitle) updateData.meta_title = changes.metaTitle.new;
      if (changes.metaDescription) updateData.meta_description = changes.metaDescription.new;

      const { error: updateError } = await serviceClient
        .from(tableName)
        .update(updateData)
        .eq("id", item.id);

      if (updateError) {
        throw new Error(`Failed to update ${item.type}: ${updateError.message}`);
      }
    }

    return {
      id: item.id,
      type: item.type,
      title: item.title,
      success: true,
      changes,
    };
  } catch (error) {
    console.error(`[BulkOptimize] Error optimizing ${item.type} ${item.id}:`, error);
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      success: false,
      changes: {},
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Bulk optimize multiple content items
 */
export async function bulkOptimizeContent(
  storeId: string,
  itemIds: string[],
  options: {
    optimizeMetaTitle?: boolean;
    optimizeMetaDescription?: boolean;
    pushToWordPress?: boolean;
  } = {}
): Promise<BulkOptimizeResult> {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      results: [],
      error: "Not authenticated",
    };
  }

  // Check for AI API keys
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return {
      success: false,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      results: [],
      error: "No AI provider configured. Please add OPENAI_API_KEY or ANTHROPIC_API_KEY.",
    };
  }

  // Get all content
  const { items, error: contentError } = await getOptimizableContent(storeId);
  if (contentError) {
    return {
      success: false,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      results: [],
      error: contentError,
    };
  }

  // Filter to selected items
  const selectedItems = items.filter((item) => itemIds.includes(item.id));
  if (selectedItems.length === 0) {
    return {
      success: false,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      results: [],
      error: "No items selected for optimization",
    };
  }

  console.log(`[BulkOptimize] Starting optimization of ${selectedItems.length} items`);

  const results: OptimizationResult[] = [];
  let successful = 0;
  let failed = 0;

  // Process items one at a time to avoid rate limits
  for (const item of selectedItems) {
    const result = await optimizeContentItem(item, storeId, serviceClient);
    results.push(result);
    
    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    // Small delay between items to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Push to WordPress if requested
  if (options.pushToWordPress && successful > 0) {
    try {
      // Get store webhook URL
      const { data: store } = await serviceClient
        .from("stores")
        .select("url, webhook_secret")
        .eq("id", storeId)
        .single();

      if (store?.webhook_secret) {
        // Get API key for this store
        const { data: apiKey } = await serviceClient
          .from("api_keys")
          .select("id")
          .eq("store_id", storeId)
          .limit(1)
          .single();

        if (apiKey) {
          // Send bulk update to WordPress
          const successfulResults = results.filter((r) => r.success && Object.keys(r.changes).length > 0);
          
          for (const result of successfulResults) {
            const payload = {
              action: "update_meta",
              type: result.type,
              id: result.id,
              data: {
                meta_title: result.changes.metaTitle?.new,
                meta_description: result.changes.metaDescription?.new,
              },
            };

            try {
              await fetch(`${store.url}/wp-json/seo-max/v1/webhook`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-SEO-Max-Signature": store.webhook_secret,
                  "X-SEO-Max-Key-ID": apiKey.id,
                },
                body: JSON.stringify(payload),
              });
            } catch (wpError) {
              console.error(`[BulkOptimize] WordPress push error for ${result.id}:`, wpError);
            }
          }
        }
      }
    } catch (pushError) {
      console.error("[BulkOptimize] WordPress push error:", pushError);
    }
  }

  revalidatePath(`/dashboard/stores/${storeId}`);
  revalidatePath(`/dashboard/stores/${storeId}/auto-optimize`);

  return {
    success: true,
    totalProcessed: selectedItems.length,
    successful,
    failed,
    results,
  };
}

/**
 * Get optimization statistics for a store
 */
export async function getOptimizationStats(
  storeId: string
): Promise<{
  total: number;
  optimized: number;
  needsAttention: number;
  averageScore: number;
  byType: {
    products: { total: number; optimized: number };
    pages: { total: number; optimized: number };
    posts: { total: number; optimized: number };
  };
}> {
  const { items } = await getOptimizableContent(storeId);

  const stats = {
    total: items.length,
    optimized: items.filter((i) => i.seoScore >= 80).length,
    needsAttention: items.filter((i) => i.seoScore < 60).length,
    averageScore: items.length > 0 
      ? Math.round(items.reduce((acc, i) => acc + i.seoScore, 0) / items.length)
      : 0,
    byType: {
      products: {
        total: items.filter((i) => i.type === "product").length,
        optimized: items.filter((i) => i.type === "product" && i.seoScore >= 80).length,
      },
      pages: {
        total: items.filter((i) => i.type === "page").length,
        optimized: items.filter((i) => i.type === "page" && i.seoScore >= 80).length,
      },
      posts: {
        total: items.filter((i) => i.type === "post").length,
        optimized: items.filter((i) => i.type === "post" && i.seoScore >= 80).length,
      },
    },
  };

  return stats;
}
