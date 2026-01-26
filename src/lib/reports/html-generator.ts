/**
 * Report HTML Generator
 * Client-side utility for generating HTML reports
 */

import type { SEOReport } from "@/lib/actions/reports";

// Generate HTML report
export function generateReportHTML(report: SEOReport): string {
  const { reportData: data } = report;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SEO Report - ${data.storeName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a1a1a; }
    h2 { color: #444; margin-top: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .score { font-size: 48px; font-weight: bold; color: ${data.summary.overallScore >= 70 ? '#22c55e' : data.summary.overallScore >= 50 ? '#eab308' : '#ef4444'}; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .stat-card { background: #f9fafb; border-radius: 8px; padding: 20px; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { color: #666; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
    th { background: #f9fafb; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    .recommendations { background: #fef3c7; padding: 20px; border-radius: 8px; margin-top: 30px; }
    .recommendations ul { margin: 10px 0; padding-left: 20px; }
    .recommendations li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${data.storeName}</h1>
      <p>SEO Performance Report: ${data.period}</p>
    </div>
    <div class="score">${data.summary.overallScore}</div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${data.traffic.totalClicks.toLocaleString()}</div>
      <div class="stat-label">Total Clicks</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.traffic.totalImpressions.toLocaleString()}</div>
      <div class="stat-label">Impressions</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.traffic.avgCtr}%</div>
      <div class="stat-label">Avg CTR</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.traffic.avgPosition}</div>
      <div class="stat-label">Avg Position</div>
    </div>
  </div>

  <h2>Top Queries</h2>
  <table>
    <tr><th>Query</th><th>Clicks</th><th>Impressions</th></tr>
    ${data.traffic.topQueries.map(q => `<tr><td>${q.query}</td><td>${q.clicks}</td><td>${q.impressions}</td></tr>`).join('')}
  </table>

  <h2>Rankings Summary</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${data.rankings.totalKeywords}</div>
      <div class="stat-label">Keywords Tracked</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.rankings.top10}</div>
      <div class="stat-label">In Top 10</div>
    </div>
    <div class="stat-card">
      <div class="stat-value positive">↑${data.rankings.improved}</div>
      <div class="stat-label">Improved</div>
    </div>
    <div class="stat-card">
      <div class="stat-value negative">↓${data.rankings.declined}</div>
      <div class="stat-label">Declined</div>
    </div>
  </div>

  <h2>Backlinks</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${data.backlinks.total}</div>
      <div class="stat-label">Total Backlinks</div>
    </div>
    <div class="stat-card">
      <div class="stat-value positive">+${data.backlinks.gained}</div>
      <div class="stat-label">Gained</div>
    </div>
    <div class="stat-card">
      <div class="stat-value negative">-${data.backlinks.lost}</div>
      <div class="stat-label">Lost</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.backlinks.avgDa}</div>
      <div class="stat-label">Avg DA</div>
    </div>
  </div>

  <div class="recommendations">
    <h2 style="margin-top: 0;">Recommendations</h2>
    <ul>
      ${data.recommendations.map(r => `<li>${r}</li>`).join('')}
    </ul>
  </div>
</body>
</html>
  `;
}
