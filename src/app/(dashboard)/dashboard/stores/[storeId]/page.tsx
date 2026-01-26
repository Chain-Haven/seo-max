import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Key,
  Package,
  FileText,
  Settings,
} from "lucide-react";
import { ApiKeyManager } from "@/components/dashboard/api-key-manager";
import { StoreStatusBadge } from "@/components/dashboard/store-status-badge";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function StoreDetailPage({ params }: Props) {
  const { storeId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get store
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (!store) {
    notFound();
  }

  // Get API keys
  const { data: apiKeys } = await supabase
    .from("api_keys")
    .select("id, key_prefix, name, permissions, last_used_at, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  // Get stats
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { count: pageCount } = await supabase
    .from("pages")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { count: blogCount } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/stores"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Stores
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{store.name}</h1>
            <StoreStatusBadge status={store.status} />
          </div>
          <div className="flex items-center gap-2">
            <a href={store.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit Site
              </Button>
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>{store.url}</span>
          <Badge variant="secondary">{store.platform}</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount || 0}</div>
            <p className="text-xs text-muted-foreground">Synced from store</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pageCount || 0}</div>
            <p className="text-xs text-muted-foreground">Including categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blogCount || 0}</div>
            <p className="text-xs text-muted-foreground">Published & drafts</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>
                Current connection status and last sync information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <StoreStatusBadge status={store.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Sync</span>
                <span className="text-sm text-muted-foreground">
                  {store.last_sync_at
                    ? new Date(store.last_sync_at).toLocaleString()
                    : "Never synced"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Created</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(store.created_at).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {store.status === "pending" && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Complete Setup
                </CardTitle>
                <CardDescription>
                  Install the WordPress plugin to connect this store.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Go to the API Keys tab and copy your API key</li>
                  <li>Download and install the SEO Max plugin on your WordPress site</li>
                  <li>Paste your API key in the plugin settings</li>
                  <li>Click Connect to complete the setup</li>
                </ol>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <ApiKeyManager storeId={storeId} apiKeys={apiKeys || []} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Store Settings
              </CardTitle>
              <CardDescription>
                Configure store-specific settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Store settings will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
