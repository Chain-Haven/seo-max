"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAIProvider } from "@/lib/ai/provider";

export interface BulkUpdateResult {
  updated: number;
  failed: number;
  errors: string[];
}

// Bulk update meta titles
export async function bulkUpdateMetaTitles(
  storeId: string,
  contentType: "products" | "pages" | "blog_posts",
  updates: Array<{ id: string; metaTitle: string }>
): Promise<BulkUpdateResult> {
  const supabase = await createClient();
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const update of updates) {
    const { error } = await supabase
      .from(contentType)
      .update({ seo_meta_title: update.metaTitle, updated_at: new Date().toISOString() })
      .eq("id", update.id)
      .eq("store_id", storeId);

    if (error) {
      failed++;
      errors.push(`${update.id}: ${error.message}`);
    } else {
      updated++;
    }
  }

  revalidatePath(`/dashboard/stores/${storeId}/${contentType}`);
  return { updated, failed, errors };
}

// Bulk update meta descriptions
export async function bulkUpdateMetaDescriptions(
  storeId: string,
  contentType: "products" | "pages" | "blog_posts",
  updates: Array<{ id: string; metaDescription: string }>
): Promise<BulkUpdateResult> {
  const supabase = await createClient();
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const update of updates) {
    const { error } = await supabase
      .from(contentType)
      .update({ seo_meta_description: update.metaDescription, updated_at: new Date().toISOString() })
      .eq("id", update.id)
      .eq("store_id", storeId);

    if (error) {
      failed++;
      errors.push(`${update.id}: ${error.message}`);
    } else {
      updated++;
    }
  }

  revalidatePath(`/dashboard/stores/${storeId}/${contentType}`);
  return { updated, failed, errors };
}

