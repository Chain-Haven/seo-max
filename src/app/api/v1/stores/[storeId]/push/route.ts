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

// Push updates to WordPress site
export async function POST(request: Request, { params }: Props) {
  try {
    const { storeId } = await params;
    const apiKey = getApiKeyFromRequest(request);

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const validation = await validateApiKey(apiKey);

    if (!validation.valid || validation.storeId !== storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!validation.permissions?.includes("write")) {
      return NextResponse.json(
        { error: "Write permission required" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    // Get store details
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("url, connection_config")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Build webhook URL
    const webhookUrl = `${store.url}/wp-json/seo-max/v1/webhook`;

    // Send webhook to WordPress site
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        action,
        data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `WordPress webhook failed: ${response.status}`,
          details: errorText,
        },
        { status: 502 }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      action,
      result,
    });
  } catch (error) {
    console.error("Push error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
