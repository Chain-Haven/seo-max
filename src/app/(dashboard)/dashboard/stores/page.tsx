import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { StoreCard } from "@/components/dashboard/store-card";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Store, AlertTriangle } from "lucide-react";

async function StoresContent() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Organization Error</AlertTitle>
          <AlertDescription>
            Unable to load your organization. Please contact support if this issue persists.
          </AlertDescription>
        </Alert>
      );
    }

    // Get stores with error handling
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false });

    if (storesError) {
      console.error("Failed to fetch stores:", storesError);
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Stores</AlertTitle>
          <AlertDescription>
            We couldn't load your stores. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      );
    }

    if (!stores || stores.length === 0) {
      return (
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
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    );
  } catch (error) {
    console.error("Unexpected error in StoresContent:", error);
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          An unexpected error occurred. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
}

function StoresLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <div className="flex justify-between items-center mt-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function StoresPage() {
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

      <Suspense fallback={<StoresLoading />}>
        <StoresContent />
      </Suspense>
    </div>
  );
}