import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStoreProducts } from "@/lib/actions/seo";
import { getStore } from "@/lib/actions/stores";
import { ProductSEOTable } from "@/components/seo/product-seo-table";
import { SEOStats } from "@/components/seo/seo-stats";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function ProductsSEOPage({ params }: Props) {
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

  const products = await getStoreProducts(storeId);

  // Calculate stats
  const totalProducts = products.length;
  const withMetaTitle = products.filter((p) => p.meta_title).length;
  const withMetaDescription = products.filter((p) => p.meta_description).length;
  const withImages = products.filter(
    (p) => p.images && Array.isArray(p.images) && p.images.length > 0
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/stores/${storeId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products SEO</h1>
            <p className="text-muted-foreground">{store.name}</p>
          </div>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Products
        </Button>
      </div>

      <SEOStats
        items={[
          {
            label: "Total Products",
            value: totalProducts,
            description: "Products synced from store",
          },
          {
            label: "Meta Titles",
            value: withMetaTitle,
            total: totalProducts,
            description: "Products with meta titles",
          },
          {
            label: "Meta Descriptions",
            value: withMetaDescription,
            total: totalProducts,
            description: "Products with meta descriptions",
          },
          {
            label: "With Images",
            value: withImages,
            total: totalProducts,
            description: "Products with images",
          },
        ]}
      />

      <ProductSEOTable products={products} storeId={storeId} />
    </div>
  );
}
