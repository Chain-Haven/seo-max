import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateApiKey, getApiKeyFromRequest } from "@/lib/api/auth";

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseKey);
}

interface Product {
  external_id: string;
  name: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  images?: Array<{ url: string; alt?: string }>;
}

interface Page {
  external_id: string;
  title: string;
  page_type?: string;
  meta_title?: string;
  meta_description?: string;
}

interface BlogPost {
  external_id: string;
  title: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  status?: string;
  published_at?: string;
}

interface SyncData {
  products?: Product[];
  pages?: Page[];
  blog_posts?: BlogPost[];
}

interface Props {
  params: Promise<{ storeId: string }>;
}

// Validate required fields
function validateProduct(product: any): product is Product {
  return (
    typeof product === "object" &&
    product !== null &&
    typeof product.external_id === "string" &&
    product.external_id.length > 0 &&
    typeof product.name === "string" &&
    product.name.length > 0
  );
}

function validatePage(page: any): page is Page {
  return (
    typeof page === "object" &&
    page !== null &&
    typeof page.external_id === "string" &&
    page.external_id.length > 0 &&
    typeof page.title === "string" &&
    page.title.length > 0
  );
}

function validateBlogPost(post: any): post is BlogPost {
  return (
    typeof post === "object" &&
    post !== null &&
    typeof post.external_id === "string" &&
    post.external_id.length > 0 &&
    typeof post.title === "string" &&
    post.title.length > 0
  );
}

export async function POST(request: Request, { params }: Props) {
  try {
    const { storeId } = await params;
    
    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    const apiKey = getApiKeyFromRequest(request);

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const validation = await validateApiKey(apiKey);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid API key" },
        { status: 401 }
      );
    }

    // Verify the API key belongs to this store
    if (validation.storeId !== storeId) {
      return NextResponse.json(
        { error: "API key does not match store" },
        { status: 403 }
      );
    }

    // Check write permission
    if (!validation.permissions?.includes("write")) {
      return NextResponse.json(
        { error: "Write permission required" },
        { status: 403 }
      );
    }

    let body: SyncData;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const results = {
      products: { created: 0, updated: 0, errors: 0, invalid: 0 },
      pages: { created: 0, updated: 0, errors: 0, invalid: 0 },
      blog_posts: { created: 0, updated: 0, errors: 0, invalid: 0 },
    };

    const errors: string[] = [];

    // Sync products
    if (body.products && Array.isArray(body.products)) {
      for (const product of body.products) {
        if (!validateProduct(product)) {
          results.products.invalid++;
          errors.push(`Invalid product: missing required fields for ${JSON.stringify(product)}`);
          continue;
        }

        try {
          const { error } = await supabase.from("products").upsert(
            {
              store_id: storeId,
              external_id: product.external_id,
              name: product.name,
              description: product.description || null,
              meta_title: product.meta_title || null,
              meta_description: product.meta_description || null,
              images: product.images || [],
              synced_at: new Date().toISOString(),
            },
            {
              onConflict: "store_id,external_id",
            }
          );

          if (error) {
            results.products.errors++;
            errors.push(`Product ${product.external_id}: ${error.message}`);
          } else {
            results.products.updated++;
          }
        } catch (error) {
          results.products.errors++;
          errors.push(`Product ${product.external_id}: Unexpected error`);
        }
      }
    }

    // Sync pages
    if (body.pages && Array.isArray(body.pages)) {
      for (const page of body.pages) {
        if (!validatePage(page)) {
          results.pages.invalid++;
          errors.push(`Invalid page: missing required fields for ${JSON.stringify(page)}`);
          continue;
        }

        try {
          const { error } = await supabase.from("pages").upsert(
            {
              store_id: storeId,
              external_id: page.external_id,
              title: page.title,
              page_type: page.page_type || "other",
              meta_title: page.meta_title || null,
              meta_description: page.meta_description || null,
              synced_at: new Date().toISOString(),
            },
            {
              onConflict: "store_id,external_id",
            }
          );

          if (error) {
            results.pages.errors++;
            errors.push(`Page ${page.external_id}: ${error.message}`);
          } else {
            results.pages.updated++;
          }
        } catch (error) {
          results.pages.errors++;
          errors.push(`Page ${page.external_id}: Unexpected error`);
        }
      }
    }

    // Sync blog posts
    if (body.blog_posts && Array.isArray(body.blog_posts)) {
      for (const post of body.blog_posts) {
        if (!validateBlogPost(post)) {
          results.blog_posts.invalid++;
          errors.push(`Invalid blog post: missing required fields for ${JSON.stringify(post)}`);
          continue;
        }

        try {
          const { error } = await supabase.from("blog_posts").upsert(
            {
              store_id: storeId,
              external_id: post.external_id,
              title: post.title,
              content: post.content || null,
              meta_title: post.meta_title || null,
              meta_description: post.meta_description || null,
              status: post.status || "draft",
              published_at: post.published_at || null,
              synced_at: new Date().toISOString(),
            },
            {
              onConflict: "store_id,external_id",
              ignoreDuplicates: false,
            }
          );

          if (error) {
            results.blog_posts.errors++;
            errors.push(`Blog post ${post.external_id}: ${error.message}`);
          } else {
            results.blog_posts.updated++;
          }
        } catch (error) {
          results.blog_posts.errors++;
          errors.push(`Blog post ${post.external_id}: Unexpected error`);
        }
      }
    }

    // Update store last sync time
    try {
      await supabase
        .from("stores")
        .update({ 
          last_sync_at: new Date().toISOString(),
          status: "connected" 
        })
        .eq("id", storeId);
    } catch (error) {
      console.error("Failed to update store sync time:", error);
    }

    // Determine overall success
    const hasErrors = Object.values(results).some(
      (result) => result.errors > 0 || result.invalid > 0
    );

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? "Sync completed with errors" : "Sync completed successfully",
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Get sync status
export async function GET(request: Request, { params }: Props) {
  try {
    const { storeId } = await params;
    
    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    const apiKey = getApiKeyFromRequest(request);

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const validation = await validateApiKey(apiKey);

    if (!validation.valid || validation.storeId !== storeId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();

    // Get store info and counts
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, status, last_sync_at")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    const [productCount, pageCount, blogCount] = await Promise.all([
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId),
      supabase
        .from("pages")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId),
      supabase
        .from("blog_posts")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId),
    ]);

    return NextResponse.json({
      store,
      counts: {
        products: productCount.count || 0,
        pages: pageCount.count || 0,
        blog_posts: blogCount.count || 0,
      },
      last_sync: store.last_sync_at,
      status: store.status,
    });
  } catch (error) {
    console.error("Get sync status error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}