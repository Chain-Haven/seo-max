import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { APIDashboardsPanel } from "@/components/seo/api-dashboards-panel";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function APIDashboardsPage({ params }: Props) {
  const { storeId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, url")
    .eq("id", storeId)
    .single();

  if (!store) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/stores/${storeId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {store.name}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">API Dashboards</h1>
        <p className="text-muted-foreground mt-2">
          Individual dashboards for SerpAPI, Moz, Ahrefs, Semrush, and DataForSEO
        </p>
      </div>

      <APIDashboardsPanel
        storeId={storeId}
        storeName={store.name}
        storeUrl={store.url}
      />
    </div>
  );
}
