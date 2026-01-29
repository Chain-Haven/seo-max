"use server";

/**
 * AI Content Calendar
 * Suggests content based on keyword gaps, trends, and opportunities
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";
import { revalidatePath } from "next/cache";

export interface ContentIdea {
  id: string;
  title: string;
  keyword: string;
  type: "blog" | "product" | "guide" | "comparison" | "faq" | "video";
  priority: "high" | "medium" | "low";
  estimatedTraffic: number;
  difficulty: number;
  targetDate: string | null;
  status: "idea" | "scheduled" | "in_progress" | "published" | "cancelled";
  outline?: string[];
  relatedKeywords: string[];
  competitorGap: boolean;
  seasonalRelevance: string | null;
  createdAt: string;
}

export interface ContentCalendarMonth {
  month: string; // YYYY-MM
  ideas: ContentIdea[];
  publishedCount: number;
  scheduledCount: number;
}

/**
 * Generate content ideas using AI
 */
export async function generateContentIdeas(
  storeId: string,
  options: {
    count?: number;
    focusArea?: string;
    includeSeasonalContent?: boolean;
  } = {}
): Promise<{ data: ContentIdea[] | null; error: string | null }> {
  const supabase = await createClient();
  const ai = getAIProvider();

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

    // Get existing content
    const { data: existingContent } = await supabase
      .from("blog_posts")
      .select("title, meta_title")
      .eq("store_id", storeId)
      .limit(20);

    // Get tracked keywords
    const { data: keywords } = await supabase
      .from("tracked_keywords")
      .select("keyword")
      .eq("store_id", storeId)
      .limit(30);

    // Get products
    const { data: products } = await supabase
      .from("products")
      .select("name, categories")
      .eq("store_id", storeId)
      .limit(20);

    // Get competitor content gaps
    const { data: competitorData } = await supabase
      .from("tracked_competitors")
      .select("domain, keywords")
      .eq("store_id", storeId)
      .limit(5);

    const prompt = `You are an SEO content strategist. Generate ${options.count || 10} content ideas for this store.

Store: ${store.name} (${store.url})

Existing content titles:
${existingContent?.map((c) => `- ${c.title}`).join("\n") || "None yet"}

Tracked keywords:
${keywords?.map((k) => `- ${k.keyword}`).join("\n") || "None"}

Products/Categories:
${products?.map((p) => `- ${p.name} (${p.categories?.join(", ") || "uncategorized"})`).join("\n") || "None"}

Competitors tracking: ${competitorData?.map((c) => c.domain).join(", ") || "None"}

${options.focusArea ? `Focus area: ${options.focusArea}` : ""}
${options.includeSeasonalContent ? "Include seasonal/trending content ideas" : ""}

Generate content ideas in JSON array format:
[
  {
    "title": "Complete title",
    "keyword": "target keyword",
    "type": "blog|product|guide|comparison|faq|video",
    "priority": "high|medium|low",
    "estimatedTraffic": 1000,
    "difficulty": 45,
    "outline": ["Section 1", "Section 2", "Section 3"],
    "relatedKeywords": ["related1", "related2"],
    "competitorGap": true,
    "seasonalRelevance": "Q1 2026" or null
  }
]

Focus on:
1. Keywords with high search volume and low difficulty
2. Content gaps vs competitors
3. Topics related to products
4. Evergreen content that will rank long-term
5. Questions people ask (for featured snippets)`;

    const response = await ai.generateText(prompt, { maxTokens: 2500 });
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return { data: null, error: "Failed to generate ideas" };
    }

    const ideas = JSON.parse(jsonMatch[0]) as Array<{
      title: string;
      keyword: string;
      type: ContentIdea["type"];
      priority: ContentIdea["priority"];
      estimatedTraffic: number;
      difficulty: number;
      outline: string[];
      relatedKeywords: string[];
      competitorGap: boolean;
      seasonalRelevance: string | null;
    }>;

    // Save ideas to database
    const contentIdeas: ContentIdea[] = [];

    for (const idea of ideas) {
      const { data: savedIdea, error } = await supabase
        .from("content_ideas")
        .insert({
          store_id: storeId,
          title: idea.title,
          keyword: idea.keyword,
          content_type: idea.type,
          priority: idea.priority,
          estimated_traffic: idea.estimatedTraffic,
          difficulty: idea.difficulty,
          outline: idea.outline,
          related_keywords: idea.relatedKeywords,
          competitor_gap: idea.competitorGap,
          seasonal_relevance: idea.seasonalRelevance,
          status: "idea",
        })
        .select()
        .single();

      if (savedIdea && !error) {
        contentIdeas.push({
          id: savedIdea.id,
          title: savedIdea.title,
          keyword: savedIdea.keyword,
          type: savedIdea.content_type,
          priority: savedIdea.priority,
          estimatedTraffic: savedIdea.estimated_traffic,
          difficulty: savedIdea.difficulty,
          targetDate: savedIdea.target_date,
          status: savedIdea.status,
          outline: savedIdea.outline,
          relatedKeywords: savedIdea.related_keywords,
          competitorGap: savedIdea.competitor_gap,
          seasonalRelevance: savedIdea.seasonal_relevance,
          createdAt: savedIdea.created_at,
        });
      }
    }

    revalidatePath(`/dashboard/stores/${storeId}/content-calendar`);

    return { data: contentIdeas, error: null };
  } catch (error) {
    console.error("[ContentCalendar] Error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get content calendar for a store
 */
export async function getContentCalendar(
  storeId: string,
  options: { startDate?: string; endDate?: string } = {}
): Promise<{ data: ContentIdea[] | null; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("content_ideas")
    .select("*")
    .eq("store_id", storeId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (options.startDate) {
    query = query.gte("target_date", options.startDate);
  }
  if (options.endDate) {
    query = query.lte("target_date", options.endDate);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      keyword: row.keyword,
      type: row.content_type,
      priority: row.priority,
      estimatedTraffic: row.estimated_traffic,
      difficulty: row.difficulty,
      targetDate: row.target_date,
      status: row.status,
      outline: row.outline,
      relatedKeywords: row.related_keywords,
      competitorGap: row.competitor_gap,
      seasonalRelevance: row.seasonal_relevance,
      createdAt: row.created_at,
    })),
    error: null,
  };
}

