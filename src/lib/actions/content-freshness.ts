"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAIProvider } from "@/lib/ai/provider";

interface ContentItem {
  id: string;
  type: "product" | "page" | "blog_post";
  title: string;
  url?: string;
  content?: string;
  wordCount: number;
  lastModified: string;
  daysSinceUpdate: number;
  freshnessScore: number;
  impressions30d?: number;
  clicks30d?: number;
  avgPosition?: number;
}

interface FreshnessResult {
  staleContent: ContentItem[];
  totalAnalyzed: number;
  averageFreshnessScore: number;
}

// Analyze content freshness for a store
export async function analyzeContentFreshness(
  storeId: string
): Promise<{ data: FreshnessResult | null; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get all content from the store
    const [productsResult, pagesResult, postsResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, description, meta_description, updated_at, url")
        .eq("store_id", storeId),
      supabase
        .from("pages")
        .select("id, title, content, meta_description, updated_at, url")
        .eq("store_id", storeId),
      supabase
        .from("blog_posts")
        .select("id, title, content, updated_at, slug")
        .eq("store_id", storeId)
        .eq("status", "published"),
    ]);

    const allContent: ContentItem[] = [];
    const now = new Date();

    // Process products
    for (const product of productsResult.data || []) {
      const lastMod = new Date(product.updated_at);
      const daysSince = Math.floor((now.getTime() - lastMod.getTime()) / (1000 * 60 * 60 * 24));
      const wordCount = ((product.description || "") + " " + (product.meta_description || "")).split(/\s+/).length;
      
      // Freshness score: 100 = fresh, 0 = very stale
      // Products over 180 days start losing freshness
      const freshnessScore = Math.max(0, 100 - Math.floor(Math.max(0, daysSince - 180) / 3));

      allContent.push({
        id: product.id,
        type: "product",
        title: product.name,
        url: product.url,
        wordCount,
        lastModified: product.updated_at,
        daysSinceUpdate: daysSince,
        freshnessScore,
      });
    }

    // Process pages
    for (const page of pagesResult.data || []) {
      const lastMod = new Date(page.updated_at);
      const daysSince = Math.floor((now.getTime() - lastMod.getTime()) / (1000 * 60 * 60 * 24));
      const wordCount = ((page.content || "") + " " + (page.meta_description || "")).split(/\s+/).length;
      
      // Pages over 90 days start losing freshness
      const freshnessScore = Math.max(0, 100 - Math.floor(Math.max(0, daysSince - 90) / 2));

      allContent.push({
        id: page.id,
        type: "page",
        title: page.title,
        url: page.url,
        content: page.content,
        wordCount,
        lastModified: page.updated_at,
        daysSinceUpdate: daysSince,
        freshnessScore,
      });
    }

    // Process blog posts
    for (const post of postsResult.data || []) {
      const lastMod = new Date(post.updated_at);
      const daysSince = Math.floor((now.getTime() - lastMod.getTime()) / (1000 * 60 * 60 * 24));
      const wordCount = (post.content || "").split(/\s+/).length;
      
      // Blog posts over 60 days start losing freshness
      const freshnessScore = Math.max(0, 100 - Math.floor(Math.max(0, daysSince - 60) / 1.5));

      allContent.push({
        id: post.id,
        type: "blog_post",
        title: post.title,
        url: post.slug,
        content: post.content,
        wordCount,
        lastModified: post.updated_at,
        daysSinceUpdate: daysSince,
        freshnessScore,
      });
    }

    // Filter to stale content (freshness score < 70)
    const staleContent = allContent
      .filter((c) => c.freshnessScore < 70)
      .sort((a, b) => a.freshnessScore - b.freshnessScore);

    // Save to content_freshness table
    const serviceClient = await createServiceClient();
    for (const item of allContent) {
      await serviceClient.from("content_freshness").upsert({
        store_id: storeId,
        entity_type: item.type,
        entity_id: item.id,
        entity_url: item.url,
        title: item.title,
        word_count: item.wordCount,
        last_modified: item.lastModified,
        days_since_update: item.daysSinceUpdate,
        freshness_score: item.freshnessScore,
        checked_at: new Date().toISOString(),
      }, { onConflict: "store_id,entity_type,entity_id" });
    }

    const avgScore = allContent.length > 0
      ? Math.round(allContent.reduce((sum, c) => sum + c.freshnessScore, 0) / allContent.length)
      : 100;

    return {
      data: {
        staleContent,
        totalAnalyzed: allContent.length,
        averageFreshnessScore: avgScore,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error analyzing freshness:", error);
    return { data: null, error: "Failed to analyze content freshness" };
  }
}

