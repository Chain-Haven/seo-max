"use server";

/**
 * Product Blog Generator
 * Scans WooCommerce products and automatically generates SEO-optimized blog posts
 */

import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";
import { generateImage, generateProductImages, type GeneratedImage } from "@/lib/ai/image-generation";
import { saveBlogPost } from "./blog";
import { revalidatePath } from "next/cache";

export interface ProductForBlog {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  categories: string[];
  price: number | null;
  regularPrice?: number;
  salePrice?: number;
  imageUrl?: string;
  sku?: string;
  stock?: string;
  attributes?: Record<string, string>;
}

export interface BlogTopicSuggestion {
  id: string;
  productId: string;
  productName: string;
  title: string;
  type: "review" | "guide" | "comparison" | "howto" | "listicle" | "benefits";
  description: string;
  targetKeyword: string;
  estimatedValue: "high" | "medium" | "low";
  selected: boolean;
}

export interface GeneratedProductBlog {
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  keyword: string;
  images: GeneratedImage[];
  productId: string;
  productName: string;
}

/**
 * Scan and fetch products from a WooCommerce store
 */
export async function scanStoreProducts(
  storeId: string,
  options: { limit?: number; category?: string } = {}
): Promise<{ data: ProductForBlog[] | null; error: string | null }> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .limit(options.limit || 50);

    if (options.category) {
      query = query.contains("categories", [options.category]);
    }

    const { data: products, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    const formattedProducts: ProductForBlog[] = (products || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      shortDescription: p.short_description,
      categories: p.categories || [],
      price: p.price,
      regularPrice: p.regular_price,
      salePrice: p.sale_price,
      imageUrl: p.image_url,
      sku: p.sku,
      stock: p.stock_status,
      attributes: p.attributes,
    }));

    return { data: formattedProducts, error: null };
  } catch (error) {
    console.error("[ProductBlogGenerator] Scan error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate blog topic suggestions for products
 */
export async function generateBlogTopics(
  storeId: string,
  products: ProductForBlog[]
): Promise<{ data: BlogTopicSuggestion[] | null; error: string | null }> {
  const ai = getAIProvider();
  const suggestions: BlogTopicSuggestion[] = [];

  try {
    // Get store info for context
    const supabase = await createClient();
    const { data: store } = await supabase
      .from("stores")
      .select("name, url")
      .eq("id", storeId)
      .single();

    const storeName = store?.name || "Store";

    // Process products in batches
    for (const product of products.slice(0, 20)) {
      const prompt = `Generate 3 blog post ideas for this product:

Product: ${product.name}
Category: ${product.categories.join(", ") || "General"}
Description: ${product.description?.substring(0, 500) || "No description"}
Price: ${product.price ? `$${product.price}` : "N/A"}
Store: ${storeName}

For each idea, provide:
1. A compelling blog title (SEO optimized)
2. Content type: review, guide, comparison, howto, listicle, or benefits
3. Brief description of what the post would cover
4. Target keyword to rank for
5. Value assessment: high (search intent + product relevance), medium, or low

Return as JSON array:
[
  {
    "title": "Blog Title Here",
    "type": "guide",
    "description": "What this post would cover",
    "targetKeyword": "keyword phrase",
    "value": "high"
  }
]`;

      try {
        const response = await ai.generateText(prompt, { maxTokens: 800 });
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          const topics = JSON.parse(jsonMatch[0]);
          for (const topic of topics) {
            suggestions.push({
              id: crypto.randomUUID(),
              productId: product.id,
              productName: product.name,
              title: topic.title,
              type: topic.type,
              description: topic.description,
              targetKeyword: topic.targetKeyword,
              estimatedValue: topic.value,
              selected: topic.value === "high",
            });
          }
        }
      } catch {
        // Continue with next product
      }
    }

    // Sort by value
    const valueOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => valueOrder[a.estimatedValue] - valueOrder[b.estimatedValue]);

    return { data: suggestions, error: null };
  } catch (error) {
    console.error("[ProductBlogGenerator] Topic generation error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate a full blog post from a product
 */
export async function generateBlogFromProduct(
  storeId: string,
  product: ProductForBlog,
  topic: BlogTopicSuggestion,
  options: {
    generateImages?: boolean;
    wordCount?: number;
    includeProductDetails?: boolean;
    includeFAQ?: boolean;
  } = {}
): Promise<{ data: GeneratedProductBlog | null; error: string | null }> {
  const ai = getAIProvider();

  try {
    console.log(`[ProductBlogGenerator] Generating blog for: ${product.name} - ${topic.title}`);

    // Get store info
    const supabase = await createClient();
    const { data: store } = await supabase
      .from("stores")
      .select("name, url")
      .eq("id", storeId)
      .single();

    const storeName = store?.name || "Store";
    const wordCount = options.wordCount || 1500;

    // Generate the blog content
    const contentPrompt = `Write a comprehensive, SEO-optimized blog post.

Title: ${topic.title}
Type: ${topic.type}
Target Keyword: ${topic.targetKeyword}
Target Word Count: ${wordCount} words

Product Information:
- Name: ${product.name}
- Category: ${product.categories.join(", ")}
- Description: ${product.description}
- Price: ${product.price ? `$${product.price}` : "N/A"}
${product.attributes ? `- Features: ${JSON.stringify(product.attributes)}` : ""}

Store: ${storeName}

Requirements:
1. Start with an engaging introduction mentioning the keyword naturally
2. Use H2 and H3 headings with keywords where appropriate
3. ${topic.type === "review" ? "Include pros and cons, detailed analysis, and honest assessment" : ""}
4. ${topic.type === "guide" ? "Provide step-by-step instructions with clear explanations" : ""}
5. ${topic.type === "howto" ? "Focus on practical, actionable steps users can follow" : ""}
6. ${topic.type === "comparison" ? "Compare features, benefits, and use cases objectively" : ""}
7. ${topic.type === "listicle" ? "Use numbered points with detailed explanations for each" : ""}
8. ${topic.type === "benefits" ? "Highlight key benefits with supporting details and examples" : ""}
9. ${options.includeProductDetails ? "Include specific product details, specifications, and pricing" : "Keep product mentions natural and not overly promotional"}
10. ${options.includeFAQ ? "Add a FAQ section with 3-5 relevant questions and answers" : ""}
11. Include internal linking opportunities marked as [INTERNAL_LINK: anchor text]
12. Write in a helpful, informative tone
13. End with a clear call-to-action

Output the blog content in clean HTML format with proper heading tags.`;

    const contentResponse = await ai.generateText(contentPrompt, { 
      maxTokens: 3000,
    });

    let content = contentResponse.content;

    // Clean up content
    content = content
      .replace(/```html\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Generate meta title
    const metaTitlePrompt = `Create an SEO meta title for this blog post:
Title: ${topic.title}
Keyword: ${topic.targetKeyword}
Store: ${storeName}

Requirements:
- 50-60 characters
- Include the keyword naturally
- Make it compelling for clicks
- Include brand name if space allows

Return ONLY the meta title, nothing else.`;

    const metaTitleResponse = await ai.generateText(metaTitlePrompt, { maxTokens: 100 });
    const metaTitle = metaTitleResponse.content.trim().replace(/^["']|["']$/g, "");

    // Generate meta description
    const metaDescPrompt = `Create an SEO meta description for this blog post:
Title: ${topic.title}
Keyword: ${topic.targetKeyword}
About: ${topic.description}

Requirements:
- 150-160 characters
- Include the keyword
- Include a call-to-action
- Make it compelling for clicks

Return ONLY the meta description, nothing else.`;

    const metaDescResponse = await ai.generateText(metaDescPrompt, { maxTokens: 200 });
    const metaDescription = metaDescResponse.content.trim().replace(/^["']|["']$/g, "");

    // Generate images if requested
    const images: GeneratedImage[] = [];
    if (options.generateImages !== false) {
      console.log("[ProductBlogGenerator] Generating images...");

      // Generate hero image
      const heroImage = await generateImage({
        articleTitle: topic.title,
        articleTopic: topic.targetKeyword,
        productInfo: {
          name: product.name,
          category: product.categories[0] || "Product",
          description: product.description?.substring(0, 200) || "",
        },
        style: "professional",
      }, "hero");

      if (heroImage) {
        images.push(heroImage);
      }

      // Generate product-specific image
      if (product.name) {
        const productImages = await generateProductImages(
          product.name,
          product.categories[0] || "Product",
          product.description?.substring(0, 200) || "",
          1
        );
        images.push(...productImages);
      }
    }

    const result: GeneratedProductBlog = {
      title: topic.title,
      content,
      metaTitle,
      metaDescription,
      keyword: topic.targetKeyword,
      images,
      productId: product.id,
      productName: product.name,
    };

    console.log("[ProductBlogGenerator] Blog generated successfully");

    return { data: result, error: null };
  } catch (error) {
    console.error("[ProductBlogGenerator] Generation error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Batch generate blogs from multiple products
 */
export async function batchGenerateProductBlogs(
  storeId: string,
  topics: BlogTopicSuggestion[],
  options: {
    generateImages?: boolean;
    autoSave?: boolean;
    autoPublish?: boolean;
  } = {}
): Promise<{
  results: Array<{
    topic: BlogTopicSuggestion;
    blog: GeneratedProductBlog | null;
    saved: boolean;
    error?: string;
  }>;
  totalGenerated: number;
  totalSaved: number;
  errors: number;
}> {
  const supabase = await createClient();
  const results: Array<{
    topic: BlogTopicSuggestion;
    blog: GeneratedProductBlog | null;
    saved: boolean;
    error?: string;
  }> = [];

  let totalGenerated = 0;
  let totalSaved = 0;
  let errors = 0;

  for (const topic of topics) {
    // Get product details
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", topic.productId)
      .single();

    if (!product) {
      results.push({
        topic,
        blog: null,
        saved: false,
        error: "Product not found",
      });
      errors++;
      continue;
    }

    const productForBlog: ProductForBlog = {
      id: product.id,
      name: product.name,
      description: product.description || "",
      categories: product.categories || [],
      price: product.price,
      imageUrl: product.image_url,
    };

    // Generate the blog
    const { data: blog, error } = await generateBlogFromProduct(
      storeId,
      productForBlog,
      topic,
      { generateImages: options.generateImages }
    );

    if (error || !blog) {
      results.push({
        topic,
        blog: null,
        saved: false,
        error: error || "Generation failed",
      });
      errors++;
      continue;
    }

    totalGenerated++;

    // Save if requested
    let saved = false;
    if (options.autoSave) {
      try {
        const saveResult = await saveBlogPost(storeId, {
          title: blog.title,
          content: blog.content,
          meta_title: blog.metaTitle,
          meta_description: blog.metaDescription,
          status: options.autoPublish ? "published" : "draft",
        });

        if (saveResult.success) {
          saved = true;
          totalSaved++;
        }
      } catch {
        // Save failed but blog was generated
      }
    }

    results.push({
      topic,
      blog,
      saved,
    });

    // Small delay between generations to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  revalidatePath(`/dashboard/stores/${storeId}/blog`);

  return {
    results,
    totalGenerated,
    totalSaved,
    errors,
  };
}

/**
 * Get product categories for filtering
 */
export async function getProductCategories(
  storeId: string
): Promise<{ data: string[] | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { data: products } = await supabase
      .from("products")
      .select("categories")
      .eq("store_id", storeId);

    const allCategories = new Set<string>();
    for (const product of products || []) {
      for (const category of product.categories || []) {
        if (category) allCategories.add(category);
      }
    }

    return {
      data: Array.from(allCategories).sort(),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
