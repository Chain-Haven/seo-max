"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateMetaTitle, generateMetaDescription, generateImageAltText } from "@/lib/ai";

// Get all products for a store
export async function getStoreProducts(storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return data || [];
}

// Get all pages for a store
export async function getStorePages(storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("store_id", storeId)
    .order("title", { ascending: true });

  if (error) {
    console.error("Error fetching pages:", error);
    return [];
  }

  return data || [];
}

// Get all blog posts for a store
export async function getStoreBlogPosts(storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }

  return data || [];
}

// Update product SEO fields
export async function updateProductSEO(
  productId: string,
  data: {
    meta_title?: string;
    meta_description?: string;
    images?: unknown;
    schema_markup?: unknown;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    console.error("Error updating product SEO:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/stores");
  return { success: true };
}

// Update page SEO fields
export async function updatePageSEO(
  pageId: string,
  data: {
    meta_title?: string;
    meta_description?: string;
    schema_markup?: unknown;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("pages")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId);

  if (error) {
    console.error("Error updating page SEO:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/stores");
  return { success: true };
}

// Update blog post SEO fields
export async function updateBlogPostSEO(
  postId: string,
  data: {
    title?: string;
    content?: string;
    meta_title?: string;
    meta_description?: string;
    status?: "draft" | "pending" | "published";
    schema_markup?: unknown;
  }
) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  if (data.status === "published" && !data.title) {
    updateData.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("blog_posts")
    .update(updateData)
    .eq("id", postId);

  if (error) {
    console.error("Error updating blog post SEO:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/stores");
  return { success: true };
}

// Generate AI meta title for a product
export async function generateProductMetaTitle(productId: string) {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("name, description")
    .eq("id", productId)
    .single();

  if (error || !product) {
    return { success: false, error: "Product not found" };
  }

  try {
    const metaTitle = await generateMetaTitle(
      product.name,
      product.description || ""
    );

    return { success: true, metaTitle };
  } catch (err) {
    console.error("Error generating meta title:", err);
    return { success: false, error: "Failed to generate meta title" };
  }
}

// Generate AI meta description for a product
export async function generateProductMetaDescription(productId: string) {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("name, description")
    .eq("id", productId)
    .single();

  if (error || !product) {
    return { success: false, error: "Product not found" };
  }

  try {
    const metaDescription = await generateMetaDescription(
      product.name,
      product.description || ""
    );

    return { success: true, metaDescription };
  } catch (err) {
    console.error("Error generating meta description:", err);
    return { success: false, error: "Failed to generate meta description" };
  }
}

// Generate AI meta title for a page
export async function generatePageMetaTitle(pageId: string) {
  const supabase = await createClient();

  const { data: page, error } = await supabase
    .from("pages")
    .select("title, page_type")
    .eq("id", pageId)
    .single();

  if (error || !page) {
    return { success: false, error: "Page not found" };
  }

  try {
    const metaTitle = await generateMetaTitle(
      page.title,
      `${page.page_type} page`
    );

    return { success: true, metaTitle };
  } catch (err) {
    console.error("Error generating meta title:", err);
    return { success: false, error: "Failed to generate meta title" };
  }
}

// Generate AI meta description for a page
export async function generatePageMetaDescription(pageId: string) {
  const supabase = await createClient();

  const { data: page, error } = await supabase
    .from("pages")
    .select("title, page_type")
    .eq("id", pageId)
    .single();

  if (error || !page) {
    return { success: false, error: "Page not found" };
  }

  try {
    const metaDescription = await generateMetaDescription(
      page.title,
      `${page.page_type} page`
    );

    return { success: true, metaDescription };
  } catch (err) {
    console.error("Error generating meta description:", err);
    return { success: false, error: "Failed to generate meta description" };
  }
}

// Generate AI alt text for an image
export async function generateAltText(
  productId: string,
  imageIndex: number
) {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("name, images")
    .eq("id", productId)
    .single();

  if (error || !product) {
    return { success: false, error: "Product not found" };
  }

  try {
    const altText = await generateImageAltText(
      product.name,
      `Product image ${imageIndex + 1}`
    );

    return { success: true, altText };
  } catch (err) {
    console.error("Error generating alt text:", err);
    return { success: false, error: "Failed to generate alt text" };
  }
}

// Bulk update products SEO
export async function bulkUpdateProductsSEO(
  updates: Array<{
    id: string;
    meta_title?: string;
    meta_description?: string;
  }>
) {
  const supabase = await createClient();
  
  const results = [];
  
  for (const update of updates) {
    const { error } = await supabase
      .from("products")
      .update({
        meta_title: update.meta_title,
        meta_description: update.meta_description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", update.id);

    results.push({
      id: update.id,
      success: !error,
      error: error?.message,
    });
  }

  revalidatePath("/dashboard/stores");
  return { success: true, results };
}

// Get SEO audit for a store
export async function getStoreSEOAudit(storeId: string) {
  const supabase = await createClient();

  // Get products with missing SEO
  const { data: products } = await supabase
    .from("products")
    .select("id, name, meta_title, meta_description, images")
    .eq("store_id", storeId);

  // Get pages with missing SEO
  const { data: pages } = await supabase
    .from("pages")
    .select("id, title, meta_title, meta_description")
    .eq("store_id", storeId);

  // Get blog posts with missing SEO
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, meta_title, meta_description")
    .eq("store_id", storeId);

  const issues = [];

  // Check products
  for (const product of products || []) {
    if (!product.meta_title) {
      issues.push({
        type: "product",
        id: product.id,
        name: product.name,
        issue: "missing_meta_title",
        severity: "high",
      });
    }
    if (!product.meta_description) {
      issues.push({
        type: "product",
        id: product.id,
        name: product.name,
        issue: "missing_meta_description",
        severity: "high",
      });
    }
    // Check for images without alt text
    const images = product.images as Array<{ alt?: string }> | null;
    if (images) {
      const missingAlt = images.filter((img) => !img.alt).length;
      if (missingAlt > 0) {
        issues.push({
          type: "product",
          id: product.id,
          name: product.name,
          issue: "missing_image_alt",
          severity: "medium",
          count: missingAlt,
        });
      }
    }
  }

  // Check pages
  for (const page of pages || []) {
    if (!page.meta_title) {
      issues.push({
        type: "page",
        id: page.id,
        name: page.title,
        issue: "missing_meta_title",
        severity: "high",
      });
    }
    if (!page.meta_description) {
      issues.push({
        type: "page",
        id: page.id,
        name: page.title,
        issue: "missing_meta_description",
        severity: "medium",
      });
    }
  }

  // Check blog posts
  for (const post of posts || []) {
    if (!post.meta_title) {
      issues.push({
        type: "blog_post",
        id: post.id,
        name: post.title,
        issue: "missing_meta_title",
        severity: "medium",
      });
    }
    if (!post.meta_description) {
      issues.push({
        type: "blog_post",
        id: post.id,
        name: post.title,
        issue: "missing_meta_description",
        severity: "medium",
      });
    }
  }

  const stats = {
    totalProducts: products?.length || 0,
    totalPages: pages?.length || 0,
    totalPosts: posts?.length || 0,
    issuesCount: issues.length,
    highSeverity: issues.filter((i) => i.severity === "high").length,
    mediumSeverity: issues.filter((i) => i.severity === "medium").length,
  };

  return { issues, stats };
}

// Push SEO changes to WordPress
export async function pushSEOChangesToWordPress(
  storeId: string,
  type: "product" | "page" | "post",
  itemId: string
) {
  const supabase = await createServiceClient();

  // Get store and API key
  const { data: store } = await supabase
    .from("stores")
    .select("url")
    .eq("id", storeId)
    .single();

  const { data: apiKey } = await supabase
    .from("api_keys")
    .select("key_prefix")
    .eq("store_id", storeId)
    .single();

  if (!store || !apiKey) {
    return { success: false, error: "Store or API key not found" };
  }

  // Get the item data
  let tableName: "products" | "pages" | "blog_posts";
  let action: string;

  switch (type) {
    case "product":
      tableName = "products";
      action = "update_product_seo";
      break;
    case "page":
      tableName = "pages";
      action = "update_page_seo";
      break;
    case "post":
      tableName = "blog_posts";
      action = "update_post_seo";
      break;
  }

  const { data: item } = await supabase
    .from(tableName)
    .select("*")
    .eq("id", itemId)
    .single();

  if (!item) {
    return { success: false, error: "Item not found" };
  }

  // Send webhook to WordPress
  const webhookUrl = `${store.url}/wp-json/seo-max/v1/webhook`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey.key_prefix, // In production, use the full key
      },
      body: JSON.stringify({
        action,
        data: {
          external_id: item.external_id,
          meta_title: item.meta_title,
          meta_description: item.meta_description,
          schema_markup: item.schema_markup,
        },
      }),
    });

    if (!response.ok) {
      return { success: false, error: `WordPress returned ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error("Error pushing to WordPress:", err);
    return { success: false, error: "Failed to connect to WordPress" };
  }
}
