import * as cheerio from "cheerio";

export interface ImageDetails {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  format: string | null;
  hasLazyLoading: boolean;
}

export interface ExternalLink {
  url: string;
  anchorText: string;
  isNofollow: boolean;
  isSponsored: boolean;
  isUgc: boolean;
}

export interface InternalLink {
  url: string;
  anchorText: string;
}

export interface OpenGraphData {
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogType: string | null;
  ogUrl: string | null;
}

export interface SchemaData {
  types: string[];
  hasProduct: boolean;
  hasFAQ: boolean;
  hasArticle: boolean;
  hasLocalBusiness: boolean;
  hasOrganization: boolean;
}

export interface CrawlResult {
  url: string;
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  h1Tags: string[];
  h2Tags: string[];
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  internalLinkUrls: InternalLink[];
  externalLinkUrls: ExternalLink[];
  imagesTotal: number;
  imagesMissingAlt: number;
  imageDetails: ImageDetails[];
  canonicalUrl: string | null;
  hasRobotsNoindex: boolean;
  hasRobotsNofollow: boolean;
  loadTimeMs: number;
  issues: CrawlIssue[];
  // New fields
  urlSlug: string;
  urlDepth: number;
  isHttps: boolean;
  hasMobileViewport: boolean;
  openGraph: OpenGraphData;
  schema: SchemaData;
  hreflangTags: Array<{ lang: string; url: string }>;
  lastModified: string | null;
  contentHash: string; // For duplicate detection
  hasAuthorInfo: boolean;
  hasDatePublished: boolean;
}

export interface CrawlIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  details?: string;
}

export interface CrawlSummary {
  totalPages: number;
  issuesBreakdown: Record<string, number>;
  criticalIssues: number;
  warnings: number;
  avgLoadTime: number;
  pagesWithMissingTitle: number;
  pagesWithMissingDescription: number;
  pagesWithMissingH1: number;
  pagesWithDuplicateH1: number;
  pagesWithNoindex: number;
  brokenLinks: number;
  redirects: number;
  imagesMissingAlt: number;
}

// Parse robots.txt
async function parseRobotsTxt(siteUrl: string): Promise<{
  disallowed: string[];
  sitemaps: string[];
}> {
  try {
    const robotsUrl = new URL("/robots.txt", siteUrl).toString();
    const response = await fetch(robotsUrl, { 
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "SEOMax-Crawler/1.0" }
    });
    
    if (!response.ok) {
      return { disallowed: [], sitemaps: [] };
    }
    
    const text = await response.text();
    const lines = text.split("\n");
    
    const disallowed: string[] = [];
    const sitemaps: string[] = [];
    let isUserAgentAll = false;
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith("user-agent:")) {
        isUserAgentAll = trimmed.includes("*");
      } else if (isUserAgentAll && trimmed.startsWith("disallow:")) {
        const path = line.split(":")[1]?.trim();
        if (path) disallowed.push(path);
      } else if (trimmed.startsWith("sitemap:")) {
        const url = line.split("sitemap:")[1]?.trim();
        if (url) sitemaps.push(url);
      }
    }
    
    return { disallowed, sitemaps };
  } catch {
    return { disallowed: [], sitemaps: [] };
  }
}

// Parse sitemap XML
async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    const response = await fetch(sitemapUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "SEOMax-Crawler/1.0" }
    });
    
    if (!response.ok) return [];
    
    const text = await response.text();
    const $ = cheerio.load(text, { xmlMode: true });
    
    const urls: string[] = [];
    
    // Handle sitemap index
    $("sitemap > loc").each((_, el) => {
      urls.push($(el).text());
    });
    
    // Handle regular sitemap
    $("url > loc").each((_, el) => {
      urls.push($(el).text());
    });
    
    return urls;
  } catch {
    return [];
  }
}

