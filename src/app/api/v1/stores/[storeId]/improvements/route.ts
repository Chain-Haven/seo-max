import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApiKey, getApiKeyFromRequest } from "@/lib/api/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const apiKey = getApiKeyFromRequest(request);

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const validation = await validateApiKey(apiKey);
    if (!validation.valid || validation.storeId !== storeId) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const supabase = await createServiceClient();

    // Get pending improvements (plugin calls with API key; no user session)
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
