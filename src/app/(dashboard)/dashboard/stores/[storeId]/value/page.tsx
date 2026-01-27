import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { TrafficValueDashboard } from "@/components/seo/traffic-value-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function TrafficValuePage({ params }: Props) {
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

  // Get traffic value history
  const { data: valueHistory } = await supabase
    .from("traffic_value")
    .select("*")
    .eq("store_id", storeId)
    .order("month", { ascending: true })
    .limit(12);

  // Get tracked keywords
  const { data: keywords } = await supabase
    .from("tracked_keywords")
    .select("keyword, current_position, search_volume")
    .eq("store_id", storeId)
    .not("current_position", "is", null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/stores/${storeId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Traffic Value</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
      </div>

      <TrafficValueDashboard
        storeId={storeId}
        valueHistory={valueHistory || []}
        keywords={keywords || []}
      />
    </div>
  );
}