// Generate refresh suggestions for stale content
export async function generateRefreshSuggestions(
  storeId: string,
  entityType: string,
  entityId: string
): Promise<{ data: { suggestions: string[]; updatedContent: string } | null; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get the content
    let content = "";
    let title = "";

    if (entityType === "product") {
      const { data } = await supabase
        .from("products")
        .select("name, description")
        .eq("id", entityId)
        .single();
      content = data?.description || "";
      title = data?.name || "";
    } else if (entityType === "page") {
      const { data } = await supabase
        .from("pages")
        .select("title, content")
        .eq("id", entityId)
        .single();
      content = data?.content || "";
      title = data?.title || "";
    } else if (entityType === "blog_post") {
      const { data } = await supabase
        .from("blog_posts")
        .select("title, content")
        .eq("id", entityId)
        .single();
      content = data?.content || "";
      title = data?.title || "";
    }

    if (!content) {
      return { data: null, error: "Content not found" };
    }

    const ai = getAIProvider();
    const currentYear = new Date().getFullYear();

    const prompt = `Analyze this content and suggest how to refresh/update it for ${currentYear}. The content may be outdated.

Title: ${title}

Content:
${content.substring(0, 3000)}

Provide:
1. A list of 3-5 specific suggestions to update/refresh this content (be specific about what to add, update, or remove)
2. An updated version of the content that incorporates these changes (keep the same general structure but make it current and fresh)

Format your response as:
SUGGESTIONS:
- [suggestion 1]
- [suggestion 2]
- [suggestion 3]

UPDATED_CONTENT:
[The refreshed content here]`;

    const response = await ai.generateText(prompt, { maxTokens: 2000 });

    // Parse the response
    const suggestionsMatch = response.content.match(/SUGGESTIONS:([\s\S]*?)(?=UPDATED_CONTENT:|$)/);
    const contentMatch = response.content.match(/UPDATED_CONTENT:([\s\S]*?)$/);

    const suggestions = suggestionsMatch
      ? suggestionsMatch[1]
          .split("\n")
          .filter((line) => line.trim().startsWith("-"))
          .map((line) => line.replace(/^-\s*/, "").trim())
      : [];

    const updatedContent = contentMatch
      ? contentMatch[1].trim()
      : content;

    // Save as improvement suggestion
    const serviceClient = await createServiceClient();
    await serviceClient.from("seo_improvements").insert({
      store_id: storeId,
      improvement_type: "content_freshness",
      entity_type: entityType,
      entity_id: entityId,
      current_value: { content, title },
      suggested_value: { content: updatedContent, suggestions },
      priority: "medium",
      impact_score: 60,
      reason: `Content hasn't been updated recently. Suggested ${suggestions.length} improvements.`,
    });

    revalidatePath(`/dashboard/stores/${storeId}/improvements`);

    return {
      data: { suggestions, updatedContent },
      error: null,
    };
  } catch (error) {
    console.error("Error generating refresh suggestions:", error);
    return { data: null, error: "Failed to generate suggestions" };
  }
}

// Apply a content refresh
export async function applyContentRefresh(
  storeId: string,
  improvementId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get the improvement
    const { data: improvement } = await supabase
      .from("seo_improvements")
      .select("*")
      .eq("id", improvementId)
      .single();

    if (!improvement) {
      return { success: false, error: "Improvement not found" };
    }

    const newContent = (improvement.suggested_value as { content: string })?.content;
    if (!newContent) {
      return { success: false, error: "No suggested content found" };
    }

    // Update the content
    const table = improvement.entity_type === "product" ? "products"
      : improvement.entity_type === "page" ? "pages"
      : "blog_posts";

    const field = improvement.entity_type === "product" ? "description" : "content";

    const { error: updateError } = await supabase
      .from(table)
      .update({ 
        [field]: newContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", improvement.entity_id);

    if (updateError) {
      throw updateError;
    }

    // Mark improvement as applied
    await supabase
      .from("seo_improvements")
      .update({ 
        status: "applied", 
        applied_at: new Date().toISOString() 
      })
      .eq("id", improvementId);

    revalidatePath(`/dashboard/stores/${storeId}`);
    return { success: true, error: null };
  } catch (error) {
    console.error("Error applying refresh:", error);
    return { success: false, error: "Failed to apply content refresh" };
  }
}

// Dismiss an improvement
export async function dismissImprovement(
  improvementId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("seo_improvements")
    .update({ 
      status: "dismissed", 
      dismissed_at: new Date().toISOString() 
    })
    .eq("id", improvementId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Get pending improvements for a store
export async function getPendingImprovements(
  storeId: string,
  type?: string
): Promise<{ data: Array<{
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  entityTitle: string;
  currentValue: unknown;
  suggestedValue: unknown;
  priority: string;
  impactScore: number;
  reason: string;
  createdAt: string;
}> | null; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("seo_improvements")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "pending")
    .order("impact_score", { ascending: false });

  if (type) {
    query = query.eq("improvement_type", type);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: data.map((i) => ({
      id: i.id,
      type: i.improvement_type,
      entityType: i.entity_type,
      entityId: i.entity_id,
      entityTitle: i.entity_title || "Unknown",
      currentValue: i.current_value,
      suggestedValue: i.suggested_value,
      priority: i.priority,
      impactScore: i.impact_score,
      reason: i.reason,
      createdAt: i.created_at,
    })),
    error: null,
  };
}
