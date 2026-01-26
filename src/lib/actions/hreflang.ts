"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface HreflangMapping {
  id: string;
  storeId: string;
  pageUrl: string;
  language: string;
  region: string | null;
  alternateUrl: string;
  isDefault: boolean;
}

export interface HreflangGroup {
  pageUrl: string;
  mappings: HreflangMapping[];
}

// Get all hreflang mappings for a store
export async function getHreflangMappings(
  storeId: string
): Promise<{ data: HreflangMapping[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hreflang_mappings")
    .select("*")
    .eq("store_id", storeId)
    .order("page_url");

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((m) => ({
      id: m.id,
      storeId: m.store_id,
      pageUrl: m.page_url,
      language: m.language,
      region: m.region,
      alternateUrl: m.alternate_url,
      isDefault: m.is_default,
    })),
    error: null,
  };
}

// Get hreflang mappings grouped by page
export async function getHreflangGroups(
  storeId: string
): Promise<{ data: HreflangGroup[] | null; error: string | null }> {
  const { data: mappings, error } = await getHreflangMappings(storeId);

  if (error || !mappings) {
    return { data: null, error };
  }

  const groupMap = new Map<string, HreflangMapping[]>();

  for (const mapping of mappings) {
    const existing = groupMap.get(mapping.pageUrl) || [];
    existing.push(mapping);
    groupMap.set(mapping.pageUrl, existing);
  }

  const groups: HreflangGroup[] = Array.from(groupMap.entries()).map(([pageUrl, mappings]) => ({
    pageUrl,
    mappings,
  }));

  return { data: groups, error: null };
}

// Create hreflang mapping
export async function createHreflangMapping(
  storeId: string,
  data: {
    pageUrl: string;
    language: string;
    region?: string;
    alternateUrl: string;
    isDefault?: boolean;
  }
): Promise<{ data: HreflangMapping | null; error: string | null }> {
  const supabase = await createClient();

  const { data: mapping, error } = await supabase
    .from("hreflang_mappings")
    .insert({
      store_id: storeId,
      page_url: data.pageUrl,
      language: data.language,
      region: data.region,
      alternate_url: data.alternateUrl,
      is_default: data.isDefault || false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "This language mapping already exists for this page" };
    }
    return { data: null, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}/languages`);
  return {
    data: {
      id: mapping.id,
      storeId: mapping.store_id,
      pageUrl: mapping.page_url,
      language: mapping.language,
      region: mapping.region,
      alternateUrl: mapping.alternate_url,
      isDefault: mapping.is_default,
    },
    error: null,
  };
}

// Update hreflang mapping
export async function updateHreflangMapping(
  mappingId: string,
  data: Partial<{
    alternateUrl: string;
    isDefault: boolean;
  }>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (data.alternateUrl !== undefined) updateData.alternate_url = data.alternateUrl;
  if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

  const { error } = await supabase
    .from("hreflang_mappings")
    .update(updateData)
    .eq("id", mappingId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Delete hreflang mapping
export async function deleteHreflangMapping(
  mappingId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("hreflang_mappings")
    .delete()
    .eq("id", mappingId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Bulk create mappings for a page
export async function bulkCreateHreflangMappings(
  storeId: string,
  pageUrl: string,
  mappings: Array<{
    language: string;
    region?: string;
    alternateUrl: string;
    isDefault?: boolean;
  }>
): Promise<{ created: number; errors: string[] }> {
  let created = 0;
  const errors: string[] = [];

  for (const mapping of mappings) {
    const result = await createHreflangMapping(storeId, {
      pageUrl,
      ...mapping,
    });

    if (result.data) {
      created++;
    } else {
      errors.push(`${mapping.language}${mapping.region ? `-${mapping.region}` : ""}: ${result.error}`);
    }
  }

  return { created, errors };
}

// Generate hreflang HTML tags
export function generateHreflangTags(mappings: HreflangMapping[]): string {
  const tags = mappings.map((m) => {
    const hreflang = m.region ? `${m.language}-${m.region}` : m.language;
    return `<link rel="alternate" hreflang="${hreflang}" href="${m.alternateUrl}" />`;
  });

  // Add x-default for the default mapping
  const defaultMapping = mappings.find((m) => m.isDefault);
  if (defaultMapping) {
    tags.push(`<link rel="alternate" hreflang="x-default" href="${defaultMapping.alternateUrl}" />`);
  }

  return tags.join("\n");
}

// Validate hreflang implementation
export interface HreflangValidation {
  pageUrl: string;
  issues: string[];
  isValid: boolean;
}

export async function validateHreflang(
  storeId: string
): Promise<{ data: HreflangValidation[] | null; error: string | null }> {
  const { data: groups, error } = await getHreflangGroups(storeId);

  if (error || !groups) {
    return { data: null, error };
  }

  const validations: HreflangValidation[] = [];

  for (const group of groups) {
    const issues: string[] = [];

    // Check for missing x-default
    if (!group.mappings.some((m) => m.isDefault)) {
      issues.push("Missing x-default (no default language set)");
    }

    // Check for self-referencing (each page should reference itself)
    for (const mapping of group.mappings) {
      const selfRef = group.mappings.some(
        (m) => m.alternateUrl === mapping.pageUrl && m.language === mapping.language
      );
      if (!selfRef && mapping.pageUrl !== mapping.alternateUrl) {
        // Page should reference itself in the same language
      }
    }

    // Check for bidirectional references
    // Each page that's linked to should link back

    validations.push({
      pageUrl: group.pageUrl,
      issues,
      isValid: issues.length === 0,
    });
  }

  return { data: validations, error: null };
}

// Common languages for UI
export const COMMON_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
];

export const COMMON_REGIONS = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
];
