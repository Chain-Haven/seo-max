import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { getBacklinks, getBacklinkStats, getTopReferringDomains } from "@/lib/actions/backlinks";
import { BacklinksDashboard } from "@/components/backlinks/backlinks-dashboard";

interface BacklinksPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function BacklinksPage({ params }: BacklinksPageProps) {
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

  const [backlinksResult, statsResult, domainsResult] = await Promise.all([
    getBacklinks(storeId),
    getBacklinkStats(storeId),
    getTopReferringDomains(storeId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backlinks</h1>
        <p className="text-muted-foreground">
          Monitor your link profile for {store.name}
        </p>
      </div>

      <BacklinksDashboard
        storeId={storeId}
        initialBacklinks={backlinksResult.data || []}
        initialStats={statsResult.data}
        initialDomains={domainsResult.data || []}
      />
    </div>
  );
}
