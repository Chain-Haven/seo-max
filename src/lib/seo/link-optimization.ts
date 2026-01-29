/**
 * Internal linking optimization and broken link detection
 */

import { getAIProvider } from "@/lib/ai/provider";

export interface InternalLinkingSuggestion {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  reason: string;
  relevanceScore: number; // 0-100
}

export interface BrokenLink {
  url: string;
  brokenLink: string;
  anchorText: string;
  statusCode: number | null;
}

/**
 * Generate internal linking suggestions based on content similarity
 */
export async function generateInternalLinkingSuggestions(
  pages: Array<{
    url: string;
    title: string | null;
    h1Tags: string[];
    h2Tags: string[];
    wordCount: number;
    contentHash: string;
  }>,
  maxSuggestions: number = 10
): Promise<InternalLinkingSuggestion[]> {
  const suggestions: InternalLinkingSuggestion[] = [];

  // Simple keyword-based matching
  for (let i = 0; i < pages.length; i++) {
    const sourcePage = pages[i];
    if (!sourcePage.title && sourcePage.h1Tags.length === 0) continue;

    const sourceKeywords = extractKeywords(sourcePage);
    if (sourceKeywords.length === 0) continue;

    const candidates: Array<{
      page: typeof pages[0];
      score: number;
    }> = [];

    for (let j = 0; j < pages.length; j++) {
      if (i === j) continue; // Don't link to self

      const targetPage = pages[j];
      const targetKeywords = extractKeywords(targetPage);
      
      // Calculate relevance score
      const commonKeywords = sourceKeywords.filter(k => targetKeywords.includes(k));
      const score = commonKeywords.length > 0
        ? Math.min(100, (commonKeywords.length / Math.max(sourceKeywords.length, targetKeywords.length)) * 100)
        : 0;

      if (score > 30) { // Minimum relevance threshold
        candidates.push({ page: targetPage, score });
      }
    }

    // Sort by score and take top candidates
    candidates.sort((a, b) => b.score - a.score);
    
    for (const candidate of candidates.slice(0, 3)) {
      const anchorText = candidate.page.h1Tags[0] || candidate.page.title || "Learn more";
      suggestions.push({
        sourceUrl: sourcePage.url,
        targetUrl: candidate.page.url,
        anchorText,
        reason: `Content similarity: ${Math.round(candidate.score)}% match`,
        relevanceScore: candidate.score,
      });
    }
  }

  return suggestions.slice(0, maxSuggestions);
}

function extractKeywords(page: {
  title: string | null;
  h1Tags: string[];
  h2Tags: string[];
}): string[] {
  const text = [
    page.title,
    ...page.h1Tags,
    ...page.h2Tags.slice(0, 3), // Top 3 H2s
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Extract meaningful words (3+ chars, not common stop words)
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "from", "up", "about", "into", "through", "during", "including", "against", "among",
    "this", "that", "these", "those", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "should", "could", "may",
    "might", "must", "can", "what", "which", "who", "when", "where", "why", "how",
  ]);

  return text
    .split(/\s+/)
    .filter(word => word.length >= 3 && !stopWords.has(word))
    .slice(0, 10); // Top 10 keywords
}

/**
 * Check for broken external links
 */
export async function checkBrokenLinks(
  externalLinks: Array<{
    url: string;
    anchorText: string;
  }>,
  maxChecks: number = 50
): Promise<BrokenLink[]> {
  const brokenLinks: BrokenLink[] = [];
  const checked = new Set<string>();

  // Limit checks to avoid rate limiting
  const linksToCheck = externalLinks.slice(0, maxChecks);

  for (const link of linksToCheck) {
    if (checked.has(link.url)) continue;
    checked.add(link.url);

    try {
      const response = await fetch(link.url, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });

      if (response.status >= 400) {
        brokenLinks.push({
          url: link.url,
          brokenLink: link.url,
          anchorText: link.anchorText,
          statusCode: response.status,
        });
      }
    } catch (error) {
      // Link is broken or unreachable
      brokenLinks.push({
        url: link.url,
        brokenLink: link.url,
        anchorText: link.anchorText,
        statusCode: null,
      });
    }

    // Rate limit: 200ms between checks
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return brokenLinks;
}

/**
 * Analyze external link quality (basic check for spam signals)
 */
export function analyzeExternalLinkQuality(
  externalLinks: Array<{
    url: string;
    anchorText: string;
    isNofollow: boolean;
  }>
): Array<{
  url: string;
  issue: string;
  severity: "high" | "medium" | "low";
}> {
  const issues: Array<{
    url: string;
    issue: string;
    severity: "high" | "medium" | "low";
  }> = [];

  const spamKeywords = ["buy", "cheap", "discount", "click here", "read more"];
  const suspiciousDomains = new Set<string>();

  for (const link of externalLinks) {
    try {
      const urlObj = new URL(link.url);
      const domain = urlObj.hostname.toLowerCase();

      // Check for spammy anchor text
      const anchorLower = link.anchorText.toLowerCase();
      if (spamKeywords.some(kw => anchorLower.includes(kw))) {
        issues.push({
          url: link.url,
          issue: `Suspicious anchor text: "${link.anchorText}"`,
          severity: "medium",
        });
      }

      // Check for excessive links to same domain
      if (!suspiciousDomains.has(domain)) {
        const linksToDomain = externalLinks.filter(l => {
          try {
            return new URL(l.url).hostname.toLowerCase() === domain;
          } catch {
            return false;
          }
        });

        if (linksToDomain.length > 5) {
          suspiciousDomains.add(domain);
          issues.push({
            url: link.url,
            issue: `Multiple links (${linksToDomain.length}) to same domain: ${domain}`,
            severity: "low",
          });
        }
      }

      // Check if dofollow links should be nofollow
      if (!link.isNofollow && (domain.includes("spam") || domain.includes("ad"))) {
        issues.push({
          url: link.url,
          issue: "Consider adding nofollow to this link",
          severity: "medium",
        });
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return issues;
}
