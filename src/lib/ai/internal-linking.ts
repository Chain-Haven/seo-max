/**
 * AI-Powered Internal Linking Tool
 * Analyzes content and suggests optimal internal links
 */

import { getAIProvider } from "./provider";

export interface LinkableContent {
  id: string;
  type: "product" | "page" | "blog_post" | "category";
  title: string;
  url: string;
  excerpt?: string;
  keywords?: string[];
}

export interface LinkSuggestion {
  anchorText: string;
  targetUrl: string;
  targetTitle: string;
  targetType: string;
  context: string; // The sentence/paragraph where the link should be inserted
  reason: string;
  priority: "high" | "medium" | "low";
  position: {
    startIndex?: number;
    endIndex?: number;
  };
}

export interface InternalLinkAnalysis {
  currentLinkCount: number;
  suggestedLinkCount: number;
  linkDensity: number; // links per 1000 words
  optimalDensity: number;
  suggestions: LinkSuggestion[];
  orphanWarning: boolean;
  overlinkedWarning: boolean;
}

export interface OrphanPage {
  id: string;
  title: string;
  url: string;
  type: string;
  incomingLinks: number;
  suggestedLinkFrom: string[];
}

// Analyze content and suggest internal links
export async function analyzeInternalLinks(
  content: string,
  contentTitle: string,
  contentUrl: string,
  availableLinks: LinkableContent[]
): Promise<InternalLinkAnalysis> {
  const ai = getAIProvider();

  // Count existing internal links
  const existingLinkMatches = content.match(/<a[^>]+href=["'][^"']*["'][^>]*>/gi) || [];
  const currentLinkCount = existingLinkMatches.length;

  // Calculate word count and link density
  const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  const linkDensity = wordCount > 0 ? (currentLinkCount / wordCount) * 1000 : 0;
  const optimalDensity = 3; // 3 links per 1000 words is a good target

  // Prepare available links for AI
  const linkContext = availableLinks
    .filter((l) => l.url !== contentUrl) // Exclude self
    .slice(0, 30) // Limit to prevent token overflow
    .map((l) => `- [${l.type}] "${l.title}" (${l.url})${l.keywords ? ` Keywords: ${l.keywords.join(", ")}` : ""}`)
    .join("\n");

  const prompt = `You are an SEO expert specializing in internal linking strategy. Analyze this content and suggest where to add internal links.

CONTENT BEING ANALYZED:
Title: ${contentTitle}
URL: ${contentUrl}

CONTENT:
${content.substring(0, 6000)}

AVAILABLE PAGES TO LINK TO:
${linkContext}

Find opportunities to add internal links by:
1. Identifying relevant keywords/phrases in the content that match available pages
2. Finding contextual mentions of topics covered by other pages
3. Adding links that provide value to readers
4. Using varied, natural anchor text (not just exact match keywords)

Return JSON:
{
  "suggestions": [
    {
      "anchorText": "<exact text from content to make into a link>",
      "targetUrl": "<URL to link to>",
      "targetTitle": "<title of target page>",
      "targetType": "<product|page|blog_post|category>",
      "context": "<the sentence containing the anchor text>",
      "reason": "<why this link adds value>",
      "priority": "high|medium|low"
    }
  ]
}

Guidelines:
- Suggest 3-8 links depending on content length
- Prioritize links that help users find related products/information
- Don't suggest links to pages already linked in the content
- Use natural anchor text that flows with the content
- High priority: directly relevant product/topic links
- Medium priority: related topic links
- Low priority: tangentially related links

Return ONLY valid JSON.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 2000,
    temperature: 0.4,
  });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      const suggestions = result.suggestions || [];

      return {
        currentLinkCount,
        suggestedLinkCount: suggestions.length,
        linkDensity: Math.round(linkDensity * 10) / 10,
        optimalDensity,
        suggestions,
        orphanWarning: currentLinkCount === 0,
        overlinkedWarning: linkDensity > 10,
      };
    }
  } catch {
    // ignore parsing errors
  }

  return {
    currentLinkCount,
    suggestedLinkCount: 0,
    linkDensity: Math.round(linkDensity * 10) / 10,
    optimalDensity,
    suggestions: [],
    orphanWarning: currentLinkCount === 0,
    overlinkedWarning: linkDensity > 10,
  };
}

// Generate optimized anchor text for a link
export async function generateAnchorText(
  context: string,
  targetTitle: string,
  targetDescription: string
): Promise<string[]> {
  const ai = getAIProvider();

  const prompt = `Generate 3 natural anchor text options for an internal link.

CONTEXT (sentence where link will be inserted):
${context}

TARGET PAGE:
Title: ${targetTitle}
Description: ${targetDescription}

Return JSON array with 3 anchor text options that:
1. Flow naturally within the context
2. Are descriptive but not keyword-stuffed
3. Vary in length (short, medium, longer phrase)

Example: ["leather boots", "our premium leather boots collection", "high-quality leather boots"]

Return ONLY a JSON array of strings.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 200,
    temperature: 0.6,
  });

  try {
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // ignore
  }

  return [targetTitle];
}

