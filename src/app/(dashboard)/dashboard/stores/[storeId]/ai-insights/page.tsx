import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { AIInsightsPanel } from "@/components/seo/ai-insights-panel";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function AIInsightsPage({ params }: Props) {
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
        <h1 className="text-3xl font-bold tracking-tight">AI Insights Hub</h1>
        <p className="text-muted-foreground mt-2">
          Aggregated data from all SEO APIs with 1-click intelligent improvements
        </p>
      </div>

      <AIInsightsPanel
        storeId={storeId}
        storeName={store.name}
        storeUrl={store.url}
      />
    </div>
  );
}
