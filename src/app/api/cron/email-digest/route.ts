import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getGSCPerformanceData } from "@/lib/actions/analytics";
import { getRankingSummary } from "@/lib/actions/rank-tracking";
import { getBacklinkStats } from "@/lib/actions/backlinks";

// Vercel Cron: runs every Monday at 9 AM UTC
// Add to vercel.json: { "crons": [{ "path": "/api/cron/email-digest", "schedule": "0 9 * * 1" }] }

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  try {
    // Get all organizations with email digest enabled
    const { data: orgs } = await supabase
      .from("organizations")
      .select(`
        id,
        name,
        settings,
        organization_members (
          user_id,
          role,
          profiles (
            email,
            full_name
          )
        )
      `);

    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ message: "No organizations" });
    }

    let emailsSent = 0;

    for (const org of orgs) {
      // Check if digest is enabled (default to true)
      const settings = org.settings as { emailDigest?: boolean } | null;
      if (settings?.emailDigest === false) continue;

      // Get stores for this org
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name, url")
        .eq("organization_id", org.id)
        .eq("status", "active");

      if (!stores || stores.length === 0) continue;

      // Gather digest data for all stores
      const storeDigests = await Promise.all(
        stores.map(async (store) => {
          const [gsc, rankings, backlinks] = await Promise.all([
            getGSCPerformanceData(store.id, 7),
            getRankingSummary(store.id),
            getBacklinkStats(store.id),
          ]);

          return {
            name: store.name,
            url: store.url,
            clicks: gsc.data?.totals.clicks || 0,
            impressions: gsc.data?.totals.impressions || 0,
            avgPosition: gsc.data?.totals.position || 0,
            keywordsTracked: rankings.data?.totalKeywords || 0,
            keywordsInTop10: rankings.data?.top10 || 0,
            rankingsImproved: rankings.data?.improved || 0,
            rankingsDeclined: rankings.data?.declined || 0,
            backlinks: backlinks.data?.totalBacklinks || 0,
            backlinksGained: backlinks.data?.gainedThisMonth || 0,
          };
        })
      );

      // Generate digest HTML
      const digestHtml = generateDigestEmail(org.name, storeDigests);

      // Get admin emails
      const adminMembers = (org.organization_members as unknown as Array<{
        role: string;
        profiles: { email: string; full_name: string } | null;
      }>).filter((m) => m.role === "owner" || m.role === "admin");

      for (const member of adminMembers) {
        if (!member.profiles?.email) continue;

        // In production, send via email service (Resend, SendGrid, etc.)
        // For now, just log
        console.log(`Would send digest to ${member.profiles.email}`);
        emailsSent++;

        // Example with Resend:
        // await resend.emails.send({
        //   from: 'SEO Max <reports@seomax.com>',
        //   to: member.profiles.email,
        //   subject: `Weekly SEO Report - ${org.name}`,
        //   html: digestHtml,
        // });
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Email digest error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

interface StoreDigest {
  name: string;
  url: string | null;
  clicks: number;
  impressions: number;
  avgPosition: number;
  keywordsTracked: number;
  keywordsInTop10: number;
  rankingsImproved: number;
  rankingsDeclined: number;
  backlinks: number;
  backlinksGained: number;
}

function generateDigestEmail(orgName: string, stores: StoreDigest[]): string {
  const storeRows = stores
    .map(
      (store) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${store.name}</strong>
        ${store.url ? `<br><small style="color: #666;">${store.url}</small>` : ""}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        ${store.clicks.toLocaleString()}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        ${store.keywordsInTop10}/${store.keywordsTracked}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        <span style="color: ${store.rankingsImproved > store.rankingsDeclined ? "#22c55e" : store.rankingsImproved < store.rankingsDeclined ? "#ef4444" : "#666"};">
          ↑${store.rankingsImproved} ↓${store.rankingsDeclined}
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        ${store.backlinks} (+${store.backlinksGained})
      </td>
    </tr>
  `
    )
    .join("");

  const totalClicks = stores.reduce((sum, s) => sum + s.clicks, 0);
  const totalImpressions = stores.reduce((sum, s) => sum + s.impressions, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #0066FF, #0044AA); padding: 30px; color: white;">
      <h1 style="margin: 0; font-size: 24px;">Weekly SEO Report</h1>
      <p style="margin: 10px 0 0; opacity: 0.9;">${orgName}</p>
    </div>
    
    <div style="padding: 30px;">
      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        <div style="flex: 1; background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #0066FF;">${totalClicks.toLocaleString()}</div>
          <div style="color: #666; font-size: 14px;">Total Clicks</div>
        </div>
        <div style="flex: 1; background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #0066FF;">${totalImpressions.toLocaleString()}</div>
          <div style="color: #666; font-size: 14px;">Impressions</div>
        </div>
      </div>

      <h2 style="font-size: 18px; margin: 0 0 15px;">Store Performance</h2>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px; text-align: left;">Store</th>
            <th style="padding: 12px; text-align: center;">Clicks</th>
            <th style="padding: 12px; text-align: center;">Top 10</th>
            <th style="padding: 12px; text-align: center;">Changes</th>
            <th style="padding: 12px; text-align: center;">Backlinks</th>
          </tr>
        </thead>
        <tbody>
          ${storeRows}
        </tbody>
      </table>

      <div style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 8px;">
        <h3 style="margin: 0 0 10px; font-size: 16px; color: #0066FF;">Quick Actions</h3>
        <ul style="margin: 0; padding-left: 20px; color: #444;">
          <li>Review keywords that dropped positions</li>
          <li>Check for new content opportunities</li>
          <li>Analyze competitor rankings</li>
        </ul>
      </div>
    </div>

    <div style="padding: 20px 30px; background: #f9fafb; text-align: center; color: #666; font-size: 12px;">
      <p style="margin: 0;">This report was generated automatically by SEO Max.</p>
      <p style="margin: 10px 0 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color: #0066FF; text-decoration: none;">View Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
