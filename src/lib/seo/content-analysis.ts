/**
 * Advanced content analysis: duplicate detection, keyword cannibalization, etc.
 */

import { getAIProvider } from "@/lib/ai/provider";

export interface DuplicateContent {
  url1: string;
  url2: string;
  similarity: number; // 0-100
  reason: string;
}

export interface KeywordCannibalization {
  keyword: string;
  pages: Array<{
    url: string;
    title: string;
    position: number; // Current ranking position if known
  }>;
  recommendation: string;
}

/**
 * Detect duplicate or very similar content across pages
 */
export async function detectDuplicateContent(
  pages: Array<{
    url: string;
    contentHash: string;
    wordCount: number;
    title: string | null;
    h1Tags: string[];
  }>
): Promise<DuplicateContent[]> {
  const duplicates: DuplicateContent[] = [];
  const seenHashes = new Map<string, string>();

  // Exact hash matches
  for (const page of pages) {
    if (page.contentHash && seenHashes.has(page.contentHash)) {
      duplicates.push({
        url1: seenHashes.get(page.contentHash)!,
        url2: page.url,
        similarity: 100,
        reason: "Exact content match",
      });
    } else if (page.contentHash) {
      seenHashes.set(page.contentHash, page.url);
    }
  }

  // Similar titles/H1s (potential duplicates)
  const titleMap = new Map<string, string[]>();
  for (const page of pages) {
    const titleKey = (page.title || page.h1Tags[0] || "").toLowerCase().trim();
    if (titleKey && titleKey.length > 10) {
      if (!titleMap.has(titleKey)) {
        titleMap.set(titleKey, []);
      }
      titleMap.get(titleKey)!.push(page.url);
    }
  }

  for (const [title, urls] of titleMap.entries()) {
    if (urls.length > 1) {
      for (let i = 0; i < urls.length; i++) {
        for (let j = i + 1; j < urls.length; j++) {
          duplicates.push({
            url1: urls[i],
            url2: urls[j],
            similarity: 85,
            reason: `Similar titles/H1s: "${title.substring(0, 50)}"`,
          });
        }
      }
    }
  }

  return duplicates;
}

/**
 * Detect keyword cannibalization (multiple pages targeting same keyword)
 */
export async function detectKeywordCannibalization(
  pages: Array<{
    url: string;
    title: string | null;
    h1Tags: string[];
    metaDescription: string | null;
    wordCount: number;
  }>,
  trackedKeywords?: Array<{ keyword: string; url: string; position: number | null }>
): Promise<KeywordCannibalization[]> {
  const cannibalization: KeywordCannibalization[] = [];
  
  // Extract potential keywords from titles and H1s
  const keywordPages = new Map<string, Array<{ url: string; title: string; position: number }>>();

  for (const page of pages) {
    const title = page.title || page.h1Tags[0] || "";
    if (!title || title.length < 5) continue;

    // Simple keyword extraction (first 3-5 words)
    const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length < 2) continue;

    // Create potential keywords (2-4 word phrases)
    for (let i = 0; i < Math.min(words.length - 1, 3); i++) {
      for (let len = 2; len <= Math.min(4, words.length - i); len++) {
        const keyword = words.slice(i, i + len).join(" ");
        
        if (!keywordPages.has(keyword)) {
          keywordPages.set(keyword, []);
        }

        const tracked = trackedKeywords?.find(k => k.url === page.url);
        keywordPages.get(keyword)!.push({
          url: page.url,
          title: title.substring(0, 60),
          position: tracked?.position || 999,
        });
      }
    }
  }

  // Find keywords with multiple pages
  for (const [keyword, pageList] of keywordPages.entries()) {
    if (pageList.length > 1) {
      // Sort by position (lower is better)
      pageList.sort((a, b) => a.position - b.position);
      
      const recommendation = pageList.length === 2
        ? `Consider consolidating these pages or differentiating their target keywords. "${pageList[0].title}" is ranking better (position ${pageList[0].position}).`
        : `Multiple pages (${pageList.length}) are targeting similar keywords. Consider consolidating or better differentiating their content.`;

      cannibalization.push({
        keyword,
        pages: pageList,
        recommendation,
      });
    }
  }

  return cannibalization.filter(c => c.pages.length > 1);
}

/**
 * Detect orphan pages (pages with no internal links pointing to them)
 */
export function detectOrphanPages(
  allPages: Array<{ url: string }>,
  internalLinks: Array<Array<{ url: string }>>
): string[] {
  const linkedUrls = new Set<string>();
  
  // Collect all URLs that are linked to
  for (const links of internalLinks) {
    for (const link of links) {
      try {
        const urlObj = new URL(link.url);
        linkedUrls.add(urlObj.pathname);
      } catch {
        // Invalid URL, skip
      }
    }
  }

  // Find pages that aren't linked to
  const orphanPages: string[] = [];
  for (const page of allPages) {
    try {
      const urlObj = new URL(page.url);
      const pathname = urlObj.pathname;
      
      // Skip homepage
      if (pathname === "/" || pathname === "") continue;
      
      if (!linkedUrls.has(pathname)) {
        orphanPages.push(page.url);
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return orphanPages;
}

/**
 * Analyze content freshness
 */
export function analyzeContentFreshness(
  pages: Array<{
    url: string;
    lastModified: string | null;
    wordCount: number;
  }>,
  thresholdDays: number = 365
): Array<{
  url: string;
  daysSinceUpdate: number;
  recommendation: string;
}> {
  const stalePages: Array<{
    url: string;
    daysSinceUpdate: number;
    recommendation: string;
  }> = [];

  const now = Date.now();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  for (const page of pages) {
    if (!page.lastModified) {
      stalePages.push({
        url: page.url,
        daysSinceUpdate: -1,
        recommendation: "No last-modified date found. Consider updating content to signal freshness.",
      });
      continue;
    }

    const modifiedDate = new Date(page.lastModified).getTime();
    const daysSinceUpdate = Math.floor((now - modifiedDate) / (24 * 60 * 60 * 1000));

    if (daysSinceUpdate > thresholdDays) {
      stalePages.push({
        url: page.url,
        daysSinceUpdate,
        recommendation: `Content hasn't been updated in ${daysSinceUpdate} days. Consider refreshing with new information or a "last updated" notice.`,
      });
    }
  }

  return stalePages;
}
