import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { AutoOptimizePanel } from "@/components/seo/auto-optimize-panel";
import { getOptimizableContent, getOptimizationStats } from "@/lib/actions/bulk-optimize";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function AutoOptimizePage({ params }: Props) {
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
    .select("id, name, url, status, platform")
    .eq("id", storeId)
    .single();

  if (!store) {
    notFound();
  }

  // Get content and stats
  const [{ items }, stats] = await Promise.all([
    getOptimizableContent(storeId),
    getOptimizationStats(storeId),
  ]);

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
        <h1 className="text-3xl font-bold tracking-tight">Auto Optimize Content</h1>
        <p className="text-muted-foreground mt-2">
          Automatically optimize SEO for all your {store.platform === "woocommerce" ? "products, pages, and posts" : "content"}
        </p>
      </div>

      <AutoOptimizePanel
        storeId={storeId}
        storeName={store.name}
        storeStatus={store.status}
        items={items}
        stats={stats}
      />
    </div>
  );
}
