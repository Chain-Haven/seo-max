"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAIProvider } from "@/lib/ai/provider";

const MIN_WORD_COUNT = 300; // Minimum words for good SEO

interface ThinContentItem {
  id: string;
  type: "product" | "page" | "blog_post";
  title: string;
  url?: string;
  wordCount: number;
  currentContent: string;
  suggestedMinWords: number;
  priority: "low" | "medium" | "high" | "critical";
}

// Analyze store for thin content
export async function analyzeThinContent(
  storeId: string
): Promise<{ data: ThinContentItem[] | null; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get all content from the store
    const [productsResult, pagesResult, postsResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, description, url")
        .eq("store_id", storeId),
      supabase
        .from("pages")
        .select("id, title, content, url")
        .eq("store_id", storeId),
      supabase
        .from("blog_posts")
        .select("id, title, content, slug")
        .eq("store_id", storeId)
        .eq("status", "published"),
    ]);

    const thinContent: ThinContentItem[] = [];

    // Process products (lower threshold for products)
    for (const product of productsResult.data || []) {
      const content = product.description || "";
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      const minWords = 150; // Products need at least 150 words

      if (wordCount < minWords) {
        const ratio = wordCount / minWords;
        thinContent.push({
          id: product.id,
          type: "product",
          title: product.name,
          url: product.url,
          wordCount,
          currentContent: content,
          suggestedMinWords: minWords,
          priority: ratio < 0.3 ? "critical" : ratio < 0.5 ? "high" : ratio < 0.7 ? "medium" : "low",
        });
      }
    }

    // Process pages
    for (const page of pagesResult.data || []) {
      const content = page.content || "";
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      const minWords = MIN_WORD_COUNT;

      if (wordCount < minWords) {
        const ratio = wordCount / minWords;
        thinContent.push({
          id: page.id,
          type: "page",
          title: page.title,
          url: page.url,
          wordCount,
          currentContent: content,
          suggestedMinWords: minWords,
          priority: ratio < 0.3 ? "critical" : ratio < 0.5 ? "high" : ratio < 0.7 ? "medium" : "low",
        });
      }
    }

    // Process blog posts (higher threshold for blogs)
    for (const post of postsResult.data || []) {
      const content = post.content || "";
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      const minWords = 600; // Blog posts need at least 600 words

      if (wordCount < minWords) {
        const ratio = wordCount / minWords;
        thinContent.push({
          id: post.id,
          type: "blog_post",
          title: post.title,
          url: post.slug,
          wordCount,
          currentContent: content,
          suggestedMinWords: minWords,
          priority: ratio < 0.3 ? "critical" : ratio < 0.5 ? "high" : ratio < 0.7 ? "medium" : "low",
        });
      }
    }

    // Sort by priority (critical first) then by word count (lowest first)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    thinContent.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return a.wordCount - b.wordCount;
    });

    return { data: thinContent, error: null };
  } catch (error) {
    console.error("Error analyzing thin content:", error);
    return { data: null, error: "Failed to analyze thin content" };
  }
}

// Generate expanded content for a thin page
export async function generateExpandedContent(
  storeId: string,
  entityType: string,
  entityId: string,
  targetWordCount?: number
): Promise<{ data: { expandedContent: string; addedSections: string[] } | null; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get the content
    let content = "";
    let title = "";
    let context = "";

    if (entityType === "product") {
      const { data } = await supabase
        .from("products")
        .select("name, description, category")
        .eq("id", entityId)
        .single();
      content = data?.description || "";
      title = data?.name || "";
      context = `Product category: ${data?.category || "General"}`;
      targetWordCount = targetWordCount || 200;
    } else if (entityType === "page") {
      const { data } = await supabase
        .from("pages")
        .select("title, content, page_type")
        .eq("id", entityId)
        .single();
      content = data?.content || "";
      title = data?.title || "";
      context = `Page type: ${data?.page_type || "General"}`;
      targetWordCount = targetWordCount || 400;
    } else if (entityType === "blog_post") {
      const { data } = await supabase
        .from("blog_posts")
        .select("title, content, topic")
        .eq("id", entityId)
        .single();
      content = data?.content || "";
      title = data?.title || "";
      context = `Topic: ${data?.topic || "General"}`;
      targetWordCount = targetWordCount || 800;
    }

    if (!title) {
      return { data: null, error: "Content not found" };
    }

    const currentWordCount = content.split(/\s+/).filter(Boolean).length;
    const ai = getAIProvider();

    const prompt = `You are an SEO content expert. This content is too thin (${currentWordCount} words) and needs to be expanded to at least ${targetWordCount} words for better SEO performance.

Title: ${title}
${context}

Current Content:
${content || "[No content yet]"}

Please expand this content by:
1. Adding more detailed explanations
2. Including relevant examples or use cases
3. Adding helpful tips or best practices
4. Expanding on key points
5. Adding a conclusion if appropriate

Keep the same tone and style. Make the content comprehensive and valuable to readers.

Format your response as:
ADDED_SECTIONS:
- [Brief description of section 1 you added]
- [Brief description of section 2 you added]
- [etc.]

EXPANDED_CONTENT:
[The complete expanded content here - include the original content integrated with new additions]`;

    const response = await ai.generateText(prompt, { maxTokens: 2500 });

    // Parse the response
    const sectionsMatch = response.content.match(/ADDED_SECTIONS:([\s\S]*?)(?=EXPANDED_CONTENT:|$)/);
    const contentMatch = response.content.match(/EXPANDED_CONTENT:([\s\S]*?)$/);

    const addedSections = sectionsMatch
      ? sectionsMatch[1]
          .split("\n")
          .filter((line) => line.trim().startsWith("-"))
          .map((line) => line.replace(/^-\s*/, "").trim())
      : [];

    const expandedContent = contentMatch
      ? contentMatch[1].trim()
      : content;

    // Save as improvement suggestion
    const serviceClient = await createServiceClient();
    await serviceClient.from("seo_improvements").insert({
      store_id: storeId,
      improvement_type: "thin_content",
      entity_type: entityType,
      entity_id: entityId,
      entity_title: title,
      current_value: { content, wordCount: currentWordCount },
      suggested_value: { 
        content: expandedContent, 
        addedSections,
        wordCount: expandedContent.split(/\s+/).filter(Boolean).length 
      },
      priority: currentWordCount < 50 ? "critical" : currentWordCount < 100 ? "high" : "medium",
      impact_score: Math.min(100, Math.round(((targetWordCount || 300) - currentWordCount) / (targetWordCount || 300) * 100)),
      reason: `Content is thin (${currentWordCount} words). Expanded to ${expandedContent.split(/\s+/).filter(Boolean).length} words with ${addedSections.length} new sections.`,
    });

    revalidatePath(`/dashboard/stores/${storeId}/improvements`);

    return {
      data: { expandedContent, addedSections },
      error: null,
    };
  } catch (error) {
    console.error("Error generating expanded content:", error);
    return { data: null, error: "Failed to generate expanded content" };
  }
}

// Apply content expansion
export async function applyContentExpansion(
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
    console.error("Error applying expansion:", error);
    return { success: false, error: "Failed to apply content expansion" };
  }
}
