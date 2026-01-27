/**
 * Core Web Vitals Monitoring
 * Track and analyze Core Web Vitals for SEO performance
 */

export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint (ms)
  fid: number; // First Input Delay (ms)
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte (ms)
  fcp: number; // First Contentful Paint (ms)
  inp?: number; // Interaction to Next Paint (ms)
}

export interface CoreWebVitalsScore {
  vitals: CoreWebVitals;
  scores: {
    lcp: "good" | "needs-improvement" | "poor";
    fid: "good" | "needs-improvement" | "poor";
    cls: "good" | "needs-improvement" | "poor";
    overall: "good" | "needs-improvement" | "poor";
  };
  recommendations: string[];
  performanceScore: number;
}

// Thresholds based on Google's Core Web Vitals guidelines
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
  fcp: { good: 1800, poor: 3000 },
  inp: { good: 200, poor: 500 },
};

export function evaluateWebVitals(vitals: CoreWebVitals): CoreWebVitalsScore {
  const scores = {
    lcp: evaluateMetric(vitals.lcp, THRESHOLDS.lcp),
    fid: evaluateMetric(vitals.fid, THRESHOLDS.fid),
    cls: evaluateMetric(vitals.cls, THRESHOLDS.cls),
    overall: "good" as "good" | "needs-improvement" | "poor",
  };

  // Overall is poor if any are poor
  if (scores.lcp === "poor" || scores.fid === "poor" || scores.cls === "poor") {
    scores.overall = "poor";
  } else if (scores.lcp === "needs-improvement" || scores.fid === "needs-improvement" || scores.cls === "needs-improvement") {
    scores.overall = "needs-improvement";
  }

  const recommendations: string[] = [];

  // LCP recommendations
  if (scores.lcp === "poor") {
    recommendations.push("LCP is poor (>4s): Optimize largest image, enable lazy loading, use CDN");
  } else if (scores.lcp === "needs-improvement") {
    recommendations.push("LCP needs improvement (2.5-4s): Preload critical resources, optimize server response time");
  }

  // FID recommendations
  if (scores.fid === "poor") {
    recommendations.push("FID is poor (>300ms): Reduce JavaScript execution time, break up long tasks");
  } else if (scores.fid === "needs-improvement") {
    recommendations.push("FID needs improvement (100-300ms): Defer non-critical JavaScript, use code splitting");
  }

  // CLS recommendations
  if (scores.cls === "poor") {
    recommendations.push("CLS is poor (>0.25): Set image dimensions, avoid injecting content, use transform instead of layout properties");
  } else if (scores.cls === "needs-improvement") {
    recommendations.push("CLS needs improvement (0.1-0.25): Reserve space for ads/embeds, use CSS aspect-ratio");
  }

  // TTFB recommendations
  if (vitals.ttfb > THRESHOLDS.ttfb.poor) {
    recommendations.push("TTFB is slow (>1800ms): Use caching, optimize database queries, upgrade hosting");
  }

  // Calculate performance score (0-100)
  const lcpScore = Math.max(0, 100 - (vitals.lcp / THRESHOLDS.lcp.poor) * 100);
  const fidScore = Math.max(0, 100 - (vitals.fid / THRESHOLDS.fid.poor) * 100);
  const clsScore = Math.max(0, 100 - (vitals.cls / THRESHOLDS.cls.poor) * 100);
  const performanceScore = Math.round((lcpScore + fidScore + clsScore) / 3);

  return {
    vitals,
    scores,
    recommendations,
    performanceScore,
  };
}

function evaluateMetric(
  value: number,
  threshold: { good: number; poor: number }
): "good" | "needs-improvement" | "poor" {
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

// Fetch Core Web Vitals using PageSpeed Insights API
export async function fetchCoreWebVitals(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
  apiKey?: string
): Promise<CoreWebVitals | null> {
  if (!apiKey) {
    return null;
  }

  try {
    const endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
    const params = new URLSearchParams({
      url,
      strategy,
      category: "PERFORMANCE",
      key: apiKey,
    });

    const response = await fetch(`${endpoint}?${params}`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const audits = data.lighthouseResult?.audits;

    if (!audits) {
      return null;
    }

    return {
      lcp: audits["largest-contentful-paint"]?.numericValue || 0,
      fid: audits["max-potential-fid"]?.numericValue || 0,
      cls: audits["cumulative-layout-shift"]?.numericValue || 0,
      ttfb: audits["server-response-time"]?.numericValue || 0,
      fcp: audits["first-contentful-paint"]?.numericValue || 0,
      inp: audits["experimental-interaction-to-next-paint"]?.numericValue,
    };
  } catch (error) {
    console.error("Core Web Vitals fetch error:", error);
    return null;
  }
}

// Get optimization opportunities from PageSpeed Insights
export async function getPerformanceOpportunities(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
  apiKey?: string
): Promise<Array<{
  title: string;
  description: string;
  savings: number; // ms saved
  priority: "high" | "medium" | "low";
}>> {
  if (!apiKey) {
    return [];
  }

  try {
    const endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
    const params = new URLSearchParams({
      url,
      strategy,
      category: "PERFORMANCE",
      key: apiKey,
    });

    const response = await fetch(`${endpoint}?${params}`);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const opportunities = data.lighthouseResult?.audits || {};

    const results: Array<{
      title: string;
      description: string;
      savings: number;
      priority: "high" | "medium" | "low";
    }> = [];

    // Key opportunities
    const keyOpportunities = [
      "render-blocking-resources",
      "uses-optimized-images",
      "offscreen-images",
      "unminified-css",
      "unminified-javascript",
      "unused-css-rules",
      "modern-image-formats",
      "uses-text-compression",
      "efficient-animated-content",
      "dom-size",
    ];

    for (const key of keyOpportunities) {
      const audit = opportunities[key];
      
      if (audit && audit.numericValue && audit.numericValue > 100) {
        results.push({
          title: audit.title,
          description: audit.description,
          savings: Math.round(audit.numericValue),
          priority: audit.numericValue > 1000 ? "high" : audit.numericValue > 500 ? "medium" : "low",
        });
      }
    }

    results.sort((a, b) => b.savings - a.savings);

    return results;
  } catch (error) {
    console.error("Performance opportunities fetch error:", error);
    return [];
  }
}
