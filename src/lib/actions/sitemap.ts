"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generateStoreSitemap,
  generateSitemapIndex,
  validateSitemap,
  type SitemapConfig,
} from "@/lib/seo/xml-sitemap";

export interface SitemapResult {
  xml: string;
  urlCount: number;
  isValid: boolean;
  errors: string[];
}

// Generate sitemap for a store
export async function generateSitemap(
  storeId: string,
  options: {
    includeProducts?: boolean;
    includePages?: boolean;
    includeBlogPosts?: boolean;
    includeCategories?: boolean;
  } = {}
): Promise<{ data: SitemapResult | null; error: string | null }> {
  const supabase = await createClient();

  // Get store
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("url")
    .eq("id", storeId)
    .single();

  if (storeError || !store?.url) {
    return { data: null, error: "Store URL not configured" };
  }

  const config: SitemapConfig = {
    baseUrl: store.url,
    includeProducts: options.includeProducts ?? true,
    includePages: options.includePages ?? true,
    includeBlogPosts: options.includeBlogPosts ?? true,
    includeCategories: options.includeCategories ?? true,
  };

  // Fetch data
  const [productsResult, pagesResult, blogResult] = await Promise.all([
    config.includeProducts
      ? supabase
          .from("products")
          .select("slug, updated_at, images, name")
          .eq("store_id", storeId)
      : { data: null },
    config.includePages
      ? supabase
          .from("pages")
          .select("slug, updated_at")
          .eq("store_id", storeId)
      : { data: null },
    config.includeBlogPosts
      ? supabase
          .from("blog_posts")
          .select("slug, updated_at, featured_image, title")
          .eq("store_id", storeId)
          .eq("status", "published")
      : { data: null },
  ]);

  const data = {
    products: (productsResult.data || []).map((p) => ({
      slug: p.slug,
      updatedAt: p.updated_at,
      images: p.images as string[] | undefined,
      name: p.name,
    })),
    pages: (pagesResult.data || []).map((p) => ({
      slug: p.slug,
      updatedAt: p.updated_at,
    })),
    blogPosts: (blogResult.data || []).map((p) => ({
      slug: p.slug,
      updatedAt: p.updated_at,
      featuredImage: p.featured_image,
      title: p.title,
    })),
  };

  const xml = generateStoreSitemap(config, data);
  const validation = validateSitemap(xml);

  return {
    data: {
      xml,
      urlCount: validation.urlCount,
      isValid: validation.isValid,
      errors: validation.errors,
    },
    error: null,
  };
}

// Generate sitemap index for large sites
export async function generateSitemapIndexXml(
  storeId: string
): Promise<{ data: string | null; error: string | null }> {
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("url")
    .eq("id", storeId)
    .single();

  if (!store?.url) {
    return { data: null, error: "Store URL not configured" };
  }

  const baseUrl = store.url.replace(/\/$/, "");
  const now = new Date().toISOString().split("T")[0];

  const sitemaps = [
    { loc: `${baseUrl}/sitemap-products.xml`, lastmod: now },
    { loc: `${baseUrl}/sitemap-pages.xml`, lastmod: now },
    { loc: `${baseUrl}/sitemap-posts.xml`, lastmod: now },
  ];

  const xml = generateSitemapIndex(sitemaps);
  return { data: xml, error: null };
}

// Get sitemap stats
export async function getSitemapStats(storeId: string): Promise<{
  data: {
    productCount: number;
    pageCount: number;
    blogPostCount: number;
    totalUrls: number;
    lastGenerated: string | null;
  } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const [products, pages, posts] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("store_id", storeId),
    supabase.from("pages").select("*", { count: "exact", head: true }).eq("store_id", storeId),
    supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "published"),
  ]);

  const productCount = products.count || 0;
  const pageCount = pages.count || 0;
  const blogPostCount = posts.count || 0;

  return {
    data: {
      productCount,
      pageCount,
      blogPostCount,
      totalUrls: productCount + pageCount + blogPostCount + 1, // +1 for homepage
      lastGenerated: null, // Would track this in a settings table
    },
    error: null,
  };
}

// Push sitemap to search engines
export async function submitSitemapToSearchEngines(
  storeId: string
): Promise<{ success: boolean; results: Array<{ engine: string; success: boolean }> }> {
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("url")
    .eq("id", storeId)
    .single();

  if (!store?.url) {
    return { success: false, results: [] };
  }

  const sitemapUrl = encodeURIComponent(`${store.url}/sitemap.xml`);
  const results: Array<{ engine: string; success: boolean }> = [];

  // Submit to Google
  try {
    const googleResponse = await fetch(
      `https://www.google.com/ping?sitemap=${sitemapUrl}`,
      { method: "GET" }
    );
    results.push({ engine: "Google", success: googleResponse.ok });
  } catch {
    results.push({ engine: "Google", success: false });
  }

  // Submit to Bing
  try {
    const bingResponse = await fetch(
      `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
      { method: "GET" }
    );
    results.push({ engine: "Bing", success: bingResponse.ok });
  } catch {
    results.push({ engine: "Bing", success: false });
  }

  return {
    success: results.some((r) => r.success),
    results,
  };
}
