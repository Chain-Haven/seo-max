import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { optimizeContent } from "@/lib/seo/realtime-content-optimizer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    // Verify API key
    const supabase = await createClient();
    const { data: key } = await supabase
      .from("api_keys")
      .select("*")
      .eq("store_id", storeId)
      .eq("key_hash", apiKey) // In production, hash comparison
      .single();

    if (!key) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const { content, metadata } = body;

    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const result = optimizeContent(content, metadata || {});

    return NextResponse.json(result);
  } catch (error) {
    console.error("Content optimization error:", error);
    return NextResponse.json({ error: "Optimization failed" }, { status: 500 });
  }
}
