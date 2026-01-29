"use server";

import { createClient } from "@/lib/supabase/server";
import { generateChat } from "@/lib/ai/provider";
import type { AIMessage } from "@/lib/ai/types";

export interface StoreContext {
  storeName: string;
  storeUrl: string;
  platform: string;
  status: string;
  lastSyncAt: string | null;
  counts: { products: number; pages: number; blogPosts: number; keywords: number };
  latestCrawl: {
    status: string;
    pagesCrawled: number;
    criticalIssues: number;
    warnings: number;
    pagesWithMissingTitle: number;
    pagesWithMissingDescription: number;
    pagesWithMissingH1: number;
    imagesMissingAlt: number;
  } | null;
  topImprovements: Array<{
    type: string;
    entityTitle: string;
    reason: string;
    priority: string;
    impactScore: number;
  }>;
  sampleKeywords: Array<{ keyword: string; position: number | null }>;
}

/**
 * Gather all relevant store data for Robo Jacob so he can give informed SEO advice.
 */
export async function getStoreContext(storeId: string): Promise<{
  data: StoreContext | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  try {
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, url, platform, status, last_sync_at")
      .eq("id", storeId)
      .single();
    if (!store) return { data: null, error: "Store not found" };

    const [productsRes, pagesRes, postsRes, keywordsRes, crawlRes, improvementsRes, keywordsSampleRes] =
      await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
        supabase.from("pages").select("id", { count: "exact", head: true }).eq("store_id", storeId),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("store_id", storeId),
        supabase.from("tracked_keywords").select("id", { count: "exact", head: true }).eq("store_id", storeId),
        supabase
          .from("site_crawls")
          .select("id, status, pages_crawled, summary")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("seo_improvements")
          .select("improvement_type, entity_title, reason, priority, impact_score")
          .eq("store_id", storeId)
          .eq("status", "pending")
          .order("impact_score", { ascending: false })
          .limit(15),
        supabase
          .from("tracked_keywords")
          .select("keyword, current_position")
          .eq("store_id", storeId)
          .limit(10),
      ]);

    const summary = crawlRes.data?.summary as Record<string, unknown> | null;
    const latestCrawl = crawlRes.data
      ? {
          status: crawlRes.data.status as string,
          pagesCrawled: (crawlRes.data.pages_crawled as number) ?? 0,
          criticalIssues: (summary?.criticalIssues as number) ?? 0,
          warnings: (summary?.warnings as number) ?? 0,
          pagesWithMissingTitle: (summary?.pagesWithMissingTitle as number) ?? 0,
          pagesWithMissingDescription: (summary?.pagesWithMissingDescription as number) ?? 0,
          pagesWithMissingH1: (summary?.pagesWithMissingH1 as number) ?? 0,
          imagesMissingAlt: (summary?.imagesMissingAlt as number) ?? 0,
        }
      : null;

    const topImprovements = (improvementsRes.data ?? []).map((i) => ({
      type: i.improvement_type as string,
      entityTitle: (i.entity_title as string) || "—",
      reason: (i.reason as string) || "",
      priority: (i.priority as string) || "medium",
      impactScore: (i.impact_score as number) ?? 0,
    }));

    const sampleKeywords = (keywordsSampleRes.data ?? []).map((k) => ({
      keyword: k.keyword as string,
      position: k.current_position as number | null,
    }));

    return {
      data: {
        storeName: store.name,
        storeUrl: store.url,
        platform: store.platform,
        status: store.status,
        lastSyncAt: store.last_sync_at,
        counts: {
          products: productsRes.count ?? 0,
          pages: pagesRes.count ?? 0,
          blogPosts: postsRes.count ?? 0,
          keywords: keywordsRes.count ?? 0,
        },
        latestCrawl,
        topImprovements,
        sampleKeywords,
      },
      error: null,
    };
  } catch (e) {
    console.error("getStoreContext error:", e);
    return { data: null, error: e instanceof Error ? e.message : "Failed to load context" };
  }
}

