import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { getSpeedHistory } from "@/lib/actions/analytics";
import { SiteSpeedDashboard } from "@/components/speed/site-speed-dashboard";

interface SpeedPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function SpeedPage({ params }: SpeedPageProps) {
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

  const { data: speedHistory } = await getSpeedHistory(storeId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Site Speed</h1>
        <p className="text-muted-foreground">
          Core Web Vitals and performance metrics for {store.name}
        </p>
      </div>

      <SiteSpeedDashboard
        storeId={storeId}
        storeUrl={store.url || ""}
        initialHistory={speedHistory || []}
      />
    </div>
  );
}
