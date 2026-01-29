/**
 * Core Web Vitals integration using PageSpeed Insights API
 */

export interface CoreWebVitals {
  lcp: number | null; // Largest Contentful Paint (ms)
  fid: number | null; // First Input Delay (ms)
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint (ms)
  ttfb: number | null; // Time to First Byte (ms)
  score: number | null; // Overall performance score (0-100)
  opportunities: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
  }>;
}

export async function getCoreWebVitals(
  url: string,
  apiKey?: string
): Promise<CoreWebVitals | null> {
  if (!apiKey) {
    // Return null if no API key - feature will be skipped
    return null;
  }

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
    
    const response = await fetch(apiUrl, {
      headers: apiKey ? { "x-api-key": apiKey } : {},
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(`PageSpeed API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    const lighthouse = data.lighthouseResult;
    const audits = lighthouse?.audits || {};
    const categories = lighthouse?.categories || {};

    const lcp = audits["largest-contentful-paint"]?.numericValue || null;
    const fid = audits["max-potential-fid"]?.numericValue || null;
    const cls = audits["cumulative-layout-shift"]?.numericValue || null;
    const fcp = audits["first-contentful-paint"]?.numericValue || null;
    const ttfb = audits["server-response-time"]?.numericValue || null;
    const score = categories.performance?.score ? Math.round(categories.performance.score * 100) : null;

    // Extract optimization opportunities
    const opportunities: CoreWebVitals["opportunities"] = [];
    
    const opportunityAudits = [
      "render-blocking-resources",
      "unused-css-rules",
      "unused-javascript",
      "modern-image-formats",
      "offscreen-images",
      "unminified-css",
      "unminified-javascript",
      "efficient-animated-content",
      "uses-responsive-images",
      "uses-optimized-images",
    ];

    for (const auditId of opportunityAudits) {
      const audit = audits[auditId];
      if (audit && audit.score !== null && audit.score < 0.9) {
        const impact = audit.score < 0.5 ? "high" : audit.score < 0.75 ? "medium" : "low";
        opportunities.push({
          title: audit.title,
          description: audit.description || "",
          impact,
        });
      }
    }

    return {
      lcp,
      fid,
      cls,
      fcp,
      ttfb,
      score,
      opportunities,
    };
  } catch (error) {
    console.error("Core Web Vitals fetch error:", error);
    return null;
  }
}

export function getCoreWebVitalsGrade(cwv: CoreWebVitals): {
  lcp: "good" | "needs-improvement" | "poor";
  fid: "good" | "needs-improvement" | "poor";
  cls: "good" | "needs-improvement" | "poor";
} {
  return {
    lcp: !cwv.lcp ? "poor" : cwv.lcp <= 2500 ? "good" : cwv.lcp <= 4000 ? "needs-improvement" : "poor",
    fid: !cwv.fid ? "poor" : cwv.fid <= 100 ? "good" : cwv.fid <= 300 ? "needs-improvement" : "poor",
    cls: !cwv.cls ? "poor" : cwv.cls <= 0.1 ? "good" : cwv.cls <= 0.25 ? "needs-improvement" : "poor",
  };
}