// Detect orphan pages (pages with no incoming internal links)
export function detectOrphanPages(
  allContent: Array<{
    id: string;
    title: string;
    url: string;
    type: string;
    content?: string;
  }>,
  linkMap: Map<string, string[]> // Map of URL -> array of URLs that link to it
): OrphanPage[] {
  const orphans: OrphanPage[] = [];

  for (const page of allContent) {
    const incomingLinks = linkMap.get(page.url) || [];

    if (incomingLinks.length === 0) {
      // Find pages that could link to this one based on title keywords
      const keywords = page.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const suggestedFrom: string[] = [];

      for (const otherPage of allContent) {
        if (otherPage.url === page.url) continue;
        if (!otherPage.content) continue;

        const contentLower = otherPage.content.toLowerCase();
        const hasKeyword = keywords.some((kw) => contentLower.includes(kw));

        if (hasKeyword && suggestedFrom.length < 3) {
          suggestedFrom.push(otherPage.title);
        }
      }

      orphans.push({
        id: page.id,
        title: page.title,
        url: page.url,
        type: page.type,
        incomingLinks: 0,
        suggestedLinkFrom: suggestedFrom,
      });
    }
  }

  return orphans;
}

// Build a link map from content
export function buildLinkMap(
  allContent: Array<{
    url: string;
    content?: string;
  }>
): Map<string, string[]> {
  const linkMap = new Map<string, string[]>();

  // Initialize all URLs with empty arrays
  for (const page of allContent) {
    linkMap.set(page.url, []);
  }

  // Parse each page's content for internal links
  for (const page of allContent) {
    if (!page.content) continue;

    // Find all href values
    const hrefMatches = page.content.matchAll(/href=["']([^"']+)["']/gi);

    for (const match of hrefMatches) {
      const href = match[1];

      // Check if this href matches any of our pages
      for (const targetPage of allContent) {
        if (href === targetPage.url || href.endsWith(targetPage.url)) {
          const existing = linkMap.get(targetPage.url) || [];
          if (!existing.includes(page.url)) {
            existing.push(page.url);
            linkMap.set(targetPage.url, existing);
          }
        }
      }
    }
  }

  return linkMap;
}

// Apply a link suggestion to content
export function applyLinkToContent(
  content: string,
  anchorText: string,
  targetUrl: string,
  options?: {
    openInNewTab?: boolean;
    nofollow?: boolean;
  }
): string {
  // Escape special regex characters in anchor text
  const escapedAnchor = anchorText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Build the link HTML
  let linkAttrs = `href="${targetUrl}"`;
  if (options?.openInNewTab) {
    linkAttrs += ' target="_blank" rel="noopener"';
  }
  if (options?.nofollow) {
    linkAttrs += ' rel="nofollow"';
  }

  const linkHtml = `<a ${linkAttrs}>${anchorText}</a>`;

  // Replace first occurrence that isn't already linked
  // Look for the anchor text not preceded by > (closing tag) or followed by </a>
  const regex = new RegExp(`(?<!>)\\b(${escapedAnchor})\\b(?!</a>)`, "i");

  return content.replace(regex, linkHtml);
}

// Bulk apply multiple link suggestions
export function applyMultipleLinks(
  content: string,
  suggestions: Array<{ anchorText: string; targetUrl: string }>
): string {
  let updatedContent = content;

  for (const suggestion of suggestions) {
    updatedContent = applyLinkToContent(
      updatedContent,
      suggestion.anchorText,
      suggestion.targetUrl
    );
  }

  return updatedContent;
}
