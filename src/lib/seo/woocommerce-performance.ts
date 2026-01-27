/**
 * WooCommerce Performance Optimization
 * Detect and fix performance issues specific to WooCommerce
 */

export interface PerformanceIssue {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  impact: string;
  suggestedFix: string;
  affectedUrls?: string[];
}

export interface PerformanceAudit {
  overallScore: number;
  issues: PerformanceIssue[];
  recommendations: string[];
  estimatedSpeedImprovement: string;
}

// Audit WooCommerce performance
export async function auditWooCommercePerformance(siteData: {
  pluginCount: number;
  themeActive: string;
  phpVersion: string;
  mysqlVersion: string;
  productCount: number;
  orderCount: number;
  hasCaching: boolean;
  hasCDN: boolean;
  hasLazyLoading: boolean;
}): Promise<PerformanceAudit> {
  const issues: PerformanceIssue[] = [];

  // Too many plugins
  if (siteData.pluginCount > 30) {
    issues.push({
      type: "too_many_plugins",
      severity: "high",
      description: `${siteData.pluginCount} plugins active`,
      impact: "Each plugin adds overhead. Excessive plugins slow down your site.",
      suggestedFix: "Audit and deactivate unused plugins. Aim for under 20 active plugins.",
    });
  } else if (siteData.pluginCount > 20) {
    issues.push({
      type: "many_plugins",
      severity: "medium",
      description: `${siteData.pluginCount} plugins active`,
      impact: "Moderate plugin overhead",
      suggestedFix: "Consider reducing plugin count to improve performance",
    });
  }

  // No caching
  if (!siteData.hasCaching) {
    issues.push({
      type: "no_caching",
      severity: "critical",
      description: "No caching plugin detected",
      impact: "Every page request hits the database. This is extremely slow.",
      suggestedFix: "Install WP Rocket, W3 Total Cache, or WP Super Cache immediately",
    });
  }

  // No CDN
  if (!siteData.hasCDN) {
    issues.push({
      type: "no_cdn",
      severity: "high",
      description: "No CDN detected",
      impact: "Assets load slowly for international visitors",
      suggestedFix: "Set up Cloudflare (free) or BunnyCDN for faster asset delivery",
    });
  }

  // No lazy loading
  if (!siteData.hasLazyLoading) {
    issues.push({
      type: "no_lazy_loading",
      severity: "medium",
      description: "Lazy loading not enabled",
      impact: "All images load immediately, slowing initial page load",
      suggestedFix: "Enable native lazy loading or use a plugin like Lazy Load by WP Rocket",
    });
  }

  // PHP version
  const phpVersion = parseFloat(siteData.phpVersion);
  if (phpVersion < 8.0) {
    issues.push({
      type: "outdated_php",
      severity: "high",
      description: `PHP ${siteData.phpVersion} is outdated`,
      impact: "Older PHP versions are slower and less secure",
      suggestedFix: "Upgrade to PHP 8.1 or higher for 20-30% performance improvement",
    });
  }

  // Large product count without optimization
  if (siteData.productCount > 1000 && !siteData.hasCaching) {
    issues.push({
      type: "large_catalog_uncached",
      severity: "critical",
      description: `${siteData.productCount} products without caching`,
      impact: "Large product database queries are killing performance",
      suggestedFix: "Enable object caching (Redis/Memcached) and page caching immediately",
    });
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (issues.some((i) => i.type === "no_caching")) {
    recommendations.push("Install WP Rocket or similar caching plugin (highest impact)");
  }

  if (issues.some((i) => i.type === "no_cdn")) {
    recommendations.push("Set up Cloudflare for free CDN and optimization");
  }

  if (siteData.productCount > 500) {
    recommendations.push("Optimize WooCommerce database tables regularly");
    recommendations.push("Disable WooCommerce admin widgets if not needed");
    recommendations.push("Use object caching for product queries");
  }

  recommendations.push("Minify and combine CSS/JS files");
  recommendations.push("Enable GZIP compression on server");
  recommendations.push("Optimize product images before uploading");

  // Calculate overall score
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "critical") score -= 25;
    else if (issue.severity === "high") score -= 15;
    else if (issue.severity === "medium") score -= 8;
    else score -= 3;
  }
  score = Math.max(0, score);

  const estimatedSpeedImprovement = 
    issues.some((i) => i.severity === "critical") ? "50-70% faster" :
    issues.some((i) => i.severity === "high") ? "30-50% faster" :
    issues.some((i) => i.severity === "medium") ? "15-30% faster" : "5-15% faster";

  return {
    overallScore: score,
    issues,
    recommendations,
    estimatedSpeedImprovement,
  };
}

