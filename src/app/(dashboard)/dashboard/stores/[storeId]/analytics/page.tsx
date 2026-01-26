import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { getGSCPerformanceData, getGSCConnection } from "@/lib/actions/analytics";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

interface AnalyticsPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
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

  const [gscConnection, gscData] = await Promise.all([
    getGSCConnection(storeId),
    getGSCPerformanceData(storeId, 28),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search Analytics</h1>
        <p className="text-muted-foreground">
          Google Search Console data for {store.name}
        </p>
      </div>

      <AnalyticsDashboard
        storeId={storeId}
        isConnected={gscConnection.data?.isConnected || false}
        siteUrl={gscConnection.data?.siteUrl || null}
        performanceData={gscData.data}
      />
    </div>
  );
}
