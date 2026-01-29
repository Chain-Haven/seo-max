import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { RoboJacobChat } from "@/components/robo-jacob/robo-jacob-chat";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function RoboJacobPage({ params }: Props) {
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
          <h1 className="text-3xl font-bold tracking-tight">Robo Jacob</h1>
          <p className="text-muted-foreground">
            Your AI SEO advisor for {store.name}. Ask about your data, audit, or next steps.
          </p>
        </div>
      </div>

      <RoboJacobChat storeId={storeId} storeName={store.name} />
    </div>
  );
}
