import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ImprovementsDashboard } from "@/components/improvements/improvements-dashboard";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function ImprovementsPage({ params }: Props) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/stores/${storeId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SEO Improvements</h1>
          <p className="text-muted-foreground">
            AI-suggested improvements for {store.name}
          </p>
        </div>
      </div>

      <ImprovementsDashboard storeId={storeId} storeUrl={store.url || ""} />
    </div>
  );
}
