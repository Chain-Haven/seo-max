import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { AdvancedToolsPanel } from "@/components/seo/advanced-tools-panel";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function AdvancedToolsPage({ params }: Props) {
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
        <h1 className="text-3xl font-bold tracking-tight">Advanced SEO Tools</h1>
        <p className="text-muted-foreground mt-2">
          Schema Validator, Mobile Audit, International SEO, and E-E-A-T Analysis
        </p>
      </div>

      <AdvancedToolsPanel
        storeId={storeId}
        storeName={store.name}
        storeUrl={store.url}
      />
    </div>
  );
}
