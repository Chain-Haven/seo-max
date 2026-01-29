/**
 * Blog Internal Linking System
 * Suggests and manages internal links based on crawled site pages
 * Uses semantic similarity and keyword matching
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";

export interface CrawledPage {
  id: string;
  url: string;
  title: string;
  meta_description?: string;
  h1?: string;
  content_preview?: string;
  page_type?: string;
  word_count?: number;
}

export interface LinkSuggestion {
  url: string;
  title: string;
  anchorText: string;
  relevanceScore: number;
  reason: string;
  pageType: string;
  context?: string;
}

export interface InternalLinkingResult {
  suggestions: LinkSuggestion[];
  existingLinks: string[];
  contentWithLinks: string;
  linkDensity: number;
}

/**
 * Get crawled pages for a store
 */
export async function getCrawledPagesForStore(
  storeId: string,
  limit: number = 200
): Promise<CrawledPage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("crawled_pages")
    .select("id, url, title, meta_description, h1, word_count")
    .eq("store_id", storeId)
    .not("title", "is", null)
    .order("word_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching crawled pages:", error);
    return [];
  }

  return (data || []).map((page) => ({
    id: page.id,
    url: page.url,
    title: page.title || "",
    meta_description: page.meta_description,
    h1: page.h1,
    word_count: page.word_count,
    page_type: detectPageType(page.url),
  }));
}

/**
 * Detect page type from URL
 */
function detectPageType(url: string): string {
  const urlLower = url.toLowerCase();

  if (
    urlLower.includes("/product/") ||
    urlLower.includes("/shop/") ||
    urlLower.includes("/item/")
  ) {
    return "product";
  }
  if (
    urlLower.includes("/category/") ||
    urlLower.includes("/collection/") ||
    urlLower.includes("/c/")
  ) {
    return "category";
  }
  if (
    urlLower.includes("/blog/") ||
    urlLower.includes("/article/") ||
    urlLower.includes("/post/")
  ) {
    return "blog";
  }
  if (
    urlLower.includes("/about") ||
    urlLower.includes("/contact") ||
    urlLower.includes("/faq")
  ) {
    return "info";
  }

  return "page";
}

/**
 * Extract keywords from content
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "as", "is", "was", "are", "were", "been", "be",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "this", "that", "these",
    "those", "it", "its", "they", "them", "their", "we", "our", "you", "your",
    "he", "she", "him", "her", "his", "i", "me", "my", "what", "which", "who",
    "when", "where", "why", "how", "all", "each", "every", "both", "few",
    "more", "most", "other", "some", "such", "no", "not", "only", "same", "so",
    "than", "too", "very", "just", "also", "now", "here", "there", "then",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Count word frequency
  const wordFreq: Record<string, number> = {};
  for (const word of words) {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  }

  // Return top keywords by frequency
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Calculate relevance score between content and page
 */
function calculateRelevance(
  contentKeywords: string[],
  pageTitle: string,
  pageDescription: string | undefined
): number {
  const pageText = `${pageTitle} ${pageDescription || ""}`.toLowerCase();
  const pageKeywords = extractKeywords(pageText);

  let matchCount = 0;
  for (const keyword of contentKeywords) {
    if (pageKeywords.includes(keyword) || pageText.includes(keyword)) {
      matchCount++;
    }
  }

  // Score from 0-100 based on keyword overlap
  return Math.min(100, Math.round((matchCount / contentKeywords.length) * 200));
}

/**
 * Find existing links in content
 */
function findExistingLinks(content: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }

  return links;
}

/**
 * Generate anchor text suggestions using AI
 */
