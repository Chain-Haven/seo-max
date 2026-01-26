/**
 * Advanced Schema Markup Generator
 * Generates structured data for various content types
 */

import { getAIProvider } from "./provider";

// LocalBusiness Schema
export interface LocalBusinessSchema {
  "@context": "https://schema.org";
  "@type": "LocalBusiness" | "Store" | "Restaurant" | "ProfessionalService";
  name: string;
  description?: string;
  url?: string;
  telephone?: string;
  email?: string;
  address?: {
    "@type": "PostalAddress";
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  openingHoursSpecification?: Array<{
    "@type": "OpeningHoursSpecification";
    dayOfWeek: string[];
    opens: string;
    closes: string;
  }>;
  priceRange?: string;
  image?: string | string[];
  sameAs?: string[];
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
  };
}

// Product Schema
export interface ProductSchema {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description?: string;
  image?: string | string[];
  sku?: string;
  brand?: {
    "@type": "Brand";
    name: string;
  };
  offers?: {
    "@type": "Offer";
    price: number;
    priceCurrency: string;
    availability?: string;
    url?: string;
    priceValidUntil?: string;
  };
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  review?: Array<{
    "@type": "Review";
    author: { "@type": "Person"; name: string };
    datePublished: string;
    reviewRating: { "@type": "Rating"; ratingValue: number };
    reviewBody: string;
  }>;
}

// HowTo Schema
export interface HowToSchema {
  "@context": "https://schema.org";
  "@type": "HowTo";
  name: string;
  description?: string;
  image?: string;
  totalTime?: string;
  estimatedCost?: {
    "@type": "MonetaryAmount";
    currency: string;
    value: number;
  };
  supply?: Array<{
    "@type": "HowToSupply";
    name: string;
  }>;
  tool?: Array<{
    "@type": "HowToTool";
    name: string;
  }>;
  step: Array<{
    "@type": "HowToStep";
    name?: string;
    text: string;
    image?: string;
    url?: string;
  }>;
}

// Generate LocalBusiness schema
export function generateLocalBusinessSchema(
  data: {
    name: string;
    businessType?: string;
    description?: string;
    url?: string;
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
    coordinates?: { lat: number; lng: number };
    hours?: Array<{ days: string[]; open: string; close: string }>;
    priceRange?: string;
    images?: string[];
    socialProfiles?: string[];
    rating?: { value: number; count: number };
  }
): LocalBusinessSchema {
  const schema: LocalBusinessSchema = {
    "@context": "https://schema.org",
    "@type": (data.businessType as LocalBusinessSchema["@type"]) || "LocalBusiness",
    name: data.name,
  };

  if (data.description) schema.description = data.description;
  if (data.url) schema.url = data.url;
  if (data.phone) schema.telephone = data.phone;
  if (data.email) schema.email = data.email;

  if (data.address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: data.address.street,
      addressLocality: data.address.city,
      addressRegion: data.address.state,
      postalCode: data.address.zip,
      addressCountry: data.address.country || "US",
    };
  }

  if (data.coordinates) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: data.coordinates.lat,
      longitude: data.coordinates.lng,
    };
  }

  if (data.hours && data.hours.length > 0) {
    schema.openingHoursSpecification = data.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.open,
      closes: h.close,
    }));
  }

  if (data.priceRange) schema.priceRange = data.priceRange;
  if (data.images && data.images.length > 0) {
    schema.image = data.images.length === 1 ? data.images[0] : data.images;
  }
  if (data.socialProfiles && data.socialProfiles.length > 0) {
    schema.sameAs = data.socialProfiles;
  }

  if (data.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: data.rating.value,
      reviewCount: data.rating.count,
    };
  }

  return schema;
}

// Generate Product schema
export function generateProductSchema(
  data: {
    name: string;
    description?: string;
    images?: string[];
    sku?: string;
    brand?: string;
    price?: number;
    currency?: string;
    availability?: "InStock" | "OutOfStock" | "PreOrder";
    url?: string;
    rating?: { value: number; count: number };
    reviews?: Array<{
      author: string;
      date: string;
      rating: number;
      text: string;
    }>;
  }
): ProductSchema {
  const schema: ProductSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.name,
  };

  if (data.description) schema.description = data.description;
  if (data.images && data.images.length > 0) {
    schema.image = data.images.length === 1 ? data.images[0] : data.images;
  }
  if (data.sku) schema.sku = data.sku;
  if (data.brand) {
    schema.brand = {
      "@type": "Brand",
      name: data.brand,
    };
  }

  if (data.price !== undefined) {
    schema.offers = {
      "@type": "Offer",
      price: data.price,
      priceCurrency: data.currency || "USD",
      availability: `https://schema.org/${data.availability || "InStock"}`,
      url: data.url,
    };
  }

  if (data.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: data.rating.value,
      reviewCount: data.rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (data.reviews && data.reviews.length > 0) {
    schema.review = data.reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      datePublished: r.date,
      reviewRating: { "@type": "Rating", ratingValue: r.rating },
      reviewBody: r.text,
    }));
  }

  return schema;
}

// Generate HowTo schema from content
export async function generateHowToSchema(
  title: string,
  content: string
): Promise<HowToSchema> {
  const ai = getAIProvider();

  const prompt = `Extract a HowTo schema from this content. Return ONLY valid JSON.

TITLE: ${title}
CONTENT: ${content.substring(0, 4000)}

Return JSON in this format:
{
  "name": "<title of the how-to>",
  "description": "<brief description>",
  "totalTime": "<ISO 8601 duration, e.g. PT30M for 30 minutes>",
  "supply": [{"name": "<supply item>"}],
  "tool": [{"name": "<tool item>"}],
  "step": [
    {"name": "<step title>", "text": "<step instructions>"},
    ...
  ]
}

Only include supply/tool if mentioned in content. Include 3-10 steps.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 1500,
    temperature: 0.3,
  });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: data.name || title,
        description: data.description,
        totalTime: data.totalTime,
        supply: data.supply?.map((s: { name: string }) => ({
          "@type": "HowToSupply",
          name: s.name,
        })),
        tool: data.tool?.map((t: { name: string }) => ({
          "@type": "HowToTool",
          name: t.name,
        })),
        step: data.step.map((s: { name?: string; text: string }) => ({
          "@type": "HowToStep",
          name: s.name,
          text: s.text,
        })),
      };
    }
  } catch {
    // ignore
  }

  // Fallback: simple schema
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    step: [{ "@type": "HowToStep", text: "Follow the instructions above." }],
  };
}

// Generate FAQ schema from Q&A pairs
export function generateFAQSchema(
  questions: Array<{ question: string; answer: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}

// Generate BreadcrumbList schema
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Generate Organization schema
export function generateOrganizationSchema(data: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  socialProfiles?: string[];
  contactEmail?: string;
  contactPhone?: string;
}): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: data.name,
    url: data.url,
  };

  if (data.logo) schema.logo = data.logo;
  if (data.description) schema.description = data.description;
  if (data.socialProfiles) schema.sameAs = data.socialProfiles;

  if (data.contactEmail || data.contactPhone) {
    schema.contactPoint = {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: data.contactEmail,
      telephone: data.contactPhone,
    };
  }

  return schema;
}

// Convert schema to JSON-LD script tag
export function schemaToScript(schema: object): string {
  return `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;
}
