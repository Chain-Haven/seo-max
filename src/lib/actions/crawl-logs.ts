"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface CrawlLog {
  id: string;
  storeId: string;
  botName: string | null;
  url: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  userAgent: string | null;
  crawledAt: string;
}

export interface CrawlStats {
  totalCrawls: number;
  uniqueUrls: number;
  googleBot: number;
  bingBot: number;
  otherBots: number;
  avgResponseTime: number;
  errorRate: number;
  crawlsByDay: Array<{ date: string; count: number }>;
  topUrls: Array<{ url: string; count: number }>;
  statusCodes: Array<{ code: number; count: number }>;
}

// Get crawl logs for a store
export async function getCrawlLogs(
  storeId: string,
  options: {
    limit?: number;
    offset?: number;
    botName?: string;
    statusCode?: number;
  } = {}
): Promise<{ data: CrawlLog[] | null; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("crawl_logs")
    .select("*")
    .eq("store_id", storeId)
    .order("crawled_at", { ascending: false })
    .limit(options.limit || 100);

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  if (options.botName) {
    query = query.eq("bot_name", options.botName);
  }

  if (options.statusCode) {
    query = query.eq("status_code", options.statusCode);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((log) => ({
      id: log.id,
      storeId: log.store_id,
      botName: log.bot_name,
      url: log.url,
      statusCode: log.status_code,
      responseTimeMs: log.response_time_ms,
      userAgent: log.user_agent,
      crawledAt: log.crawled_at,
    })),
    error: null,
  };
}

// Get crawl statistics
export async function getCrawlStats(
  storeId: string,
  days: number = 30
): Promise<{ data: CrawlStats | null; error: string | null }> {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: logs, error } = await supabase
    .from("crawl_logs")
    .select("*")
    .eq("store_id", storeId)
    .gte("crawled_at", startDate.toISOString());

  if (error) {
    return { data: null, error: error.message };
  }

  if (!logs || logs.length === 0) {
    // Return simulated data for demo
    return {
      data: generateSimulatedCrawlStats(days),
      error: null,
    };
  }

  // Calculate stats
  const uniqueUrls = new Set(logs.map((l) => l.url)).size;
  const googleBot = logs.filter((l) => l.bot_name?.toLowerCase().includes("google")).length;
  const bingBot = logs.filter((l) => l.bot_name?.toLowerCase().includes("bing")).length;
  const responseTimes = logs.filter((l) => l.response_time_ms).map((l) => l.response_time_ms as number);
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;
  const errors = logs.filter((l) => l.status_code && l.status_code >= 400).length;

  // Group by day
  const dayMap = new Map<string, number>();
  for (const log of logs) {
    const day = log.crawled_at.split("T")[0];
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }
  const crawlsByDay = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top URLs
  const urlMap = new Map<string, number>();
  for (const log of logs) {
    urlMap.set(log.url, (urlMap.get(log.url) || 0) + 1);
  }
  const topUrls = Array.from(urlMap.entries())
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Status codes
  const codeMap = new Map<number, number>();
  for (const log of logs) {
    if (log.status_code) {
      codeMap.set(log.status_code, (codeMap.get(log.status_code) || 0) + 1);
    }
  }
  const statusCodes = Array.from(codeMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  return {
    data: {
      totalCrawls: logs.length,
      uniqueUrls,
      googleBot,
      bingBot,
      otherBots: logs.length - googleBot - bingBot,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: logs.length > 0 ? (errors / logs.length) * 100 : 0,
      crawlsByDay,
      topUrls,
      statusCodes,
    },
    error: null,
  };
}

