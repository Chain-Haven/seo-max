import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { SerpAnalysisPanel } from "@/components/seo/serp-analysis-panel";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function SerpAnalysisPage({ params }: Props) {
  const { storeId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get store
  const { data: store } = await supabase
    .from("stores")
    .select("id, name, url, status")
    .eq("id", storeId)
    .single();

  if (!store) {
    notFound();
  }

  // Get tracked keywords
  const { data: keywords } = await supabase
    .from("tracked_keywords")
    .select("keyword")
    .eq("store_id", storeId)
    .limit(20);

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
        <h1 className="text-3xl font-bold tracking-tight">SERP Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Analyze search engine results pages for your keywords with real SerpAPI data
        </p>
      </div>

      <SerpAnalysisPanel
        storeId={storeId}
        storeUrl={store.url}
        trackedKeywords={keywords?.map((k) => k.keyword) || []}
      />
    </div>
  );
}