// Detect slow database queries
export interface SlowQuery {
  query: string;
  avgTime: number;
  callCount: number;
  totalTime: number;
  suggestedIndex?: string;
}

export function identifySlowQueries(queryLog: Array<{ query: string; time: number }>): SlowQuery[] {
  const queryMap = new Map<string, { times: number[]; count: number }>();

  for (const log of queryLog) {
    const existing = queryMap.get(log.query) || { times: [], count: 0 };
    existing.times.push(log.time);
    existing.count++;
    queryMap.set(log.query, existing);
  }

  const slow: SlowQuery[] = [];

  for (const [query, data] of queryMap) {
    const avgTime = data.times.reduce((a, b) => a + b, 0) / data.count;
    const totalTime = data.times.reduce((a, b) => a + b, 0);

    if (avgTime > 100 || totalTime > 500) {
      slow.push({
        query: query.substring(0, 200),
        avgTime: Math.round(avgTime),
        callCount: data.count,
        totalTime: Math.round(totalTime),
        suggestedIndex: detectMissingIndex(query),
      });
    }
  }

  slow.sort((a, b) => b.totalTime - a.totalTime);

  return slow;
}

function detectMissingIndex(query: string): string | undefined {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes("where") && lowerQuery.includes("post_type")) {
    return "Consider adding index on (post_type, post_status)";
  }

  if (lowerQuery.includes("meta_key") || lowerQuery.includes("meta_value")) {
    return "Consider adding index on wp_postmeta (meta_key, meta_value)";
  }

  if (lowerQuery.includes("term_taxonomy_id")) {
    return "Consider adding index on term relationships";
  }

  return undefined;
}

// WooCommerce-specific cleanup
export function generateCleanupRecommendations(stats: {
  transientCount: number;
  revisionCount: number;
  autoDraftCount: number;
  trashedItemCount: number;
  orphanedMetaCount: number;
}): Array<{
  action: string;
  impact: "high" | "medium" | "low";
  description: string;
  query: string;
}> {
  const recommendations: Array<{
    action: string;
    impact: "high" | "medium" | "low";
    description: string;
    query: string;
  }> = [];

  if (stats.transientCount > 1000) {
    recommendations.push({
      action: "Clean up transients",
      impact: "high",
      description: `${stats.transientCount} expired transients are bloating your database`,
      query: "DELETE FROM wp_options WHERE option_name LIKE '%_transient_%'",
    });
  }

  if (stats.revisionCount > 500) {
    recommendations.push({
      action: "Limit post revisions",
      impact: "medium",
      description: `${stats.revisionCount} post revisions can be reduced`,
      query: "DELETE FROM wp_posts WHERE post_type = 'revision'",
    });
  }

  if (stats.autoDraftCount > 100) {
    recommendations.push({
      action: "Delete auto-drafts",
      impact: "low",
      description: `${stats.autoDraftCount} auto-draft posts`,
      query: "DELETE FROM wp_posts WHERE post_status = 'auto-draft'",
    });
  }

  if (stats.trashedItemCount > 50) {
    recommendations.push({
      action: "Empty trash",
      impact: "low",
      description: `${stats.trashedItemCount} trashed items`,
      query: "DELETE FROM wp_posts WHERE post_status = 'trash'",
    });
  }

  if (stats.orphanedMetaCount > 100) {
    recommendations.push({
      action: "Remove orphaned metadata",
      impact: "medium",
      description: `${stats.orphanedMetaCount} orphaned meta rows`,
      query: "DELETE pm FROM wp_postmeta pm LEFT JOIN wp_posts p ON pm.post_id = p.ID WHERE p.ID IS NULL",
    });
  }

  return recommendations;
}
