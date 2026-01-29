import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { SEOHealthPanel } from "@/components/seo/seo-health-panel";
import { calculateSEOHealthScore } from "@/lib/actions/seo-apis";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function SEOHealthPage({ params }: Props) {
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

  // Calculate SEO Health Score
  const { data: healthScore } = await calculateSEOHealthScore(storeId);

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
        <h1 className="text-3xl font-bold tracking-tight">SEO Health Score</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive SEO health analysis for your store
        </p>
      </div>

      <SEOHealthPanel
        storeId={storeId}
        storeName={store.name}
        storeUrl={store.url}
        initialScore={healthScore}
      />
    </div>
  );
}