/**
 * Update content idea
 */
export async function updateContentIdea(
  ideaId: string,
  updates: Partial<{
    title: string;
    targetDate: string;
    status: ContentIdea["status"];
    priority: ContentIdea["priority"];
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (updates.title) updateData.title = updates.title;
  if (updates.targetDate) updateData.target_date = updates.targetDate;
  if (updates.status) updateData.status = updates.status;
  if (updates.priority) updateData.priority = updates.priority;

  const { error } = await supabase
    .from("content_ideas")
    .update(updateData)
    .eq("id", ideaId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete content idea
 */
export async function deleteContentIdea(
  ideaId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("content_ideas")
    .delete()
    .eq("id", ideaId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get content ideas grouped by month
 */
export async function getContentCalendarByMonth(
  storeId: string,
  year: number = new Date().getFullYear()
): Promise<{ data: ContentCalendarMonth[] | null; error: string | null }> {
  const supabase = await createClient();

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from("content_ideas")
    .select("*")
    .eq("store_id", storeId)
    .gte("target_date", startDate)
    .lte("target_date", endDate)
    .order("target_date", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  // Group by month
  const monthsMap = new Map<string, ContentIdea[]>();

  for (const row of data || []) {
    if (!row.target_date) continue;
    const month = row.target_date.substring(0, 7); // YYYY-MM
    if (!monthsMap.has(month)) {
      monthsMap.set(month, []);
    }
    monthsMap.get(month)!.push({
      id: row.id,
      title: row.title,
      keyword: row.keyword,
      type: row.content_type,
      priority: row.priority,
      estimatedTraffic: row.estimated_traffic,
      difficulty: row.difficulty,
      targetDate: row.target_date,
      status: row.status,
      outline: row.outline,
      relatedKeywords: row.related_keywords,
      competitorGap: row.competitor_gap,
      seasonalRelevance: row.seasonal_relevance,
      createdAt: row.created_at,
    });
  }

  const months: ContentCalendarMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthKey = `${year}-${m.toString().padStart(2, "0")}`;
    const ideas = monthsMap.get(monthKey) || [];
    months.push({
      month: monthKey,
      ideas,
      publishedCount: ideas.filter((i) => i.status === "published").length,
      scheduledCount: ideas.filter((i) => i.status === "scheduled").length,
    });
  }

  return { data: months, error: null };
}