// Log a crawl (called via API from server/plugin)
export async function logCrawl(
  storeId: string,
  data: {
    botName?: string;
    url: string;
    statusCode?: number;
    responseTimeMs?: number;
    userAgent?: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createServiceClient();

  // Detect bot name from user agent if not provided
  let botName = data.botName;
  if (!botName && data.userAgent) {
    if (data.userAgent.toLowerCase().includes("googlebot")) {
      botName = "Googlebot";
    } else if (data.userAgent.toLowerCase().includes("bingbot")) {
      botName = "Bingbot";
    } else if (data.userAgent.toLowerCase().includes("yandex")) {
      botName = "YandexBot";
    } else if (data.userAgent.toLowerCase().includes("duckduck")) {
      botName = "DuckDuckBot";
    } else {
      botName = "Other";
    }
  }

  const { error } = await supabase.from("crawl_logs").insert({
    store_id: storeId,
    bot_name: botName,
    url: data.url,
    status_code: data.statusCode,
    response_time_ms: data.responseTimeMs,
    user_agent: data.userAgent,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Generate simulated crawl stats for demo
function generateSimulatedCrawlStats(days: number): CrawlStats {
  const crawlsByDay: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    crawlsByDay.push({
      date: date.toISOString().split("T")[0],
      count: Math.floor(Math.random() * 500) + 100,
    });
  }

  const totalCrawls = crawlsByDay.reduce((sum, d) => sum + d.count, 0);

  return {
    totalCrawls,
    uniqueUrls: Math.floor(totalCrawls * 0.3),
    googleBot: Math.floor(totalCrawls * 0.65),
    bingBot: Math.floor(totalCrawls * 0.25),
    otherBots: Math.floor(totalCrawls * 0.1),
    avgResponseTime: 245,
    errorRate: 2.3,
    crawlsByDay,
    topUrls: [
      { url: "/", count: Math.floor(totalCrawls * 0.15) },
      { url: "/products", count: Math.floor(totalCrawls * 0.12) },
      { url: "/blog", count: Math.floor(totalCrawls * 0.08) },
      { url: "/about", count: Math.floor(totalCrawls * 0.05) },
      { url: "/contact", count: Math.floor(totalCrawls * 0.04) },
    ],
    statusCodes: [
      { code: 200, count: Math.floor(totalCrawls * 0.92) },
      { code: 301, count: Math.floor(totalCrawls * 0.03) },
      { code: 404, count: Math.floor(totalCrawls * 0.02) },
      { code: 500, count: Math.floor(totalCrawls * 0.01) },
    ],
  };
}

// Analyze crawl budget efficiency
export interface CrawlBudgetAnalysis {
  efficiency: number;
  recommendations: string[];
  wastedCrawls: number;
  importantPagesCrawled: number;
}

export async function analyzeCrawlBudget(
  storeId: string
): Promise<{ data: CrawlBudgetAnalysis | null; error: string | null }> {
  const { data: stats, error } = await getCrawlStats(storeId);

  if (error || !stats) {
    return { data: null, error };
  }

  const recommendations: string[] = [];

  // Check error rate
  if (stats.errorRate > 5) {
    recommendations.push(
      `High error rate (${stats.errorRate.toFixed(1)}%). Fix broken pages to improve crawl efficiency.`
    );
  }

  // Check response time
  if (stats.avgResponseTime > 500) {
    recommendations.push(
      `Average response time is ${stats.avgResponseTime}ms. Improve server performance for faster crawling.`
    );
  }

  // Check crawl distribution
  const googlePercent = (stats.googleBot / stats.totalCrawls) * 100;
  if (googlePercent < 50) {
    recommendations.push(
      "Googlebot crawl rate is low. Check robots.txt and sitemap to ensure important pages are accessible."
    );
  }

  // Estimate wasted crawls (404s, redirects)
  const errorCrawls = stats.statusCodes
    .filter((s) => s.code >= 400 || s.code === 301 || s.code === 302)
    .reduce((sum, s) => sum + s.count, 0);

  const efficiency = Math.max(0, 100 - (errorCrawls / stats.totalCrawls) * 100);

  return {
    data: {
      efficiency: Math.round(efficiency),
      recommendations:
        recommendations.length > 0
          ? recommendations
          : ["Your crawl budget is being used efficiently. Keep up the good work!"],
      wastedCrawls: errorCrawls,
      importantPagesCrawled: stats.uniqueUrls,
    },
    error: null,
  };
}