async function generateAnchorText(
  pageTitle: string,
  contentContext: string
): Promise<string> {
  try {
    const ai = getAIProvider();
    
    const prompt = `Generate a natural, SEO-friendly anchor text for an internal link.

Page being linked to: "${pageTitle}"
Content context around the link: "${contentContext.substring(0, 200)}"

Requirements:
- Keep it short (2-5 words)
- Make it descriptive and relevant
- Avoid generic phrases like "click here" or "read more"
- Use natural language that fits the context

Return only the anchor text, nothing else.`;

    const response = await ai.generateText(prompt, { maxTokens: 50 });
    return response.content.trim().replace(/['"]/g, "");
  } catch {
    // Fallback to page title
    return pageTitle.substring(0, 40);
  }
}

/**
 * Find best context in content for placing a link
 */
function findLinkContext(content: string, pageKeywords: string[]): string | null {
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);

  let bestSentence: string | null = null;
  let bestScore = 0;

  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    let score = 0;

    for (const keyword of pageKeywords) {
      if (sentenceLower.includes(keyword)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence.trim();
    }
  }

  return bestSentence;
}

/**
 * Suggest internal links for blog content
 */
export async function suggestInternalLinks(
  storeId: string,
  content: string,
  options: {
    maxSuggestions?: number;
    includeProducts?: boolean;
    includeCategories?: boolean;
    includeBlogs?: boolean;
    minRelevanceScore?: number;
  } = {}
): Promise<InternalLinkingResult> {
  const {
    maxSuggestions = 10,
    includeProducts = true,
    includeCategories = true,
    includeBlogs = true,
    minRelevanceScore = 30,
  } = options;

  // Get crawled pages
  const crawledPages = await getCrawledPagesForStore(storeId);

  if (crawledPages.length === 0) {
    return {
      suggestions: [],
      existingLinks: [],
      contentWithLinks: content,
      linkDensity: 0,
    };
  }

  // Extract keywords from content
  const contentText = content.replace(/<[^>]*>/g, " ");
  const contentKeywords = extractKeywords(contentText);

  // Find existing links
  const existingLinks = findExistingLinks(content);
  const existingUrls = new Set(existingLinks.map((l) => l.toLowerCase()));

  // Score and filter pages
  const suggestions: LinkSuggestion[] = [];

  for (const page of crawledPages) {
    // Skip if already linked
    if (existingUrls.has(page.url.toLowerCase())) {
      continue;
    }

    // Filter by page type
    if (page.page_type === "product" && !includeProducts) continue;
    if (page.page_type === "category" && !includeCategories) continue;
    if (page.page_type === "blog" && !includeBlogs) continue;

    // Calculate relevance
    const relevanceScore = calculateRelevance(
      contentKeywords,
      page.title,
      page.meta_description
    );

    if (relevanceScore >= minRelevanceScore) {
      // Find context for this link
      const pageKeywords = extractKeywords(
        `${page.title} ${page.meta_description || ""}`
      );
      const context = findLinkContext(content, pageKeywords);

      suggestions.push({
        url: page.url,
        title: page.title,
        anchorText: page.title.substring(0, 50), // Will be enhanced later
        relevanceScore,
        reason: `Matches ${relevanceScore}% of content keywords`,
        pageType: page.page_type || "page",
        context: context || undefined,
      });
    }
  }

  // Sort by relevance and limit
  suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topSuggestions = suggestions.slice(0, maxSuggestions);

  // Generate better anchor text for top suggestions
  for (const suggestion of topSuggestions) {
    if (suggestion.context) {
      suggestion.anchorText = await generateAnchorText(
        suggestion.title,
        suggestion.context
      );
    }
  }

  // Calculate link density
  const wordCount = contentText.split(/\s+/).filter((w) => w.length > 0).length;
  const linkDensity =
    wordCount > 0 ? (existingLinks.length / wordCount) * 100 : 0;

  return {
    suggestions: topSuggestions,
    existingLinks,
    contentWithLinks: content,
    linkDensity: Math.round(linkDensity * 100) / 100,
  };
}

/**
 * Auto-insert internal links into content
 */
export async function autoInsertInternalLinks(
  storeId: string,
  content: string,
  options: {
    maxLinks?: number;
    minRelevanceScore?: number;
    avoidOverlinking?: boolean;
  } = {}
): Promise<{
  content: string;
  insertedLinks: Array<{ url: string; anchorText: string }>;
}> {
  const { maxLinks = 5, minRelevanceScore = 40, avoidOverlinking = true } = options;

  const { suggestions, existingLinks, linkDensity } = await suggestInternalLinks(
    storeId,
    content,
    { maxSuggestions: maxLinks * 2, minRelevanceScore }
  );

  // Don't add more links if already over-linked
  if (avoidOverlinking && linkDensity > 2) {
    return { content, insertedLinks: [] };
  }

  const insertedLinks: Array<{ url: string; anchorText: string }> = [];
  let modifiedContent = content;

  for (const suggestion of suggestions.slice(0, maxLinks)) {
    if (!suggestion.context) continue;

    // Find the context in content and add link
    const anchorText = suggestion.anchorText;
    const linkHtml = `<a href="${suggestion.url}" title="${suggestion.title}">${anchorText}</a>`;

    // Try to find a good place to insert the link
    const contextPattern = suggestion.context
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .substring(0, 50);

    // Look for a keyword from the anchor text in the context
    const anchorKeywords = anchorText.toLowerCase().split(/\s+/);
    let inserted = false;

    for (const keyword of anchorKeywords) {
      if (keyword.length < 4) continue;

      // Case-insensitive replacement of first occurrence
      const regex = new RegExp(`\\b(${keyword}s?)\\b(?![^<]*>)`, "i");
      if (regex.test(modifiedContent)) {
        modifiedContent = modifiedContent.replace(regex, (match) => {
          return `<a href="${suggestion.url}" title="${suggestion.title}">${match}</a>`;
        });
        insertedLinks.push({ url: suggestion.url, anchorText: match });
        inserted = true;
        break;
      }
    }
  }

  return { content: modifiedContent, insertedLinks };
}

/**
 * Get link suggestions with AI-enhanced relevance
 */
export async function getAIEnhancedLinkSuggestions(
  storeId: string,
  content: string,
  blogTopic: string,
  keywords: string[]
): Promise<LinkSuggestion[]> {
  const crawledPages = await getCrawledPagesForStore(storeId, 100);

  if (crawledPages.length === 0) {
    return [];
  }

  try {
    const ai = getAIProvider();

    const pageList = crawledPages
      .slice(0, 50)
      .map((p, i) => `${i + 1}. ${p.title} (${p.page_type}) - ${p.url}`)
      .join("\n");

    const prompt = `Analyze this blog content and suggest the most relevant internal links.

Blog Topic: ${blogTopic}
Target Keywords: ${keywords.join(", ")}

Content Preview:
${content.substring(0, 1000)}

Available Pages:
${pageList}

For each suggested link, provide:
1. Page number from the list
2. Suggested anchor text (2-5 words, natural)
3. Where to place it (describe the context)
4. Relevance score (0-100)

Return as JSON array:
[
  {
    "pageNum": 1,
    "anchorText": "natural anchor text",
    "placement": "in the section about X",
    "relevance": 85
  }
]

Select 5-8 most relevant pages. Focus on:
- Product pages related to the topic
- Category pages for broader context
- Related blog posts for topic clusters
- Informational pages that add value`;

    const response = await ai.generateText(prompt, { maxTokens: 1000 });

    // Parse AI response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const aiSuggestions = JSON.parse(jsonMatch[0]) as Array<{
      pageNum: number;
      anchorText: string;
      placement: string;
      relevance: number;
    }>;

    return aiSuggestions
      .filter((s) => s.pageNum > 0 && s.pageNum <= crawledPages.length)
      .map((s) => {
        const page = crawledPages[s.pageNum - 1];
        return {
          url: page.url,
          title: page.title,
          anchorText: s.anchorText,
          relevanceScore: s.relevance,
          reason: s.placement,
          pageType: page.page_type || "page",
        };
      });
  } catch (error) {
    console.error("Error getting AI link suggestions:", error);

    // Fallback to basic suggestions
    const result = await suggestInternalLinks(storeId, content, {
      maxSuggestions: 8,
    });
    return result.suggestions;
  }
}
