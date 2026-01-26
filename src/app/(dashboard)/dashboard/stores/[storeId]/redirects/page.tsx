import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { getRedirects, getBrokenLinks } from "@/lib/actions/redirects";
import { RedirectsDashboard } from "@/components/redirects/redirects-dashboard";

interface RedirectsPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function RedirectsPage({ params }: RedirectsPageProps) {
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

  const [redirectsResult, brokenLinksResult] = await Promise.all([
    getRedirects(storeId),
    getBrokenLinks(storeId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Redirects</h1>
        <p className="text-muted-foreground">
          Manage URL redirects and fix broken links for {store.name}
        </p>
      </div>

      <RedirectsDashboard
        storeId={storeId}
        initialRedirects={redirectsResult.data || []}
        initialBrokenLinks={brokenLinksResult.data || []}
      />
    </div>
  );
}
