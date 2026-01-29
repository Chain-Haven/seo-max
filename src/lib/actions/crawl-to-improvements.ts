"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { detectDuplicateContent, detectKeywordCannibalization, detectOrphanPages, analyzeContentFreshness } from "@/lib/seo/content-analysis";
import { generateInternalLinkingSuggestions, checkBrokenLinks, analyzeExternalLinkQuality } from "@/lib/seo/link-optimization";
import { analyzeURL, validateSitemap } from "@/lib/seo/url-analysis";
import { getCoreWebVitals } from "@/lib/seo/core-web-vitals";
import { suggestKeywordsFromContent } from "@/lib/seo/auto-keywords";
import { detectRedirectChains } from "@/lib/seo/redirect-analysis";

const MIN_WORDS_FOR_PAGE = 300;
const MIN_WORDS_FOR_BLOG = 600;

/**
 * Generate comprehensive SEO improvements from completed crawl data.
 * Includes all new advanced analyses: duplicate content, keyword cannibalization,
 * Core Web Vitals, internal linking, broken links, URL analysis, etc.
 */
export async function generateImprovementsFromCrawl(
  storeId: string,
  crawlId: string
): Promise<{ count: number; error: string | null }> {
  const serviceClient = await createServiceClient();

  try {
    // Fetch all crawl data with new fields
    const { data: pages, error: fetchError } = await serviceClient
      .from("crawled_pages")
      .select("*")
      .eq("crawl_id", crawlId)
      .eq("store_id", storeId);

    if (fetchError || !pages?.length) {
      return { count: 0, error: fetchError?.message ?? "No crawl data" };
    }

    let inserted = 0;
    const seenKeys = new Set<string>();

    // Get store URL for Core Web Vitals and sitemap validation
    const { data: store } = await serviceClient
      .from("stores")
      .select("url")
      .eq("id", storeId)
      .single();

    const storeUrl = store?.url || "";
    const baseUrl = storeUrl.startsWith("http") ? storeUrl : `https://${storeUrl}`;

    // Advanced analyses (run once for all pages)
    const pageData = pages.map(p => ({
      url: p.url as string,
      title: (p.title as string) || null,
      metaDescription: p.meta_description as string | null,
      h1Tags: (p.h1_tags as string[]) || [],
      h2Tags: (p.h2_tags as string[]) || [],
      wordCount: (p.word_count as number) || 0,
      contentHash: (p.content_hash as string) || "",
      internalLinkUrls: (p.internal_link_urls as Array<{ url: string; anchorText: string }>) || [],
      externalLinkUrls: (p.external_link_urls as Array<{ url: string; anchorText: string; isNofollow: boolean }>) || [],
      imageDetails: (p.image_details as Array<{ url: string; alt: string | null; width: number | null; height: number | null; format: string | null; hasLazyLoading: boolean }>) || [],
      openGraph: (p.open_graph as { ogTitle: string | null; ogDescription: string | null; ogImage: string | null; ogType: string | null; ogUrl: string | null }) || { ogTitle: null, ogDescription: null, ogImage: null, ogType: null, ogUrl: null },
      schema: (p.schema_data as { types: string[]; hasProduct: boolean; hasFAQ: boolean; hasArticle: boolean; hasLocalBusiness: boolean; hasOrganization: boolean }) || { types: [], hasProduct: false, hasFAQ: false, hasArticle: false, hasLocalBusiness: false, hasOrganization: false },
      lastModified: (p.last_modified as string) || null,
      isHttps: (p.is_https as boolean) ?? true,
      hasMobileViewport: (p.has_mobile_viewport as boolean) ?? false,
      urlSlug: (p.url_slug as string) || "",
      urlDepth: (p.url_depth as number) || 0,
      hasAuthorInfo: (p.has_author_info as boolean) ?? false,
      hasDatePublished: (p.has_date_published as boolean) ?? false,
    }));

    // 1. Duplicate Content Detection
    const duplicates = await detectDuplicateContent(pageData);
    for (const dup of duplicates) {
      const key = `duplicate:${dup.url1}:${dup.url2}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        await serviceClient.from("seo_improvements").insert({
          store_id: storeId,
          improvement_type: "duplicate_content",
          entity_type: "crawled_page",
          entity_id: dup.url1,
          entity_title: dup.url1,
          current_value: { url1: dup.url1, url2: dup.url2, similarity: dup.similarity },
          suggested_value: { recommendation: `Content is ${dup.similarity}% similar to ${dup.url2}. ${dup.reason}. Consider consolidating or differentiating content.` },
          priority: dup.similarity > 90 ? "high" : "medium",
          impact_score: Math.min(90, dup.similarity),
          reason: dup.reason,
        });
        inserted++;
      }
    }

    // 2. Keyword Cannibalization
    const cannibalization = await detectKeywordCannibalization(pageData);
    for (const cannibal of cannibalization) {
      const key = `cannibalization:${cannibal.keyword}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        await serviceClient.from("seo_improvements").insert({
          store_id: storeId,
          improvement_type: "keyword_cannibalization",
          entity_type: "keyword",
          entity_id: cannibal.keyword,
          entity_title: cannibal.keyword,
          current_value: { keyword: cannibal.keyword, pages: cannibal.pages },
          suggested_value: { recommendation: cannibal.recommendation },
          priority: "high",
          impact_score: 75,
          reason: `Multiple pages targeting keyword "${cannibal.keyword}"`,
        });
        inserted++;
      }
    }

    // 3. Orphan Pages
    const allInternalLinks = pageData.map(p => p.internalLinkUrls);
    const orphanUrls = detectOrphanPages(pageData, allInternalLinks);
    for (const orphanUrl of orphanUrls) {
      const key = `orphan:${orphanUrl}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const page = pageData.find(p => p.url === orphanUrl);
        await serviceClient.from("seo_improvements").insert({
          store_id: storeId,
          improvement_type: "orphan_page",
          entity_type: "crawled_page",
          entity_id: orphanUrl,
          entity_title: page?.title || orphanUrl,
          current_value: { url: orphanUrl },
          suggested_value: { recommendation: "Add internal links to this page from other pages to improve discoverability and SEO." },
          priority: "medium",
          impact_score: 60,
          reason: "Page has no internal links pointing to it",
        });
        inserted++;
      }
    }

    // 4. Content Freshness
    const stalePages = analyzeContentFreshness(pageData);
    for (const stale of stalePages) {
      const key = `stale:${stale.url}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        await serviceClient.from("seo_improvements").insert({
          store_id: storeId,
          improvement_type: "stale_content",
          entity_type: "crawled_page",
          entity_id: stale.url,
          entity_title: stale.url,
          current_value: { url: stale.url, daysSinceUpdate: stale.daysSinceUpdate },
          suggested_value: { recommendation: stale.recommendation },
          priority: stale.daysSinceUpdate > 730 ? "high" : "medium",
          impact_score: Math.min(70, stale.daysSinceUpdate > 0 ? Math.round(stale.daysSinceUpdate / 10) : 50),
          reason: stale.recommendation,
        });
        inserted++;
      }
    }

    // 5. Internal Linking Suggestions
    const linkingSuggestions = await generateInternalLinkingSuggestions(pageData, 20);
    for (const suggestion of linkingSuggestions) {
      const key = `internal_link:${suggestion.sourceUrl}:${suggestion.targetUrl}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        await serviceClient.from("seo_improvements").insert({
          store_id: storeId,
          improvement_type: "internal_linking",
          entity_type: "crawled_page",
          entity_id: suggestion.sourceUrl,
          entity_title: suggestion.sourceUrl,
          current_value: { sourceUrl: suggestion.sourceUrl, targetUrl: suggestion.targetUrl },
          suggested_value: { recommendation: `Add internal link to "${suggestion.targetUrl}" with anchor text "${suggestion.anchorText}". ${suggestion.reason}` },
          priority: suggestion.relevanceScore > 70 ? "medium" : "low",
          impact_score: suggestion.relevanceScore,
          reason: suggestion.reason,
        });
        inserted++;
      }
    }

    // 6. Broken External Links (sample check - limit to avoid rate limiting)
    const allExternalLinks = pageData.flatMap(p => 
      p.externalLinkUrls.map(link => ({ url: link.url, anchorText: link.anchorText, sourceUrl: p.url }))
    );
    const brokenLinks = await checkBrokenLinks(allExternalLinks, 30);
    for (const broken of brokenLinks) {
      const key = `broken_link:${broken.url}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        await serviceClient.from("seo_improvements").insert({
          store_id: storeId,
          improvement_type: "broken_external_link",
          entity_type: "crawled_page",
          entity_id: broken.url,
          entity_title: broken.url,
          current_value: { url: broken.url, brokenLink: broken.brokenLink, statusCode: broken.statusCode },
          suggested_value: { recommendation: `Fix or remove broken link: ${broken.brokenLink} (Status: ${broken.statusCode || "unreachable"})` },
          priority: "high",
          impact_score: 80,
          reason: `Broken external link found: ${broken.brokenLink}`,
        });
        inserted++;
      }
    }

    // 7. External Link Quality
    const linkQualityIssues = analyzeExternalLinkQuality(
      pageData.flatMap(p => p.externalLinkUrls.map(link => ({
        url: link.url,
        anchorText: link.anchorText || "",
        isNofollow: link.isNofollow || false,
      })))
    );
    for (const issue of linkQualityIssues) {
      const key = `link_quality:${issue.url}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        await serviceClient.from("seo_improvements").insert({
          store_id: storeId,
          improvement_type: "external_link_quality",
          entity_type: "crawled_page",
          entity_id: issue.url,
          entity_title: issue.url,
          current_value: { url: issue.url, issue: issue.issue },
          suggested_value: { recommendation: issue.issue },
          priority: issue.severity,
          impact_score: issue.severity === "high" ? 70 : issue.severity === "medium" ? 50 : 30,
          reason: issue.issue,
        });
        inserted++;
      }
    }

    // 7.5. Redirect Chain Detection (check pages with redirect issues)
    const redirectPages = pageData.filter(p => 
      p.url && (p as any).issues?.some((i: any) => i.type === "redirect")
    );
    if (redirectPages.length > 0) {
      const redirectUrls = redirectPages.map(p => p.url).slice(0, 10); // Limit to 10
      const chains = await detectRedirectChains(redirectUrls);
      for (const chain of chains) {
        if (chain.isTooLong) {
          const key = `redirect_chain:${chain.startUrl}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            await serviceClient.from("seo_improvements").insert({
              store_id: storeId,
              improvement_type: "redirect_chain",
              entity_type: "crawled_page",
              entity_id: chain.startUrl,
              entity_title: chain.startUrl,
              current_value: { startUrl: chain.startUrl, finalUrl: chain.finalUrl, chainLength: chain.length },
              suggested_value: { recommendation: `Redirect chain is ${chain.length} hops long (recommended: <3). Update to redirect directly to final URL: ${chain.finalUrl}` },
              priority: "high",
              impact_score: 75,
              reason: `Redirect chain: ${chain.startUrl} → ${chain.finalUrl} (${chain.length} hops)`,
            });
            inserted++;
          }
        }
      }
    }

    // Per-page improvements
    for (const page of pages) {
      const issues = (page.issues as Array<{ type: string; severity: string; message: string }>) || [];
      const url = page.url as string;
      const title = (page.title as string) || "";
      const metaDesc = page.meta_description as string | null;
      const wordCount = (page.word_count as number) || 0;
      const h1Tags = (page.h1_tags as string[]) || [];
      const imagesMissingAlt = (page.images_missing_alt as number) || 0;
      const hasNoindex = Boolean(page.has_robots_noindex);
      const openGraph = (page.open_graph as { ogTitle: string | null; ogDescription: string | null; ogImage: string | null }) || { ogTitle: null, ogDescription: null, ogImage: null };
      const schema = (page.schema_data as { types: string[]; hasProduct: boolean; hasFAQ: boolean; hasArticle: boolean }) || { types: [], hasProduct: false, hasFAQ: false, hasArticle: false };
      const imageDetails = (page.image_details as Array<{ url: string; format: string | null; hasLazyLoading: boolean; width: number | null; height: number | null }>) || [];
      const isHttps = (page.is_https as boolean) ?? true;
      const hasMobileViewport = (page.has_mobile_viewport as boolean) ?? false;
      const urlSlug = (page.url_slug as string) || "";
      const hasAuthorInfo = (page.has_author_info as boolean) ?? false;

      // Existing improvements (keeping all existing logic)
      // Missing title
      if (!title?.trim()) {
        const key = `missing_title:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "missing_title",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: url,
            current_value: { url, title: null },
            suggested_value: { recommendation: "Add a unique, descriptive <title> tag (50–60 chars) targeting your primary keyword." },
            priority: "high",
            impact_score: 85,
            reason: "Page has no title tag. Titles are critical for SEO and click-through.",
          });
          inserted++;
        }
      }

      // Missing meta description
      if (!metaDesc?.trim()) {
        const key = `missing_description:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "missing_description",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, meta_description: null },
            suggested_value: { recommendation: "Add a meta description (150–160 chars) that summarizes the page and includes a call to action." },
            priority: "medium",
            impact_score: 70,
            reason: "Page has no meta description. Descriptions improve SERP click-through.",
          });
          inserted++;
        }
      }

      // Thin content
      const isBlog = /\/blog\/|\/post\/|\/news\//i.test(url);
      const minWords = isBlog ? MIN_WORDS_FOR_BLOG : MIN_WORDS_FOR_PAGE;
      if (wordCount > 0 && wordCount < minWords) {
        const key = `thin_content:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "thin_content",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, word_count: wordCount, suggested_min: minWords },
            suggested_value: { recommendation: `Expand content to at least ${minWords} words. Add sections, examples, or FAQs to add value.` },
            priority: wordCount < 100 ? "high" : "medium",
            impact_score: Math.min(90, Math.round(((minWords - wordCount) / minWords) * 100)),
            reason: `Page has only ${wordCount} words. Recommended minimum: ${minWords} for better rankings.`,
          });
          inserted++;
        }
      }

      // Missing H1
      if (h1Tags.length === 0) {
        const key = `missing_h1:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "missing_h1",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, h1_count: 0 },
            suggested_value: { recommendation: "Add exactly one H1 tag that clearly describes the page topic and includes your target keyword." },
            priority: "high",
            impact_score: 80,
            reason: "Page has no H1. A single, descriptive H1 helps search engines and users understand the page.",
          });
          inserted++;
        }
      }

      // Duplicate H1
      if (h1Tags.length > 1) {
        const key = `duplicate_h1:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "duplicate_h1",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, h1_count: h1Tags.length },
            suggested_value: { recommendation: "Use a single H1 for the main topic. Use H2/H3 for subsections." },
            priority: "medium",
            impact_score: 50,
            reason: "Multiple H1 tags dilute topic clarity. Use one H1 per page.",
          });
          inserted++;
        }
      }

      // Images missing alt
      if (imagesMissingAlt > 0) {
        const key = `images_alt:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "images_missing_alt",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, images_missing_alt: imagesMissingAlt },
            suggested_value: { recommendation: `Add descriptive alt text to ${imagesMissingAlt} image(s). Describe the image for accessibility and SEO.` },
            priority: "medium",
            impact_score: 60,
            reason: `${imagesMissingAlt} image(s) missing alt text. Alt text helps rankings and accessibility.`,
          });
          inserted++;
        }
      }

      // NEW: Open Graph tags
      if (!openGraph.ogTitle && title) {
        const key = `missing_og_title:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "missing_og_title",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, hasOgTitle: false },
            suggested_value: { recommendation: "Add Open Graph og:title meta tag for better social media sharing." },
            priority: "medium",
            impact_score: 55,
            reason: "Missing Open Graph title tag",
          });
          inserted++;
        }
      }

      if (!openGraph.ogImage && imageDetails.length > 0) {
        const key = `missing_og_image:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "missing_og_image",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, hasOgImage: false },
            suggested_value: { recommendation: "Add Open Graph og:image meta tag for better social media previews." },
            priority: "low",
            impact_score: 40,
            reason: "Missing Open Graph image tag",
          });
          inserted++;
        }
      }

      // NEW: Schema markup
      const isProductPage = /\/product\/|\/shop\/|\/item\//i.test(url);
      const isArticlePage = /\/blog\/|\/article\/|\/post\//i.test(url);
      
      if (isProductPage && !schema.hasProduct) {
        const key = `missing_product_schema:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "missing_product_schema",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, hasProductSchema: false },
            suggested_value: { recommendation: "Add Product schema markup to help search engines understand product details and enable rich results." },
            priority: "high",
            impact_score: 75,
            reason: "Product page missing Product schema markup",
          });
          inserted++;
        }
      }

      if (isArticlePage && !schema.hasArticle) {
        const key = `missing_article_schema:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "missing_article_schema",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, hasArticleSchema: false },
            suggested_value: { recommendation: "Add Article schema markup with author and publish date for better E-E-A-T signals." },
            priority: "medium",
            impact_score: 65,
            reason: "Article page missing Article schema markup",
          });
          inserted++;
        }
      }

      if (wordCount > 500 && !schema.hasFAQ && !schema.hasArticle) {
        const key = `missing_faq_schema:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "missing_faq_schema",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, hasFAQSchema: false },
            suggested_value: { recommendation: "Consider adding FAQ schema markup if page answers common questions. This can help with featured snippets." },
            priority: "low",
            impact_score: 45,
            reason: "Page could benefit from FAQ schema markup",
          });
          inserted++;
        }
      }

      // NEW: Image optimization
      const unoptimizedImages = imageDetails.filter(img => 
        img.format && !["webp", "avif"].includes(img.format.toLowerCase()) && img.format !== "svg"
      );
      if (unoptimizedImages.length > 0) {
        const key = `unoptimized_images:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "unoptimized_images",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, unoptimizedCount: unoptimizedImages.length },
            suggested_value: { recommendation: `Convert ${unoptimizedImages.length} image(s) to WebP or AVIF format for better performance.` },
            priority: "medium",
            impact_score: 50,
            reason: `${unoptimizedImages.length} image(s) not using modern formats (WebP/AVIF)`,
          });
          inserted++;
        }
      }

      const imagesWithoutLazyLoading = imageDetails.filter(img => !img.hasLazyLoading && imageDetails.indexOf(img) > 2);
      if (imagesWithoutLazyLoading.length > 0) {
        const key = `images_no_lazy_loading:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "images_no_lazy_loading",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, imagesWithoutLazyLoading: imagesWithoutLazyLoading.length },
            suggested_value: { recommendation: `Add lazy loading to ${imagesWithoutLazyLoading.length} image(s) below the fold for better page speed.` },
            priority: "low",
            impact_score: 40,
            reason: "Images below fold missing lazy loading",
          });
          inserted++;
        }
      }

      // NEW: URL/Slug analysis
      const urlAnalysis = analyzeURL(url);
      if (urlAnalysis.score < 80) {
        for (const issue of urlAnalysis.issues) {
          const key = `url_issue:${issue.type}:${url}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            await serviceClient.from("seo_improvements").insert({
              store_id: storeId,
              improvement_type: "url_optimization",
              entity_type: "crawled_page",
              entity_id: url,
              entity_title: title || url,
              current_value: { url, issue: issue.message },
              suggested_value: { recommendation: issue.suggestion },
              priority: issue.severity,
              impact_score: issue.severity === "high" ? 70 : issue.severity === "medium" ? 50 : 30,
              reason: issue.message,
            });
            inserted++;
          }
        }
      }

      // NEW: HTTPS check
      if (!isHttps) {
        const key = `not_https:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "not_https",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, isHttps: false },
            suggested_value: { recommendation: "Enable HTTPS for this page. HTTPS is required for security and SEO." },
            priority: "high",
            impact_score: 90,
            reason: "Page not served over HTTPS",
          });
          inserted++;
        }
      }

      // NEW: Mobile viewport
      if (!hasMobileViewport) {
        const key = `missing_mobile_viewport:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "missing_mobile_viewport",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, hasMobileViewport: false },
            suggested_value: { recommendation: "Add viewport meta tag: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" },
            priority: "high",
            impact_score: 85,
            reason: "Missing mobile viewport meta tag",
          });
          inserted++;
        }
      }

      // NEW: E-E-A-T signals
      if (!hasAuthorInfo && (schema.hasArticle || wordCount > 500)) {
        const key = `missing_author_info:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "missing_author_info",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, hasAuthorInfo: false },
            suggested_value: { recommendation: "Add author information (meta author tag or author schema) to improve E-E-A-T signals." },
            priority: "medium",
            impact_score: 60,
            reason: "Missing author information (E-E-A-T signal)",
          });
          inserted++;
        }
      }

      // Noindex
      if (hasNoindex) {
        const key = `noindex:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "noindex_page",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, noindex: true },
            suggested_value: { recommendation: "Remove noindex if this page should appear in search results." },
            priority: "low",
            impact_score: 30,
            reason: "Page has noindex. It will not appear in search results.",
          });
          inserted++;
        }
      }

      // Critical issues from crawler
      for (const issue of issues) {
        if (issue.severity !== "critical") continue;
        const key = `issue:${issue.type}:${url}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          await serviceClient.from("seo_improvements").insert({
            store_id: storeId,
            improvement_type: "crawl_issue",
            entity_type: "crawled_page",
            entity_id: url,
            entity_title: title || url,
            current_value: { url, issue_type: issue.type, message: issue.message },
            suggested_value: { recommendation: issue.message },
            priority: "high",
            impact_score: 75,
            reason: issue.message,
          });
          inserted++;
        }
      }
    }

    // 7.5. Auto-keyword suggestions (for pages without tracked keywords)
    const { data: trackedKeywords } = await serviceClient
      .from("tracked_keywords")
      .select("keyword")
      .eq("store_id", storeId)
      .eq("is_active", true);

    const trackedKeywordSet = new Set((trackedKeywords || []).map(k => k.keyword.toLowerCase()));

    // Suggest keywords for top pages
    for (const page of pageData.slice(0, 10)) { // Limit to top 10 pages
      if (!page.title && page.h1Tags.length === 0) continue;

      const suggestions = await suggestKeywordsFromContent(page, 5);
      
      for (const suggestion of suggestions) {
        // Only suggest if keyword isn't already tracked
        if (!trackedKeywordSet.has(suggestion.keyword.toLowerCase())) {
          const key = `keyword_suggestion:${suggestion.keyword}:${page.url}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            await serviceClient.from("seo_improvements").insert({
              store_id: storeId,
              improvement_type: "keyword_suggestion",
              entity_type: "crawled_page",
              entity_id: page.url,
              entity_title: page.title || page.url,
              current_value: { url: page.url, keyword: suggestion.keyword },
              suggested_value: { recommendation: `Consider tracking keyword "${suggestion.keyword}". ${suggestion.reason}` },
              priority: suggestion.relevance > 70 ? "medium" : "low",
              impact_score: suggestion.relevance,
              reason: suggestion.reason,
            });
            inserted++;
          }
        }
      }
    }

    // 8. Core Web Vitals (check homepage and a few key pages)
    if (baseUrl) {
      const keyPages = [baseUrl, ...pageData.slice(0, 2).map(p => p.url)];
      for (const pageUrl of keyPages) {
        const cwv = await getCoreWebVitals(pageUrl, process.env.PAGESPEED_INSIGHTS_API_KEY);
        if (cwv) {
          const grades = {
            lcp: !cwv.lcp ? "poor" : cwv.lcp <= 2500 ? "good" : cwv.lcp <= 4000 ? "needs-improvement" : "poor",
            fid: !cwv.fid ? "poor" : cwv.fid <= 100 ? "good" : cwv.fid <= 300 ? "needs-improvement" : "poor",
            cls: !cwv.cls ? "poor" : cwv.cls <= 0.1 ? "good" : cwv.cls <= 0.25 ? "needs-improvement" : "poor",
          };

          if (grades.lcp !== "good" || grades.fid !== "good" || grades.cls !== "good") {
            const key = `core_web_vitals:${pageUrl}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              const issues = [];
              if (grades.lcp !== "good") issues.push(`LCP: ${cwv.lcp}ms (${grades.lcp})`);
              if (grades.fid !== "good") issues.push(`FID: ${cwv.fid}ms (${grades.fid})`);
              if (grades.cls !== "good") issues.push(`CLS: ${cwv.cls} (${grades.cls})`);

              await serviceClient.from("seo_improvements").insert({
                store_id: storeId,
                improvement_type: "core_web_vitals",
                entity_type: "crawled_page",
                entity_id: pageUrl,
                entity_title: pageUrl,
                current_value: { url: pageUrl, lcp: cwv.lcp, fid: cwv.fid, cls: cwv.cls, score: cwv.score },
                suggested_value: { recommendation: `Improve Core Web Vitals: ${issues.join(", ")}. ${cwv.opportunities.slice(0, 3).map(o => o.title).join(", ")}` },
                priority: cwv.score && cwv.score < 50 ? "high" : "medium",
                impact_score: cwv.score || 50,
                reason: `Core Web Vitals need improvement: ${issues.join(", ")}`,
              });
              inserted++;
            }
          }
        }
      }
    }

    // 9. Sitemap Validation
    if (baseUrl) {
      const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
      const sitemapValidation = await validateSitemap(sitemapUrl);
      if (!sitemapValidation.isValid || sitemapValidation.issues.length > 0) {
        for (const issue of sitemapValidation.issues) {
          const key = `sitemap:${issue.type}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            await serviceClient.from("seo_improvements").insert({
              store_id: storeId,
              improvement_type: "sitemap_validation",
              entity_type: "site",
              entity_id: baseUrl,
              entity_title: "Sitemap",
              current_value: { sitemapUrl, issue: issue.message },
              suggested_value: { recommendation: issue.message },
              priority: issue.severity,
              impact_score: issue.severity === "high" ? 70 : issue.severity === "medium" ? 50 : 30,
              reason: issue.message,
            });
            inserted++;
          }
        }
      }
    }

    return { count: inserted, error: null };
  } catch (err) {
    console.error("generateImprovementsFromCrawl error:", err);
    return { count: 0, error: err instanceof Error ? err.message : "Failed to generate improvements" };
  }
}
