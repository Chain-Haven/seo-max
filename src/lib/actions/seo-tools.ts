"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { analyzeContentSEO, generateContentImprovements, type SEOAnalysisResult } from "@/lib/ai/seo-analyzer";
import { analyzeAEO, generateQAPairs, optimizeForFeaturedSnippet, type AEOAnalysis, type QAPair } from "@/lib/ai/aeo";
import {
  generateLocalBusinessSchema,
  generateProductSchema,
  generateHowToSchema,
  generateFAQSchema,
  generateOrganizationSchema,
  schemaToScript,
} from "@/lib/ai/schema-generator";

// Analyze a page's SEO
export async function analyzePageSEO(
  storeId: string,
  pageId: string
): Promise<{ data: SEOAnalysisResult | null; error: string | null }> {
  const supabase = await createClient();

  const { data: page, error } = await supabase
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .eq("store_id", storeId)
    .single();

  if (error || !page) {
    return { data: null, error: error?.message || "Page not found" };
  }

  const analysis = await analyzeContentSEO(page.content || "", {
    title: page.title,
    metaDescription: page.meta_description,
    contentType: page.page_type === "blog" ? "blog" : "page",
  });

  return { data: analysis, error: null };
}

// Analyze a product's SEO
export async function analyzeProductSEO(
  storeId: string,
  productId: string
): Promise<{ data: SEOAnalysisResult | null; error: string | null }> {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("store_id", storeId)
    .single();

  if (error || !product) {
    return { data: null, error: error?.message || "Product not found" };
  }

  const analysis = await analyzeContentSEO(product.description || "", {
    title: product.name,
    metaDescription: product.meta_description,
    contentType: "product",
  });

  return { data: analysis, error: null };
}

// Analyze blog post SEO
export async function analyzeBlogPostSEO(
  storeId: string,
  postId: string
): Promise<{ data: SEOAnalysisResult | null; error: string | null }> {
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", postId)
    .eq("store_id", storeId)
    .single();

  if (error || !post) {
    return { data: null, error: error?.message || "Blog post not found" };
  }

  const analysis = await analyzeContentSEO(post.content || "", {
    title: post.title,
    metaDescription: post.meta_description,
    contentType: "blog",
  });

  return { data: analysis, error: null };
}

// Generate improved content based on analysis
export async function getContentImprovements(
  content: string,
  analysis: SEOAnalysisResult,
  targetKeyword?: string
): Promise<{ data: string | null; error: string | null }> {
  try {
    const improved = await generateContentImprovements(content, analysis, targetKeyword);
    return { data: improved, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to generate improvements" };
  }
}

// AEO Analysis
export async function analyzeContentAEO(
  content: string,
  options: {
    title?: string;
    targetQueries?: string[];
    contentType: "product" | "page" | "blog" | "faq";
  }
): Promise<{ data: AEOAnalysis | null; error: string | null }> {
  try {
    const analysis = await analyzeAEO(content, options);
    return { data: analysis, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "AEO analysis failed" };
  }
}

// Generate FAQ pairs for content
export async function generateFAQPairs(
  content: string,
  topic: string,
  targetAudience?: string,
  numPairs?: number
): Promise<{ data: QAPair[] | null; error: string | null }> {
  try {
    const pairs = await generateQAPairs(content, { topic, targetAudience, numPairs });
    return { data: pairs, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to generate FAQ" };
  }
}

// Generate featured snippet content
export async function generateSnippetContent(
  content: string,
  targetQuery: string,
  snippetType: "paragraph" | "list" | "table"
): Promise<{ data: { optimizedContent: string; probability: string } | null; error: string | null }> {
  try {
    const result = await optimizeForFeaturedSnippet(content, targetQuery, snippetType);
    return { 
      data: { 
        optimizedContent: result.optimizedContent, 
        probability: result.probability 
      }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to optimize" };
  }
}

// Schema Generation

export async function generateStoreLocalBusinessSchema(storeId: string): Promise<{ data: string | null; error: string | null }> {
  const supabase = await createClient();

  const { data: store, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (error || !store) {
    return { data: null, error: error?.message || "Store not found" };
  }

  const settings = (store.settings as Record<string, unknown>) || {};

  const schema = generateLocalBusinessSchema({
    name: store.name,
    businessType: (settings.business_type as string) || "Store",
    description: settings.description as string,
    url: store.url,
    phone: settings.phone as string,
    email: settings.email as string,
    address: settings.address as {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    },
    coordinates: settings.coordinates as { lat: number; lng: number },
    hours: settings.hours as Array<{ days: string[]; open: string; close: string }>,
    priceRange: settings.price_range as string,
    socialProfiles: settings.social_profiles as string[],
  });

  return { data: schemaToScript(schema), error: null };
}

export async function generateProductSchemaMarkup(
  storeId: string,
  productId: string
): Promise<{ data: string | null; error: string | null }> {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("store_id", storeId)
    .single();

  if (error || !product) {
    return { data: null, error: error?.message || "Product not found" };
  }

  const schema = generateProductSchema({
    name: product.name,
    description: product.description,
    images: product.images as string[],
    sku: product.sku,
    brand: product.brand,
    price: product.price,
    currency: "USD",
    availability: product.stock_status === "instock" ? "InStock" : "OutOfStock",
    url: product.url,
  });

  return { data: schemaToScript(schema), error: null };
}

export async function generateHowToSchemaFromContent(
  title: string,
  content: string
): Promise<{ data: string | null; error: string | null }> {
  try {
    const schema = await generateHowToSchema(title, content);
    return { data: schemaToScript(schema), error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to generate HowTo schema" };
  }
}

export async function generateFAQSchemaFromPairs(
  questions: Array<{ question: string; answer: string }>
): Promise<{ data: string | null; error: string | null }> {
  try {
    const schema = generateFAQSchema(questions);
    return { data: schemaToScript(schema), error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to generate FAQ schema" };
  }
}

export async function generateOrgSchema(data: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  socialProfiles?: string[];
  contactEmail?: string;
  contactPhone?: string;
}): Promise<{ data: string | null; error: string | null }> {
  try {
    const schema = generateOrganizationSchema(data);
    return { data: schemaToScript(schema), error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to generate Organization schema" };
  }
}

// Save schema to store settings
export async function saveStoreSchema(
  storeId: string,
  schemaType: string,
  schemaJson: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", storeId)
    .single();

  const currentSettings = (store?.settings as Record<string, unknown>) || {};
  const schemas = (currentSettings.schemas as Record<string, string>) || {};

  schemas[schemaType] = schemaJson;

  const { error } = await supabase
    .from("stores")
    .update({
      settings: {
        ...currentSettings,
        schemas,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}`);
  return { success: true, error: null };
}
