/**
 * Schema.org Validator
 * Validates structured data against schema.org specifications
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "critical";
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

// Product Schema Validation
export function validateProductSchema(schema: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  if (!schema || typeof schema !== "object") {
    return {
      isValid: false,
      errors: [{ field: "schema", message: "Schema must be an object", severity: "critical" }],
      warnings: [],
      suggestions: [],
    };
  }

  const s = schema as Record<string, unknown>;

  // Required fields
  if (!s["@context"] || s["@context"] !== "https://schema.org") {
    errors.push({
      field: "@context",
      message: "@context must be 'https://schema.org'",
      severity: "critical",
    });
  }

  if (!s["@type"] || s["@type"] !== "Product") {
    errors.push({
      field: "@type",
      message: "@type must be 'Product'",
      severity: "critical",
    });
  }

  if (!s.name || typeof s.name !== "string") {
    errors.push({
      field: "name",
      message: "Product name is required",
      severity: "error",
    });
  }

  if (!s.image) {
    errors.push({
      field: "image",
      message: "At least one image is required",
      severity: "error",
    });
  }

  if (!s.description || typeof s.description !== "string") {
    warnings.push({
      field: "description",
      message: "Product description is missing",
      recommendation: "Add a detailed product description for better visibility",
    });
  }

  // Offers validation
  if (!s.offers) {
    errors.push({
      field: "offers",
      message: "Offers object is required",
      severity: "error",
    });
  } else {
    const offers = s.offers as Record<string, unknown>;
    
    if (!offers["@type"] || !["Offer", "AggregateOffer"].includes(offers["@type"] as string)) {
      errors.push({
        field: "offers.@type",
        message: "offers.@type must be 'Offer' or 'AggregateOffer'",
        severity: "error",
      });
    }

    if (!offers.price && !offers.lowPrice) {
      errors.push({
        field: "offers.price",
        message: "Price is required",
        severity: "error",
      });
    }

    if (!offers.priceCurrency) {
      errors.push({
        field: "offers.priceCurrency",
        message: "Currency code is required (e.g., 'USD')",
        severity: "error",
      });
    }

    if (!offers.availability) {
      warnings.push({
        field: "offers.availability",
        message: "Availability status is missing",
        recommendation: "Add availability (InStock, OutOfStock, PreOrder)",
      });
    }

    if (!offers.url) {
      warnings.push({
        field: "offers.url",
        message: "Product URL is missing",
        recommendation: "Add the product page URL",
      });
    }
  }

  // Reviews
  if (s.aggregateRating) {
    const rating = s.aggregateRating as Record<string, unknown>;
    
    if (!rating.ratingValue) {
      errors.push({
        field: "aggregateRating.ratingValue",
        message: "Rating value is required if aggregateRating is present",
        severity: "error",
      });
    }

    if (!rating.reviewCount && !rating.ratingCount) {
      errors.push({
        field: "aggregateRating.reviewCount",
        message: "Review count or rating count is required",
        severity: "error",
      });
    }
  } else {
    suggestions.push("Add review schema to display star ratings in search results");
  }

  // Brand
  if (!s.brand) {
    warnings.push({
      field: "brand",
      message: "Brand information is missing",
      recommendation: "Add brand for better product identification",
    });
  }

  // SKU
  if (!s.sku && !s.mpn && !s.gtin) {
    warnings.push({
      field: "sku",
      message: "No product identifiers found",
      recommendation: "Add SKU, MPN, or GTIN for better product matching",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

// LocalBusiness Schema Validation
export function validateLocalBusinessSchema(schema: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  if (!schema || typeof schema !== "object") {
    return {
      isValid: false,
      errors: [{ field: "schema", message: "Schema must be an object", severity: "critical" }],
      warnings: [],
      suggestions: [],
    };
  }

  const s = schema as Record<string, unknown>;

  // Required fields
  if (!s["@context"]) {
    errors.push({ field: "@context", message: "@context is required", severity: "critical" });
  }

  if (!s["@type"] || typeof s["@type"] !== "string") {
    errors.push({ field: "@type", message: "@type is required", severity: "critical" });
  }

  if (!s.name) {
    errors.push({ field: "name", message: "Business name is required", severity: "error" });
  }

  if (!s.address) {
    errors.push({ field: "address", message: "Address is required", severity: "error" });
  } else {
    const address = s.address as Record<string, unknown>;
    
    if (!address.streetAddress) {
      warnings.push({
        field: "address.streetAddress",
        message: "Street address is missing",
        recommendation: "Add full street address",
      });
    }

    if (!address.addressLocality) {
      warnings.push({
        field: "address.addressLocality",
        message: "City is missing",
        recommendation: "Add city name",
      });
    }

    if (!address.postalCode) {
      warnings.push({
        field: "address.postalCode",
        message: "Postal code is missing",
        recommendation: "Add postal code for better local SEO",
      });
    }
  }

  if (!s.telephone) {
    warnings.push({
      field: "telephone",
      message: "Phone number is missing",
      recommendation: "Add phone number for customer contact",
    });
  }

  if (!s.openingHoursSpecification) {
    warnings.push({
      field: "openingHoursSpecification",
      message: "Opening hours are missing",
      recommendation: "Add business hours for better local visibility",
    });
  }

  if (!s.geo) {
    warnings.push({
      field: "geo",
      message: "Geographic coordinates are missing",
      recommendation: "Add latitude/longitude for map display",
    });
  }

  if (!s.url) {
    warnings.push({
      field: "url",
      message: "Website URL is missing",
      recommendation: "Add your website URL",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

// Article Schema Validation
export function validateArticleSchema(schema: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  if (!schema || typeof schema !== "object") {
    return {
      isValid: false,
      errors: [{ field: "schema", message: "Schema must be an object", severity: "critical" }],
      warnings: [],
      suggestions: [],
    };
  }

  const s = schema as Record<string, unknown>;

  if (!s.headline) {
    errors.push({ field: "headline", message: "Article headline is required", severity: "error" });
  }

  if (!s.author) {
    warnings.push({
      field: "author",
      message: "Author information is missing",
      recommendation: "Add author for authorship markup",
    });
  }

  if (!s.datePublished) {
    errors.push({ field: "datePublished", message: "Publication date is required", severity: "error" });
  }

  if (!s.image) {
    warnings.push({
      field: "image",
      message: "Article image is missing",
      recommendation: "Add featured image (required for rich results)",
    });
  }

  if (!s.publisher) {
    warnings.push({
      field: "publisher",
      message: "Publisher information is missing",
      recommendation: "Add publisher with name and logo",
    });
  } else {
    const publisher = s.publisher as Record<string, unknown>;
    
    if (!publisher.logo) {
      warnings.push({
        field: "publisher.logo",
        message: "Publisher logo is missing",
        recommendation: "Add logo (60x600px, required for rich results)",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

// FAQ Schema Validation
export function validateFAQSchema(schema: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  if (!schema || typeof schema !== "object") {
    return {
      isValid: false,
      errors: [{ field: "schema", message: "Schema must be an object", severity: "critical" }],
      warnings: [],
      suggestions: [],
    };
  }

  const s = schema as Record<string, unknown>;

  if (!s.mainEntity || !Array.isArray(s.mainEntity)) {
    errors.push({
      field: "mainEntity",
      message: "mainEntity array is required with at least one Q&A pair",
      severity: "error",
    });
  } else {
    const entities = s.mainEntity as Array<Record<string, unknown>>;
    
    if (entities.length < 2) {
      warnings.push({
        field: "mainEntity",
        message: "Only one Q&A pair found",
        recommendation: "Add at least 2-3 questions for FAQ rich results",
      });
    }

    entities.forEach((entity, index) => {
      if (!entity.name) {
        errors.push({
          field: `mainEntity[${index}].name`,
          message: "Question text is required",
          severity: "error",
        });
      }

      if (!entity.acceptedAnswer) {
        errors.push({
          field: `mainEntity[${index}].acceptedAnswer`,
          message: "Answer is required",
          severity: "error",
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

// Breadcrumb Schema Validation
export function validateBreadcrumbSchema(schema: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  if (!schema || typeof schema !== "object") {
    return {
      isValid: false,
      errors: [{ field: "schema", message: "Schema must be an object", severity: "critical" }],
      warnings: [],
      suggestions: [],
    };
  }

  const s = schema as Record<string, unknown>;

  if (!s.itemListElement || !Array.isArray(s.itemListElement)) {
    errors.push({
      field: "itemListElement",
      message: "itemListElement array is required",
      severity: "error",
    });
  } else {
    const items = s.itemListElement as Array<Record<string, unknown>>;
    
    if (items.length < 2) {
      warnings.push({
        field: "itemListElement",
        message: "Breadcrumb should have at least 2 items",
        recommendation: "Add more breadcrumb levels",
      });
    }

    items.forEach((item, index) => {
      if (!item.position) {
        errors.push({
          field: `itemListElement[${index}].position`,
          message: "Position is required",
          severity: "error",
        });
      }

      if (!item.item) {
        errors.push({
          field: `itemListElement[${index}].item`,
          message: "Item URL is required",
          severity: "error",
        });
      }

      if (!item.name) {
        errors.push({
          field: `itemListElement[${index}].name`,
          message: "Item name is required",
          severity: "error",
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

// Universal validator
export function validateSchema(schemaType: string, schema: unknown): ValidationResult {
  switch (schemaType) {
    case "Product":
      return validateProductSchema(schema);
    case "LocalBusiness":
    case "Store":
    case "Restaurant":
      return validateLocalBusinessSchema(schema);
    case "Article":
    case "BlogPosting":
    case "NewsArticle":
      return validateArticleSchema(schema);
    case "FAQPage":
      return validateFAQSchema(schema);
    case "BreadcrumbList":
      return validateBreadcrumbSchema(schema);
    default:
      return {
        isValid: true,
        errors: [],
        warnings: [{
          field: "@type",
          message: `Schema type '${schemaType}' validation not implemented`,
          recommendation: "Manual validation recommended",
        }],
        suggestions: [],
      };
  }
}

// Test schema in Google's Rich Results Test (simulated)
export async function testInGoogleRichResults(schema: unknown): Promise<{
  valid: boolean;
  warnings: string[];
  richResultsEligible: boolean;
  richResultType?: string;
}> {
  // In production, this would call Google's Rich Results Test API
  // For now, we'll do basic validation
  
  const schemaType = (schema as Record<string, unknown>)["@type"] as string;
  const validation = validateSchema(schemaType, schema);

  return {
    valid: validation.isValid,
    warnings: validation.warnings.map((w) => `${w.field}: ${w.message}`),
    richResultsEligible: validation.isValid && validation.warnings.length < 3,
    richResultType: schemaType,
  };
}