function formatContextForPrompt(ctx: StoreContext): string {
  const lines: string[] = [
    `## Store`,
    `- Name: ${ctx.storeName}`,
    `- URL: ${ctx.storeUrl}`,
    `- Platform: ${ctx.platform}`,
    `- Status: ${ctx.status}`,
    `- Last sync: ${ctx.lastSyncAt ? new Date(ctx.lastSyncAt).toISOString() : "Never"}`,
    ``,
    `## Content counts`,
    `- Products: ${ctx.counts.products}`,
    `- Pages: ${ctx.counts.pages}`,
    `- Blog posts: ${ctx.counts.blogPosts}`,
    `- Tracked keywords: ${ctx.counts.keywords}`,
  ];

  if (ctx.latestCrawl) {
    lines.push(
      ``,
      `## Latest site audit`,
      `- Status: ${ctx.latestCrawl.status}`,
      `- Pages crawled: ${ctx.latestCrawl.pagesCrawled}`,
      `- Critical issues: ${ctx.latestCrawl.criticalIssues}`,
      `- Warnings: ${ctx.latestCrawl.warnings}`,
      `- Pages missing title: ${ctx.latestCrawl.pagesWithMissingTitle}`,
      `- Pages missing meta description: ${ctx.latestCrawl.pagesWithMissingDescription}`,
      `- Pages missing H1: ${ctx.latestCrawl.pagesWithMissingH1}`,
      `- Images missing alt: ${ctx.latestCrawl.imagesMissingAlt}`,
    );
  } else {
    lines.push(``, `## Site audit`, `No crawl has been run yet. Suggest running a site audit.`);
  }

  if (ctx.topImprovements.length > 0) {
    lines.push(``, `## Top pending SEO improvements (by impact)`);
    ctx.topImprovements.forEach((i, idx) => {
      lines.push(
        `${idx + 1}. [${i.type}] ${i.entityTitle} (${i.priority}, impact ${i.impactScore}): ${i.reason}`
      );
    });
  }

  if (ctx.sampleKeywords.length > 0) {
    lines.push(``, `## Sample tracked keywords`);
    ctx.sampleKeywords.forEach((k) => {
      lines.push(`- "${k.keyword}"${k.position != null ? ` — position ${k.position}` : ""}`);
    });
  }

  return lines.join("\n");
}

const ROBO_JACOB_SYSTEM =
  `You are Robo Jacob, a friendly and expert SEO assistant for the SEO Max platform. You have access to the customer's store data below. Use it to give specific, actionable advice. Be concise but helpful. When you don't have data (e.g. no audit yet), suggest the right next step (e.g. run a site audit, add keywords). Reference specific numbers and improvement types when relevant. Stay on topic: SEO, content, technical SEO, and the tools available in SEO Max. If asked about something outside SEO, politely steer back or give a brief answer. Sign off occasionally as Robo Jacob. Do not make up URLs or data that isn't in the context.`;

/**
 * Send a message to Robo Jacob and get a reply. Uses full store context and conversation history.
 */
export async function chatWithRoboJacob(
  storeId: string,
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ data: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data: context, error: ctxError } = await getStoreContext(storeId);
  if (ctxError || !context) return { data: null, error: ctxError ?? "Could not load store context" };

  const contextBlock = formatContextForPrompt(context);
  const systemContent = `${ROBO_JACOB_SYSTEM}\n\n---\nCurrent store data (use this to give accurate advice):\n\n${contextBlock}`;

  const messages: AIMessage[] = [
    { role: "system", content: systemContent },
    ...conversationHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  try {
    const result = await generateChat(messages, {
      temperature: 0.7,
      maxTokens: 1024,
    });
    return { data: result.content?.trim() ?? null, error: null };
  } catch (e) {
    console.error("chatWithRoboJacob error:", e);
    return {
      data: null,
      error: e instanceof Error ? e.message : "Robo Jacob couldn't respond. Try again.",
    };
  }
}
