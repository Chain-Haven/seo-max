import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error("Supabase environment variables not configured");
  }
  
  return createClient(url, key);
}

export interface ApiKeyValidation {
  valid: boolean;
  storeId?: string;
  permissions?: string[];
  error?: string;
}

export async function validateApiKey(apiKey: string): Promise<ApiKeyValidation> {
  if (!apiKey || !apiKey.startsWith("seomax_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  const supabase = getSupabaseClient();
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, store_id, permissions, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !data) {
    return { valid: false, error: "Invalid API key" };
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Update last used timestamp
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    valid: true,
    storeId: data.store_id,
    permissions: data.permissions,
  };
}

export function getApiKeyFromRequest(request: Request): string | null {
  // Check header first
  const headerKey = request.headers.get("X-API-Key");
  if (headerKey) return headerKey;

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}
