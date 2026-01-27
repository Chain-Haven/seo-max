"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateImageAltText } from "@/lib/seo/image-optimizer";
import { optimizeProductSEO } from "@/lib/seo/woocommerce-seo";

// ==================== BULK META UPDATE ====================

export async function bulkUpdateMeta(
  storeId: string,
  entityType: "product" | "page" | "blog_post",
  updates: Array<{ entityId: string; metaTitle?: string; metaDescription?: string }>
): Promise<{ data: { updated: number } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const tableName = entityType === "product" ? "products" : entityType === "page" ? "pages" : "blog_posts";

    let updated = 0;
    for (const update of updates) {
      const { error } = await supabase
        .from(tableName)
        .update({
          meta_title: update.metaTitle,
          meta_description: update.metaDescription,
          updated_at: new Date().toISOString(),
        })
        .eq("id", update.entityId);

      if (!error) updated++;
    }

    revalidatePath(`/dashboard/stores/${storeId}/${entityType}s`);

    return { data: { updated }, error: null };
  } catch (error) {
    console.error("Bulk meta update error:", error);
    return { data: null, error: "Failed to update meta" };
  }
}

// ==================== BULK ALT TEXT GENERATION ====================

export async function bulkGenerateAltText(
  storeId: string,
  productIds: string[]
): Promise<{ data: { generated: number } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    let generated = 0;

    for (const productId of productIds) {
      const { data: product } = await supabase
        .from("products")
        .select("name, category, images")
        .eq("id", productId)
        .single();

      if (!product) continue;

      const images = (product.images as string[]) || [];
      const altTexts: string[] = [];

      for (const imageUrl of images) {
        const altText = await generateImageAltText(imageUrl, {
          productName: product.name,
          category: product.category,
        });
        altTexts.push(altText);
      }

      // Save back to product
      await supabase
        .from("products")
        .update({
          images: images.map((url, i) => ({ url, alt: altTexts[i] })),
        })
        .eq("id", productId);

      generated++;

      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    revalidatePath(`/dashboard/stores/${storeId}/products`);

    return { data: { generated }, error: null };
  } catch (error) {
    console.error("Bulk alt text generation error:", error);
    return { data: null, error: "Failed to generate alt text" };
  }
}

// ==================== BULK REDIRECTS ====================

export async function bulkCreateRedirects(
  storeId: string,
  redirects: Array<{ source: string; target: string; type: "301" | "302" }>
): Promise<{ data: { created: number } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const serviceClient = await createServiceClient();

    let created = 0;
    for (const redirect of redirects) {
      const { error } = await serviceClient.from("redirects").insert({
        store_id: storeId,
        source_url: redirect.source,
        target_url: redirect.target,
        redirect_type: redirect.type,
        is_active: true,
      });

      if (!error) created++;
    }

    revalidatePath(`/dashboard/stores/${storeId}/redirects`);

    return { data: { created }, error: null };
  } catch (error) {
    console.error("Bulk redirect creation error:", error);
    return { data: null, error: "Failed to create redirects" };
  }
}

// ==================== BULK SCHEMA GENERATION ====================

export async function bulkGenerateSchema(
  storeId: string,
  entityType: "product" | "page" | "blog_post",
  entityIds: string[]
): Promise<{ data: { generated: number } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const tableName = entityType === "product" ? "products" : entityType === "page" ? "pages" : "blog_posts";

    let generated = 0;

    for (const entityId of entityIds) {
      // Get entity data
      const { data: entity } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", entityId)
        .single();

      if (!entity) continue;

      // Generate schema (simplified - would use schema-generator.ts)
      const schema = {
        "@context": "https://schema.org",
        "@type": entityType === "product" ? "Product" : "WebPage",
        name: entity.name || entity.title,
        description: entity.description || entity.meta_description,
      };

      // Save schema
      await supabase
        .from(tableName)
        .update({ schema_markup: schema })
        .eq("id", entityId);

      generated++;
    }

    revalidatePath(`/dashboard/stores/${storeId}/${entityType}s`);

    return { data: { generated }, error: null };
  } catch (error) {
    console.error("Bulk schema generation error:", error);
    return { data: null, error: "Failed to generate schemas" };
  }
}

// ==================== BULK IMAGE OPTIMIZATION ====================

export async function queueBulkImageOptimization(
  storeId: string,
  imageUrls: string[]
): Promise<{ data: { queued: number } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const serviceClient = await createServiceClient();

    let queued = 0;
    for (const imageUrl of imageUrls) {
      const { error } = await serviceClient.from("image_optimization_queue").insert({
        store_id: storeId,
        image_url: imageUrl,
        status: "pending",
        suggested_format: "webp",
        estimated_savings_percent: 40,
      });

      if (!error) queued++;
    }

    revalidatePath(`/dashboard/stores/${storeId}/images`);

    return { data: { queued }, error: null };
  } catch (error) {
    console.error("Bulk image optimization error:", error);
    return { data: null, error: "Failed to queue images" };
  }
}
