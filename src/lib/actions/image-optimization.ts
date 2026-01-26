"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAIProvider } from "@/lib/ai/provider";

interface ImageIssue {
  id: string;
  imageUrl: string;
  imageName: string;
  entityType: string;
  entityId: string;
  entityTitle: string;
  issues: {
    missingAltText: boolean;
    poorAltText: boolean;
    largeFileSize: boolean;
    wrongFormat: boolean;
    oversized: boolean;
  };
  currentAltText: string | null;
  suggestedAltText: string | null;
  estimatedSizeKb: number | null;
  suggestedFormat: string | null;
  priority: "low" | "medium" | "high" | "critical";
}

// Analyze images for optimization opportunities
export async function analyzeImages(
  storeId: string
): Promise<{ data: ImageIssue[] | null; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get products with images
    const { data: products } = await supabase
      .from("products")
      .select("id, name, image_url, image_alt")
      .eq("store_id", storeId);

    // Get pages (which might have images in content)
    const { data: pages } = await supabase
      .from("pages")
      .select("id, title, content")
      .eq("store_id", storeId);

    const imageIssues: ImageIssue[] = [];
    const serviceClient = await createServiceClient();

    // Analyze product images
    for (const product of products || []) {
      if (!product.image_url) continue;

      const issues = {
        missingAltText: !product.image_alt || product.image_alt.trim() === "",
        poorAltText: product.image_alt && (
          product.image_alt.length < 10 ||
          product.image_alt.toLowerCase().includes("image") ||
          product.image_alt.toLowerCase().includes("photo") ||
          /^img_?\d+/i.test(product.image_alt) ||
          /^dsc_?\d+/i.test(product.image_alt)
        ),
        largeFileSize: false, // Would need actual file check
        wrongFormat: !product.image_url.match(/\.(webp|avif)$/i),
        oversized: false, // Would need actual dimension check
      };

      const hasIssues = Object.values(issues).some(Boolean);
      if (!hasIssues) continue;

      const issueCount = Object.values(issues).filter(Boolean).length;

      // Save to queue
      await serviceClient.from("image_optimization_queue").upsert({
        store_id: storeId,
        image_url: product.image_url,
        image_name: product.image_url.split("/").pop() || "unknown",
        associated_entity_type: "product",
        associated_entity_id: product.id,
        has_alt_text: !!product.image_alt,
        current_alt_text: product.image_alt,
        suggested_format: product.image_url.match(/\.(webp|avif)$/i) ? null : "webp",
        status: "pending",
      }, { onConflict: "store_id,image_url" });

      imageIssues.push({
        id: product.id,
        imageUrl: product.image_url,
        imageName: product.image_url.split("/").pop() || "unknown",
        entityType: "product",
        entityId: product.id,
        entityTitle: product.name,
        issues,
        currentAltText: product.image_alt,
        suggestedAltText: null,
        estimatedSizeKb: null,
        suggestedFormat: product.image_url.match(/\.(webp|avif)$/i) ? null : "webp",
        priority: issueCount >= 3 ? "critical" : issueCount >= 2 ? "high" : "medium",
      });
    }

    // Extract images from page content
    for (const page of pages || []) {
      if (!page.content) continue;

      // Find images in content (simple regex for img tags and markdown images)
      const imgTagMatches = page.content.match(/<img[^>]+>/gi) || [];
      const mdImageMatches = page.content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];

      for (const imgTag of imgTagMatches) {
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);

        if (!srcMatch) continue;

        const imgUrl = srcMatch[1];
        const altText = altMatch ? altMatch[1] : null;

        const issues = {
          missingAltText: !altText || altText.trim() === "",
          poorAltText: altText ? (
            altText.length < 10 ||
            altText.toLowerCase().includes("image") ||
            /^img_?\d+/i.test(altText)
          ) : false,
          largeFileSize: false,
          wrongFormat: !imgUrl.match(/\.(webp|avif)$/i),
          oversized: false,
        };

        const hasIssues = Object.values(issues).some(Boolean);
        if (!hasIssues) continue;

        const issueCount = Object.values(issues).filter(Boolean).length;

        imageIssues.push({
          id: `${page.id}-${imgUrl}`,
          imageUrl: imgUrl,
          imageName: imgUrl.split("/").pop() || "unknown",
          entityType: "page",
          entityId: page.id,
          entityTitle: page.title,
          issues,
          currentAltText: altText,
          suggestedAltText: null,
          estimatedSizeKb: null,
          suggestedFormat: imgUrl.match(/\.(webp|avif)$/i) ? null : "webp",
          priority: issueCount >= 3 ? "critical" : issueCount >= 2 ? "high" : "medium",
        });
      }
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    imageIssues.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return { data: imageIssues, error: null };
  } catch (error) {
    console.error("Error analyzing images:", error);
    return { data: null, error: "Failed to analyze images" };
  }
}

