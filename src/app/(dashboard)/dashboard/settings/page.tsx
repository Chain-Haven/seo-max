import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Settings,
  User,
  Key,
  Globe,
  FileCode,
  CheckCircle,
} from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and platform settings.
        </p>
      </div>

      <Tabs defaultValue="plugin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plugin">WordPress Plugin</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="plugin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                SEO Max Connector Plugin
              </CardTitle>
              <CardDescription>
                Download and install the WordPress plugin to connect your
                WooCommerce stores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50">
                <FileCode className="h-10 w-10 text-primary mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold">seo-max-connector.zip</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Version 1.0.0 - Compatible with WordPress 5.8+ and
                    WooCommerce 5.0+
                  </p>
                  <a href="/api/plugin/download" download>
                    <Button>
                      <Download className="mr-2 h-4 w-4" />
                      Download Plugin
                    </Button>
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Installation Instructions</h3>
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Download the plugin ZIP file using the button above
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      In WordPress, go to{" "}
                      <code className="bg-muted px-1 py-0.5 rounded">
                        Plugins → Add New → Upload Plugin
                      </code>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Upload the ZIP file and click{" "}
                      <code className="bg-muted px-1 py-0.5 rounded">
                        Install Now
                      </code>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Activate the plugin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Go to{" "}
                      <code className="bg-muted px-1 py-0.5 rounded">
                        SEO Max
                      </code>{" "}
                      in your WordPress admin menu
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Enter your API key (found on the store detail page) and
                      click &quot;Test Connection&quot;
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Click &quot;Sync All Data Now&quot; to sync your site with
                      SEO Max
                    </span>
                  </li>
                </ol>
              </div>

              <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/50">
                <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Plugin Features
                </h4>
                <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                  <li>• Automatic sync of products, pages, and blog posts</li>
                  <li>
                    • Compatible with Yoast, Rank Math, AIOSEO, and SEOPress
                  </li>
                  <li>• Real-time webhook updates</li>
                  <li>• Schema markup injection</li>
                  <li>• Bulk alt text management</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your account details and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground">
                    {profile?.full_name || "Not set"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {user.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Information
              </CardTitle>
              <CardDescription>
                API endpoints for plugin communication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">API Base URL</label>
                <code className="block mt-1 p-2 bg-muted rounded text-sm">
                  https://seo-max-pink.vercel.app/api/v1
                </code>
              </div>
              <div>
                <label className="text-sm font-medium">Available Endpoints</label>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <code className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-xs">
                      POST
                    </code>
                    <code>/connect</code>
                    <span className="text-muted-foreground">
                      - Initial plugin connection
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-xs">
                      POST
                    </code>
                    <code>/stores/:id/sync</code>
                    <span className="text-muted-foreground">- Data sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">
                      GET
                    </code>
                    <code>/stores/:id/products</code>
                    <span className="text-muted-foreground">
                      - Get products
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-xs">
                      POST
                    </code>
                    <code>/stores/:id/webhook</code>
                    <span className="text-muted-foreground">
                      - Receive webhooks
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Configure webhooks for your WordPress sites.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The plugin automatically handles webhooks. Your WordPress site
                will receive updates at:
              </p>
              <code className="block mt-2 p-2 bg-muted rounded text-sm">
                https://your-site.com/wp-json/seo-max/v1/webhook
              </code>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
