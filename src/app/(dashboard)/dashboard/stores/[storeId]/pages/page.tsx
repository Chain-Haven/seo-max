import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStorePages } from "@/lib/actions/seo";
import { getStore } from "@/lib/actions/stores";
import { PageSEOTable } from "@/components/seo/page-seo-table";
import { SEOStats } from "@/components/seo/seo-stats";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function PagesSEOPage({ params }: Props) {
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

  const pages = await getStorePages(storeId);

  // Calculate stats
  const totalPages = pages.length;
  const withMetaTitle = pages.filter((p) => p.meta_title).length;
  const withMetaDescription = pages.filter((p) => p.meta_description).length;
  const homepages = pages.filter((p) => p.page_type === "homepage").length;

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
            <h1 className="text-3xl font-bold tracking-tight">Pages SEO</h1>
            <p className="text-muted-foreground">{store.name}</p>
          </div>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Pages
        </Button>
      </div>

      <SEOStats
        items={[
          {
            label: "Total Pages",
            value: totalPages,
            description: "Pages synced from store",
          },
          {
            label: "Meta Titles",
            value: withMetaTitle,
            total: totalPages,
            description: "Pages with meta titles",
          },
          {
            label: "Meta Descriptions",
            value: withMetaDescription,
            total: totalPages,
            description: "Pages with meta descriptions",
          },
          {
            label: "Homepage",
            value: homepages,
            description: "Homepage configured",
          },
        ]}
      />

      <PageSEOTable pages={pages} storeId={storeId} />
    </div>
  );
}
