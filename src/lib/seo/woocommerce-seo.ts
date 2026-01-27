/**
 * WooCommerce-Specific SEO Optimizations
 * Handle product variations, out-of-stock, category pages, etc.
 */

import { getAIProvider } from "@/lib/ai/provider";

export interface ProductSEOOptimization {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  imageAltTexts: string[];
  schema: unknown;
  recommendations: string[];
}

export interface CategoryPageOptimization {
  metaTitle: string;
  metaDescription: string;
  headerContent: string;
  footerContent: string;
  internalLinks: Array<{ anchor: string; url: string }>;
}

export interface OutOfStockStrategy {
  recommended: "keep" | "noindex" | "redirect" | "modify";
  reason: string;
  actions: string[];
}

// Optimize product SEO
export async function optimizeProductSEO(product: {
  name: string;
  category: string;
  description: string;
  attributes?: Record<string, string>;
  price?: number;
  images?: string[];
}): Promise<ProductSEOOptimization> {
  const ai = getAIProvider();

  const prompt = `Optimize SEO for this WooCommerce product:

Name: ${product.name}
Category: ${product.category}
Description: ${product.description.substring(0, 500)}

Generate:
1. SEO-optimized meta title (50-60 chars, include brand/category if relevant)
2. Compelling meta description (120-160 chars, include benefits, CTA)
3. SEO-friendly URL slug
4. Alt text for ${product.images?.length || 0} product images

Format as JSON:
{
  "metaTitle": "title here",
  "metaDescription": "description here",
  "slug": "product-slug",
  "imageAltTexts": ["alt 1", "alt 2"],
  "recommendations": ["tip 1", "tip 2"]
}`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 1000 });
    const match = response.content.match(/\{[\s\S]*\}/);

    if (match) {
      const data = JSON.parse(match[0]);
      return {
        ...data,
        schema: generateProductSchema(product),
      };
    }
  } catch (error) {
    console.error("Product SEO optimization error:", error);
  }

  // Fallback
  return {
    metaTitle: `${product.name} - Buy Online`,
    metaDescription: `Shop ${product.name}. ${product.description.substring(0, 100)}`,
    slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    imageAltTexts: [`${product.name} product image`],
    schema: generateProductSchema(product),
    recommendations: [],
  };
}

// Optimize category page
export async function optimizeCategoryPage(category: {
  name: string;
  description?: string;
  productCount: number;
  topProducts: Array<{ name: string; price: number }>;
}): Promise<CategoryPageOptimization> {
  const ai = getAIProvider();

  const prompt = `Create SEO-optimized content for a WooCommerce category page:

Category: ${category.name}
Products: ${category.productCount}
Top products: ${category.topProducts.slice(0, 5).map((p) => p.name).join(", ")}

Generate:
1. Meta title (50-60 chars)
2. Meta description (120-160 chars)
3. Header content (100-200 words introducing the category)
4. Footer content (150-300 words with keywords and value props)

Format as JSON:
{
  "metaTitle": "title",
  "metaDescription": "description",
  "headerContent": "intro paragraph",
  "footerContent": "detailed content"
}`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 1500 });
    const match = response.content.match(/\{[\s\S]*\}/);

    if (match) {
      const data = JSON.parse(match[0]);
      return {
        ...data,
        internalLinks: [],
      };
    }
  } catch (error) {
    console.error("Category optimization error:", error);
  }

  return {
    metaTitle: `Shop ${category.name} - ${category.productCount} Products`,
    metaDescription: `Browse our selection of ${category.name}. Shop from ${category.productCount} products with fast shipping.`,
    headerContent: `<h1>Shop ${category.name}</h1><p>Explore our ${category.name} collection.</p>`,
    footerContent: `<p>Discover the best ${category.name} products at competitive prices.</p>`,
    internalLinks: [],
  };
}

// Determine strategy for out-of-stock products
export function determineOutOfStockStrategy(product: {
  hasTraffic: boolean;
  hasBacklinks: boolean;
  rankingKeywords: number;
  avgPosition: number | null;
  lastSoldDate: Date | null;
  isTemporarilyUnavailable: boolean;
}): OutOfStockStrategy {
  // Keep if it has SEO value
  if (product.hasTraffic || product.hasBacklinks || product.rankingKeywords > 0) {
    if (product.isTemporarilyUnavailable) {
      return {
        recommended: "keep",
        reason: "Product has SEO value and will be restocked",
        actions: [
          "Keep page indexed with out-of-stock notice",
          "Add 'Notify me when available' form",
          "Show similar products",
          "Update schema availability to 'OutOfStock'",
        ],
      };
    } else {
      return {
        recommended: "redirect",
        reason: "Product won't return but has SEO value",
        actions: [
          "301 redirect to similar product or category",
          "Preserve link equity",
          "Update internal links",
        ],
      };
    }
  }

  // No SEO value - consider noindexing or deleting
  const daysSinceLastSold = product.lastSoldDate
    ? (Date.now() - product.lastSoldDate.getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  if (daysSinceLastSold > 180) {
    return {
      recommended: "redirect",
      reason: "No recent sales or traffic",
      actions: [
        "Redirect to category page",
        "Consider deleting if no stock returning",
      ],
    };
  }

  return {
    recommended: "noindex",
    reason: "Low value, might return",
    actions: [
      "Add noindex meta tag",
      "Keep page live for potential restock",
      "Monitor for 90 days, then redirect if still out of stock",
    ],
  };
}

// Handle product variations SEO
export function optimizeProductVariations(
  parentProduct: { name: string; slug: string },
  variations: Array<{ id: string; attributes: Record<string, string>; price: number; sku: string }>
): Array<{
  variationId: string;
  canonicalUrl: string;
  shouldIndex: boolean;
  schema: unknown;
}> {
  // Variations should NOT be indexed separately
  // They should all canonical to the main product
  
  return variations.map((variation) => ({
    variationId: variation.id,
    canonicalUrl: `/product/${parentProduct.slug}`,
    shouldIndex: false,
    schema: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${parentProduct.name} - ${Object.values(variation.attributes).join(" / ")}`,
      sku: variation.sku,
      offers: {
        "@type": "Offer",
        price: variation.price,
      },
      isVariantOf: {
        "@type": "Product",
        name: parentProduct.name,
      },
    },
  }));
}

// Generate product schema
function generateProductSchema(product: {
  name: string;
  description: string;
  price?: number;
  images?: string[];
}): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images || [],
    offers: {
      "@type": "Offer",
      price: product.price || 0,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };
}

// Optimize product URL structure
export function generateOptimalProductUrl(product: {
  name: string;
  category?: string;
  brand?: string;
  sku?: string;
}): string {
  // Best practice: /product-name or /category/product-name
  
  let slug = product.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

  // Option to include category for better hierarchy
  if (product.category) {
    const categorySlug = product.category.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    return `/${categorySlug}/${slug}`;
  }

  return `/product/${slug}`;
}