// Crawl a single page
async function crawlPage(url: string, baseDomain: string): Promise<CrawlResult> {
  const startTime = Date.now();
  const issues: CrawlIssue[] = [];
  
  let statusCode = 0;
  let html = "";
  
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "SEOMax-Crawler/1.0" },
      redirect: "follow",
    });
    
    statusCode = response.status;
    
    if (statusCode >= 400) {
      issues.push({
        type: "http_error",
        severity: statusCode >= 500 ? "critical" : "warning",
        message: `HTTP ${statusCode} error`,
      });
    }
    
    if (response.redirected) {
      issues.push({
        type: "redirect",
        severity: "info",
        message: "Page redirects",
        details: `Redirects to: ${response.url}`,
      });
    }
    
    html = await response.text();
  } catch (error) {
    const urlObj = new URL(url);
    return {
      url,
      statusCode: 0,
      title: null,
      metaDescription: null,
      h1Tags: [],
      h2Tags: [],
      wordCount: 0,
      internalLinks: 0,
      externalLinks: 0,
      internalLinkUrls: [],
      externalLinkUrls: [],
      imagesTotal: 0,
      imagesMissingAlt: 0,
      imageDetails: [],
      canonicalUrl: null,
      hasRobotsNoindex: false,
      hasRobotsNofollow: false,
      loadTimeMs: Date.now() - startTime,
      issues: [{
        type: "fetch_error",
        severity: "critical",
        message: "Failed to fetch page",
        details: error instanceof Error ? error.message : "Unknown error",
      }],
      urlSlug: urlObj.pathname,
      urlDepth: urlObj.pathname.split("/").filter(Boolean).length,
      isHttps: urlObj.protocol === "https:",
      hasMobileViewport: false,
      openGraph: {
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        ogType: null,
        ogUrl: null,
      },
      schema: {
        types: [],
        hasProduct: false,
        hasFAQ: false,
        hasArticle: false,
        hasLocalBusiness: false,
        hasOrganization: false,
      },
      hreflangTags: [],
      lastModified: null,
      contentHash: "",
      hasAuthorInfo: false,
      hasDatePublished: false,
    };
  }
  
  const loadTimeMs = Date.now() - startTime;
  const $ = cheerio.load(html);
  
  // URL analysis
  const urlObj = new URL(url);
  const urlSlug = urlObj.pathname.split("/").filter(Boolean).join("/") || "/";
  const urlDepth = urlObj.pathname.split("/").filter(Boolean).length;
  const isHttps = urlObj.protocol === "https:";
  
  if (!isHttps) {
    issues.push({
      type: "not_https",
      severity: "critical",
      message: "Page not served over HTTPS",
    });
  }
  
  // Mobile viewport check
  const viewport = $('meta[name="viewport"]').attr("content") || "";
  const hasMobileViewport = viewport.includes("width") || viewport.includes("device-width");
  if (!hasMobileViewport) {
    issues.push({
      type: "missing_mobile_viewport",
      severity: "warning",
      message: "Missing or invalid viewport meta tag",
    });
  }
  
  // Title
  const title = $("title").first().text().trim() || null;
  if (!title) {
    issues.push({
      type: "missing_title",
      severity: "critical",
      message: "Missing title tag",
    });
  } else if (title.length < 30) {
    issues.push({
      type: "short_title",
      severity: "warning",
      message: "Title too short",
      details: `${title.length} characters (recommended: 50-60)`,
    });
  } else if (title.length > 60) {
    issues.push({
      type: "long_title",
      severity: "warning",
      message: "Title may be truncated",
      details: `${title.length} characters (recommended: 50-60)`,
    });
  }
  
  // Meta description
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;
  if (!metaDescription) {
    issues.push({
      type: "missing_meta_description",
      severity: "critical",
      message: "Missing meta description",
    });
  } else if (metaDescription.length < 120) {
    issues.push({
      type: "short_meta_description",
      severity: "warning",
      message: "Meta description too short",
      details: `${metaDescription.length} characters (recommended: 120-160)`,
    });
  } else if (metaDescription.length > 160) {
    issues.push({
      type: "long_meta_description",
      severity: "warning",
      message: "Meta description may be truncated",
      details: `${metaDescription.length} characters (recommended: 120-160)`,
    });
  }
  
  // H1 tags
  const h1Tags: string[] = [];
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1Tags.push(text);
  });
  
  if (h1Tags.length === 0) {
    issues.push({
      type: "missing_h1",
      severity: "critical",
      message: "Missing H1 tag",
    });
  } else if (h1Tags.length > 1) {
    issues.push({
      type: "multiple_h1",
      severity: "warning",
      message: "Multiple H1 tags",
      details: `Found ${h1Tags.length} H1 tags`,
    });
  }
  
  // H2 tags
  const h2Tags: string[] = [];
  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2Tags.push(text);
  });
  
  // Word count
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 0).length;
  
  if (wordCount < 300) {
    issues.push({
      type: "thin_content",
      severity: "warning",
      message: "Thin content",
      details: `Only ${wordCount} words (recommended: 300+)`,
    });
  }
  
  // Open Graph tags
  const openGraph: OpenGraphData = {
    ogTitle: $('meta[property="og:title"]').attr("content")?.trim() || null,
    ogDescription: $('meta[property="og:description"]').attr("content")?.trim() || null,
    ogImage: $('meta[property="og:image"]').attr("content")?.trim() || null,
    ogType: $('meta[property="og:type"]').attr("content")?.trim() || null,
    ogUrl: $('meta[property="og:url"]').attr("content")?.trim() || null,
  };
  
  if (!openGraph.ogTitle && title) {
    issues.push({
      type: "missing_og_title",
      severity: "warning",
      message: "Missing Open Graph title",
    });
  }
  
  // Schema markup detection
  const schemaScripts = $('script[type="application/ld+json"]');
  const schemaTypes: string[] = [];
  let hasProduct = false;
  let hasFAQ = false;
  let hasArticle = false;
  let hasLocalBusiness = false;
  let hasOrganization = false;
  
  schemaScripts.each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "{}");
      if (json["@type"]) {
        const type = Array.isArray(json["@type"]) ? json["@type"][0] : json["@type"];
        schemaTypes.push(type);
        if (type === "Product") hasProduct = true;
        if (type === "FAQPage" || type === "Question") hasFAQ = true;
        if (type === "Article" || type === "BlogPosting") hasArticle = true;
        if (type === "LocalBusiness") hasLocalBusiness = true;
        if (type === "Organization") hasOrganization = true;
      }
    } catch {
      // Invalid JSON, skip
    }
  });
  
  const schema: SchemaData = {
    types: schemaTypes,
    hasProduct,
    hasFAQ,
    hasArticle,
    hasLocalBusiness,
    hasOrganization,
  };
  
  // Links - collect detailed info
  let internalLinks = 0;
  let externalLinks = 0;
  const internalLinkUrls: InternalLink[] = [];
  const externalLinkUrls: ExternalLink[] = [];
  const brokenLinkCandidates: string[] = [];
  
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }
    
    const anchorText = $(el).text().trim();
    const rel = $(el).attr("rel")?.toLowerCase() || "";
    const isNofollow = rel.includes("nofollow");
    const isSponsored = rel.includes("sponsored");
    const isUgc = rel.includes("ugc");
    
    try {
      const linkUrl = new URL(href, url);
      if (linkUrl.hostname === baseDomain || linkUrl.hostname.endsWith(`.${baseDomain}`)) {
        internalLinks++;
        internalLinkUrls.push({ url: linkUrl.toString(), anchorText });
      } else {
        externalLinks++;
        externalLinkUrls.push({
          url: linkUrl.toString(),
          anchorText,
          isNofollow,
          isSponsored,
          isUgc,
        });
      }
    } catch {
      brokenLinkCandidates.push(href);
    }
  });
  
  if (internalLinks < 3) {
    issues.push({
      type: "few_internal_links",
      severity: "warning",
      message: "Few internal links",
      details: `Only ${internalLinks} internal links`,
    });
  }
  
  if (internalLinks === 0) {
    issues.push({
      type: "orphan_page",
      severity: "warning",
      message: "Orphan page - no internal links found",
    });
  }
  
  // Images - collect detailed info
  let imagesTotal = 0;
  let imagesMissingAlt = 0;
  const imageDetails: ImageDetails[] = [];
  
  $("img").each((_, el) => {
    imagesTotal++;
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const alt = $(el).attr("alt") || null;
    const width = parseInt($(el).attr("width") || "0") || null;
    const height = parseInt($(el).attr("height") || "0") || null;
    const loading = $(el).attr("loading")?.toLowerCase() || "";
    const hasLazyLoading = loading === "lazy" || $(el).attr("data-src") !== undefined;
    
    if (!alt || alt.trim().length === 0) {
      imagesMissingAlt++;
    }
    
    let imageUrl = src;
    if (src && !src.startsWith("http")) {
      try {
        imageUrl = new URL(src, url).toString();
      } catch {
        imageUrl = src;
      }
    }
    
    // Try to determine format from URL
    let format: string | null = null;
    if (imageUrl) {
      const match = imageUrl.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i);
      if (match) format = match[1].toLowerCase();
    }
    
    imageDetails.push({
      url: imageUrl,
      alt,
      width,
      height,
      sizeBytes: null, // Would need HEAD request to get actual size
      format,
      hasLazyLoading,
    });
    
    // Check for large images without dimensions
    if (!width || !height) {
      issues.push({
        type: "image_missing_dimensions",
        severity: "info",
        message: "Image missing width/height attributes",
        details: `Image: ${src.substring(0, 50)}`,
      });
    }
    
    // Check for missing lazy loading on images below fold
    if (!hasLazyLoading && imagesTotal > 3) {
      issues.push({
        type: "image_missing_lazy_loading",
        severity: "info",
        message: "Consider lazy loading images for better performance",
      });
    }
  });
  
  if (imagesMissingAlt > 0) {
    issues.push({
      type: "images_missing_alt",
      severity: "warning",
      message: "Images missing alt text",
      details: `${imagesMissingAlt} of ${imagesTotal} images`,
    });
  }
  
  // Hreflang tags
  const hreflangTags: Array<{ lang: string; url: string }> = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang") || "";
    const href = $(el).attr("href") || "";
    if (lang && href) {
      hreflangTags.push({ lang, url: href });
    }
  });
  
  // Last modified date
  const lastModified = $('meta[http-equiv="last-modified"]').attr("content") || null;
  
  // Content hash for duplicate detection (hash of main content)
  const mainContent = $("main").text() || $("article").text() || $("body").text();
  const contentHash = Buffer.from(mainContent.replace(/\s+/g, " ").trim()).toString("base64").substring(0, 32);
  
  // E-E-A-T signals
  const hasAuthorInfo = $('meta[name="author"]').length > 0 || 
                        $('[rel="author"]').length > 0 ||
                        $('.author').length > 0 ||
                        $('[itemprop="author"]').length > 0;
  const hasDatePublished = $('meta[property="article:published_time"]').length > 0 ||
                          $('time[datetime]').length > 0 ||
                          $('[itemprop="datePublished"]').length > 0;
  
  if (!hasAuthorInfo && (hasArticle || wordCount > 500)) {
    issues.push({
      type: "missing_author_info",
      severity: "info",
      message: "Missing author information (E-E-A-T signal)",
    });
  }
  
  // Canonical
  const canonicalUrl = $('link[rel="canonical"]').attr("href") || null;
  if (!canonicalUrl) {
    issues.push({
      type: "missing_canonical",
      severity: "warning",
      message: "Missing canonical tag",
    });
  }
  
  // Robots meta
  const robotsMeta = $('meta[name="robots"]').attr("content")?.toLowerCase() || "";
  const hasRobotsNoindex = robotsMeta.includes("noindex");
  const hasRobotsNofollow = robotsMeta.includes("nofollow");
  
  if (hasRobotsNoindex) {
    issues.push({
      type: "noindex",
      severity: "info",
      message: "Page has noindex",
    });
  }
  
  // Load time
  if (loadTimeMs > 3000) {
    issues.push({
      type: "slow_page",
      severity: "warning",
      message: "Slow page load",
      details: `${(loadTimeMs / 1000).toFixed(1)}s (target: <3s)`,
    });
  }
  
  return {
    url,
    statusCode,
    title,
    metaDescription,
    h1Tags,
    h2Tags,
    wordCount,
    internalLinks,
    externalLinks,
    internalLinkUrls,
    externalLinkUrls,
    imagesTotal,
    imagesMissingAlt,
    imageDetails,
    canonicalUrl,
    hasRobotsNoindex,
    hasRobotsNofollow,
    loadTimeMs,
    issues,
    urlSlug,
    urlDepth,
    isHttps,
    hasMobileViewport,
    openGraph,
    schema,
    hreflangTags,
    lastModified,
    contentHash,
    hasAuthorInfo,
    hasDatePublished,
  };
}

