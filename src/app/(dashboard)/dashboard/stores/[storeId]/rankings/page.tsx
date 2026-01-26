import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { getTrackedKeywords, getRankingSummary, getAlertHistory } from "@/lib/actions/rank-tracking";
import { RankTrackingDashboard } from "@/components/rankings/rank-tracking-dashboard";

interface RankingsPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function RankingsPage({ params }: RankingsPageProps) {
  const { storeId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: store } = await getStore(storeId);
  if (!store) {
    redirect("/dashboard/stores");
  }

  const [keywordsResult, summaryResult, alertsResult] = await Promise.all([
    getTrackedKeywords(storeId),
    getRankingSummary(storeId),
    getAlertHistory(storeId, 20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Keyword Rankings</h1>
        <p className="text-muted-foreground">
          Track keyword positions for {store.name}
        </p>
      </div>

      <RankTrackingDashboard
        storeId={storeId}
        storeDomain={store.url ? new URL(store.url).hostname : ""}
        initialKeywords={keywordsResult.data || []}
        initialSummary={summaryResult.data}
        initialAlerts={alertsResult.data || []}
      />
    </div>
  );
}
