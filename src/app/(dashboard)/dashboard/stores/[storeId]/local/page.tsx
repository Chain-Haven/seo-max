import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { LocalSEODashboard } from "@/components/local/local-seo-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function LocalSEOPage({ params }: Props) {
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

  // Get business locations
  const { data: locations } = await supabase
    .from("business_locations")
    .select("*")
    .eq("store_id", storeId);

  // Get local rankings
  const { data: localRankings } = await supabase
    .from("local_rankings")
    .select("*")
    .eq("store_id", storeId)
    .order("checked_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/stores/${storeId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Local SEO</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
      </div>

      <LocalSEODashboard
        storeId={storeId}
        locations={locations || []}
        localRankings={localRankings || []}
      />
    </div>
  );
}
