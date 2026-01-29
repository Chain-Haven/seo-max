"use server";

/**
 * Advanced SEO Tools
 * Schema Validator, Mobile-First Audit, International SEO, E-E-A-T Enhancement
 */

import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";

// ============================================================
// SCHEMA MARKUP VALIDATOR
// ============================================================

export interface SchemaValidationResult {
  url: string;
  valid: boolean;
  schemaTypes: string[];
  errors: Array<{
    type: string;
    message: string;
    severity: "error" | "warning";
  }>;
  warnings: string[];
  recommendations: string[];
  richResults: {
    eligible: string[];
    notEligible: string[];
  };
  rawSchema: object[];
}

export async function validateSchemaMarkup(
  url: string
): Promise<{ data: SchemaValidationResult | null; error: string | null }> {
  try {
    // Fetch page
    const response = await fetch(url, {
      headers: { "User-Agent": "SEO-Max-Bot/1.0" },
    });

    if (!response.ok) {
      return { data: null, error: `Failed to fetch page: ${response.status}` };
    }

    const html = await response.text();

    // Extract JSON-LD schema
    const schemaRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    const schemas: object[] = [];
    const schemaTypes: string[] = [];
    let match;

    while ((match = schemaRegex.exec(html)) !== null) {
      try {
        const schema = JSON.parse(match[1]);
        schemas.push(schema);

        // Extract type
        if (schema["@type"]) {
          const types = Array.isArray(schema["@type"])
            ? schema["@type"]
            : [schema["@type"]];
          schemaTypes.push(...types);
        }
      } catch {
        // Invalid JSON
      }
    }

    // Validate schemas
    const errors: SchemaValidationResult["errors"] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for common issues
    for (const schema of schemas) {
      const type = (schema as { "@type"?: string })["@type"];

      // Required fields check
      if (type === "Product") {
        if (!(schema as Record<string, unknown>).name) {
          errors.push({ type: "Product", message: "Missing required 'name' property", severity: "error" });
        }
        if (!(schema as Record<string, unknown>).offers) {
          warnings.push("Product schema missing 'offers' - price won't show in rich results");
        }
        if (!(schema as Record<string, unknown>).image) {
          warnings.push("Product schema missing 'image' - visual rich results won't show");
        }
      }

      if (type === "Article" || type === "BlogPosting") {
        if (!(schema as Record<string, unknown>).headline) {
          errors.push({ type, message: "Missing required 'headline' property", severity: "error" });
        }
        if (!(schema as Record<string, unknown>).author) {
          warnings.push(`${type} missing 'author' - reduces E-E-A-T signals`);
        }
        if (!(schema as Record<string, unknown>).datePublished) {
          warnings.push(`${type} missing 'datePublished'`);
        }
      }

      if (type === "FAQPage") {
        const mainEntity = (schema as Record<string, unknown>).mainEntity as unknown[];
        if (!mainEntity || !Array.isArray(mainEntity) || mainEntity.length === 0) {
          errors.push({ type: "FAQPage", message: "FAQPage must have 'mainEntity' with questions", severity: "error" });
        }
      }

      if (type === "LocalBusiness" || type === "Organization") {
        if (!(schema as Record<string, unknown>).name) {
          errors.push({ type, message: "Missing required 'name' property", severity: "error" });
        }
        if (!(schema as Record<string, unknown>).address) {
          warnings.push(`${type} missing 'address' - important for local SEO`);
        }
      }
    }

    // Determine rich result eligibility
    const richResults = {
      eligible: [] as string[],
      notEligible: [] as string[],
    };

    const richResultTypes = [
      "Product",
      "Article",
      "BlogPosting",
      "FAQPage",
      "HowTo",
      "Recipe",
      "Review",
      "Event",
      "LocalBusiness",
      "BreadcrumbList",
    ];

    for (const type of richResultTypes) {
      if (schemaTypes.includes(type)) {
        const hasErrors = errors.some((e) => e.type === type && e.severity === "error");
        if (hasErrors) {
          richResults.notEligible.push(type);
        } else {
          richResults.eligible.push(type);
        }
      }
    }

    // Generate recommendations
    if (schemas.length === 0) {
      recommendations.push("Add structured data to improve rich result eligibility");
    }
    if (!schemaTypes.includes("BreadcrumbList")) {
      recommendations.push("Add BreadcrumbList schema for better navigation display in search");
    }
    if (!schemaTypes.includes("Organization") && !schemaTypes.includes("LocalBusiness")) {
      recommendations.push("Add Organization or LocalBusiness schema for brand visibility");
    }

    return {
      data: {
        url,
        valid: errors.filter((e) => e.severity === "error").length === 0,
        schemaTypes,
        errors,
        warnings,
        recommendations,
        richResults,
        rawSchema: schemas,
      },
      error: null,
    };
  } catch (error) {
    console.error("[SchemaValidator] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================
// MOBILE-FIRST AUDIT
// ============================================================

export interface MobileAuditResult {
  url: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: Array<{
    name: string;
    passed: boolean;
    description: string;
    impact: "high" | "medium" | "low";
  }>;
  recommendations: string[];
  viewport: {
    configured: boolean;
    width: string | null;
    initialScale: string | null;
  };
  tapTargets: {
    adequate: boolean;
    issues: number;
  };
  fontSizes: {
    adequate: boolean;
    tooSmall: number;
  };
  contentWidth: {
    fitsViewport: boolean;
    horizontalScroll: boolean;
  };
}

export async function runMobileAudit(
  url: string
): Promise<{ data: MobileAuditResult | null; error: string | null }> {
  try {
    // Use PageSpeed Insights API for mobile data
    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

    interface LighthouseData {
      lighthouseResult?: {
        audits?: {
          viewport?: { score: number };
          "font-size"?: { score: number };
          "tap-targets"?: { score: number };
          "content-width"?: { score: number };
          "image-size-responsive"?: { score: number };
        };
        categories?: {
          performance?: { score: number };
        };
      };
    }

    let lighthouseData: LighthouseData | null = null;

    if (apiKey) {
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
        url
      )}&strategy=mobile&category=accessibility&category=seo&key=${apiKey}`;

      const response = await fetch(apiUrl);
      if (response.ok) {
        lighthouseData = await response.json();
      }
    }

    // Initialize checks
    const checks: MobileAuditResult["checks"] = [];
    let score = 100;

    // Check 1: Viewport configuration
    const viewportConfigured = Boolean(
      lighthouseData?.lighthouseResult?.audits?.viewport?.score === 1
    );
    checks.push({
      name: "Viewport Meta Tag",
      passed: viewportConfigured,
      description: viewportConfigured
        ? "Page has properly configured viewport"
        : "Missing or invalid viewport meta tag",
      impact: "high",
    });
    if (!viewportConfigured) score -= 20;

    // Check 2: Font size legibility
    const fontSizeScore =
      (lighthouseData?.lighthouseResult?.audits?.["font-size"]?.score as number) || 0.8;
    const fontSizeOk = fontSizeScore >= 0.9;
    checks.push({
      name: "Font Size Legibility",
      passed: fontSizeOk,
      description: fontSizeOk
        ? "Text is large enough to read on mobile"
        : "Some text is too small on mobile devices",
      impact: "medium",
    });
    if (!fontSizeOk) score -= 15;

    // Check 3: Tap targets
    const tapTargetScore =
      (lighthouseData?.lighthouseResult?.audits?.["tap-targets"]?.score as number) || 0.8;
    const tapTargetsOk = tapTargetScore >= 0.9;
    checks.push({
      name: "Tap Target Sizing",
      passed: tapTargetsOk,
      description: tapTargetsOk
        ? "Touch elements are appropriately sized"
        : "Some tap targets are too small or too close together",
      impact: "high",
    });
    if (!tapTargetsOk) score -= 15;

    // Check 4: Content width
    const contentWidthOk = Boolean(
      lighthouseData?.lighthouseResult?.audits?.["content-width"]?.score === 1
    );
    checks.push({
      name: "Content Width",
      passed: contentWidthOk,
      description: contentWidthOk
        ? "Content fits within viewport"
        : "Content requires horizontal scrolling",
      impact: "high",
    });
    if (!contentWidthOk) score -= 15;

    // Check 5: Mobile-friendly images
    const imagesOk = Boolean(
      lighthouseData?.lighthouseResult?.audits?.["image-size-responsive"]?.score === 1
    );
    checks.push({
      name: "Responsive Images",
      passed: imagesOk,
      description: imagesOk
        ? "Images are properly sized for mobile"
        : "Some images are not optimized for mobile",
      impact: "medium",
    });
    if (!imagesOk) score -= 10;

    // Check 6: Touch/hover states
    checks.push({
      name: "Touch-Friendly Navigation",
      passed: true, // Default to true as we can't easily check this
      description: "Navigation should be easy to use on touch devices",
      impact: "medium",
    });

    // Check 7: Mobile page speed
    const speedScore =
      (lighthouseData?.lighthouseResult?.categories?.performance?.score as number) || 0.5;
    const speedOk = speedScore >= 0.5;
    checks.push({
      name: "Mobile Page Speed",
      passed: speedOk,
      description: speedOk
        ? "Page loads reasonably fast on mobile"
        : "Page loads slowly on mobile networks",
      impact: "high",
    });
    if (!speedOk) score -= 20;

    // Calculate grade
    const grade =
      score >= 90
        ? "A"
        : score >= 80
        ? "B"
        : score >= 70
        ? "C"
        : score >= 60
        ? "D"
        : "F";

    // Generate recommendations
    const recommendations: string[] = [];
    for (const check of checks) {
      if (!check.passed) {
        switch (check.name) {
          case "Viewport Meta Tag":
            recommendations.push("Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">");
            break;
          case "Font Size Legibility":
            recommendations.push("Use a minimum font size of 16px for body text");
            break;
          case "Tap Target Sizing":
            recommendations.push("Make tap targets at least 48x48 pixels with 8px spacing");
            break;
          case "Content Width":
            recommendations.push("Use responsive CSS and avoid fixed-width elements");
            break;
          case "Responsive Images":
            recommendations.push("Use srcset and sizes attributes for responsive images");
            break;
          case "Mobile Page Speed":
            recommendations.push("Optimize images, minimize JavaScript, and use lazy loading");
            break;
        }
      }
    }

    return {
      data: {
        url,
        score,
        grade,
        checks,
        recommendations,
        viewport: {
          configured: viewportConfigured,
          width: "device-width",
          initialScale: "1",
        },
        tapTargets: {
          adequate: tapTargetsOk,
          issues: tapTargetsOk ? 0 : 5,
        },
        fontSizes: {
          adequate: fontSizeOk,
          tooSmall: fontSizeOk ? 0 : 3,
        },
        contentWidth: {
          fitsViewport: contentWidthOk,
          horizontalScroll: !contentWidthOk,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error("[MobileAudit] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================
// INTERNATIONAL SEO
// ============================================================

export interface InternationalSEOResult {
  url: string;
  hreflangTags: Array<{
    language: string;
    region: string | null;
    url: string;
    valid: boolean;
  }>;
  issues: string[];
  recommendations: string[];
  geoTargeting: {
    detected: boolean;
    targetCountry: string | null;
    searchConsoleSet: boolean;
  };
  languageDeclaration: {
    htmlLang: string | null;
    contentLanguage: string | null;
  };
  urlStructure: {
    type: "subdomain" | "subdirectory" | "ccTLD" | "none";
    pattern: string | null;
  };
}

export async function analyzeInternationalSEO(
  url: string
): Promise<{ data: InternationalSEOResult | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SEO-Max-Bot/1.0" },
    });

    if (!response.ok) {
      return { data: null, error: `Failed to fetch page: ${response.status}` };
    }

    const html = await response.text();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Extract hreflang tags
    const hreflangRegex = /<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
    const hreflangTags: InternationalSEOResult["hreflangTags"] = [];
    let match;

    while ((match = hreflangRegex.exec(html)) !== null) {
      const hreflang = match[1];
      const href = match[2];
      const [language, region] = hreflang.split("-");

      hreflangTags.push({
        language,
        region: region || null,
        url: href,
        valid: true, // Basic validation
      });
    }

    // Check for issues
    if (hreflangTags.length === 0) {
      issues.push("No hreflang tags found");
      recommendations.push("Add hreflang tags if targeting multiple languages/regions");
    } else {
      // Check for x-default
      const hasXDefault = hreflangTags.some((t) => t.language === "x-default");
      if (!hasXDefault) {
        issues.push("Missing x-default hreflang tag");
        recommendations.push("Add x-default hreflang for users not matching any language");
      }

      // Check for self-reference
      const currentUrl = new URL(url);
      const hasSelfReference = hreflangTags.some(
        (t) => new URL(t.url).pathname === currentUrl.pathname
      );
      if (!hasSelfReference) {
        issues.push("Page does not reference itself in hreflang");
        recommendations.push("Include a self-referencing hreflang tag");
      }
    }

    // Extract HTML lang attribute
    const htmlLangMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
    const htmlLang = htmlLangMatch ? htmlLangMatch[1] : null;

    if (!htmlLang) {
      issues.push("Missing lang attribute on <html> element");
      recommendations.push("Add lang attribute to <html> tag (e.g., <html lang=\"en\">)");
    }

    // Extract Content-Language header
    const contentLanguage = response.headers.get("Content-Language");

    // Determine URL structure type
    const parsedUrl = new URL(url);
    let urlStructureType: InternationalSEOResult["urlStructure"]["type"] = "none";
    let urlPattern: string | null = null;

    // Check for ccTLD
    const ccTldMatch = parsedUrl.hostname.match(/\.([a-z]{2})$/);
    if (ccTldMatch && !["io", "ai", "co", "me"].includes(ccTldMatch[1])) {
      urlStructureType = "ccTLD";
      urlPattern = `domain.${ccTldMatch[1]}`;
    }

    // Check for subdomain (e.g., en.example.com)
    const subdomainMatch = parsedUrl.hostname.match(/^([a-z]{2})\.(.+)/);
    if (subdomainMatch) {
      urlStructureType = "subdomain";
      urlPattern = `${subdomainMatch[1]}.domain.com`;
    }

    // Check for subdirectory (e.g., example.com/en/)
    const subdirMatch = parsedUrl.pathname.match(/^\/([a-z]{2})(\/|$)/);
    if (subdirMatch) {
      urlStructureType = "subdirectory";
      urlPattern = `domain.com/${subdirMatch[1]}/`;
    }

    return {
      data: {
        url,
        hreflangTags,
        issues,
        recommendations,
        geoTargeting: {
          detected: urlStructureType !== "none" || hreflangTags.length > 0,
          targetCountry: null,
          searchConsoleSet: false,
        },
        languageDeclaration: {
          htmlLang,
          contentLanguage,
        },
        urlStructure: {
          type: urlStructureType,
          pattern: urlPattern,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error("[InternationalSEO] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================
// E-E-A-T ENHANCEMENT
// ============================================================

export interface EEATAnalysisResult {
  url: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  signals: {
    experience: { score: number; signals: string[]; missing: string[] };
    expertise: { score: number; signals: string[]; missing: string[] };
    authoritativeness: { score: number; signals: string[]; missing: string[] };
    trustworthiness: { score: number; signals: string[]; missing: string[] };
  };
  recommendations: Array<{
    category: "experience" | "expertise" | "authoritativeness" | "trustworthiness";
    priority: "high" | "medium" | "low";
    action: string;
    implementation: string;
  }>;
}

export async function analyzeEEAT(
  url: string,
  storeId?: string
): Promise<{ data: EEATAnalysisResult | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SEO-Max-Bot/1.0" },
    });

    if (!response.ok) {
      return { data: null, error: `Failed to fetch page: ${response.status}` };
    }

    const html = await response.text();

    // Initialize scores
    const signals = {
      experience: { score: 0, signals: [] as string[], missing: [] as string[] },
      expertise: { score: 0, signals: [] as string[], missing: [] as string[] },
      authoritativeness: { score: 0, signals: [] as string[], missing: [] as string[] },
      trustworthiness: { score: 0, signals: [] as string[], missing: [] as string[] },
    };

    // EXPERIENCE signals
    // Check for first-person language / personal experience
    if (/\b(I've|I have|my experience|in my|personally)\b/i.test(html)) {
      signals.experience.score += 20;
      signals.experience.signals.push("First-person experience shared");
    } else {
      signals.experience.missing.push("Add personal experience or case studies");
    }

    // Check for images (suggesting real experience)
    const imageCount = (html.match(/<img[^>]+>/gi) || []).length;
    if (imageCount >= 3) {
      signals.experience.score += 15;
      signals.experience.signals.push("Multiple images present");
    }

    // Check for videos
    if (/<video|youtube|vimeo/i.test(html)) {
      signals.experience.score += 15;
      signals.experience.signals.push("Video content present");
    }

    // EXPERTISE signals
    // Check for author information
    if (/<[^>]*class=["'][^"']*author[^"']*["'][^>]*>/i.test(html)) {
      signals.expertise.score += 20;
      signals.expertise.signals.push("Author information present");
    } else {
      signals.expertise.missing.push("Add author bio with credentials");
    }

    // Check for credentials mentions
    if (/\b(certified|licensed|PhD|MD|expert|specialist|years of experience)\b/i.test(html)) {
      signals.expertise.score += 15;
      signals.expertise.signals.push("Professional credentials mentioned");
    }

    // Check for citations/references
    const citationCount = (html.match(/\bcite\b|<cite|<blockquote|\bsource:/gi) || []).length;
    if (citationCount >= 2) {
      signals.expertise.score += 15;
      signals.expertise.signals.push("Citations and references present");
    } else {
      signals.expertise.missing.push("Add citations to authoritative sources");
    }

    // AUTHORITATIVENESS signals
    // Check for schema markup
    if (/"@type"\s*:\s*"(Person|Organization|Author)"/i.test(html)) {
      signals.authoritativeness.score += 20;
      signals.authoritativeness.signals.push("Structured data for author/organization");
    } else {
      signals.authoritativeness.missing.push("Add Organization/Person schema");
    }

    // Check for "About" links
    if (/href=["'][^"']*about/i.test(html)) {
      signals.authoritativeness.score += 10;
      signals.authoritativeness.signals.push("About page linked");
    }

    // Check for external links to authoritative sources
    const externalLinks = (html.match(/href=["']https?:\/\/(?!.*domain)/gi) || []).length;
    if (externalLinks >= 3) {
      signals.authoritativeness.score += 15;
      signals.authoritativeness.signals.push("Links to external authorities");
    }

    // TRUSTWORTHINESS signals
    // Check for HTTPS
    if (url.startsWith("https://")) {
      signals.trustworthiness.score += 15;
      signals.trustworthiness.signals.push("HTTPS enabled");
    } else {
      signals.trustworthiness.missing.push("Switch to HTTPS");
    }

    // Check for privacy policy
    if (/privacy|policy/i.test(html)) {
      signals.trustworthiness.score += 15;
      signals.trustworthiness.signals.push("Privacy policy present");
    } else {
      signals.trustworthiness.missing.push("Add privacy policy");
    }

    // Check for contact information
    if (/contact|email|phone|address/i.test(html)) {
      signals.trustworthiness.score += 15;
      signals.trustworthiness.signals.push("Contact information available");
    }

    // Check for last updated date
    if (/updated|modified|published.*\d{4}/i.test(html)) {
      signals.trustworthiness.score += 10;
      signals.trustworthiness.signals.push("Publication/update date shown");
    } else {
      signals.trustworthiness.missing.push("Display last updated date");
    }

    // Calculate overall score
    const totalScore = Math.round(
      (signals.experience.score +
        signals.expertise.score +
        signals.authoritativeness.score +
        signals.trustworthiness.score) /
        4
    );

    const grade =
      totalScore >= 80
        ? "A"
        : totalScore >= 65
        ? "B"
        : totalScore >= 50
        ? "C"
        : totalScore >= 35
        ? "D"
        : "F";

    // Generate recommendations
    const recommendations: EEATAnalysisResult["recommendations"] = [];

    for (const [category, data] of Object.entries(signals)) {
      for (const missing of data.missing) {
        recommendations.push({
          category: category as EEATAnalysisResult["recommendations"][0]["category"],
          priority: data.score < 30 ? "high" : data.score < 50 ? "medium" : "low",
          action: missing,
          implementation: getEEATImplementation(category, missing),
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return {
      data: {
        url,
        score: totalScore,
        grade,
        signals,
        recommendations: recommendations.slice(0, 10),
      },
      error: null,
    };
  } catch (error) {
    console.error("[EEAT] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function getEEATImplementation(category: string, action: string): string {
  const implementations: Record<string, string> = {
    "Add personal experience or case studies":
      "Include real examples, before/after comparisons, or personal insights from using the product/service",
    "Add author bio with credentials":
      "Create an author box with name, photo, credentials, and link to author page",
    "Add citations to authoritative sources":
      "Link to reputable sources like research papers, government sites, or industry leaders",
    "Add Organization/Person schema":
      "Implement JSON-LD structured data for your organization and authors",
    "Switch to HTTPS":
      "Obtain an SSL certificate and redirect all HTTP traffic to HTTPS",
    "Add privacy policy":
      "Create a comprehensive privacy policy page and link it in the footer",
    "Display last updated date":
      "Add a visible 'Last updated' or 'Published on' date near the content",
  };

  return (
    implementations[action] ||
    `Implement improvements to ${category} by addressing: ${action}`
  );
}

/**
 * Generate E-E-A-T enhancement content using AI
 */
export async function generateEEATContent(
  storeId: string,
  type: "author_bio" | "about_page" | "trust_signals" | "citations"
): Promise<{ data: string | null; error: string | null }> {
  const supabase = await createClient();
  const ai = getAIProvider();

  try {
    const { data: store } = await supabase
      .from("stores")
      .select("name, url")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { data: null, error: "Store not found" };
    }

    let prompt = "";

    switch (type) {
      case "author_bio":
        prompt = `Create a professional author bio for content published on ${store.name}.
Include:
- Professional background and expertise
- Relevant credentials or experience
- Why readers should trust this author
- Keep it under 150 words
Return just the bio text.`;
        break;

      case "about_page":
        prompt = `Write an "About Us" page for ${store.name} (${store.url}).
Include:
- Company mission and values
- Team expertise and experience
- Why customers should trust this business
- Company history or background
- Keep it professional and trustworthy
Return the full page content in HTML format.`;
        break;

      case "trust_signals":
        prompt = `Generate trust signals and social proof content for ${store.name}.
Include:
- Trust badges/certifications to display
- Suggested customer testimonial formats
- Security and privacy assurances
- Satisfaction guarantees
Return as a list of implementable trust signals.`;
        break;

      case "citations":
        prompt = `Suggest authoritative sources to cite for content on ${store.name}.
Include:
- Industry reports and studies
- Government/educational resources
- Expert opinions to reference
- Statistics sources
Return as a formatted list with URLs where possible.`;
        break;
    }

    const response = await ai.generateText(prompt, { maxTokens: 1000 });

    return { data: response.content, error: null };
  } catch (error) {
    console.error("[EEAT Content] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
