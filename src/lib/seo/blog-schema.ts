/**
 * Enhanced Blog Schema Generator
 * Generates comprehensive schema.org structured data for blog posts
 * Includes BlogPosting, Article, WebPage, BreadcrumbList, FAQ, HowTo schemas
 */

export interface BlogPostSchemaInput {
  title: string;
  description: string;
  content: string;
  url: string;
  imageUrl?: string;
  datePublished: string;
  dateModified?: string;
  author: {
    name: string;
    url?: string;
    image?: string;
    jobTitle?: string;
    sameAs?: string[]; // Social profiles
    description?: string;
  };
  organization: {
    name: string;
    url: string;
    logo?: string;
  };
  breadcrumbs?: Array<{
    name: string;
    url: string;
  }>;
  categories?: string[];
  tags?: string[];
  wordCount?: number;
  readingTime?: number;
  faqItems?: Array<{
    question: string;
    answer: string;
  }>;
  howToSteps?: Array<{
    name: string;
    text: string;
    image?: string;
  }>;
}

export interface BlogPostSchemaOutput {
  articleSchema: object;
  breadcrumbSchema?: object;
  faqSchema?: object;
  howToSchema?: object;
  webPageSchema: object;
  organizationSchema: object;
  combinedSchema: object[];
}

// Extract main heading from content
function extractMainHeading(content: string): string {
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const mdH1Match = content.match(/^#\s+(.+)$/m);
  return h1Match?.[1] || mdH1Match?.[1] || "";
}

// Calculate word count from content
function calculateWordCount(content: string): number {
  const textContent = content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return textContent.split(/\s+/).filter((w) => w.length > 0).length;
}

// Calculate reading time (average 200 words per minute)
function calculateReadingTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 200);
  return `PT${minutes}M`;
}

// Extract headings from content for article sections
function extractHeadings(content: string): string[] {
  const headings: string[] = [];
  
  // HTML headings
  const htmlMatches = content.matchAll(/<h[2-6][^>]*>([^<]+)<\/h[2-6]>/gi);
  for (const match of htmlMatches) {
    headings.push(match[1].trim());
  }
  
  // Markdown headings
  const mdMatches = content.matchAll(/^#{2,6}\s+(.+)$/gm);
  for (const match of mdMatches) {
    headings.push(match[1].trim());
  }
  
  return headings;
}

/**
 * Generate BlogPosting/Article Schema
 */
export function generateArticleSchema(input: BlogPostSchemaInput): object {
  const wordCount = input.wordCount || calculateWordCount(input.content);
  const headings = extractHeadings(input.content);
  
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${input.url}#article`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.url,
    },
    headline: input.title.substring(0, 110), // Google recommends max 110 chars
    name: input.title,
    description: input.description,
    image: input.imageUrl
      ? {
          "@type": "ImageObject",
          url: input.imageUrl,
          width: 1200,
          height: 630,
        }
      : undefined,
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    author: {
      "@type": "Person",
      "@id": input.author.url ? `${input.author.url}#author` : undefined,
      name: input.author.name,
      url: input.author.url,
      image: input.author.image,
      jobTitle: input.author.jobTitle,
      description: input.author.description,
      sameAs: input.author.sameAs,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${input.organization.url}#organization`,
      name: input.organization.name,
      url: input.organization.url,
      logo: input.organization.logo
        ? {
            "@type": "ImageObject",
            url: input.organization.logo,
          }
        : undefined,
    },
    wordCount,
    timeRequired: calculateReadingTime(wordCount),
    articleBody: input.content.replace(/<[^>]*>/g, " ").substring(0, 5000),
    articleSection: headings.slice(0, 5),
    keywords: input.tags?.join(", "),
    inLanguage: "en-US",
    isAccessibleForFree: true,
    // Removed sameAs as it's not valid for BlogPosting
  };
}

/**
 * Generate BreadcrumbList Schema
 */
export function generateBreadcrumbSchema(
  breadcrumbs: Array<{ name: string; url: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

/**
 * Generate FAQPage Schema
 */
export function generateFAQSchema(
  faqItems: Array<{ question: string; answer: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate HowTo Schema
 */
export function generateHowToSchema(
  title: string,
  description: string,
  steps: Array<{ name: string; text: string; image?: string }>,
  totalTime?: string
): object {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    totalTime: totalTime || `PT${steps.length * 5}M`,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      image: step.image,
    })),
  };
}

/**
 * Generate WebPage Schema
 */
