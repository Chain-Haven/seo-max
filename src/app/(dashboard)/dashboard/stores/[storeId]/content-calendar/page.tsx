import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { ContentCalendarPanel } from "@/components/seo/content-calendar-panel";
import { getContentCalendar } from "@/lib/actions/content-calendar";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function ContentCalendarPage({ params }: Props) {
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

  const { data: contentIdeas } = await getContentCalendar(storeId);

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
        <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered content ideas and planning based on keyword gaps and opportunities
        </p>
      </div>

      <ContentCalendarPanel
        storeId={storeId}
        storeName={store.name}
        initialIdeas={contentIdeas || []}
      />
    </div>
  );
}
