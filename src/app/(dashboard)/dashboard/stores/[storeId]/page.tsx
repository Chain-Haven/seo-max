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
  ChevronRight,
  Newspaper,
  TrendingUp,
  BarChart3,
  Gauge,
  FileBarChart,
  ArrowRightLeft,
  Link as LinkIcon,
  Sparkles,
  Search,
  Bug,
  Target,
  Copy,
  DollarSign,
  MapPin,
  Layers,
  Code,
  Bot,
} from "lucide-react";
import { ApiKeyManager } from "@/components/dashboard/api-key-manager";
import { StoreStatusBadge } from "@/components/dashboard/store-status-badge";
import { SEOAuditPanel } from "@/components/seo/seo-audit-panel";
import { ApiCredentialsForm } from "@/components/settings/api-credentials-form";
import { getStoreApiCredentials } from "@/lib/actions/api-credentials";

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

  const { count: keywordCount } = await supabase
    .from("tracked_keywords")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { data: apiCredentials } = await getStoreApiCredentials(storeId);

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

      {/* Stats - Clickable cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href={`/dashboard/stores/${storeId}/products`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{productCount || 0}</div>
                  <p className="text-xs text-muted-foreground">Manage SEO</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/pages`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pages</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{pageCount || 0}</div>
                  <p className="text-xs text-muted-foreground">Manage SEO</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/blog`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
              <Newspaper className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{blogCount || 0}</div>
                  <p className="text-xs text-muted-foreground">Manage content</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/rankings`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rankings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{keywordCount || 0}</div>
                  <p className="text-xs text-muted-foreground">Track keywords</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Robo Jacob - AI SEO Advisor */}
      <Link href={`/dashboard/stores/${storeId}/robo-jacob`}>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer border-2 border-dashed border-primary/40 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base">Robo Jacob</p>
                <p className="text-sm text-muted-foreground">
                  Your AI SEO advisor. Ask about your site data, audit results, or what to fix next.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 ml-auto" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Additional Tools - Row 1 */}
      <div className="grid gap-4 md:grid-cols-6">
        <Link href={`/dashboard/stores/${storeId}/keywords`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Keywords</p>
                  <p className="text-xs text-muted-foreground">Research</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/audit`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-orange-500/30 bg-orange-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Bug className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-sm">Site Audit</p>
                  <p className="text-xs text-muted-foreground">Find Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/improvements`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">AI Improvements</p>
                  <p className="text-xs text-muted-foreground">Auto-optimize</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/cannibalization`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-red-500/30 bg-red-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Copy className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-sm">Cannibalization</p>
                  <p className="text-xs text-muted-foreground">Detect conflicts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/competitors`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-purple-500/30 bg-purple-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium text-sm">Competitors</p>
                  <p className="text-xs text-muted-foreground">Gap analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/value`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm">Traffic Value</p>
                  <p className="text-xs text-muted-foreground">ROI estimate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Additional Tools - Row 2 */}
      <div className="grid gap-4 md:grid-cols-6">
        <Link href={`/dashboard/stores/${storeId}/analytics`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Analytics</p>
                  <p className="text-xs text-muted-foreground">Search Console</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/speed`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm">Speed</p>
                  <p className="text-xs text-muted-foreground">Core Web Vitals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/links`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <LinkIcon className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="font-medium text-sm">Links</p>
                  <p className="text-xs text-muted-foreground">Broken/Orphans</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/local`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-pink-500" />
                <div>
                  <p className="font-medium text-sm">Local SEO</p>
                  <p className="text-xs text-muted-foreground">GMB & NAP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/bulk`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-cyan-500" />
                <div>
                  <p className="font-medium text-sm">Bulk Ops</p>
                  <p className="text-xs text-muted-foreground">Mass updates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/schema`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Code className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">Schema</p>
                  <p className="text-xs text-muted-foreground">Structured data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/reports`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <FileBarChart className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium text-sm">Reports</p>
                  <p className="text-xs text-muted-foreground">SEO Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/redirects`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-sm">Redirects</p>
                  <p className="text-xs text-muted-foreground">URL Manager</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/stores/${storeId}/backlinks`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <LinkIcon className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-sm">Backlinks</p>
                  <p className="text-xs text-muted-foreground">Link Profile</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
                <Link href="/dashboard/settings">
                  <Button variant="outline" size="sm">
                    Download Plugin
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* SEO Audit Panel */}
          <SEOAuditPanel storeId={storeId} />

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
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <ApiKeyManager storeId={storeId} apiKeys={apiKeys || []} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <ApiCredentialsForm
            storeId={storeId}
            initialCredentials={apiCredentials}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
