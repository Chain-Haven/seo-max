import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateProductSchema } from "@/lib/ai/schema-generator";

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
      .eq("key_hash", apiKey)
      .single();

    if (!key) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const { post_type, post_id } = body;

    if (post_type === "product") {
      // Get product from WP external_id
      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId)
        .eq("external_id", post_id)
        .single();

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const schema = await generateProductSchema({
        name: product.name,
        description: product.description || "",
        brand: "Store Brand",
        price: 0,
        currency: "USD",
        availability: "InStock",
        images: product.images as string[] || [],
      });

      return NextResponse.json(schema);
    }

    return NextResponse.json({ error: "Unsupported post type" }, { status: 400 });
  } catch (error) {
    console.error("Schema generation error:", error);
    return NextResponse.json({ error: "Schema generation failed" }, { status: 500 });
  }
}