// Main crawler function
export async function crawlSite(
  siteUrl: string,
  options: {
    maxPages?: number;
    onProgress?: (crawled: number, total: number, currentUrl: string) => void;
    onPageCrawled?: (result: CrawlResult) => void;
  } = {}
): Promise<{
  results: CrawlResult[];
  summary: CrawlSummary;
}> {
  const { maxPages = 100, onProgress, onPageCrawled } = options;
  
  const baseUrl = new URL(siteUrl);
  const baseDomain = baseUrl.hostname;
  
  // Get sitemap URLs
  const robots = await parseRobotsTxt(siteUrl);
  let urlsToCrawl: string[] = [siteUrl];
  
  for (const sitemapUrl of robots.sitemaps) {
    const sitemapUrls = await parseSitemap(sitemapUrl);
    urlsToCrawl = [...urlsToCrawl, ...sitemapUrls];
  }
  
  // If no sitemap, try common sitemap locations
  if (urlsToCrawl.length === 1) {
    const commonSitemaps = [
      "/sitemap.xml",
      "/sitemap_index.xml",
      "/sitemap-index.xml",
      "/wp-sitemap.xml",
    ];
    
    for (const path of commonSitemaps) {
      const urls = await parseSitemap(new URL(path, siteUrl).toString());
      if (urls.length > 0) {
        urlsToCrawl = [...urlsToCrawl, ...urls];
        break;
      }
    }
  }
  
  // Filter and dedupe URLs
  const crawledUrls = new Set<string>();
  const results: CrawlResult[] = [];
  
  urlsToCrawl = [...new Set(urlsToCrawl)]
    .filter((url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname === baseDomain || parsed.hostname.endsWith(`.${baseDomain}`);
      } catch {
        return false;
      }
    })
    .slice(0, maxPages);
  
  const totalPages = urlsToCrawl.length;
  
  // Crawl pages with rate limiting
  for (let i = 0; i < urlsToCrawl.length; i++) {
    const url = urlsToCrawl[i];
    
    if (crawledUrls.has(url)) continue;
    crawledUrls.add(url);
    
    onProgress?.(i + 1, totalPages, url);
    
    const result = await crawlPage(url, baseDomain);
    results.push(result);
    onPageCrawled?.(result);
    
    // Rate limit: 500ms between requests
    if (i < urlsToCrawl.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  
  // Generate summary
  const summary = generateSummary(results);
  
  return { results, summary };
}

function generateSummary(results: CrawlResult[]): CrawlSummary {
  const issuesBreakdown: Record<string, number> = {};
  let criticalIssues = 0;
  let warnings = 0;
  let totalLoadTime = 0;
  let pagesWithMissingTitle = 0;
  let pagesWithMissingDescription = 0;
  let pagesWithMissingH1 = 0;
  let pagesWithDuplicateH1 = 0;
  let pagesWithNoindex = 0;
  let brokenLinks = 0;
  let redirects = 0;
  let imagesMissingAlt = 0;
  
  for (const result of results) {
    totalLoadTime += result.loadTimeMs;
    imagesMissingAlt += result.imagesMissingAlt;
    
    if (!result.title) pagesWithMissingTitle++;
    if (!result.metaDescription) pagesWithMissingDescription++;
    if (result.h1Tags.length === 0) pagesWithMissingH1++;
    if (result.h1Tags.length > 1) pagesWithDuplicateH1++;
    if (result.hasRobotsNoindex) pagesWithNoindex++;
    
    for (const issue of result.issues) {
      issuesBreakdown[issue.type] = (issuesBreakdown[issue.type] || 0) + 1;
      
      if (issue.severity === "critical") criticalIssues++;
      if (issue.severity === "warning") warnings++;
      if (issue.type === "http_error" && result.statusCode >= 400) brokenLinks++;
      if (issue.type === "redirect") redirects++;
    }
  }
  
  return {
    totalPages: results.length,
    issuesBreakdown,
    criticalIssues,
    warnings,
    avgLoadTime: results.length > 0 ? Math.round(totalLoadTime / results.length) : 0,
    pagesWithMissingTitle,
    pagesWithMissingDescription,
    pagesWithMissingH1,
    pagesWithDuplicateH1,
    pagesWithNoindex,
    brokenLinks,
    redirects,
    imagesMissingAlt,
  };
}

// Quick health check (crawls homepage only)
export async function quickHealthCheck(siteUrl: string): Promise<{
  healthy: boolean;
  score: number;
  criticalIssues: CrawlIssue[];
  recommendations: string[];
}> {
  const result = await crawlPage(siteUrl, new URL(siteUrl).hostname);
  
  const criticalIssues = result.issues.filter((i) => i.severity === "critical");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  
  // Calculate score
  let score = 100;
  score -= criticalIssues.length * 15;
  score -= warnings.length * 5;
  score = Math.max(0, score);
  
  const recommendations: string[] = [];
  
  if (!result.title) recommendations.push("Add a title tag to improve CTR");
  if (!result.metaDescription) recommendations.push("Add meta description for better SERP appearance");
  if (result.h1Tags.length === 0) recommendations.push("Add an H1 tag for better content structure");
  if (result.imagesMissingAlt > 0) recommendations.push(`Add alt text to ${result.imagesMissingAlt} images`);
  if (result.loadTimeMs > 3000) recommendations.push("Improve page speed (currently over 3 seconds)");
  if (result.wordCount < 300) recommendations.push("Add more content (currently thin content)");
  
  return {
    healthy: criticalIssues.length === 0,
    score,
    criticalIssues,
    recommendations,
  };
}
