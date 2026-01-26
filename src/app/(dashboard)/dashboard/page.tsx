import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StoreCard } from "@/components/dashboard/store-card";
import { Store, FileText, TrendingUp, AlertCircle, Plus } from "lucide-react";
import { CreateOrganizationDialog } from "@/components/dashboard/create-organization-dialog";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has an organization
  const { data: memberships } = await supabase
    .from("organization_members")
    .select(`
      role,
      organization_id
    `)
    .eq("user_id", user.id);

  const hasOrganization = memberships && memberships.length > 0;
  const organizationId = hasOrganization ? memberships[0].organization_id : null;

  // Get stores for the organization
  let stores: Array<{
    id: string;
    name: string;
    url: string;
    platform: string;
    status: string;
    last_sync_at: string | null;
  }> = [];

  if (organizationId) {
    const { data: storeData } = await supabase
      .from("stores")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    stores = storeData || [];
  }

  // Stats
  const totalStores = stores.length;
  const connectedStores = stores.filter((s) => s.status === "connected").length;

  // If no organization, show onboarding
  if (!hasOrganization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to SEO Max</h1>
          <p className="text-muted-foreground max-w-md">
            Get started by creating an organization to manage your stores and SEO.
          </p>
        </div>
        <CreateOrganizationDialog />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your SEO performance.
          </p>
        </div>
        <Link href="/dashboard/stores/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Store
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStores}</div>
            <p className="text-xs text-muted-foreground">
              {connectedStores} connected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Across all stores
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Generated this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SEO Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stores Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Stores</h2>
          <Link href="/dashboard/stores">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </div>
        {stores.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Store className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No stores yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Connect your first WooCommerce store to start managing its SEO.
              </p>
              <Link href="/dashboard/stores/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Store
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stores.slice(0, 6).map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