export function generateWebPageSchema(input: BlogPostSchemaInput): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": input.url,
    url: input.url,
    name: input.title,
    description: input.description,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${input.organization.url}#website`,
      url: input.organization.url,
      name: input.organization.name,
      publisher: {
        "@type": "Organization",
        "@id": `${input.organization.url}#organization`,
      },
    },
    about: input.categories?.map((cat) => ({
      "@type": "Thing",
      name: cat,
    })),
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    breadcrumb: input.breadcrumbs
      ? {
          "@type": "BreadcrumbList",
          itemListElement: input.breadcrumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
            item: crumb.url,
          })),
        }
      : undefined,
  };
}

/**
 * Generate Organization Schema
 */
export function generateOrganizationSchema(org: {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  description?: string;
  contactPoint?: {
    telephone?: string;
    email?: string;
    contactType?: string;
  };
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${org.url}#organization`,
    name: org.name,
    url: org.url,
    logo: org.logo,
    description: org.description,
    sameAs: org.sameAs,
    contactPoint: org.contactPoint
      ? {
          "@type": "ContactPoint",
          telephone: org.contactPoint.telephone,
          email: org.contactPoint.email,
          contactType: org.contactPoint.contactType || "customer service",
        }
      : undefined,
  };
}

/**
 * Generate Complete Blog Post Schema (all types combined)
 */
export function generateBlogPostSchema(
  input: BlogPostSchemaInput
): BlogPostSchemaOutput {
  const articleSchema = generateArticleSchema(input);
  
  const webPageSchema = generateWebPageSchema(input);
  
  const organizationSchema = generateOrganizationSchema({
    name: input.organization.name,
    url: input.organization.url,
    logo: input.organization.logo,
  });

  const breadcrumbSchema = input.breadcrumbs?.length
    ? generateBreadcrumbSchema(input.breadcrumbs)
    : undefined;

  const faqSchema =
    input.faqItems && input.faqItems.length > 0
      ? generateFAQSchema(input.faqItems)
      : undefined;

  const howToSchema =
    input.howToSteps && input.howToSteps.length > 0
      ? generateHowToSchema(input.title, input.description, input.howToSteps)
      : undefined;

  // Combine all schemas into @graph format
  const combinedSchema: object[] = [
    articleSchema,
    webPageSchema,
    organizationSchema,
  ];

  if (breadcrumbSchema) combinedSchema.push(breadcrumbSchema);
  if (faqSchema) combinedSchema.push(faqSchema);
  if (howToSchema) combinedSchema.push(howToSchema);

  return {
    articleSchema,
    breadcrumbSchema,
    faqSchema,
    howToSchema,
    webPageSchema,
    organizationSchema,
    combinedSchema,
  };
}

/**
 * Generate JSON-LD script tag for embedding
 */
export function generateSchemaScript(schemas: object[]): string {
  const graphSchema = {
    "@context": "https://schema.org",
    "@graph": schemas,
  };

  return `<script type="application/ld+json">${JSON.stringify(graphSchema, null, 2)}</script>`;
}

/**
 * Validate schema for common issues
 */
export function validateSchema(schema: object): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const schemaStr = JSON.stringify(schema);
  const schemaObj = schema as Record<string, unknown>;

  // Check for required fields based on type
  const type = schemaObj["@type"];

  if (type === "BlogPosting" || type === "Article") {
    if (!schemaObj.headline) errors.push("Missing headline");
    if (!schemaObj.author) errors.push("Missing author");
    if (!schemaObj.datePublished) errors.push("Missing datePublished");
    if (!schemaObj.image) warnings.push("Missing image (recommended)");
    
    const headline = schemaObj.headline as string;
    if (headline && headline.length > 110) {
      warnings.push("Headline exceeds 110 characters");
    }
  }

  if (type === "FAQPage") {
    const mainEntity = schemaObj.mainEntity as unknown[];
    if (!mainEntity || mainEntity.length === 0) {
      errors.push("FAQPage requires at least one question");
    }
  }

  if (type === "BreadcrumbList") {
    const items = schemaObj.itemListElement as unknown[];
    if (!items || items.length < 2) {
      warnings.push("BreadcrumbList should have at least 2 items");
    }
  }

  // Check for valid URLs
  const urlPattern = /https?:\/\//;
  if (schemaObj.url && !urlPattern.test(schemaObj.url as string)) {
    errors.push("Invalid URL format");
  }

  // Check for valid dates
  const dateFields = ["datePublished", "dateModified"];
  for (const field of dateFields) {
    if (schemaObj[field]) {
      const date = new Date(schemaObj[field] as string);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid date format for ${field}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
