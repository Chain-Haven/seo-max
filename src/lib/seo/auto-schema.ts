/**
 * Auto-generate schema markup for pages missing it
 */

import { generateProductSchema, generateFAQSchema, generateArticleSchema, schemaToScript } from "@/lib/ai/schema-generator";

export interface SchemaGenerationResult {
  schemaType: string;
  schemaJson: Record<string, unknown>;
  schemaScript: string;
}

/**
 * Auto-generate Product schema for a product page
 */
export async function generateProductSchemaAuto(
  productData: {
    name: string;
    description: string;
    price?: number;
    currency?: string;
    images?: string[];
    sku?: string;
    brand?: string;
    availability?: string;
    url: string;
  }
): Promise<SchemaGenerationResult | null> {
  try {
    const schema = generateProductSchema({
      name: productData.name,
      description: productData.description,
      images: productData.images || [],
      sku: productData.sku,
      brand: productData.brand,
      price: productData.price || 0,
      currency: productData.currency || "USD",
      availability: productData.availability || "InStock",
      url: productData.url,
    });

    return {
      schemaType: "Product",
      schemaJson: schema,
      schemaScript: schemaToScript(schema),
    };
  } catch (error) {
    console.error("Product schema generation error:", error);
    return null;
  }
}

/**
 * Auto-generate FAQ schema from content
 */
export async function generateFAQSchemaAuto(
  faqItems: Array<{ question: string; answer: string }>
): Promise<SchemaGenerationResult | null> {
  try {
    if (!faqItems || faqItems.length === 0) {
      return null;
    }

    const schema = generateFAQSchema(faqItems);

    return {
      schemaType: "FAQPage",
      schemaJson: schema,
      schemaScript: schemaToScript(schema),
    };
  } catch (error) {
    console.error("FAQ schema generation error:", error);
    return null;
  }
}

/**
 * Auto-generate Article schema
 */
export async function generateArticleSchemaAuto(
  articleData: {
    title: string;
    description: string;
    author?: string;
    datePublished?: string;
    dateModified?: string;
    image?: string;
    url: string;
  }
): Promise<SchemaGenerationResult | null> {
  try {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": articleData.title,
      "description": articleData.description,
      "url": articleData.url,
      ...(articleData.author && { "author": { "@type": "Person", "name": articleData.author } }),
      ...(articleData.datePublished && { "datePublished": articleData.datePublished }),
      ...(articleData.dateModified && { "dateModified": articleData.dateModified }),
      ...(articleData.image && { "image": articleData.image }),
    };

    return {
      schemaType: "Article",
      schemaJson: schema,
      schemaScript: schemaToScript(schema),
    };
  } catch (error) {
    console.error("Article schema generation error:", error);
    return null;
  }
}
