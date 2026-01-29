/**
 * URL and slug SEO analysis
 */

export interface URLAnalysis {
  url: string;
  slug: string;
  issues: Array<{
    type: string;
    severity: "high" | "medium" | "low";
    message: string;
    suggestion: string;
  }>;
  score: number; // 0-100
}

/**
 * Analyze URL structure for SEO best practices
 */
export function analyzeURL(url: string): URLAnalysis {
  const issues: URLAnalysis["issues"] = [];
  let score = 100;

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const slug = pathname.split("/").filter(Boolean).pop() || "";

    // Check URL length
    if (url.length > 75) {
      score -= 10;
      issues.push({
        type: "url_too_long",
        severity: "medium",
        message: `URL is ${url.length} characters (recommended: <75)`,
        suggestion: "Shorten the URL by removing unnecessary words",
      });
    }

    // Check slug length
    if (slug.length > 50) {
      score -= 10;
      issues.push({
        type: "slug_too_long",
        severity: "medium",
        message: `Slug is ${slug.length} characters (recommended: <50)`,
        suggestion: "Use a shorter, more concise slug",
      });
    }

    // Check for uppercase letters
    if (slug !== slug.toLowerCase()) {
      score -= 5;
      issues.push({
        type: "uppercase_in_url",
        severity: "low",
        message: "URL contains uppercase letters",
        suggestion: "Use lowercase letters only for consistency",
      });
    }

    // Check for special characters
    const specialChars = /[^a-z0-9\-_]/g;
    const matches = slug.match(specialChars);
    if (matches) {
      score -= 15;
      issues.push({
        type: "special_characters",
        severity: "high",
        message: `URL contains special characters: ${matches.join(", ")}`,
        suggestion: "Use hyphens to separate words, avoid special characters",
      });
    }

    // Check for numbers-only slugs
    if (/^\d+$/.test(slug)) {
      score -= 20;
      issues.push({
        type: "numeric_slug",
        severity: "high",
        message: "Slug contains only numbers",
        suggestion: "Use descriptive words instead of numbers",
      });
    }

    // Check for stop words (optional - can be removed for shorter URLs)
    const stopWords = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of"];
    const slugWords = slug.split("-");
    const hasStopWords = slugWords.some(word => stopWords.includes(word.toLowerCase()));
    if (hasStopWords && slugWords.length > 4) {
      score -= 5;
      issues.push({
        type: "stop_words_in_url",
        severity: "low",
        message: "URL contains stop words",
        suggestion: "Consider removing stop words for shorter URLs",
      });
    }

    // Check URL depth
    const depth = pathname.split("/").filter(Boolean).length;
    if (depth > 3) {
      score -= 10;
      issues.push({
        type: "url_too_deep",
        severity: "medium",
        message: `URL is ${depth} levels deep (recommended: <3)`,
        suggestion: "Flatten URL structure for better crawlability",
      });
    }

    // Check for file extensions in slug
    if (/\.(html|htm|php|asp|aspx)$/i.test(slug)) {
      score -= 5;
      issues.push({
        type: "file_extension_in_url",
        severity: "low",
        message: "URL contains file extension",
        suggestion: "Remove file extensions for cleaner URLs",
      });
    }

    // Check for duplicate slashes
    if (pathname.includes("//")) {
      score -= 5;
      issues.push({
        type: "duplicate_slashes",
        severity: "low",
        message: "URL contains duplicate slashes",
        suggestion: "Remove duplicate slashes",
      });
    }

    // Check for trailing slash consistency (prefer no trailing slash for non-directories)
    if (pathname !== "/" && pathname.endsWith("/") && !slug.includes(".")) {
      score -= 3;
      issues.push({
        type: "trailing_slash",
        severity: "low",
        message: "URL has trailing slash",
        suggestion: "Choose trailing slash or no trailing slash and be consistent",
      });
    }

    score = Math.max(0, score);
  } catch (error) {
    issues.push({
      type: "invalid_url",
      severity: "high",
      message: "Invalid URL format",
      suggestion: "Fix URL format",
    });
    score = 0;
  }

  return {
    url,
    slug: slug || "/",
    issues,
    score,
  };
}

/**
 * Validate XML sitemap
 */
export interface SitemapValidation {
  isValid: boolean;
  issues: Array<{
    type: string;
    severity: "high" | "medium" | "low";
    message: string;
  }>;
  urlCount: number;
  lastModified: string | null;
}

export async function validateSitemap(sitemapUrl: string): Promise<SitemapValidation> {
  const issues: SitemapValidation["issues"] = [];
  let urlCount = 0;
  let lastModified: string | null = null;

  try {
    const response = await fetch(sitemapUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "SEOMax-Crawler/1.0" },
    });

    if (!response.ok) {
      issues.push({
        type: "sitemap_not_accessible",
        severity: "high",
        message: `Sitemap returned HTTP ${response.status}`,
      });
      return { isValid: false, issues, urlCount, lastModified };
    }

    const text = await response.text();
    
    // Check if it's valid XML
    if (!text.trim().startsWith("<?xml")) {
      issues.push({
        type: "invalid_xml",
        severity: "high",
        message: "Sitemap is not valid XML",
      });
      return { isValid: false, issues, urlCount, lastModified };
    }

    // Parse sitemap (basic check)
    const urlMatches = text.match(/<loc>(.*?)<\/loc>/g);
    if (urlMatches) {
      urlCount = urlMatches.length;
    } else {
      issues.push({
        type: "no_urls_found",
        severity: "high",
        message: "No URLs found in sitemap",
      });
    }

    // Check for lastmod
    const lastmodMatch = text.match(/<lastmod>(.*?)<\/lastmod>/);
    if (lastmodMatch) {
      lastModified = lastmodMatch[1];
    } else {
      issues.push({
        type: "no_lastmod",
        severity: "low",
        message: "Sitemap doesn't include lastmod dates",
      });
    }

    // Check sitemap size (should be <50MB and <50k URLs)
    if (urlCount > 50000) {
      issues.push({
        type: "sitemap_too_large",
        severity: "medium",
        message: `Sitemap contains ${urlCount} URLs (recommended: <50,000)`,
      });
    }

    if (text.length > 50 * 1024 * 1024) {
      issues.push({
        type: "sitemap_file_too_large",
        severity: "medium",
        message: "Sitemap file is too large (recommended: <50MB)",
      });
    }

    // Check for HTTPS URLs
    const httpMatches = text.match(/<loc>http:\/\/(.*?)<\/loc>/g);
    if (httpMatches && httpMatches.length > 0) {
      issues.push({
        type: "http_urls_in_sitemap",
        severity: "high",
        message: `Sitemap contains ${httpMatches.length} HTTP URLs (should be HTTPS)`,
      });
    }

  } catch (error) {
    issues.push({
      type: "sitemap_fetch_error",
      severity: "high",
      message: `Failed to fetch sitemap: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }

  return {
    isValid: issues.filter(i => i.severity === "high").length === 0,
    issues,
    urlCount,
    lastModified,
  };
}
