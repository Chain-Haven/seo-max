"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// Generate a secure API key
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `seomax_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = key.substring(0, 12);
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, prefix, hash };
}

export async function createStore(data: {
  name: string;
  url: string;
  platform: "woocommerce" | "wordpress";
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "No organization found" };
  }

  // Normalize URL
  let normalizedUrl = data.url.trim();
  if (!normalizedUrl.startsWith("http")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  normalizedUrl = normalizedUrl.replace(/\/$/, "");

  // Create store
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      organization_id: membership.organization_id,
      name: data.name,
      url: normalizedUrl,
      platform: data.platform,
      status: "pending",
    })
    .select()
    .single();

  if (storeError) {
    return { error: storeError.message };
  }

  // Generate and create API key
  const { key, prefix, hash } = generateApiKey();

  const { error: keyError } = await supabase.from("api_keys").insert({
    store_id: store.id,
    key_hash: hash,
    key_prefix: prefix,
    name: "Default Key",
    permissions: ["read", "write"],
  });

  if (keyError) {
    // Rollback store creation
    await supabase.from("stores").delete().eq("id", store.id);
    return { error: keyError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stores");

  // Return the API key only once (it won't be retrievable later)
  return { data: { store, apiKey: key } };
}

export async function getStore(storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

export async function getStores() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "No organization found", data: null };
  }

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

export async function getStoreApiKeys(storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, key_prefix, name, permissions, last_used_at, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

export async function regenerateApiKey(storeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Delete existing keys
  await supabase.from("api_keys").delete().eq("store_id", storeId);

  // Generate new key
  const { key, prefix, hash } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    store_id: storeId,
    key_hash: hash,
    key_prefix: prefix,
    name: "Default Key",
    permissions: ["read", "write"],
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}`);

  return { data: { apiKey: key } };
}

export async function deleteStore(storeId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("stores").delete().eq("id", storeId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stores");

  return { success: true };
}

export async function updateStoreStatus(
  storeId: string,
  status: "pending" | "connected" | "disconnected" | "error"
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("stores")
    .update({ status, last_sync_at: status === "connected" ? new Date().toISOString() : undefined })
    .eq("id", storeId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/stores/${storeId}`);

  return { success: true };
}
