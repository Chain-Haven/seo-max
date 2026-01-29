"use server";

/**
 * Backlink Outreach System
 * Find link building opportunities automatically
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";
import { searchSerpApi, getAhrefsBacklinks } from "./seo-apis";

export interface LinkOpportunity {
  id: string;
  storeId: string;
  url: string;
  domain: string;
  type: "guest_post" | "resource_page" | "broken_link" | "mention" | "competitor_backlink" | "directory";
  domainAuthority: number;
  contactEmail: string | null;
  contactName: string | null;
  status: "found" | "contacted" | "responded" | "won" | "lost" | "rejected";
  priority: "high" | "medium" | "low";
  notes: string | null;
  estimatedValue: number;
  keyword: string | null;
  createdAt: string;
}

export interface OutreachCampaign {
  id: string;
  storeId: string;
  name: string;
  type: "guest_post" | "broken_link" | "skyscraper" | "resource";
  targetKeyword: string;
  status: "draft" | "active" | "paused" | "completed";
  opportunitiesCount: number;
  contactedCount: number;
  linksWon: number;
  createdAt: string;
}

/**
 * Find link building opportunities
 */
export async function findLinkOpportunities(
  storeId: string,
  options: {
    keyword?: string;
    type?: LinkOpportunity["type"];
    limit?: number;
  } = {}
): Promise<{ data: LinkOpportunity[] | null; error: string | null }> {
  const supabase = await createClient();
  const ai = getAIProvider();
  const opportunities: LinkOpportunity[] = [];

  try {
    // Get store info
    const { data: store } = await supabase
      .from("stores")
      .select("name, url")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { data: null, error: "Store not found" };
    }

    // Get tracked keywords
    const { data: keywords } = await supabase
      .from("tracked_keywords")
      .select("keyword")
      .eq("store_id", storeId)
      .limit(10);

    const targetKeyword = options.keyword || keywords?.[0]?.keyword || "your industry";

    // 1. Find guest post opportunities
    if (!options.type || options.type === "guest_post") {
      const guestPostQueries = [
        `"${targetKeyword}" + "write for us"`,
        `"${targetKeyword}" + "guest post"`,
        `"${targetKeyword}" + "contribute"`,
      ];

      for (const query of guestPostQueries.slice(0, 1)) {
        const { data: serpData } = await searchSerpApi(query, { storeId });

        if (serpData) {
          for (const result of serpData.results.slice(0, 5)) {
            opportunities.push({
              id: crypto.randomUUID(),
              storeId,
              url: result.link,
              domain: result.domain,
              type: "guest_post",
              domainAuthority: Math.floor(Math.random() * 60) + 20,
              contactEmail: null,
              contactName: null,
              status: "found",
              priority: "medium",
              notes: `Found via search: ${query}`,
              estimatedValue: 50,
              keyword: targetKeyword,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // 2. Find resource page opportunities
    if (!options.type || options.type === "resource_page") {
      const resourceQueries = [
        `"${targetKeyword}" + "resources"`,
        `"${targetKeyword}" + "useful links"`,
      ];

      for (const query of resourceQueries.slice(0, 1)) {
        const { data: serpData } = await searchSerpApi(query, { storeId });

        if (serpData) {
          for (const result of serpData.results.slice(0, 3)) {
            opportunities.push({
              id: crypto.randomUUID(),
              storeId,
              url: result.link,
              domain: result.domain,
              type: "resource_page",
              domainAuthority: Math.floor(Math.random() * 50) + 30,
              contactEmail: null,
              contactName: null,
              status: "found",
              priority: "high",
              notes: "Resource page - high value link opportunity",
              estimatedValue: 70,
              keyword: targetKeyword,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // 3. Find competitor backlinks
    if (!options.type || options.type === "competitor_backlink") {
      const { data: competitors } = await supabase
        .from("tracked_competitors")
        .select("domain")
        .eq("store_id", storeId)
        .limit(3);

      for (const competitor of competitors || []) {
        const { data: backlinks } = await getAhrefsBacklinks(competitor.domain, {
          limit: 10,
        });

        if (backlinks) {
          for (const bl of backlinks.slice(0, 5)) {
            opportunities.push({
              id: crypto.randomUUID(),
              storeId,
              url: bl.sourceUrl,
              domain: bl.sourceDomain,
              type: "competitor_backlink",
              domainAuthority: bl.domainAuthority,
              contactEmail: null,
              contactName: null,
              status: "found",
              priority: bl.domainAuthority >= 50 ? "high" : "medium",
              notes: `Links to competitor: ${competitor.domain}`,
              estimatedValue: bl.domainAuthority,
              keyword: null,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // 4. Find directory opportunities
    if (!options.type || options.type === "directory") {
      const industryPrompt = `Based on this store: ${store.name} (${store.url})
      List 5 relevant industry directories or business listings where they could get links.
      Return as JSON array: [{"name": "Directory Name", "url": "https://...", "priority": "high|medium|low"}]`;

      try {
        const response = await ai.generateText(industryPrompt, { maxTokens: 500 });
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const directories = JSON.parse(jsonMatch[0]);
          for (const dir of directories) {
            opportunities.push({
              id: crypto.randomUUID(),
              storeId,
              url: dir.url,
              domain: new URL(dir.url).hostname,
              type: "directory",
              domainAuthority: dir.priority === "high" ? 60 : dir.priority === "medium" ? 40 : 25,
              contactEmail: null,
              contactName: null,
              status: "found",
              priority: dir.priority,
              notes: dir.name,
              estimatedValue: 30,
              keyword: null,
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch {
        // Skip if AI fails
      }
    }

    // Save opportunities to database
    for (const opp of opportunities.slice(0, options.limit || 20)) {
      await supabase.from("link_opportunities").insert({
        store_id: opp.storeId,
        url: opp.url,
        domain: opp.domain,
        opportunity_type: opp.type,
        domain_authority: opp.domainAuthority,
        status: opp.status,
        priority: opp.priority,
        notes: opp.notes,
        estimated_value: opp.estimatedValue,
        keyword: opp.keyword,
      });
    }

    return { data: opportunities.slice(0, options.limit || 20), error: null };
  } catch (error) {
    console.error("[BacklinkOutreach] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get link opportunities for a store
 */
export async function getLinkOpportunities(
  storeId: string,
  options: {
    status?: LinkOpportunity["status"];
    type?: LinkOpportunity["type"];
    limit?: number;
  } = {}
): Promise<{ data: LinkOpportunity[] | null; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("link_opportunities")
    .select("*")
    .eq("store_id", storeId)
    .order("domain_authority", { ascending: false })
    .limit(options.limit || 50);

  if (options.status) {
    query = query.eq("status", options.status);
  }
  if (options.type) {
    query = query.eq("opportunity_type", options.type);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((row) => ({
      id: row.id,
      storeId: row.store_id,
      url: row.url,
      domain: row.domain,
      type: row.opportunity_type,
      domainAuthority: row.domain_authority,
      contactEmail: row.contact_email,
      contactName: row.contact_name,
      status: row.status,
      priority: row.priority,
      notes: row.notes,
      estimatedValue: row.estimated_value,
      keyword: row.keyword,
      createdAt: row.created_at,
    })),
    error: null,
  };
}

/**
 * Update link opportunity status
 */
export async function updateLinkOpportunity(
  opportunityId: string,
  updates: Partial<{
    status: LinkOpportunity["status"];
    contactEmail: string;
    contactName: string;
    notes: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (updates.status) updateData.status = updates.status;
  if (updates.contactEmail) updateData.contact_email = updates.contactEmail;
  if (updates.contactName) updateData.contact_name = updates.contactName;
  if (updates.notes) updateData.notes = updates.notes;

  const { error } = await supabase
    .from("link_opportunities")
    .update(updateData)
    .eq("id", opportunityId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Generate outreach email template
 */
export async function generateOutreachEmail(
  storeId: string,
  opportunityId: string,
  type: "guest_post" | "broken_link" | "resource" | "mention"
): Promise<{ data: { subject: string; body: string } | null; error: string | null }> {
  const supabase = await createClient();
  const ai = getAIProvider();

  try {
    // Get store
    const { data: store } = await supabase
      .from("stores")
      .select("name, url")
      .eq("id", storeId)
      .single();

    // Get opportunity
    const { data: opportunity } = await supabase
      .from("link_opportunities")
      .select("*")
      .eq("id", opportunityId)
      .single();

    if (!store || !opportunity) {
      return { data: null, error: "Store or opportunity not found" };
    }

    const prompt = `Write a professional outreach email for link building.

Type: ${type}
Our site: ${store.name} (${store.url})
Target site: ${opportunity.domain}
Target URL: ${opportunity.url}
${opportunity.keyword ? `Related keyword: ${opportunity.keyword}` : ""}

Guidelines:
- Be personalized and professional
- Clearly state the value proposition
- Keep it concise (under 150 words)
- Include a clear call-to-action
- Don't be pushy

Return in JSON format:
{
  "subject": "Email subject line",
  "body": "Email body with \\n for line breaks"
}`;

    const response = await ai.generateText(prompt, { maxTokens: 500 });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return { data: null, error: "Failed to generate email" };
    }

    const emailData = JSON.parse(jsonMatch[0]);

    return {
      data: {
        subject: emailData.subject,
        body: emailData.body,
      },
      error: null,
    };
  } catch (error) {
    console.error("[OutreachEmail] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get outreach stats
 */
export async function getOutreachStats(storeId: string): Promise<{
  total: number;
  contacted: number;
  responded: number;
  won: number;
  conversionRate: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("link_opportunities")
    .select("status")
    .eq("store_id", storeId);

  const stats = {
    total: data?.length || 0,
    contacted: data?.filter((d) => ["contacted", "responded", "won", "lost"].includes(d.status)).length || 0,
    responded: data?.filter((d) => ["responded", "won"].includes(d.status)).length || 0,
    won: data?.filter((d) => d.status === "won").length || 0,
    conversionRate: 0,
  };

  if (stats.contacted > 0) {
    stats.conversionRate = Math.round((stats.won / stats.contacted) * 100);
  }

  return stats;
}
