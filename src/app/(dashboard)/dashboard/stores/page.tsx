import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { StoreCard } from "@/components/dashboard/store-card";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Store } from "lucide-react";

export default async function StoresPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/dashboard");
  }

  // Get stores
  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stores</h1>
          <p className="text-muted-foreground">
            Manage your connected WooCommerce and WordPress stores.
          </p>
        </div>
        <Link href="/dashboard/stores/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Store
          </Button>
        </Link>
      </div>

      {!stores || stores.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Store className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No stores yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Connect your first WooCommerce or WordPress store to start managing its SEO
              from this centralized dashboard.
            </p>
            <Link href="/dashboard/stores/new">
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Add Your First Store
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}
