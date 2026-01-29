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
  // #region agent log
  console.log("[DEBUG] getCoreWebVitals called", { url, hasApiKey: !!apiKey });
  // #endregion
  if (!apiKey) {
    // Return null if no API key - feature will be skipped
    // #region agent log
    console.log("[DEBUG] No PageSpeed API key - skipping Core Web Vitals");
    // #endregion
    return null;
  }

  try {
    // FIX: PageSpeed API uses query parameter 'key', not x-api-key header
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${encodeURIComponent(apiKey)}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
    
    // #region agent log
    console.log("[DEBUG] Calling PageSpeed API for", url);
    // #endregion
    
    const response = await fetch(apiUrl, {
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

// Alias for backwards compatibility
export const fetchCoreWebVitals = async (
  url: string,
  device: "mobile" | "desktop" = "mobile",
  apiKey?: string
): Promise<CoreWebVitals & { inp?: number } | null> => {
  const result = await getCoreWebVitals(url, apiKey);
  if (!result) return null;
  return { ...result, inp: null as unknown as number };
};

// Evaluate web vitals and provide scores/recommendations
export function evaluateWebVitals(vitals: CoreWebVitals & { inp?: number }): {
  scores: { lcp: string; fid: string; cls: string; overall: string };
  performanceScore: number;
  recommendations: string[];
} {
  const grades = getCoreWebVitalsGrade(vitals);
  const recommendations: string[] = [];

  if (grades.lcp === "poor") {
    recommendations.push("Improve Largest Contentful Paint: optimize images, use CDN, reduce server response time");
  } else if (grades.lcp === "needs-improvement") {
    recommendations.push("LCP could be improved: consider lazy loading below-fold images");
  }

  if (grades.fid === "poor") {
    recommendations.push("Reduce First Input Delay: minimize JavaScript, break up long tasks");
  }

  if (grades.cls === "poor") {
    recommendations.push("Fix Cumulative Layout Shift: set dimensions on images/videos, avoid inserting content above existing content");
  } else if (grades.cls === "needs-improvement") {
    recommendations.push("CLS could be improved: ensure all images have width/height attributes");
  }

  const scoreMap = { good: 90, "needs-improvement": 60, poor: 30 };
  const performanceScore = Math.round(
    (scoreMap[grades.lcp] + scoreMap[grades.fid] + scoreMap[grades.cls]) / 3
  );

  return {
    scores: {
      lcp: grades.lcp,
      fid: grades.fid,
      cls: grades.cls,
      overall: performanceScore >= 90 ? "good" : performanceScore >= 50 ? "needs-improvement" : "poor",
    },
    performanceScore,
    recommendations,
  };
}

// Get performance opportunities from CWV data
export async function getPerformanceOpportunities(
  url: string,
  device: "mobile" | "desktop" = "mobile",
  apiKey?: string
): Promise<Array<{ title: string; description: string; savings: number; priority: string }>> {
  const cwv = await getCoreWebVitals(url, apiKey);
  if (!cwv) return [];

  return cwv.opportunities.map((opp) => ({
    title: opp.title,
    description: opp.description,
    savings: opp.impact === "high" ? 1000 : opp.impact === "medium" ? 500 : 100,
    priority: opp.impact,
  }));
}
