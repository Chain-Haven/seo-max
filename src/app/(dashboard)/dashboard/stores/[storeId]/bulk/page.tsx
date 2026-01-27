import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { BulkOperationsDashboard } from "@/components/bulk/bulk-operations-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function BulkOperationsPage({ params }: Props) {
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

  // Get products without meta
  const { data: productsNeedingMeta } = await supabase
    .from("products")
    .select("id, name, meta_title, meta_description")
    .eq("store_id", storeId)
    .or("meta_title.is.null,meta_description.is.null")
    .limit(100);

  // Get images without alt text
  const { data: allProducts } = await supabase
    .from("products")
    .select("id, name, images")
    .eq("store_id", storeId)
    .limit(500);

  const imagesNeedingAlt = (allProducts || []).filter((p) => {
    const images = (p.images as Array<{ url: string; alt?: string }>) || [];
    return images.some((img) => !img.alt || img.alt.trim().length === 0);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/stores/${storeId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Operations</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
      </div>

      <BulkOperationsDashboard
        storeId={storeId}
        productsNeedingMeta={productsNeedingMeta || []}
        imagesNeedingAlt={imagesNeedingAlt.map((p) => p.id)}
      />
    </div>
  );
}
