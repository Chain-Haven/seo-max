"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Backlink {
  id: string;
  storeId: string;
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  anchorText: string | null;
  isDofollow: boolean;
  domainAuthority: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isLost: boolean;
}

export interface BacklinkStats {
  totalBacklinks: number;
  dofollow: number;
  nofollow: number;
  uniqueDomains: number;
  lostThisMonth: number;
  gainedThisMonth: number;
  avgDomainAuthority: number;
}

// Get all backlinks for a store
export async function getBacklinks(
  storeId: string,
  options: {
    includeLost?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: Backlink[] | null; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("backlinks")
    .select("*")
    .eq("store_id", storeId)
    .order("domain_authority", { ascending: false, nullsFirst: false })
    .limit(options.limit || 100);

  if (!options.includeLost) {
    query = query.eq("is_lost", false);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((b) => ({
      id: b.id,
      storeId: b.store_id,
      sourceUrl: b.source_url,
      sourceDomain: b.source_domain,
      targetUrl: b.target_url,
      anchorText: b.anchor_text,
      isDofollow: b.is_dofollow,
      domainAuthority: b.domain_authority,
      firstSeenAt: b.first_seen_at,
      lastSeenAt: b.last_seen_at,
      isLost: b.is_lost,
    })),
    error: null,
  };
}

// Get backlink statistics
export async function getBacklinkStats(
  storeId: string
): Promise<{ data: BacklinkStats | null; error: string | null }> {
  const supabase = await createClient();

  const { data: backlinks, error } = await supabase
    .from("backlinks")
    .select("*")
    .eq("store_id", storeId);

  if (error) {
    return { data: null, error: error.message };
  }

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const active = (backlinks || []).filter((b) => !b.is_lost);
  const uniqueDomains = new Set(active.map((b) => b.source_domain)).size;
  const dofollow = active.filter((b) => b.is_dofollow).length;
  const daValues = active.filter((b) => b.domain_authority).map((b) => b.domain_authority as number);
  const avgDA = daValues.length > 0 ? daValues.reduce((a, b) => a + b, 0) / daValues.length : 0;

  const lostThisMonth = (backlinks || []).filter(
    (b) => b.is_lost && new Date(b.last_seen_at) >= monthAgo
  ).length;
  const gainedThisMonth = active.filter(
    (b) => new Date(b.first_seen_at) >= monthAgo
  ).length;

  return {
    data: {
      totalBacklinks: active.length,
      dofollow,
      nofollow: active.length - dofollow,
      uniqueDomains,
      lostThisMonth,
      gainedThisMonth,
      avgDomainAuthority: Math.round(avgDA),
    },
    error: null,
  };
}

// Add a backlink manually
export async function addBacklink(
  storeId: string,
  data: {
    sourceUrl: string;
    targetUrl: string;
    anchorText?: string;
    isDofollow?: boolean;
    domainAuthority?: number;
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Extract domain from source URL
  let sourceDomain = data.sourceUrl;
  try {
    sourceDomain = new URL(data.sourceUrl).hostname.replace("www.", "");
  } catch {
    // Keep as-is if not a valid URL
  }

  const { error } = await supabase.from("backlinks").upsert(
    {
      store_id: storeId,
      source_url: data.sourceUrl,
      source_domain: sourceDomain,
      target_url: data.targetUrl,
      anchor_text: data.anchorText,
      is_dofollow: data.isDofollow ?? true,
      domain_authority: data.domainAuthority,
      last_seen_at: new Date().toISOString(),
      is_lost: false,
    },
    { onConflict: "store_id,source_url,target_url" }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}/backlinks`);
  return { success: true, error: null };
}

// Mark backlink as lost
export async function markBacklinkLost(
  backlinkId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("backlinks")
    .update({ is_lost: true, last_seen_at: new Date().toISOString() })
    .eq("id", backlinkId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Delete backlink
export async function deleteBacklink(
  backlinkId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("backlinks").delete().eq("id", backlinkId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Import backlinks from CSV
export async function importBacklinks(
  storeId: string,
  backlinks: Array<{
    sourceUrl: string;
    targetUrl: string;
    anchorText?: string;
    isDofollow?: boolean;
    domainAuthority?: number;
  }>
): Promise<{ imported: number; errors: number }> {
  let imported = 0;
  let errors = 0;

  for (const backlink of backlinks) {
    const result = await addBacklink(storeId, backlink);
    if (result.success) {
      imported++;
    } else {
      errors++;
    }
  }

  return { imported, errors };
}

// Simulate backlink discovery (for demo)
export async function discoverBacklinks(
  storeId: string
): Promise<{ discovered: number; error: string | null }> {
  const supabase = await createClient();

  // Get store URL
  const { data: store } = await supabase
    .from("stores")
    .select("url")
    .eq("id", storeId)
    .single();

  if (!store?.url) {
    return { discovered: 0, error: "Store URL not set" };
  }

  // Simulated backlink discovery
  const sampleBacklinks = [
    { domain: "techblog.com", da: 65, anchor: "great products" },
    { domain: "reviewsite.net", da: 58, anchor: "recommended store" },
    { domain: "industry-news.com", da: 72, anchor: "leading retailer" },
    { domain: "shopping-guide.org", da: 45, anchor: "buy here" },
    { domain: "blogger.example.com", da: 32, anchor: "check out" },
  ];

  let discovered = 0;
  for (const sample of sampleBacklinks) {
    // Randomly decide if this backlink exists
    if (Math.random() > 0.4) {
      const result = await addBacklink(storeId, {
        sourceUrl: `https://${sample.domain}/article-${Math.floor(Math.random() * 1000)}`,
        targetUrl: store.url,
        anchorText: sample.anchor,
        isDofollow: Math.random() > 0.3,
        domainAuthority: sample.da + Math.floor(Math.random() * 10) - 5,
      });
      if (result.success) discovered++;
    }
  }

  return { discovered, error: null };
}

// Get top referring domains
export async function getTopReferringDomains(
  storeId: string,
  limit: number = 10
): Promise<{
  data: Array<{
    domain: string;
    backlinks: number;
    avgDa: number;
  }> | null;
  error: string | null;
}> {
  const { data: backlinks, error } = await getBacklinks(storeId, { limit: 1000 });

  if (error || !backlinks) {
    return { data: null, error };
  }

  // Group by domain
  const domainMap = new Map<string, { count: number; daSum: number; daCount: number }>();

  for (const bl of backlinks) {
    const existing = domainMap.get(bl.sourceDomain) || { count: 0, daSum: 0, daCount: 0 };
    existing.count++;
    if (bl.domainAuthority) {
      existing.daSum += bl.domainAuthority;
      existing.daCount++;
    }
    domainMap.set(bl.sourceDomain, existing);
  }

  const domains = Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      backlinks: stats.count,
      avgDa: stats.daCount > 0 ? Math.round(stats.daSum / stats.daCount) : 0,
    }))
    .sort((a, b) => b.backlinks - a.backlinks)
    .slice(0, limit);

  return { data: domains, error: null };
}
