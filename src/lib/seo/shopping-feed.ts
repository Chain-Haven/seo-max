/**
 * Shopping Feed Generator
 * Generate Google Shopping / Facebook / Bing product feeds
 */

export interface ProductFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  price: string;
  salePrice?: string;
  availability: "in stock" | "out of stock" | "preorder" | "backorder";
  brand?: string;
  gtin?: string;
  mpn?: string;
  sku?: string;
  condition?: "new" | "refurbished" | "used";
  productType?: string;
  googleProductCategory?: string;
  shipping?: {
    country: string;
    service: string;
    price: string;
  }[];
  tax?: {
    country: string;
    rate: string;
  };
  ageGroup?: "newborn" | "infant" | "toddler" | "kids" | "adult";
  color?: string;
  gender?: "male" | "female" | "unisex";
  size?: string;
  material?: string;
  pattern?: string;
  itemGroupId?: string;
}

export interface FeedValidationError {
  productId: string;
  field: string;
  message: string;
  severity: "error" | "warning";
}

// Generate Google Shopping XML Feed
export function generateGoogleShoppingFeed(
  products: ProductFeedItem[],
  options: {
    title: string;
    link: string;
    description: string;
  }
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
  xml += "  <channel>\n";
  xml += `    <title><![CDATA[${escapeXml(options.title)}]]></title>\n`;
  xml += `    <link>${escapeXml(options.link)}</link>\n`;
  xml += `    <description><![CDATA[${escapeXml(options.description)}]]></description>\n`;

  for (const product of products) {
    xml += "    <item>\n";
    xml += `      <g:id>${escapeXml(product.id)}</g:id>\n`;
    xml += `      <g:title><![CDATA[${escapeXml(product.title.substring(0, 150))}]]></g:title>\n`;
    xml += `      <g:description><![CDATA[${escapeXml(product.description.substring(0, 5000))}]]></g:description>\n`;
    xml += `      <g:link>${escapeXml(product.link)}</g:link>\n`;
    xml += `      <g:image_link>${escapeXml(product.imageLink)}</g:image_link>\n`;

    if (product.additionalImageLinks && product.additionalImageLinks.length > 0) {
      for (const imgLink of product.additionalImageLinks.slice(0, 10)) {
        xml += `      <g:additional_image_link>${escapeXml(imgLink)}</g:additional_image_link>\n`;
      }
    }

    xml += `      <g:availability>${product.availability}</g:availability>\n`;
    xml += `      <g:price>${escapeXml(product.price)}</g:price>\n`;

    if (product.salePrice) {
      xml += `      <g:sale_price>${escapeXml(product.salePrice)}</g:sale_price>\n`;
    }

    if (product.brand) {
      xml += `      <g:brand><![CDATA[${escapeXml(product.brand)}]]></g:brand>\n`;
    }

    if (product.gtin) {
      xml += `      <g:gtin>${escapeXml(product.gtin)}</g:gtin>\n`;
    }

    if (product.mpn) {
      xml += `      <g:mpn>${escapeXml(product.mpn)}</g:mpn>\n`;
    }

    if (product.condition) {
      xml += `      <g:condition>${product.condition}</g:condition>\n`;
    }

    if (product.googleProductCategory) {
      xml += `      <g:google_product_category>${escapeXml(product.googleProductCategory)}</g:google_product_category>\n`;
    }

    if (product.productType) {
      xml += `      <g:product_type><![CDATA[${escapeXml(product.productType)}]]></g:product_type>\n`;
    }

    if (product.shipping && product.shipping.length > 0) {
      for (const ship of product.shipping) {
        xml += "      <g:shipping>\n";
        xml += `        <g:country>${escapeXml(ship.country)}</g:country>\n`;
        xml += `        <g:service>${escapeXml(ship.service)}</g:service>\n`;
        xml += `        <g:price>${escapeXml(ship.price)}</g:price>\n`;
        xml += "      </g:shipping>\n";
      }
    }

    if (product.color) {
      xml += `      <g:color><![CDATA[${escapeXml(product.color)}]]></g:color>\n`;
    }

    if (product.size) {
      xml += `      <g:size><![CDATA[${escapeXml(product.size)}]]></g:size>\n`;
    }

    if (product.gender) {
      xml += `      <g:gender>${product.gender}</g:gender>\n`;
    }

    if (product.itemGroupId) {
      xml += `      <g:item_group_id>${escapeXml(product.itemGroupId)}</g:item_group_id>\n`;
    }

    xml += "    </item>\n";
  }

  xml += "  </channel>\n";
  xml += "</rss>";

  return xml;
}

