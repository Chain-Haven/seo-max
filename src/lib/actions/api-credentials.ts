"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface StoreApiCredentials {
  googleClientId: string | null;
  googleClientSecret: string | null;
  googlePagespeedKey: string | null;
  serpApiKey: string | null;
}

export interface OrgApiCredentials {
  googleClientId: string | null;
  googleClientSecret: string | null;
  googlePagespeedKey: string | null;
  serpApiKey: string | null;
}

// Get store API credentials
export async function getStoreApiCredentials(
  storeId: string
): Promise<{ data: StoreApiCredentials | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stores")
    .select("google_client_id, google_client_secret, google_pagespeed_key, serp_api_key")
    .eq("id", storeId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      googleClientId: data.google_client_id,
      googleClientSecret: data.google_client_secret,
      googlePagespeedKey: data.google_pagespeed_key,
      serpApiKey: data.serp_api_key,
    },
    error: null,
  };
}

// Update store API credentials
export async function updateStoreApiCredentials(
  storeId: string,
  credentials: Partial<StoreApiCredentials>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const updateData: Record<string, string | null> = {};
  if (credentials.googleClientId !== undefined) {
    updateData.google_client_id = credentials.googleClientId;
  }
  if (credentials.googleClientSecret !== undefined) {
    updateData.google_client_secret = credentials.googleClientSecret;
  }
  if (credentials.googlePagespeedKey !== undefined) {
    updateData.google_pagespeed_key = credentials.googlePagespeedKey;
  }
  if (credentials.serpApiKey !== undefined) {
    updateData.serp_api_key = credentials.serpApiKey;
  }

  const { error } = await supabase
    .from("stores")
    .update(updateData)
    .eq("id", storeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}/settings`);
  return { success: true, error: null };
}

// Get organization API credentials (shared across all stores)
export async function getOrgApiCredentials(
  organizationId: string
): Promise<{ data: OrgApiCredentials | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("google_client_id, google_client_secret, google_pagespeed_key, serp_api_key")
    .eq("id", organizationId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      googleClientId: data.google_client_id,
      googleClientSecret: data.google_client_secret,
      googlePagespeedKey: data.google_pagespeed_key,
      serpApiKey: data.serp_api_key,
    },
    error: null,
  };
}

// Update organization API credentials
export async function updateOrgApiCredentials(
  organizationId: string,
  credentials: Partial<OrgApiCredentials>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const updateData: Record<string, string | null> = {};
  if (credentials.googleClientId !== undefined) {
    updateData.google_client_id = credentials.googleClientId;
  }
  if (credentials.googleClientSecret !== undefined) {
    updateData.google_client_secret = credentials.googleClientSecret;
  }
  if (credentials.googlePagespeedKey !== undefined) {
    updateData.google_pagespeed_key = credentials.googlePagespeedKey;
  }
  if (credentials.serpApiKey !== undefined) {
    updateData.serp_api_key = credentials.serpApiKey;
  }

  const { error } = await supabase
    .from("organizations")
    .update(updateData)
    .eq("id", organizationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true, error: null };
}

// Get effective credentials for a store (store > org > env)
export async function getEffectiveCredentials(
  storeId: string
): Promise<{
  googleClientId: string | null;
  googleClientSecret: string | null;
  googlePagespeedKey: string | null;
  serpApiKey: string | null;
}> {
  const supabase = await createClient();

  // Get store with org
  const { data: store } = await supabase
    .from("stores")
    .select(`
      google_client_id,
      google_client_secret,
      google_pagespeed_key,
      serp_api_key,
      organizations (
        google_client_id,
        google_client_secret,
        google_pagespeed_key,
        serp_api_key
      )
    `)
    .eq("id", storeId)
    .single();

  const org = store?.organizations as unknown as {
    google_client_id: string | null;
    google_client_secret: string | null;
    google_pagespeed_key: string | null;
    serp_api_key: string | null;
  } | null;

  // Priority: Store > Org > Env
  return {
    googleClientId:
      store?.google_client_id ||
      org?.google_client_id ||
      process.env.GOOGLE_CLIENT_ID ||
      null,
    googleClientSecret:
      store?.google_client_secret ||
      org?.google_client_secret ||
      process.env.GOOGLE_CLIENT_SECRET ||
      null,
    googlePagespeedKey:
      store?.google_pagespeed_key ||
      org?.google_pagespeed_key ||
      process.env.GOOGLE_PAGESPEED_API_KEY ||
      null,
    serpApiKey:
      store?.serp_api_key ||
      org?.serp_api_key ||
      process.env.SERP_API_KEY ||
      null,
  };
}

// Test Google credentials
export async function testGoogleCredentials(
  clientId: string,
  clientSecret: string
): Promise<{ valid: boolean; error: string | null }> {
  // Basic validation
  if (!clientId || !clientSecret) {
    return { valid: false, error: "Both Client ID and Secret are required" };
  }

  if (!clientId.includes(".apps.googleusercontent.com")) {
    return { valid: false, error: "Invalid Client ID format" };
  }

  // In production, you could test by attempting a token refresh or OAuth flow
  return { valid: true, error: null };
}

// Test PageSpeed API key
export async function testPageSpeedKey(
  apiKey: string
): Promise<{ valid: boolean; error: string | null }> {
  if (!apiKey) {
    return { valid: false, error: "API key is required" };
  }

  try {
    const testUrl = "https://www.google.com";
    const response = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(testUrl)}&key=${apiKey}&strategy=mobile&category=performance`,
      { method: "GET" }
    );

    if (response.ok) {
      return { valid: true, error: null };
    }

    const data = await response.json();
    return {
      valid: false,
      error: data.error?.message || "Invalid API key",
    };
  } catch (error) {
    return { valid: false, error: "Failed to test API key" };
  }
}

// Test SERP API key
export async function testSerpApiKey(
  apiKey: string
): Promise<{ valid: boolean; error: string | null }> {
  if (!apiKey) {
    return { valid: false, error: "API key is required" };
  }

  try {
    const response = await fetch(
      `https://serpapi.com/account?api_key=${apiKey}`,
      { method: "GET" }
    );

    if (response.ok) {
      return { valid: true, error: null };
    }

    return { valid: false, error: "Invalid API key" };
  } catch (error) {
    return { valid: false, error: "Failed to test API key" };
  }
}
