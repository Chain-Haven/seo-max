import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { KeywordResearchDashboard } from "@/components/keywords/keyword-research-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function KeywordResearchPage({ params }: Props) {
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

  // Get existing keyword research
  const { data: savedKeywords } = await supabase
    .from("keyword_research")
    .select("*")
    .eq("store_id", storeId)
    .order("search_volume", { ascending: false });

  // Get tracked keywords for comparison
  const { data: trackedKeywords } = await supabase
    .from("tracked_keywords")
    .select("keyword, current_position, search_volume")
    .eq("store_id", storeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/stores/${storeId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Keyword Research</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
      </div>

      <KeywordResearchDashboard
        storeId={storeId}
        savedKeywords={savedKeywords || []}
        trackedKeywords={trackedKeywords || []}
      />
    </div>
  );
}
