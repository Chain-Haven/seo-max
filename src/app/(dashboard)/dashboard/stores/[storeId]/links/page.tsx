import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { LinkManagementDashboard } from "@/components/links/link-management-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function LinkManagementPage({ params }: Props) {
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

  // Get broken links
  const { data: brokenLinks } = await supabase
    .from("broken_links")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_fixed", false)
    .order("first_detected_at", { ascending: false });

  // Get orphan pages
  const { data: orphanPages } = await supabase
    .from("orphan_pages")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "orphaned")
    .order("is_important", { ascending: false });

  // Get redirect chains
  const { data: redirectChains } = await supabase
    .from("redirect_chains")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_problematic", true)
    .is("resolved_at", null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/stores/${storeId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Link Management</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
      </div>

      <LinkManagementDashboard
        storeId={storeId}
        brokenLinks={brokenLinks || []}
        orphanPages={orphanPages || []}
        redirectChains={redirectChains || []}
      />
    </div>
  );
}
