import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { SiteAuditDashboard } from "@/components/audit/site-audit-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function SiteAuditPage({ params }: Props) {
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

  // Get latest crawl
  const { data: latestCrawl } = await supabase
    .from("site_crawls")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get crawl history
  const { data: crawlHistory } = await supabase
    .from("site_crawls")
    .select("id, status, pages_crawled, summary, completed_at, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get crawled pages from latest crawl
  let crawledPages: Array<{
    url: string;
    status_code: number;
    title: string | null;
    meta_description: string | null;
    issues: Array<{ type: string; severity: string; message: string }>;
  }> = [];
  
  if (latestCrawl?.id) {
    const { data: pages } = await supabase
      .from("crawled_pages")
      .select("url, status_code, title, meta_description, issues")
      .eq("crawl_id", latestCrawl.id)
      .order("created_at", { ascending: true })
      .limit(100);
    
    crawledPages = pages || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/stores/${storeId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Site Audit</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
      </div>

      <SiteAuditDashboard
        storeId={storeId}
        siteUrl={store.url || ""}
        latestCrawl={latestCrawl}
        crawlHistory={crawlHistory || []}
        crawledPages={crawledPages}
      />
    </div>
  );
}