// Generate alt text suggestions for images
export async function generateAltTextSuggestions(
  storeId: string,
  images: Array<{ entityType: string; entityId: string; entityTitle: string; imageUrl: string; currentAltText: string | null }>
): Promise<{ data: Array<{ imageUrl: string; suggestedAltText: string }> | null; error: string | null }> {
  try {
    const ai = getAIProvider();
    const suggestions: Array<{ imageUrl: string; suggestedAltText: string }> = [];

    // Process in batches of 5
    const batchSize = 5;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      
      const prompt = `Generate SEO-optimized alt text for the following images. Each alt text should:
- Be descriptive and specific (50-125 characters)
- Include relevant keywords naturally
- Describe what's in the image accurately
- Be useful for screen readers

Images:
${batch.map((img, idx) => `${idx + 1}. ${img.entityTitle} (${img.entityType}): ${img.imageUrl}
   Current alt: ${img.currentAltText || "None"}`).join("\n")}

Format your response as:
1. [alt text for image 1]
2. [alt text for image 2]
etc.`;

      const response = await ai.generateText(prompt, { maxTokens: 500 });

      // Parse response
      const lines = response.content.split("\n").filter((line) => /^\d+\./.test(line.trim()));
      
      batch.forEach((img, idx) => {
        const line = lines[idx];
        if (line) {
          const altText = line.replace(/^\d+\.\s*/, "").trim();
          suggestions.push({
            imageUrl: img.imageUrl,
            suggestedAltText: altText,
          });
        }
      });
    }

    // Save suggestions to database
    const serviceClient = await createServiceClient();
    for (const img of images) {
      const suggestion = suggestions.find((s) => s.imageUrl === img.imageUrl);
      if (suggestion) {
        await serviceClient.from("seo_improvements").insert({
          store_id: storeId,
          improvement_type: "image_optimization",
          entity_type: img.entityType,
          entity_id: img.entityId,
          entity_title: img.entityTitle,
          entity_url: img.imageUrl,
          current_value: { altText: img.currentAltText, imageUrl: img.imageUrl },
          suggested_value: { altText: suggestion.suggestedAltText, imageUrl: img.imageUrl },
          priority: img.currentAltText ? "medium" : "high",
          impact_score: img.currentAltText ? 40 : 70,
          reason: img.currentAltText 
            ? "Alt text could be improved for better SEO"
            : "Missing alt text - critical for accessibility and SEO",
        });
      }
    }

    revalidatePath(`/dashboard/stores/${storeId}/improvements`);

    return { data: suggestions, error: null };
  } catch (error) {
    console.error("Error generating alt text:", error);
    return { data: null, error: "Failed to generate alt text suggestions" };
  }
}

// Apply alt text update
export async function applyAltTextUpdate(
  storeId: string,
  improvementId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get the improvement
    const { data: improvement } = await supabase
      .from("seo_improvements")
      .select("*")
      .eq("id", improvementId)
      .single();

    if (!improvement) {
      return { success: false, error: "Improvement not found" };
    }

    const newAltText = (improvement.suggested_value as { altText: string })?.altText;
    if (!newAltText) {
      return { success: false, error: "No suggested alt text found" };
    }

    // For products, update the image_alt field
    if (improvement.entity_type === "product") {
      const { error: updateError } = await supabase
        .from("products")
        .update({ image_alt: newAltText })
        .eq("id", improvement.entity_id);

      if (updateError) throw updateError;
    }
    // For pages, we'd need to update the content HTML - more complex
    // For now, mark as applied (the actual push would happen via the plugin)

    // Mark improvement as applied
    await supabase
      .from("seo_improvements")
      .update({ 
        status: "applied", 
        applied_at: new Date().toISOString() 
      })
      .eq("id", improvementId);

    revalidatePath(`/dashboard/stores/${storeId}`);
    return { success: true, error: null };
  } catch (error) {
    console.error("Error applying alt text:", error);
    return { success: false, error: "Failed to apply alt text update" };
  }
}

// Bulk apply alt text updates
export async function bulkApplyAltText(
  storeId: string,
  improvementIds: string[]
): Promise<{ success: boolean; applied: number; failed: number; error: string | null }> {
  let applied = 0;
  let failed = 0;

  for (const id of improvementIds) {
    const result = await applyAltTextUpdate(storeId, id);
    if (result.success) {
      applied++;
    } else {
      failed++;
    }
  }

  return { success: failed === 0, applied, failed, error: null };
}
