import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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
      .eq("key_hash", apiKey)
      .single();

    if (!key) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Get pending improvements
    const { data: improvements, error } = await supabase
      .from("seo_improvements")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "pending")
      .order("impact_score", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ improvements });
  } catch (error) {
    console.error("Get improvements error:", error);
    return NextResponse.json({ error: "Failed to get improvements" }, { status: 500 });
  }
}
