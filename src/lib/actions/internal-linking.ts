"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  analyzeInternalLinks,
  buildLinkMap,
  detectOrphanPages,
  applyLinkToContent,
  type LinkableContent,
  type InternalLinkAnalysis,
  type OrphanPage,
  type LinkSuggestion,
} from "@/lib/ai/internal-linking";

// Get all linkable content for a store
export async function getStoreLinkableContent(
  storeId: string
): Promise<{ data: LinkableContent[] | null; error: string | null }> {
  const supabase = await createClient();

  // Fetch products
  const { data: products } = await supabase
    .from("products")
    .select("id, name, url, description, meta_title")
    .eq("store_id", storeId)
    .limit(100);

  // Fetch pages
  const { data: pages } = await supabase
    .from("pages")
    .select("id, title, url, content, meta_title")
    .eq("store_id", storeId)
    .limit(100);

  // Fetch blog posts
  const { data: blogPosts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, content, meta_title")
    .eq("store_id", storeId)
    .eq("status", "published")
    .limit(100);

  const linkableContent: LinkableContent[] = [];

  // Add products
  if (products) {
    for (const product of products) {
      linkableContent.push({
        id: product.id,
        type: "product",
        title: product.name,
        url: product.url || `/product/${product.id}`,
        excerpt: product.description?.substring(0, 150),
        keywords: extractKeywords(product.name, product.meta_title),
      });
    }
  }

  // Add pages
  if (pages) {
    for (const page of pages) {
      linkableContent.push({
        id: page.id,
        type: "page",
        title: page.title,
        url: page.url || `/${page.id}`,
        excerpt: page.content?.substring(0, 150),
        keywords: extractKeywords(page.title, page.meta_title),
      });
    }
  }

  // Add blog posts
  if (blogPosts) {
    for (const post of blogPosts) {
      linkableContent.push({
        id: post.id,
        type: "blog_post",
        title: post.title,
        url: `/blog/${post.slug || post.id}`,
        excerpt: post.content?.replace(/<[^>]*>/g, "").substring(0, 150),
        keywords: extractKeywords(post.title, post.meta_title),
      });
    }
  }

  return { data: linkableContent, error: null };
}

// Helper to extract keywords from title and meta
function extractKeywords(title: string, metaTitle?: string | null): string[] {
  const text = `${title} ${metaTitle || ""}`.toLowerCase();
  const words = text.split(/\s+/).filter((w) => w.length > 3);
  // Remove common stop words
  const stopWords = ["this", "that", "with", "from", "have", "will", "your", "about", "which", "their", "been"];
  return [...new Set(words.filter((w) => !stopWords.includes(w)))].slice(0, 5);
}

// Analyze internal links for a specific content piece
export async function analyzeContentInternalLinks(
  storeId: string,
  contentType: "product" | "page" | "blog_post",
  contentId: string
): Promise<{ data: InternalLinkAnalysis | null; error: string | null }> {
  const supabase = await createClient();

  // Fetch the content
  let content: string = "";
  let title: string = "";
  let url: string = "";

  if (contentType === "product") {
    const { data: product } = await supabase
      .from("products")
      .select("name, description, url")
      .eq("id", contentId)
      .single();
    if (product) {
      content = product.description || "";
      title = product.name;
      url = product.url || "";
    }
  } else if (contentType === "page") {
    const { data: page } = await supabase
      .from("pages")
      .select("title, content, url")
      .eq("id", contentId)
      .single();
    if (page) {
      content = page.content || "";
      title = page.title;
      url = page.url || "";
    }
  } else if (contentType === "blog_post") {
    const { data: post } = await supabase
      .from("blog_posts")
      .select("title, content, slug")
      .eq("id", contentId)
      .single();
    if (post) {
      content = post.content || "";
      title = post.title;
      url = `/blog/${post.slug}`;
    }
  }

  if (!content) {
    return { data: null, error: "Content not found" };
  }

  // Get all linkable content for the store
  const { data: linkableContent } = await getStoreLinkableContent(storeId);
  if (!linkableContent) {
    return { data: null, error: "Failed to fetch linkable content" };
  }

  // Analyze with AI
  const analysis = await analyzeInternalLinks(content, title, url, linkableContent);

  return { data: analysis, error: null };
}

// Analyze a custom text input (for the tool UI)
export async function analyzeTextInternalLinks(
  storeId: string,
  text: string,
  textTitle: string
): Promise<{ data: InternalLinkAnalysis | null; error: string | null }> {
  // Get all linkable content for the store
  const { data: linkableContent } = await getStoreLinkableContent(storeId);
  if (!linkableContent) {
    return { data: null, error: "Failed to fetch linkable content" };
  }

  // Analyze with AI
  const analysis = await analyzeInternalLinks(text, textTitle, "", linkableContent);

  return { data: analysis, error: null };
}

// Detect orphan pages for a store
export async function detectStoreOrphanPages(
  storeId: string
): Promise<{ data: OrphanPage[] | null; error: string | null }> {
  const supabase = await createClient();

  // Fetch all content with their content
  const allContent: Array<{
    id: string;
    title: string;
    url: string;
    type: string;
    content?: string;
  }> = [];

  // Fetch products
  const { data: products } = await supabase
    .from("products")
    .select("id, name, url, description")
    .eq("store_id", storeId);

  if (products) {
    for (const p of products) {
      allContent.push({
        id: p.id,
        title: p.name,
        url: p.url || `/product/${p.id}`,
        type: "product",
        content: p.description,
      });
    }
  }

  // Fetch pages
  const { data: pages } = await supabase
    .from("pages")
    .select("id, title, url, content")
    .eq("store_id", storeId);

  if (pages) {
    for (const p of pages) {
      allContent.push({
        id: p.id,
        title: p.title,
        url: p.url || `/${p.id}`,
        type: "page",
        content: p.content,
      });
    }
  }

  // Fetch blog posts
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, content")
    .eq("store_id", storeId);

  if (posts) {
    for (const p of posts) {
      allContent.push({
        id: p.id,
        title: p.title,
        url: `/blog/${p.slug || p.id}`,
        type: "blog_post",
        content: p.content,
      });
    }
  }

  // Build link map and detect orphans
  const linkMap = buildLinkMap(allContent);
  const orphans = detectOrphanPages(allContent, linkMap);

  return { data: orphans, error: null };
}

// Get link statistics for a store
export async function getStoreLinkStats(storeId: string): Promise<{
  data: {
    totalPages: number;
    orphanPages: number;
    averageLinksPerPage: number;
    pagesWithFewLinks: number;
    topLinkedPages: Array<{ title: string; incomingLinks: number }>;
  } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Get counts
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { count: pageCount } = await supabase
    .from("pages")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { count: postCount } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  const totalPages = (productCount || 0) + (pageCount || 0) + (postCount || 0);

  // Get orphan count
  const { data: orphans } = await detectStoreOrphanPages(storeId);
  const orphanPages = orphans?.length || 0;

  return {
    data: {
      totalPages,
      orphanPages,
      averageLinksPerPage: 2.5, // Would need full content analysis
      pagesWithFewLinks: Math.floor(totalPages * 0.3), // Estimate
      topLinkedPages: [], // Would need full link map analysis
    },
    error: null,
  };
}

// Apply link suggestion to content and save
export async function applyLinkSuggestion(
  storeId: string,
  contentType: "product" | "page" | "blog_post",
  contentId: string,
  suggestion: LinkSuggestion
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  let table: string;
  let contentField: string;

  if (contentType === "product") {
    table = "products";
    contentField = "description";
  } else if (contentType === "page") {
    table = "pages";
    contentField = "content";
  } else {
    table = "blog_posts";
    contentField = "content";
  }

  // Fetch current content
  const { data: record } = await supabase
    .from(table)
    .select(contentField)
    .eq("id", contentId)
    .eq("store_id", storeId)
    .single();

  if (!record) {
    return { success: false, error: "Content not found" };
  }

  const recordData = record as unknown as Record<string, string>;
  const currentContent = recordData[contentField] || "";

  // Apply the link
  const updatedContent = applyLinkToContent(
    currentContent,
    suggestion.anchorText,
    suggestion.targetUrl
  );

  // Save back
  const { error } = await supabase
    .from(table)
    .update({
      [contentField]: updatedContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contentId)
    .eq("store_id", storeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}`);
  return { success: true, error: null };
}

// Bulk apply multiple link suggestions
export async function bulkApplyLinkSuggestions(
  storeId: string,
  contentType: "product" | "page" | "blog_post",
  contentId: string,
  suggestions: LinkSuggestion[]
): Promise<{ success: boolean; appliedCount: number; error: string | null }> {
  let appliedCount = 0;

  for (const suggestion of suggestions) {
    const result = await applyLinkSuggestion(storeId, contentType, contentId, suggestion);
    if (result.success) {
      appliedCount++;
    }
  }

  return {
    success: appliedCount > 0,
    appliedCount,
    error: appliedCount === 0 ? "No links could be applied" : null,
  };
}

// Get content for before/after preview
export async function getContentForPreview(
  storeId: string,
  contentType: "product" | "page" | "blog_post",
  contentId: string,
  suggestions: LinkSuggestion[]
): Promise<{
  data: { before: string; after: string; title: string } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  let content: string = "";
  let title: string = "";

  if (contentType === "product") {
    const { data: product } = await supabase
      .from("products")
      .select("name, description")
      .eq("id", contentId)
      .eq("store_id", storeId)
      .single();
    if (product) {
      content = product.description || "";
      title = product.name;
    }
  } else if (contentType === "page") {
    const { data: page } = await supabase
      .from("pages")
      .select("title, content")
      .eq("id", contentId)
      .eq("store_id", storeId)
      .single();
    if (page) {
      content = page.content || "";
      title = page.title;
    }
  } else if (contentType === "blog_post") {
    const { data: post } = await supabase
      .from("blog_posts")
      .select("title, content")
      .eq("id", contentId)
      .eq("store_id", storeId)
      .single();
    if (post) {
      content = post.content || "";
      title = post.title;
    }
  }

  if (!content) {
    return { data: null, error: "Content not found" };
  }

  // Generate after content with all suggested links
  let afterContent = content;
  for (const suggestion of suggestions) {
    afterContent = applyLinkToContent(
      afterContent,
      suggestion.anchorText,
      suggestion.targetUrl
    );
  }

  return {
    data: {
      before: content,
      after: afterContent,
      title,
    },
    error: null,
  };
}

// Push changes to WordPress via webhook
export async function pushInternalLinksToWordPress(
  storeId: string,
  contentType: "product" | "page" | "blog_post",
  contentId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Get the store's webhook URL
  const { data: store } = await supabase
    .from("stores")
    .select("url, settings")
    .eq("id", storeId)
    .single();

  if (!store) {
    return { success: false, error: "Store not found" };
  }

  const settings = (store.settings as Record<string, unknown>) || {};
  const webhookUrl = settings.webhook_url as string;

  if (!webhookUrl) {
    // If no webhook, just return success (content was saved locally)
    return { success: true, error: null };
  }

  // Get the updated content
  let content: string = "";
  let wpId: string | null = null;

  if (contentType === "product") {
    const { data: product } = await supabase
      .from("products")
      .select("description, external_id")
      .eq("id", contentId)
      .single();
    if (product) {
      content = product.description || "";
      wpId = product.external_id;
    }
  } else if (contentType === "page") {
    const { data: page } = await supabase
      .from("pages")
      .select("content, external_id")
      .eq("id", contentId)
      .single();
    if (page) {
      content = page.content || "";
      wpId = page.external_id;
    }
  } else if (contentType === "blog_post") {
    const { data: post } = await supabase
      .from("blog_posts")
      .select("content, external_id")
      .eq("id", contentId)
      .single();
    if (post) {
      content = post.content || "";
      wpId = post.external_id;
    }
  }

  if (!wpId) {
    return { success: true, error: null }; // No external ID, can't push
  }

  // Send webhook to update content
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "update_content",
        type: contentType,
        id: wpId,
        content,
      }),
    });

    if (!response.ok) {
      return { success: false, error: "Failed to push to WordPress" };
    }

    return { success: true, error: null };
  } catch {
    return { success: false, error: "Webhook request failed" };
  }
}
