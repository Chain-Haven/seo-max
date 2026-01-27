import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { RobotsTxtEditor } from "@/components/seo/robots-txt-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function RobotsTxtPage({ params }: Props) {
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

  // Get robots.txt config
  const { data: robotsConfig } = await supabase
    .from("robots_txt_config")
    .select("*")
    .eq("store_id", storeId)
    .single();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/stores/${storeId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Robots.txt Editor</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
      </div>

      <RobotsTxtEditor
        storeId={storeId}
        initialContent={robotsConfig?.content || ""}
      />
    </div>
  );
}
