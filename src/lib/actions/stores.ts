"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// Types for better type safety
interface CreateStoreData {
  name: string;
  url: string;
  platform: "woocommerce" | "wordpress";
}

interface ApiKeyInfo {
  key: string;
  prefix: string;
  hash: string;
}

// Generate a secure API key
function generateApiKey(): ApiKeyInfo {
  const key = `seomax_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = key.substring(0, 12);
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, prefix, hash };
}

// Normalize and validate URL
function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  
  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, "");
  
  // Add protocol if missing
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }
  
  // Validate URL format
  try {
    new URL(normalized);
  } catch {
    throw new Error("Invalid URL format");
  }
  
  return normalized;
}

export async function createStore(data: CreateStoreData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", data: null };
    }

    // Validate input
    if (!data.name || data.name.trim().length < 1) {
      return { error: "Store name is required", data: null };
    }

    if (!data.url || data.url.trim().length < 1) {
      return { error: "Store URL is required", data: null };
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      console.error("Organization lookup failed:", membershipError);
      return { error: "No organization found. Please create or join an organization first.", data: null };
    }

    // Normalize URL
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(data.url);
    } catch (error) {
      return { error: "Invalid URL format. Please enter a valid website URL.", data: null };
    }

    // Check if store URL already exists
    const { data: existingStore } = await supabase
      .from("stores")
      .select("id")
      .eq("organization_id", membership.organization_id)
      .eq("url", normalizedUrl)
      .single();

    if (existingStore) {
      return { error: "A store with this URL already exists in your organization", data: null };
    }

    // Create store
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .insert({
        organization_id: membership.organization_id,
        name: data.name.trim(),
        url: normalizedUrl,
        platform: data.platform,
        status: "pending",
      })
      .select()
      .single();

    if (storeError) {
      console.error("Store creation failed:", storeError);
      return { 
        error: storeError.message || "Failed to create store. Please try again.", 
        data: null 
      };
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
      console.error("API key creation failed:", keyError);
      // Rollback store creation
      await supabase.from("stores").delete().eq("id", store.id);
      return { 
        error: "Failed to generate API key. Please try again.", 
        data: null 
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/stores");

    // Return the API key only once (it won't be retrievable later)
    return { data: { store, apiKey: key }, error: null };
  } catch (error) {
    console.error("Unexpected error in createStore:", error);
    return { 
      error: "An unexpected error occurred. Please try again.", 
      data: null 
    };
  }
}

export async function getStore(storeId: string) {
  try {
    if (!storeId) {
      return { error: "Store ID is required", data: null };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { error: "Store not found", data: null };
      }
      console.error("Store fetch error:", error);
      return { error: "Failed to fetch store details", data: null };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error in getStore:", error);
    return { error: "An unexpected error occurred", data: null };
  }
}

export async function getStores() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", data: [] };
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      console.error("Organization lookup failed:", membershipError);
      return { error: "No organization found", data: [] };
    }

    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Stores fetch error:", error);
      return { error: "Failed to fetch stores", data: [] };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Unexpected error in getStores:", error);
    return { error: "An unexpected error occurred", data: [] };
  }
}

export async function getStoreApiKeys(storeId: string) {
  try {
    if (!storeId) {
      return { error: "Store ID is required", data: [] };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, key_prefix, name, permissions, last_used_at, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("API keys fetch error:", error);
      return { error: "Failed to fetch API keys", data: [] };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Unexpected error in getStoreApiKeys:", error);
    return { error: "An unexpected error occurred", data: [] };
  }
}

export async function regenerateApiKey(storeId: string) {
  try {
    if (!storeId) {
      return { error: "Store ID is required", data: null };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", data: null };
    }

    // Verify store ownership
    const { data: store } = await supabase
      .from("stores")
      .select("organization_id")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { error: "Store not found", data: null };
    }

    // Delete existing keys
    const { error: deleteError } = await supabase
      .from("api_keys")
      .delete()
      .eq("store_id", storeId);

    if (deleteError) {
      console.error("Failed to delete old keys:", deleteError);
      return { error: "Failed to regenerate API key", data: null };
    }

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
      console.error("Failed to create new key:", error);
      return { error: "Failed to create new API key", data: null };
    }

    revalidatePath(`/dashboard/stores/${storeId}`);

    return { data: { apiKey: key }, error: null };
  } catch (error) {
    console.error("Unexpected error in regenerateApiKey:", error);
    return { error: "An unexpected error occurred", data: null };
  }
}

export async function deleteStore(storeId: string) {
  try {
    if (!storeId) {
      return { error: "Store ID is required", success: false };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", success: false };
    }

    // Verify store ownership
    const { data: store } = await supabase
      .from("stores")
      .select("name, organization_id")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { error: "Store not found", success: false };
    }

    // Delete the store (cascades to related records)
    const { error } = await supabase
      .from("stores")
      .delete()
      .eq("id", storeId);

    if (error) {
      console.error("Store deletion failed:", error);
      return { error: "Failed to delete store", success: false };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/stores");

    return { success: true, error: null };
  } catch (error) {
    console.error("Unexpected error in deleteStore:", error);
    return { error: "An unexpected error occurred", success: false };
  }
}

export async function updateStoreStatus(
  storeId: string,
  status: "pending" | "connected" | "disconnected" | "error"
) {
  try {
    if (!storeId) {
      return { error: "Store ID is required", success: false };
    }

    const validStatuses = ["pending", "connected", "disconnected", "error"];
    if (!validStatuses.includes(status)) {
      return { error: "Invalid status", success: false };
    }

    const supabase = await createClient();

    const updateData: any = { status };
    
    // Update last sync time only for connected status
    if (status === "connected") {
      updateData.last_sync_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("stores")
      .update(updateData)
      .eq("id", storeId);

    if (error) {
      console.error("Store status update failed:", error);
      return { error: "Failed to update store status", success: false };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/stores/${storeId}`);

    return { success: true, error: null };
  } catch (error) {
    console.error("Unexpected error in updateStoreStatus:", error);
    return { error: "An unexpected error occurred", success: false };
  }
}