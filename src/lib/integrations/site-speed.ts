/**
 * Site Speed & Core Web Vitals Monitor
 * Uses PageSpeed Insights API
 */

export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint (ms)
  fid: number; // First Input Delay (ms)
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint (ms)
  ttfb: number; // Time to First Byte (ms)
}

export interface SpeedMetrics {
  performanceScore: number;
  coreWebVitals: CoreWebVitals;
  speedIndex: number;
  totalBlockingTime: number;
  opportunities: SpeedOpportunity[];
  diagnostics: SpeedDiagnostic[];
}

export interface SpeedOpportunity {
  id: string;
  title: string;
  description: string;
  savings: string;
  impact: "high" | "medium" | "low";
}

export interface SpeedDiagnostic {
  id: string;
  title: string;
  description: string;
  displayValue?: string;
}

const PSI_API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export class SiteSpeedMonitor {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || "";
  }

  async analyzeUrl(
    url: string,
    device: "mobile" | "desktop" = "mobile"
  ): Promise<SpeedMetrics> {
    // If no API key, return simulated data
    if (!this.apiKey) {
      return this.simulateSpeedMetrics(url, device);
    }

    const params = new URLSearchParams({
      url,
      key: this.apiKey,
      strategy: device,
      category: "performance",
    });

    const response = await fetch(`${PSI_API_BASE}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`PageSpeed API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parsePageSpeedResponse(data);
  }

  private parsePageSpeedResponse(data: Record<string, unknown>): SpeedMetrics {
    const lighthouse = data.lighthouseResult as Record<string, unknown>;
    const audits = lighthouse?.audits as Record<string, Record<string, unknown>>;
    const categories = lighthouse?.categories as Record<string, { score: number }>;

    const getMetricValue = (auditId: string): number => {
      const audit = audits?.[auditId];
      return (audit?.numericValue as number) || 0;
    };

    const opportunities: SpeedOpportunity[] = [];
    const diagnostics: SpeedDiagnostic[] = [];

    // Parse opportunities
    const opportunityAudits = [
      "render-blocking-resources",
      "unused-css-rules",
      "unused-javascript",
      "modern-image-formats",
      "offscreen-images",
      "unminified-css",
      "unminified-javascript",
      "efficient-animated-content",
    ];

    for (const auditId of opportunityAudits) {
      const audit = audits?.[auditId];
      if (audit && (audit.score as number) < 1) {
        const savings = audit.numericValue
          ? `${Math.round((audit.numericValue as number) / 1000)}s`
          : "";
        opportunities.push({
          id: auditId,
          title: (audit.title as string) || auditId,
          description: (audit.description as string) || "",
          savings,
          impact: (audit.score as number) < 0.5 ? "high" : (audit.score as number) < 0.9 ? "medium" : "low",
        });
      }
    }

    // Parse diagnostics
    const diagnosticAudits = [
      "dom-size",
      "critical-request-chains",
      "font-display",
      "uses-passive-event-listeners",
      "no-document-write",
    ];

    for (const auditId of diagnosticAudits) {
      const audit = audits?.[auditId];
      if (audit) {
        diagnostics.push({
          id: auditId,
          title: (audit.title as string) || auditId,
          description: (audit.description as string) || "",
          displayValue: audit.displayValue as string,
        });
      }
    }

    return {
      performanceScore: Math.round((categories?.performance?.score || 0) * 100),
      coreWebVitals: {
        lcp: Math.round(getMetricValue("largest-contentful-paint")),
        fid: Math.round(getMetricValue("max-potential-fid")),
        cls: parseFloat((getMetricValue("cumulative-layout-shift") || 0).toFixed(3)),
        fcp: Math.round(getMetricValue("first-contentful-paint")),
        ttfb: Math.round(getMetricValue("server-response-time")),
      },
      speedIndex: Math.round(getMetricValue("speed-index")),
      totalBlockingTime: Math.round(getMetricValue("total-blocking-time")),
      opportunities,
      diagnostics,
    };
  }

  private simulateSpeedMetrics(url: string, device: string): SpeedMetrics {
    const isMobile = device === "mobile";
    const baseScore = Math.floor(Math.random() * 30) + 55;

    return {
      performanceScore: isMobile ? baseScore : baseScore + 15,
      coreWebVitals: {
        lcp: isMobile ? 2800 + Math.random() * 1500 : 1800 + Math.random() * 800,
        fid: isMobile ? 150 + Math.random() * 100 : 50 + Math.random() * 50,
        cls: parseFloat((Math.random() * 0.15 + 0.05).toFixed(3)),
        fcp: isMobile ? 1800 + Math.random() * 1000 : 1200 + Math.random() * 600,
        ttfb: 400 + Math.random() * 300,
      },
      speedIndex: isMobile ? 4500 + Math.random() * 2000 : 2500 + Math.random() * 1000,
      totalBlockingTime: isMobile ? 350 + Math.random() * 200 : 150 + Math.random() * 100,
      opportunities: [
        {
          id: "render-blocking-resources",
          title: "Eliminate render-blocking resources",
          description: "Resources are blocking the first paint of your page.",
          savings: "1.2s",
          impact: "high",
        },
        {
          id: "unused-css-rules",
          title: "Reduce unused CSS",
          description: "Reduce unused rules from stylesheets.",
          savings: "0.8s",
          impact: "medium",
        },
        {
          id: "modern-image-formats",
          title: "Serve images in next-gen formats",
          description: "Use WebP or AVIF for better compression.",
          savings: "0.5s",
          impact: "medium",
        },
        {
          id: "offscreen-images",
          title: "Defer offscreen images",
          description: "Lazy-load offscreen images after critical resources.",
          savings: "0.3s",
          impact: "low",
        },
      ],
      diagnostics: [
        {
          id: "dom-size",
          title: "Avoid an excessive DOM size",
          description: "A large DOM can increase memory and processing time.",
          displayValue: "1,245 elements",
        },
        {
          id: "font-display",
          title: "Ensure text remains visible during webfont load",
          description: "Use font-display CSS property.",
        },
      ],
    };
  }

  // Get score grade
  getScoreGrade(score: number): { grade: string; color: string } {
    if (score >= 90) return { grade: "A", color: "green" };
    if (score >= 80) return { grade: "B", color: "lime" };
    if (score >= 70) return { grade: "C", color: "yellow" };
    if (score >= 50) return { grade: "D", color: "orange" };
    return { grade: "F", color: "red" };
  }

  // Get Core Web Vitals status
  getCWVStatus(vitals: CoreWebVitals): {
    lcp: "good" | "needs-improvement" | "poor";
    fid: "good" | "needs-improvement" | "poor";
    cls: "good" | "needs-improvement" | "poor";
  } {
    return {
      lcp: vitals.lcp <= 2500 ? "good" : vitals.lcp <= 4000 ? "needs-improvement" : "poor",
      fid: vitals.fid <= 100 ? "good" : vitals.fid <= 300 ? "needs-improvement" : "poor",
      cls: vitals.cls <= 0.1 ? "good" : vitals.cls <= 0.25 ? "needs-improvement" : "poor",
    };
  }
}

// Singleton
let speedMonitor: SiteSpeedMonitor | null = null;

export function getSiteSpeedMonitor(): SiteSpeedMonitor {
  if (!speedMonitor) {
    speedMonitor = new SiteSpeedMonitor();
  }
  return speedMonitor;
}