// Validate product feed
export function validateProductFeed(products: ProductFeedItem[]): FeedValidationError[] {
  const errors: FeedValidationError[] = [];

  for (const product of products) {
    // Required fields
    if (!product.id || product.id.length > 50) {
      errors.push({
        productId: product.id || "unknown",
        field: "id",
        message: "ID is required and must be under 50 characters",
        severity: "error",
      });
    }

    if (!product.title || product.title.length > 150) {
      errors.push({
        productId: product.id,
        field: "title",
        message: "Title is required and must be under 150 characters",
        severity: "error",
      });
    }

    if (!product.description || product.description.length > 5000) {
      errors.push({
        productId: product.id,
        field: "description",
        message: "Description is required and must be under 5000 characters",
        severity: "error",
      });
    }

    if (!product.link || !isValidUrl(product.link)) {
      errors.push({
        productId: product.id,
        field: "link",
        message: "Valid product URL is required",
        severity: "error",
      });
    }

    if (!product.imageLink || !isValidUrl(product.imageLink)) {
      errors.push({
        productId: product.id,
        field: "image_link",
        message: "Valid image URL is required",
        severity: "error",
      });
    }

    if (!product.price || !isValidPrice(product.price)) {
      errors.push({
        productId: product.id,
        field: "price",
        message: "Valid price is required (e.g., '19.99 USD')",
        severity: "error",
      });
    }

    if (!product.availability) {
      errors.push({
        productId: product.id,
        field: "availability",
        message: "Availability is required",
        severity: "error",
      });
    }

    // Recommended fields
    if (!product.brand) {
      errors.push({
        productId: product.id,
        field: "brand",
        message: "Brand is recommended for better visibility",
        severity: "warning",
      });
    }

    if (!product.gtin && !product.mpn) {
      errors.push({
        productId: product.id,
        field: "gtin/mpn",
        message: "GTIN or MPN is recommended for product identification",
        severity: "warning",
      });
    }

    if (!product.googleProductCategory) {
      errors.push({
        productId: product.id,
        field: "google_product_category",
        message: "Google Product Category is recommended",
        severity: "warning",
      });
    }

    if (!product.condition) {
      errors.push({
        productId: product.id,
        field: "condition",
        message: "Condition is recommended (default: 'new')",
        severity: "warning",
      });
    }

    // Title optimization
    if (product.title.length < 30) {
      errors.push({
        productId: product.id,
        field: "title",
        message: "Title is too short - aim for 30-150 characters",
        severity: "warning",
      });
    }

    // Description optimization
    if (product.description.length < 200) {
      errors.push({
        productId: product.id,
        field: "description",
        message: "Description is too short - aim for 200+ characters",
        severity: "warning",
      });
    }

    // Image validation
    if (product.additionalImageLinks && product.additionalImageLinks.length > 10) {
      errors.push({
        productId: product.id,
        field: "additional_image_link",
        message: "Maximum 10 additional images allowed",
        severity: "error",
      });
    }
  }

  return errors;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidPrice(price: string): boolean {
  // Format: "19.99 USD" or "19.99"
  const match = price.match(/^\d+(\.\d{2})?\s*[A-Z]{3}?$/);
  return match !== null;
}

// Generate CSV feed for Facebook
export function generateFacebookCSVFeed(products: ProductFeedItem[]): string {
  let csv = "id,title,description,availability,condition,price,link,image_link,brand,google_product_category\n";

  for (const product of products) {
    const row = [
      product.id,
      `"${product.title.replace(/"/g, '""')}"`,
      `"${product.description.replace(/"/g, '""')}"`,
      product.availability,
      product.condition || "new",
      product.price,
      product.link,
      product.imageLink,
      product.brand || "",
      product.googleProductCategory || "",
    ];

    csv += row.join(",") + "\n";
  }

  return csv;
}
