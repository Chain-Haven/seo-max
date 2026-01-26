import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { getReports } from "@/lib/actions/reports";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";

interface ReportsPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function ReportsPage({ params }: ReportsPageProps) {
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

  const { data: reports } = await getReports(storeId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SEO Reports</h1>
        <p className="text-muted-foreground">
          Generate and view performance reports for {store.name}
        </p>
      </div>

      <ReportsDashboard
        storeId={storeId}
        storeName={store.name}
        initialReports={reports || []}
      />
    </div>
  );
}
