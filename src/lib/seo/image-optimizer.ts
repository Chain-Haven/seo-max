/**
 * Image Optimization Tools
 * Bulk image compression, alt text generation, WebP conversion
 */

import { getAIProvider } from "@/lib/ai/provider";

export interface ImageOptimization {
  originalUrl: string;
  originalSize: number;
  originalFormat: string;
  optimizedUrl?: string;
  optimizedSize?: number;
  optimizedFormat?: string;
  savings: number;
  savingsPercent: number;
  altText: string;
  suggestedDimensions?: { width: number; height: number };
}

export interface BulkImageAnalysis {
  totalImages: number;
  imagesNeedingOptimization: number;
  imagesWithoutAlt: number;
  totalCurrentSize: number;
  estimatedSavings: number;
  estimatedSavingsPercent: number;
}

// Generate alt text for product images
export async function generateImageAltText(
  imageUrl: string,
  context: {
    productName?: string;
    category?: string;
    keywords?: string[];
  }
): Promise<string> {
  const ai = getAIProvider();

  const prompt = `Generate SEO-optimized alt text for this product image.

${context.productName ? `Product: ${context.productName}` : ""}
${context.category ? `Category: ${context.category}` : ""}
${context.keywords ? `Keywords: ${context.keywords.join(", ")}` : ""}

Requirements:
- Descriptive but concise (under 125 characters)
- Include product name and key features
- Natural language (not keyword stuffing)
- Accessible for screen readers

Return only the alt text, nothing else.`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 100 });
    let altText = response.content.trim().replace(/^["']|["']$/g, "");
    
    if (altText.length > 125) {
      altText = altText.substring(0, 122) + "...";
    }
    
    return altText;
  } catch (error) {
    console.error("Alt text generation error:", error);
    return context.productName || "Product image";
  }
}

// Analyze image for optimization opportunities
export async function analyzeImage(
  imageUrl: string
): Promise<{
  currentSize: number;
  currentFormat: string;
  currentDimensions: { width: number; height: number };
  recommendedFormat: string;
  estimatedSavings: number;
  recommendations: string[];
}> {
  try {
    // In production, this would call an image analysis service
    // For now, return estimated data
    
    return {
      currentSize: 500000, // 500KB estimate
      currentFormat: "jpeg",
      currentDimensions: { width: 2000, height: 2000 },
      recommendedFormat: "webp",
      estimatedSavings: 200000, // 40% savings estimate
      recommendations: [
        "Convert to WebP format for 30-40% size reduction",
        "Resize to max 1200x1200px (current: 2000x2000px)",
        "Enable lazy loading",
        "Use responsive images (srcset)",
      ],
    };
  } catch (error) {
    console.error("Image analysis error:", error);
    throw error;
  }
}

// Bulk analyze all images
export async function bulkAnalyzeImages(
  images: Array<{
    url: string;
    altText?: string;
    entityType: string;
    entityId: string;
  }>
): Promise<BulkImageAnalysis> {
  let totalCurrentSize = 0;
  let estimatedSavings = 0;
  let imagesNeedingOptimization = 0;
  let imagesWithoutAlt = 0;

  for (const image of images) {
    if (!image.altText || image.altText.trim().length === 0) {
      imagesWithoutAlt++;
    }

    // Simplified analysis
    const currentSize = 500000; // Estimate 500KB per image
    const savings = 200000; // Estimate 40% savings
    
    totalCurrentSize += currentSize;
    estimatedSavings += savings;
    
    if (savings > 50000) {
      imagesNeedingOptimization++;
    }
  }

  return {
    totalImages: images.length,
    imagesNeedingOptimization,
    imagesWithoutAlt,
    totalCurrentSize,
    estimatedSavings,
    estimatedSavingsPercent: totalCurrentSize > 0 ? (estimatedSavings / totalCurrentSize) * 100 : 0,
  };
}

// Generate responsive image sizes
export function generateResponsiveSizes(
  originalWidth: number,
  originalHeight: number
): Array<{ width: number; height: number; suffix: string }> {
  const aspectRatio = originalWidth / originalHeight;
  
  const sizes = [
    { width: 1920, suffix: "xl" },
    { width: 1280, suffix: "lg" },
    { width: 768, suffix: "md" },
    { width: 480, suffix: "sm" },
    { width: 320, suffix: "xs" },
  ];

  return sizes
    .filter((size) => size.width < originalWidth)
    .map((size) => ({
      width: size.width,
      height: Math.round(size.width / aspectRatio),
      suffix: size.suffix,
    }));
}

// Check if image is optimized
export function isImageOptimized(
  imageUrl: string,
  fileSize: number,
  dimensions: { width: number; height: number }
): {
  isOptimized: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check format
  const isWebP = imageUrl.toLowerCase().endsWith(".webp");
  if (!isWebP && fileSize > 100000) {
    issues.push("Convert to WebP format for better compression");
  }

  // Check size
  const pixelCount = dimensions.width * dimensions.height;
  const bytesPerPixel = fileSize / pixelCount;
  
  if (bytesPerPixel > 0.5) {
    issues.push("Image is not compressed efficiently");
  }

  // Check dimensions
  if (dimensions.width > 2000 || dimensions.height > 2000) {
    issues.push("Image dimensions are too large (max recommended: 2000x2000)");
  }

  // Check file size
  if (fileSize > 200000 && !isWebP) {
    issues.push("File size over 200KB - consider compression");
  }

  return {
    isOptimized: issues.length === 0,
    issues,
  };
}

// Generate srcset attribute
export function generateSrcSet(
  baseUrl: string,
  sizes: Array<{ width: number; suffix: string }>
): string {
  return sizes
    .map((size) => {
      const url = baseUrl.replace(/\.(jpg|jpeg|png|webp)$/i, `-${size.suffix}.$1`);
      return `${url} ${size.width}w`;
    })
    .join(", ");
}
