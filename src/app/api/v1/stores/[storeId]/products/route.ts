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

// Get products with SEO data
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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const { data: products, error, count } = await supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update product SEO data
export async function PATCH(request: Request, { params }: Props) {
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
    const body = await request.json();
    const { external_id, meta_title, meta_description, images, schema_markup } = body;

    if (!external_id) {
      return NextResponse.json(
        { error: "external_id is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;
    if (images !== undefined) updateData.images = images;
    if (schema_markup !== undefined) updateData.schema_markup = schema_markup;

    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("store_id", storeId)
      .eq("external_id", external_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: data,
    });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