// Bulk generate meta with AI
export async function bulkGenerateMetaTitles(
  storeId: string,
  contentType: "products" | "pages" | "blog_posts",
  ids: string[]
): Promise<BulkUpdateResult> {
  const supabase = await createClient();
  const ai = getAIProvider();
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  // Get content items
  const { data: items } = await supabase
    .from(contentType)
    .select("id, name, title, description, content")
    .eq("store_id", storeId)
    .in("id", ids);

  if (!items) {
    return { updated: 0, failed: ids.length, errors: ["Failed to fetch items"] };
  }

  for (const item of items) {
    const title = item.name || item.title || "";
    const description = item.description || item.content || "";

    if (!title) {
      failed++;
      errors.push(`${item.id}: No title/name found`);
      continue;
    }

    try {
      const prompt = `Generate an SEO-optimized meta title for this ${contentType.slice(0, -1)}:
Title: ${title}
Description: ${description.substring(0, 300)}

Requirements:
- Maximum 60 characters
- Include primary keyword naturally
- Make it compelling for clicks
- Don't include brand name at start

Return ONLY the meta title, nothing else.`;

      const response = await ai.generateText(prompt, { maxTokens: 100 });
      const metaTitle = response.content.trim().replace(/^["']|["']$/g, "");

      const { error } = await supabase
        .from(contentType)
        .update({ seo_meta_title: metaTitle.substring(0, 70), updated_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) {
        failed++;
        errors.push(`${item.id}: ${error.message}`);
      } else {
        updated++;
      }
    } catch (e) {
      failed++;
      errors.push(`${item.id}: AI generation failed`);
    }
  }

  revalidatePath(`/dashboard/stores/${storeId}/${contentType}`);
  return { updated, failed, errors };
}

export async function bulkGenerateMetaDescriptions(
  storeId: string,
  contentType: "products" | "pages" | "blog_posts",
  ids: string[]
): Promise<BulkUpdateResult> {
  const supabase = await createClient();
  const ai = getAIProvider();
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  const { data: items } = await supabase
    .from(contentType)
    .select("id, name, title, description, content")
    .eq("store_id", storeId)
    .in("id", ids);

  if (!items) {
    return { updated: 0, failed: ids.length, errors: ["Failed to fetch items"] };
  }

  for (const item of items) {
    const title = item.name || item.title || "";
    const description = item.description || item.content || "";

    try {
      const prompt = `Generate an SEO-optimized meta description for this ${contentType.slice(0, -1)}:
Title: ${title}
Content: ${description.substring(0, 500)}

Requirements:
- Between 150-160 characters
- Include a call to action
- Mention key benefits
- Make it compelling for clicks

Return ONLY the meta description, nothing else.`;

      const response = await ai.generateText(prompt, { maxTokens: 200 });
      const metaDesc = response.content.trim().replace(/^["']|["']$/g, "");

      const { error } = await supabase
        .from(contentType)
        .update({ seo_meta_description: metaDesc.substring(0, 170), updated_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) {
        failed++;
        errors.push(`${item.id}: ${error.message}`);
      } else {
        updated++;
      }
    } catch (e) {
      failed++;
      errors.push(`${item.id}: AI generation failed`);
    }
  }

  revalidatePath(`/dashboard/stores/${storeId}/${contentType}`);
  return { updated, failed, errors };
}

// Bulk update image alt texts
export async function bulkUpdateAltTexts(
  storeId: string,
  updates: Array<{ productId: string; imageUrl: string; altText: string }>
): Promise<BulkUpdateResult> {
  // This would integrate with the WordPress plugin to update image alt texts
  // For now, we'll store them in product metadata
  const supabase = await createClient();
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const update of updates) {
    const { data: product } = await supabase
      .from("products")
      .select("image_alt_texts")
      .eq("id", update.productId)
      .single();

    const altTexts = (product?.image_alt_texts as Record<string, string>) || {};
    altTexts[update.imageUrl] = update.altText;

    const { error } = await supabase
      .from("products")
      .update({ image_alt_texts: altTexts, updated_at: new Date().toISOString() })
      .eq("id", update.productId);

    if (error) {
      failed++;
      errors.push(`${update.productId}: ${error.message}`);
    } else {
      updated++;
    }
  }

  return { updated, failed, errors };
}

// Bulk generate alt texts with AI
export async function bulkGenerateAltTexts(
  storeId: string,
  productIds: string[]
): Promise<BulkUpdateResult> {
  const supabase = await createClient();
  const ai = getAIProvider();
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, images")
    .eq("store_id", storeId)
    .in("id", productIds);

  if (!products) {
    return { updated: 0, failed: productIds.length, errors: ["Failed to fetch products"] };
  }

  for (const product of products) {
    const images = (product.images as string[]) || [];
    if (images.length === 0) continue;

    try {
      const prompt = `Generate SEO-optimized alt texts for ${images.length} product images.
Product: ${product.name}
Description: ${product.description?.substring(0, 200) || ""}

Requirements for each alt text:
- Describe the image content
- Include the product name naturally
- Keep under 125 characters
- Be descriptive for accessibility

Return a JSON array of alt texts, one for each image:
["alt text 1", "alt text 2", ...]`;

      const response = await ai.generateText(prompt, { maxTokens: 500 });
      const match = response.content.match(/\[[\s\S]*\]/);

      if (match) {
        const altTexts: string[] = JSON.parse(match[0]);
        const altTextMap: Record<string, string> = {};

        images.forEach((img, i) => {
          if (altTexts[i]) {
            altTextMap[img] = altTexts[i];
          }
        });

        const { error } = await supabase
          .from("products")
          .update({ image_alt_texts: altTextMap, updated_at: new Date().toISOString() })
          .eq("id", product.id);

        if (error) {
          failed++;
          errors.push(`${product.id}: ${error.message}`);
        } else {
          updated++;
        }
      }
    } catch (e) {
      failed++;
      errors.push(`${product.id}: Alt text generation failed`);
    }
  }

  return { updated, failed, errors };
}

// Find and replace in meta fields
export async function bulkFindReplace(
  storeId: string,
  contentType: "products" | "pages" | "blog_posts",
  field: "seo_meta_title" | "seo_meta_description",
  find: string,
  replace: string
): Promise<BulkUpdateResult> {
  const supabase = await createClient();

  // Get all items with the search term
  const { data: items } = await supabase
    .from(contentType)
    .select(`id, ${field}`)
    .eq("store_id", storeId)
    .ilike(field, `%${find}%`);

  if (!items || items.length === 0) {
    return { updated: 0, failed: 0, errors: [] };
  }

  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of items) {
    const currentValue = (item as Record<string, string>)[field] || "";
    const newValue = currentValue.replace(new RegExp(find, "gi"), replace);

    const { error } = await supabase
      .from(contentType)
      .update({ [field]: newValue, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (error) {
      failed++;
      errors.push(`${item.id}: ${error.message}`);
    } else {
      updated++;
    }
  }

  revalidatePath(`/dashboard/stores/${storeId}/${contentType}`);
  return { updated, failed, errors };
}

// Export SEO data to CSV
export async function exportSEOData(
  storeId: string,
  contentType: "products" | "pages" | "blog_posts"
): Promise<{ data: string | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(contentType)
    .select("*")
    .eq("store_id", storeId);

  if (error || !data) {
    return { data: null, error: error?.message || "Failed to fetch data" };
  }

  const headers = ["ID", "Name/Title", "Meta Title", "Meta Description", "URL"];
  const rows = data.map((item) => [
    item.id,
    item.name || item.title || "",
    item.seo_meta_title || "",
    item.seo_meta_description || "",
    item.url || item.slug || "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","))].join(
    "\n"
  );

  return { data: csv, error: null };
}
