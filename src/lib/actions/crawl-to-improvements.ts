"use server";

import { createServiceClient } from "@/lib/supabase/server";

const MIN_WORDS_FOR_PAGE = 300;
const MIN_WORDS_FOR_BLOG = 600;

/**
 * Generate SEO improvements from completed crawl data.
 * Used after site audit completes (and on first connect) so the store
 * gets actionable AI-backed recommendations in one place.
 */
export async function generateImprovementsFromCrawl(
  storeId: string,
  crawlId: string
): Promise<{ count: number; error: string | null }> {
  const serviceClient = await createServiceClient();

  try {
    const { data: pages, error: fetchError } = await serviceClient
      .from("crawled_pages")
      .select("id, url, title, meta_description, h1_tags, word_count, images_total, images_missing_alt, has_robots_noindex, issues")
      .eq("crawl_id", crawlId)
      .eq("store_id", storeId);

    if (fetchError || !pages?.length) {
      return { count: 0, error: fetchError?.message ?? "No crawl data" };
    }

    let inserted = 0;
    const seenKeys = new Set<string>();

    for (const page of pages) {
      const issues = (page.issues as Array<{ type: string; severity: string; message: string }>) || [];
      const url = page.url as string;
      const title = (page.title as string) || "";
      const metaDesc = page.meta_description as string | null;
      const wordCount = (page.word_count as number) || 0;
      const h1Tags = (page.h1_tags as string[]) || [];
      const imagesMissingAlt = (page.images_missing_alt as number) || 0;
      const hasNoindex = Boolean(page.has_robots_noindex);

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

      // Thin content (treat as page unless URL suggests blog)
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

      // Critical issues from crawler (e.g. redirect, broken)
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

    return { count: inserted, error: null };
  } catch (err) {
    console.error("generateImprovementsFromCrawl error:", err);
    return { count: 0, error: err instanceof Error ? err.message : "Failed to generate improvements" };
  }
}
