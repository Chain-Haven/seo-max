"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Redirect {
  id: string;
  storeId: string;
  sourceUrl: string;
  targetUrl: string;
  redirectType: "301" | "302" | "307" | "308";
  isActive: boolean;
  hitCount: number;
  lastHitAt: string | null;
  createdAt: string;
}

export interface BrokenLink {
  id: string;
  storeId: string;
  url: string;
  foundOnPage: string | null;
  statusCode: number | null;
  linkText: string | null;
  isFixed: boolean;
  firstDetectedAt: string;
  lastCheckedAt: string;
}

// === Redirects ===

export async function getRedirects(
  storeId: string
): Promise<{ data: Redirect[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("redirects")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((r) => ({
      id: r.id,
      storeId: r.store_id,
      sourceUrl: r.source_url,
      targetUrl: r.target_url,
      redirectType: r.redirect_type,
      isActive: r.is_active,
      hitCount: r.hit_count,
      lastHitAt: r.last_hit_at,
      createdAt: r.created_at,
    })),
    error: null,
  };
}

export async function createRedirect(
  storeId: string,
  data: {
    sourceUrl: string;
    targetUrl: string;
    redirectType?: "301" | "302" | "307" | "308";
  }
): Promise<{ data: Redirect | null; error: string | null }> {
  const supabase = await createClient();

  // Normalize URLs
  const sourceUrl = data.sourceUrl.startsWith("/") ? data.sourceUrl : `/${data.sourceUrl}`;
  const targetUrl = data.targetUrl.startsWith("/") || data.targetUrl.startsWith("http")
    ? data.targetUrl
    : `/${data.targetUrl}`;

  const { data: redirect, error } = await supabase
    .from("redirects")
    .insert({
      store_id: storeId,
      source_url: sourceUrl,
      target_url: targetUrl,
      redirect_type: data.redirectType || "301",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "A redirect for this URL already exists" };
    }
    return { data: null, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}/redirects`);
  return {
    data: {
      id: redirect.id,
      storeId: redirect.store_id,
      sourceUrl: redirect.source_url,
      targetUrl: redirect.target_url,
      redirectType: redirect.redirect_type,
      isActive: redirect.is_active,
      hitCount: redirect.hit_count,
      lastHitAt: redirect.last_hit_at,
      createdAt: redirect.created_at,
    },
    error: null,
  };
}

export async function updateRedirect(
  redirectId: string,
  data: {
    targetUrl?: string;
    redirectType?: "301" | "302" | "307" | "308";
    isActive?: boolean;
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (data.targetUrl !== undefined) updateData.target_url = data.targetUrl;
  if (data.redirectType !== undefined) updateData.redirect_type = data.redirectType;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("redirects")
    .update(updateData)
    .eq("id", redirectId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function deleteRedirect(
  redirectId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("redirects").delete().eq("id", redirectId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function bulkImportRedirects(
  storeId: string,
  redirects: Array<{ source: string; target: string; type?: string }>
): Promise<{ imported: number; errors: string[] }> {
  const supabase = await createClient();
  let imported = 0;
  const errors: string[] = [];

  for (const redirect of redirects) {
    const sourceUrl = redirect.source.startsWith("/") ? redirect.source : `/${redirect.source}`;
    const targetUrl = redirect.target.startsWith("/") || redirect.target.startsWith("http")
      ? redirect.target
      : `/${redirect.target}`;

    const { error } = await supabase.from("redirects").insert({
      store_id: storeId,
      source_url: sourceUrl,
      target_url: targetUrl,
      redirect_type: redirect.type || "301",
    });

    if (error) {
      errors.push(`${redirect.source}: ${error.message}`);
    } else {
      imported++;
    }
  }

  revalidatePath(`/dashboard/stores/${storeId}/redirects`);
  return { imported, errors };
}

// === Broken Links ===

export async function getBrokenLinks(
  storeId: string,
  includeFixed: boolean = false
): Promise<{ data: BrokenLink[] | null; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("broken_links")
    .select("*")
    .eq("store_id", storeId)
    .order("first_detected_at", { ascending: false });

  if (!includeFixed) {
    query = query.eq("is_fixed", false);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((b) => ({
      id: b.id,
      storeId: b.store_id,
      url: b.url,
      foundOnPage: b.found_on_page,
      statusCode: b.status_code,
      linkText: b.link_text,
      isFixed: b.is_fixed,
      firstDetectedAt: b.first_detected_at,
      lastCheckedAt: b.last_checked_at,
    })),
    error: null,
  };
}

export async function reportBrokenLink(
  storeId: string,
  data: {
    url: string;
    foundOnPage?: string;
    statusCode?: number;
    linkText?: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("broken_links").upsert(
    {
      store_id: storeId,
      url: data.url,
      found_on_page: data.foundOnPage,
      status_code: data.statusCode,
      link_text: data.linkText,
      last_checked_at: new Date().toISOString(),
    },
    { onConflict: "store_id,url,found_on_page" }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function markBrokenLinkFixed(
  brokenLinkId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("broken_links")
    .update({ is_fixed: true })
    .eq("id", brokenLinkId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function createRedirectFromBrokenLink(
  brokenLinkId: string,
  targetUrl: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Get broken link
  const { data: brokenLink } = await supabase
    .from("broken_links")
    .select("*")
    .eq("id", brokenLinkId)
    .single();

  if (!brokenLink) {
    return { success: false, error: "Broken link not found" };
  }

  // Create redirect
  const { error: redirectError } = await supabase.from("redirects").insert({
    store_id: brokenLink.store_id,
    source_url: brokenLink.url,
    target_url: targetUrl,
    redirect_type: "301",
  });

  if (redirectError) {
    return { success: false, error: redirectError.message };
  }

  // Mark as fixed
  await supabase
    .from("broken_links")
    .update({ is_fixed: true })
    .eq("id", brokenLinkId);

  return { success: true, error: null };
}

// Generate .htaccess or nginx config
export async function exportRedirectRules(
  storeId: string,
  format: "htaccess" | "nginx" | "vercel" | "nextjs"
): Promise<{ data: string | null; error: string | null }> {
  const { data: redirects, error } = await getRedirects(storeId);

  if (error || !redirects) {
    return { data: null, error: error || "No redirects found" };
  }

  const activeRedirects = redirects.filter((r) => r.isActive);

  switch (format) {
    case "htaccess":
      return {
        data: activeRedirects
          .map((r) => `Redirect ${r.redirectType} ${r.sourceUrl} ${r.targetUrl}`)
          .join("\n"),
        error: null,
      };

    case "nginx":
      return {
        data: activeRedirects
          .map((r) => {
            const code = r.redirectType === "301" ? "permanent" : "redirect";
            return `rewrite ^${r.sourceUrl}$ ${r.targetUrl} ${code};`;
          })
          .join("\n"),
        error: null,
      };

    case "vercel":
      const vercelRedirects = activeRedirects.map((r) => ({
        source: r.sourceUrl,
        destination: r.targetUrl,
        permanent: r.redirectType === "301",
      }));
      return { data: JSON.stringify({ redirects: vercelRedirects }, null, 2), error: null };

    case "nextjs":
      const nextRedirects = activeRedirects.map((r) => ({
        source: r.sourceUrl,
        destination: r.targetUrl,
        permanent: r.redirectType === "301",
      }));
      return {
        data: `module.exports = {\n  async redirects() {\n    return ${JSON.stringify(nextRedirects, null, 4)};\n  },\n};`,
        error: null,
      };

    default:
      return { data: null, error: "Invalid format" };
  }
}
