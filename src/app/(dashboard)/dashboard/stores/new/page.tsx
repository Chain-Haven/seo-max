"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createStore } from "@/lib/actions/stores";
import { Loader2, ArrowLeft, Copy, Check, Key } from "lucide-react";
import { toast } from "sonner";

export default function NewStorePage() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<"woocommerce" | "wordpress">("woocommerce");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setLoading(true);
    try {
      const result = await createStore({
        name: name.trim(),
        url: url.trim(),
        platform,
      });

      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        toast.success("Store created successfully!");
        setApiKey(result.data.apiKey);
      }
    } catch {
      toast.error("Failed to create store");
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Show API key screen after store creation
  if (apiKey) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link
            href="/dashboard/stores"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stores
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Store Created!</h1>
          <p className="text-muted-foreground">
            Your store has been created. Save the API key below - you won&apos;t be able to see it again.
          </p>
        </div>

        <Alert>
          <Key className="h-4 w-4" />
          <AlertTitle>Save Your API Key</AlertTitle>
          <AlertDescription>
            This API key will only be shown once. Copy it now and store it securely.
            You&apos;ll need it to connect the WordPress plugin.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>API Key</CardTitle>
            <CardDescription>
              Use this key to authenticate the WordPress plugin with your store.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-3 rounded-md text-sm font-mono break-all">
                {apiKey}
              </code>
              <Button variant="outline" size="icon" onClick={copyApiKey}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Follow these steps to connect your WordPress site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>Download the SEO Max plugin from the settings page</li>
              <li>Install and activate the plugin on your WordPress site</li>
              <li>Go to SEO Max settings in your WordPress admin</li>
              <li>Paste the API key above and click Connect</li>
              <li>Your store will sync automatically</li>
            </ol>
            <div className="flex gap-2 pt-4">
              <Link href="/dashboard/stores">
                <Button variant="outline">View All Stores</Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button>Download Plugin</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/stores"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Stores
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add New Store</h1>
        <p className="text-muted-foreground">
          Connect a WooCommerce or WordPress store to start managing its SEO.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Details</CardTitle>
          <CardDescription>
            Enter the details of the store you want to connect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Store"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify this store in your dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Store URL</Label>
              <Input
                id="url"
                placeholder="https://mystore.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                The full URL of your WordPress/WooCommerce site.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as "woocommerce" | "wordpress")}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="woocommerce">WooCommerce</SelectItem>
                  <SelectItem value="wordpress">WordPress (Blog only)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select WooCommerce for e-commerce sites, or WordPress for content-only sites.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim() || !url.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Store
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
