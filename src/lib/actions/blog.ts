"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  generateBlogTopics,
  generateBlogOutline,
  generateFullBlogPost,
  type BlogTopic,
  type BlogOutline,
  type GeneratedBlogPost,
} from "@/lib/ai/blog";

// Get store context for AI generation
async function getStoreContext(storeId: string) {
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("name, url")
    .eq("id", storeId)
    .single();

  const { data: products } = await supabase
    .from("products")
    .select("name")
    .eq("store_id", storeId)
    .limit(50);

  const { data: existingPosts } = await supabase
    .from("blog_posts")
    .select("title")
    .eq("store_id", storeId);

  // Extract categories from product names (simple approach)
  const productNames = products?.map((p) => p.name) || [];
  const categories = [...new Set(productNames.slice(0, 10))];

  return {
    storeName: store?.name || "Store",
    storeUrl: store?.url,
    productCategories: categories,
    existingTopics: existingPosts?.map((p) => p.title) || [],
    relatedProducts: productNames.slice(0, 5),
  };
}

// Generate blog topic ideas
export async function generateTopicIdeas(storeId: string, niche: string, count: number = 5) {
  try {
    const context = await getStoreContext(storeId);

    const topics = await generateBlogTopics(
      context.storeName,
      niche,
      context.productCategories,
      context.existingTopics,
      count
    );

    return { success: true, topics };
  } catch (error) {
    console.error("Error generating topics:", error);
    return { success: false, error: "Failed to generate topic ideas" };
  }
}

// Generate blog outline from topic
export async function generateOutlineFromTopic(
  storeId: string,
  topic: string,
  keywords: string[]
) {
  try {
    const context = await getStoreContext(storeId);

    const outline = await generateBlogOutline(topic, keywords, {
      storeName: context.storeName,
      productCategories: context.productCategories,
      relatedProducts: context.relatedProducts,
    });

    return { success: true, outline };
  } catch (error) {
    console.error("Error generating outline:", error);
    return { success: false, error: "Failed to generate outline" };
  }
}

// Generate full blog post
export async function generateBlogPostContent(
  storeId: string,
  outline: BlogOutline
) {
  try {
    const context = await getStoreContext(storeId);

    const post = await generateFullBlogPost(outline, {
      storeName: context.storeName,
      storeUrl: context.storeUrl,
    });

    return { success: true, post };
  } catch (error) {
    console.error("Error generating blog post:", error);
    return { success: false, error: "Failed to generate blog post" };
  }
}

// Save generated blog post to database
export async function saveBlogPost(
  storeId: string,
  data: {
    title: string;
    content: string;
    meta_title: string;
    meta_description: string;
    schema_markup?: object;
    status?: "draft" | "pending" | "published";
    scheduled_at?: string;
  }
) {
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("blog_posts")
    .insert({
      store_id: storeId,
      title: data.title,
      content: data.content,
      meta_title: data.meta_title,
      meta_description: data.meta_description,
      schema_markup: data.schema_markup,
      status: data.status || "draft",
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving blog post:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}/blog`);
  return { success: true, post };
}

// Update existing blog post
export async function updateBlogPost(
  postId: string,
  data: {
    title?: string;
    content?: string;
    meta_title?: string;
    meta_description?: string;
    schema_markup?: object;
    status?: "draft" | "pending" | "published";
  }
) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  if (data.status === "published") {
    updateData.published_at = new Date().toISOString();
  }

  const { data: post, error } = await supabase
    .from("blog_posts")
    .update(updateData)
    .eq("id", postId)
    .select()
    .single();

  if (error) {
    console.error("Error updating blog post:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/stores");
  return { success: true, post };
}

// Delete blog post
export async function deleteBlogPost(postId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("blog_posts").delete().eq("id", postId);

  if (error) {
    console.error("Error deleting blog post:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/stores");
  return { success: true };
}

// Get single blog post
export async function getBlogPost(postId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Publish blog post to WordPress with enhanced SEO data
export async function publishToWordPress(storeId: string, postId: string) {
  const supabase = await createClient();

  // Get post data
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (!post) {
    return { success: false, error: "Post not found" };
  }

  // Get store and API key
  const { data: store } = await supabase
    .from("stores")
    .select("url, name")
    .eq("id", storeId)
    .single();

  const { data: apiKey } = await supabase
    .from("api_keys")
    .select("key_prefix")
    .eq("store_id", storeId)
    .single();

  if (!store || !apiKey) {
    return { success: false, error: "Store not configured" };
  }

  // Build comprehensive SEO data payload
  const seoData = post.seo_data || {};
  const schemaMarkup = post.schema_markup || {};

  // Generate Open Graph and Twitter meta if not already present
  const openGraph = seoData.openGraph || {
    ogTitle: post.meta_title || post.title,
    ogDescription: post.meta_description || "",
    ogType: "article",
    ogSiteName: store.name,
    ogLocale: "en_US",
  };

  const twitterCard = seoData.twitterCard || {
    twitterCard: "summary_large_image",
    twitterTitle: post.meta_title || post.title,
    twitterDescription: post.meta_description || "",
  };

  // Send to WordPress with full SEO data
  const webhookUrl = `${store.url}/wp-json/seo-max/v1/webhook`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey.key_prefix,
      },
      body: JSON.stringify({
        action: "create_blog_post",
        data: {
          // Basic content
          title: post.title,
          content: post.content,
          status: "publish",
          
          // Meta SEO
          meta_title: post.meta_title,
          meta_description: post.meta_description,
          
          // Schema markup
          schema_markup: schemaMarkup.schemas || schemaMarkup,
          schema_script: schemaMarkup.script,
          
          // Open Graph
          og_title: openGraph.ogTitle,
          og_description: openGraph.ogDescription,
          og_image: openGraph.ogImage,
          og_type: openGraph.ogType,
          
          // Twitter Card
          twitter_card: twitterCard.twitterCard,
          twitter_title: twitterCard.twitterTitle,
          twitter_description: twitterCard.twitterDescription,
          twitter_image: twitterCard.twitterImage,
          
          // Additional SEO data
          featured_image: post.featured_image,
          author_name: post.author_name,
          author_bio: post.author_bio,
          categories: post.categories,
          tags: post.tags,
          keywords: seoData.keywords || [],
          
          // Table of Contents (if WordPress theme supports it)
          table_of_contents: seoData.tableOfContents,
          
          // E-E-A-T signals
          eeat_signals: seoData.eeat,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `WordPress error: ${errorText}` };
    }

    const result = await response.json();

    // Update local post with external ID and status
    await supabase
      .from("blog_posts")
      .update({
        external_id: result.result?.post_id?.toString(),
        status: "published",
        published_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      })
      .eq("id", postId);

    revalidatePath(`/dashboard/stores/${storeId}/blog`);
    return { success: true, externalId: result.result?.post_id };
  } catch (error) {
    console.error("Error publishing to WordPress:", error);
    return { success: false, error: "Failed to connect to WordPress" };
  }
}

// Get content calendar data
export async function getContentCalendar(storeId: string) {
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, title, status, published_at, created_at, updated_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    return { posts: [], error: error.message };
  }

  // Group by status
  const calendar = {
    drafts: posts?.filter((p) => p.status === "draft") || [],
    pending: posts?.filter((p) => p.status === "pending") || [],
    published: posts?.filter((p) => p.status === "published") || [],
    total: posts?.length || 0,
  };

  return { calendar, error: null };
}
