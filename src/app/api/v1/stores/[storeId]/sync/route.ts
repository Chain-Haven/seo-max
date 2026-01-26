import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateApiKey, getApiKeyFromRequest } from "@/lib/api/auth";

function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

export async function POST(request: Request, { params }: Props) {
  try {
    const { storeId } = await params;
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
        { error: validation.error },
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

    const supabase = getSupabaseClient();
    const body: SyncData = await request.json();
    const results = {
      products: { created: 0, updated: 0, errors: 0 },
      pages: { created: 0, updated: 0, errors: 0 },
      blog_posts: { created: 0, updated: 0, errors: 0 },
    };

    // Sync products
    if (body.products && Array.isArray(body.products)) {
      for (const product of body.products) {
        try {
          const { error } = await supabase.from("products").upsert(
            {
              store_id: storeId,
              external_id: product.external_id,
              name: product.name,
              description: product.description,
              meta_title: product.meta_title,
              meta_description: product.meta_description,
              images: product.images,
              synced_at: new Date().toISOString(),
            },
            {
              onConflict: "store_id,external_id",
            }
          );

          if (error) {
            results.products.errors++;
          } else {
            results.products.updated++;
          }
        } catch {
          results.products.errors++;
        }
      }
    }

    // Sync pages
    if (body.pages && Array.isArray(body.pages)) {
      for (const page of body.pages) {
        try {
          const { error } = await supabase.from("pages").upsert(
            {
              store_id: storeId,
              external_id: page.external_id,
              title: page.title,
              page_type: page.page_type || "other",
              meta_title: page.meta_title,
              meta_description: page.meta_description,
              synced_at: new Date().toISOString(),
            },
            {
              onConflict: "store_id,external_id",
            }
          );

          if (error) {
            results.pages.errors++;
          } else {
            results.pages.updated++;
          }
        } catch {
          results.pages.errors++;
        }
      }
    }

    // Sync blog posts
    if (body.blog_posts && Array.isArray(body.blog_posts)) {
      for (const post of body.blog_posts) {
        try {
          const { error } = await supabase.from("blog_posts").upsert(
            {
              store_id: storeId,
              external_id: post.external_id,
              title: post.title,
              content: post.content,
              meta_title: post.meta_title,
              meta_description: post.meta_description,
              status: post.status || "draft",
              published_at: post.published_at,
              synced_at: new Date().toISOString(),
            },
            {
              onConflict: "store_id,external_id",
              ignoreDuplicates: false,
            }
          );

          if (error) {
            results.blog_posts.errors++;
          } else {
            results.blog_posts.updated++;
          }
        } catch {
          results.blog_posts.errors++;
        }
      }
    }

    // Update store last sync time
    await supabase
      .from("stores")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", storeId);

    return NextResponse.json({
      success: true,
      message: "Sync completed",
      results,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get sync status
export async function GET(request: Request, { params }: Props) {
  try {
    const { storeId } = await params;
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
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, status, last_sync_at")
      .eq("id", storeId)
      .single();

    const { count: productCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId);

    const { count: pageCount } = await supabase
      .from("pages")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId);

    const { count: blogCount } = await supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId);

    return NextResponse.json({
      store,
      counts: {
        products: productCount || 0,
        pages: pageCount || 0,
        blog_posts: blogCount || 0,
      },
    });
  } catch (error) {
    console.error("Get sync status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
