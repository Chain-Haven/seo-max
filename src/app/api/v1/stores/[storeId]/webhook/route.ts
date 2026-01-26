import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateApiKey, getApiKeyFromRequest } from "@/lib/api/auth";

function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Props {
  params: Promise<{ storeId: string }>;
}

type WebhookEvent = 
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "page.created"
  | "page.updated"
  | "page.deleted"
  | "post.created"
  | "post.updated"
  | "post.deleted";

interface WebhookPayload {
  event: WebhookEvent;
  data: {
    external_id: string;
    name?: string;
    title?: string;
    description?: string;
    content?: string;
    meta_title?: string;
    meta_description?: string;
    images?: Array<{ url: string; alt?: string }>;
    page_type?: string;
    status?: string;
    published_at?: string;
  };
  timestamp: string;
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

    if (!validation.valid || validation.storeId !== storeId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!validation.permissions?.includes("write")) {
      return NextResponse.json(
        { error: "Write permission required" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    const payload: WebhookPayload = await request.json();
    const { event, data } = payload;

    if (!event || !data?.external_id) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    let result: { error?: { message: string } | null } = { error: null };

    switch (event) {
      case "product.created":
      case "product.updated":
        result = await supabase.from("products").upsert(
          {
            store_id: storeId,
            external_id: data.external_id,
            name: data.name || "Untitled",
            description: data.description,
            meta_title: data.meta_title,
            meta_description: data.meta_description,
            images: data.images,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "store_id,external_id" }
        );
        break;

      case "product.deleted":
        result = await supabase
          .from("products")
          .delete()
          .eq("store_id", storeId)
          .eq("external_id", data.external_id);
        break;

      case "page.created":
      case "page.updated":
        result = await supabase.from("pages").upsert(
          {
            store_id: storeId,
            external_id: data.external_id,
            title: data.title || "Untitled",
            page_type: data.page_type || "other",
            meta_title: data.meta_title,
            meta_description: data.meta_description,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "store_id,external_id" }
        );
        break;

      case "page.deleted":
        result = await supabase
          .from("pages")
          .delete()
          .eq("store_id", storeId)
          .eq("external_id", data.external_id);
        break;

      case "post.created":
      case "post.updated":
        result = await supabase.from("blog_posts").upsert(
          {
            store_id: storeId,
            external_id: data.external_id,
            title: data.title || "Untitled",
            content: data.content,
            meta_title: data.meta_title,
            meta_description: data.meta_description,
            status: data.status || "draft",
            published_at: data.published_at,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "store_id,external_id", ignoreDuplicates: false }
        );
        break;

      case "post.deleted":
        result = await supabase
          .from("blog_posts")
          .delete()
          .eq("store_id", storeId)
          .eq("external_id", data.external_id);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown event type: ${event}` },
          { status: 400 }
        );
    }

    if (result.error) {
      console.error("Webhook processing error:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    // Update store last sync time
    await supabase
      .from("stores")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", storeId);

    return NextResponse.json({
      success: true,
      event,
      external_id: data.external_id,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
