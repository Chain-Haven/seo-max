/**
 * Link Analysis Tools
 * Detect orphan pages, broken links, and redirect chains
 */

export interface OrphanPage {
  url: string;
  title: string | null;
  wordCount: number;
  lastModified: Date | null;
  internalLinksIn: number;
  hasTraffic: boolean;
  hasRankings: boolean;
  suggestedLinksFrom: string[];
}

export interface RedirectChain {
  sourceUrl: string;
  chain: string[];
  finalUrl: string;
  statusCodes: number[];
  isProblematic: boolean;
  recommendation: string;
}

export interface BrokenLinkDetails {
  url: string;
  foundOnPages: string[];
  statusCode: number;
  linkText: string[];
  lastChecked: Date;
}

// Detect orphan pages (pages with no internal links)
export async function detectOrphanPages(
  allPages: Array<{ url: string; title: string | null; wordCount: number; lastModified: Date | null }>,
  internalLinks: Array<{ fromUrl: string; toUrl: string }>,
  trafficData?: Array<{ url: string; sessions: number }>,
  rankingData?: Array<{ url: string; keywords: number }>
): Promise<OrphanPage[]> {
  const orphans: OrphanPage[] = [];

  // Build link graph
  const inboundLinks = new Map<string, string[]>();
  
  for (const link of internalLinks) {
    const existing = inboundLinks.get(link.toUrl) || [];
    existing.push(link.fromUrl);
    inboundLinks.set(link.toUrl, existing);
  }

  // Find pages with no inbound links
  for (const page of allPages) {
    const inboundCount = inboundLinks.get(page.url)?.length || 0;

    if (inboundCount === 0) {
      // Check if it has traffic
      const hasTraffic = trafficData?.some((t) => t.url === page.url && t.sessions > 10) || false;

      // Check if it has rankings
      const hasRankings = rankingData?.some((r) => r.url === page.url && r.keywords > 0) || false;

      // Suggest pages to link from (find topically similar pages)
      const suggestedLinksFrom = await findSimilarPages(page, allPages.slice(0, 100));

      orphans.push({
        url: page.url,
        title: page.title,
        wordCount: page.wordCount,
        lastModified: page.lastModified,
        internalLinksIn: 0,
        hasTraffic,
        hasRankings,
        suggestedLinksFrom,
      });
    }
  }

  // Sort by importance (traffic/rankings first)
  orphans.sort((a, b) => {
    const scoreA = (a.hasTraffic ? 100 : 0) + (a.hasRankings ? 50 : 0) + a.wordCount / 100;
    const scoreB = (b.hasTraffic ? 100 : 0) + (b.hasRankings ? 50 : 0) + b.wordCount / 100;
    return scoreB - scoreA;
  });

  return orphans;
}

// Find topically similar pages for internal linking suggestions
async function findSimilarPages(
  targetPage: { url: string; title: string | null },
  allPages: Array<{ url: string; title: string | null }>
): Promise<string[]> {
  if (!targetPage.title) return [];

  const targetWords = new Set(
    targetPage.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );

  const scored = allPages
    .filter((p) => p.url !== targetPage.url && p.title)
    .map((page) => {
      const pageWords = page.title!.toLowerCase().split(/\s+/);
      const matches = pageWords.filter((w) => targetWords.has(w)).length;
      return { url: page.url, score: matches };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((p) => p.url);

  return scored;
}

// Detect redirect chains
export async function detectRedirectChains(
  siteUrl: string,
  urls: string[]
): Promise<RedirectChain[]> {
  const chains: RedirectChain[] = [];

  for (const url of urls) {
    try {
      const chain = await followRedirectChain(url);

      if (chain.length > 1) {
        const isProblematic = chain.length > 2; // More than one redirect
        
        let recommendation = "";
        if (isProblematic) {
          recommendation = `Redirect directly from ${chain[0]} to ${chain[chain.length - 1]} to avoid ${chain.length - 1} redirects`;
        } else {
          recommendation = "Single redirect is acceptable but could be optimized";
        }

        chains.push({
          sourceUrl: chain[0],
          chain,
          finalUrl: chain[chain.length - 1],
          statusCodes: [301], // Would be populated from actual requests
          isProblematic,
          recommendation,
        });
      }
    } catch (error) {
      // Skip URLs that can't be checked
      console.error(`Error checking redirect for ${url}:`, error);
    }
  }

  return chains;
}

async function followRedirectChain(url: string, maxDepth: number = 10): Promise<string[]> {
  const chain: string[] = [url];
  let currentUrl = url;
  let depth = 0;

  while (depth < maxDepth) {
    try {
      const response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });

      // Check for redirect status codes
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        
        if (location) {
          const nextUrl = new URL(location, currentUrl).toString();
          
          if (chain.includes(nextUrl)) {
            // Circular redirect detected
            break;
          }

          chain.push(nextUrl);
          currentUrl = nextUrl;
          depth++;
        } else {
          break;
        }
      } else {
        // Final destination
        break;
      }
    } catch {
      // Network error or timeout
      break;
    }
  }

  return chain;
}

// Find pages with most/least internal links
export function analyzeInternalLinkDistribution(
  pages: Array<{ url: string; title: string }>,
  links: Array<{ fromUrl: string; toUrl: string }>
): {
  topLinked: Array<{ url: string; title: string; linkCount: number }>;
  underLinked: Array<{ url: string; title: string; linkCount: number }>;
  avgLinksPerPage: number;
} {
  const linkCounts = new Map<string, number>();

  // Count inbound links for each page
  for (const link of links) {
    linkCounts.set(link.toUrl, (linkCounts.get(link.toUrl) || 0) + 1);
  }

  // Build results
  const pagesWithCounts = pages.map((page) => ({
    url: page.url,
    title: page.title,
    linkCount: linkCounts.get(page.url) || 0,
  }));

  const sorted = [...pagesWithCounts].sort((a, b) => b.linkCount - a.linkCount);
  
  const avgLinksPerPage = sorted.reduce((sum, p) => sum + p.linkCount, 0) / sorted.length;

  return {
    topLinked: sorted.slice(0, 20),
    underLinked: sorted.filter((p) => p.linkCount < 3).slice(0, 20),
    avgLinksPerPage: Math.round(avgLinksPerPage),
  };
}

// Identify broken outbound links
export async function detectBrokenOutboundLinks(
  pages: Array<{ url: string; outboundLinks: Array<{ url: string; text: string }> }>
): Promise<BrokenLinkDetails[]> {
  const brokenLinks = new Map<string, BrokenLinkDetails>();

  for (const page of pages) {
    for (const link of page.outboundLinks) {
      // Skip already checked or internal links
      if (brokenLinks.has(link.url)) {
        const existing = brokenLinks.get(link.url)!;
        existing.foundOnPages.push(page.url);
        existing.linkText.push(link.text);
        continue;
      }

      try {
        const response = await fetch(link.url, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
        });

        if (response.status >= 400) {
          brokenLinks.set(link.url, {
            url: link.url,
            foundOnPages: [page.url],
            statusCode: response.status,
            linkText: [link.text],
            lastChecked: new Date(),
          });
        }
      } catch {
        // Consider as broken (connection failed)
        brokenLinks.set(link.url, {
          url: link.url,
          foundOnPages: [page.url],
          statusCode: 0,
          linkText: [link.text],
          lastChecked: new Date(),
        });
      }

      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return Array.from(brokenLinks.values());
}
