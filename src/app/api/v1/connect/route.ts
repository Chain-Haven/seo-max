import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateApiKey, getApiKeyFromRequest } from "@/lib/api/auth";

function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
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

    const supabase = getSupabaseClient();

    // Get store details
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, url, platform, status")
      .eq("id", validation.storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Parse body for site info from plugin
    const body = await request.json().catch(() => ({}));
    const { site_url, site_name, wp_version, wc_version, plugin_version } = body;

    // Update store status to connected and store connection config
    const { error: updateError } = await supabase
      .from("stores")
      .update({
        status: "connected",
        last_sync_at: new Date().toISOString(),
        connection_config: {
          site_url,
          site_name,
          wp_version,
          wc_version,
          plugin_version,
          connected_at: new Date().toISOString(),
        },
      })
      .eq("id", validation.storeId);

    if (updateError) {
      console.error("Failed to update store:", updateError);
    }

    return NextResponse.json({
      success: true,
      message: "Connection established",
      store: {
        id: store.id,
        name: store.name,
        platform: store.platform,
      },
      permissions: validation.permissions,
    });
  } catch (error) {
    console.error("Connect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
