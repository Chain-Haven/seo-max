import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/actions/stores";
import { SchemaManagementDashboard } from "@/components/schema/schema-management-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function SchemaManagementPage({ params }: Props) {
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

  // Get schema validations
  const { data: validations } = await supabase
    .from("schema_validations")
    .select("*")
    .eq("store_id", storeId)
    .order("last_validated_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/stores/${storeId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schema Management</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
      </div>

      <SchemaManagementDashboard
        storeId={storeId}
        validations={validations || []}
      />
    </div>
  );
}
