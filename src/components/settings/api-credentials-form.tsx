"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  ExternalLink,
  Key,
  Globe,
  Gauge,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateStoreApiCredentials,
  testGoogleCredentials,
  testPageSpeedKey,
  testSerpApiKey,
  type StoreApiCredentials,
} from "@/lib/actions/api-credentials";

interface ApiCredentialsFormProps {
  storeId: string;
  initialCredentials: StoreApiCredentials | null;
}

export function ApiCredentialsForm({
  storeId,
  initialCredentials,
}: ApiCredentialsFormProps) {
  const [credentials, setCredentials] = useState({
    googleClientId: initialCredentials?.googleClientId || "",
    googleClientSecret: initialCredentials?.googleClientSecret || "",
    googlePagespeedKey: initialCredentials?.googlePagespeedKey || "",
    serpApiKey: initialCredentials?.serpApiKey || "",
  });

  const [showSecrets, setShowSecrets] = useState({
    googleClientSecret: false,
    googlePagespeedKey: false,
    serpApiKey: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateStoreApiCredentials(storeId, {
      googleClientId: credentials.googleClientId || null,
      googleClientSecret: credentials.googleClientSecret || null,
      googlePagespeedKey: credentials.googlePagespeedKey || null,
      serpApiKey: credentials.serpApiKey || null,
    });

    if (result.success) {
      toast.success("API credentials saved");
    } else {
      toast.error(result.error || "Failed to save credentials");
    }
    setIsSaving(false);
  };

  const handleTestGoogle = async () => {
    setTesting("google");
    const result = await testGoogleCredentials(
      credentials.googleClientId,
      credentials.googleClientSecret
    );
    setTestResults((prev) => ({ ...prev, google: result.valid }));
    if (result.valid) {
      toast.success("Google credentials are valid");
    } else {
      toast.error(result.error || "Invalid credentials");
    }
    setTesting(null);
  };

  const handleTestPageSpeed = async () => {
    setTesting("pagespeed");
    const result = await testPageSpeedKey(credentials.googlePagespeedKey);
    setTestResults((prev) => ({ ...prev, pagespeed: result.valid }));
    if (result.valid) {
      toast.success("PageSpeed API key is valid");
    } else {
      toast.error(result.error || "Invalid API key");
    }
    setTesting(null);
  };

  const handleTestSerp = async () => {
    setTesting("serp");
    const result = await testSerpApiKey(credentials.serpApiKey);
    setTestResults((prev) => ({ ...prev, serp: result.valid }));
    if (result.valid) {
      toast.success("SERP API key is valid");
    } else {
      toast.error(result.error || "Invalid API key");
    }
    setTesting(null);
  };

  const toggleShowSecret = (field: keyof typeof showSecrets) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const getStatusBadge = (key: string) => {
    if (testResults[key] === true) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Valid
        </Badge>
      );
    }
    if (testResults[key] === false) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Invalid
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Credentials
          </CardTitle>
          <CardDescription>
            Configure your own API keys for Google Search Console, PageSpeed Insights, and SERP tracking.
            These credentials are stored securely and used only for this store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {/* Google Search Console */}
            <AccordionItem value="google">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Google Search Console
                  {getStatusBadge("google")}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm">
                  <p className="font-medium mb-2">How to get Google OAuth credentials:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Create a new project or select an existing one</li>
                    <li>Enable the "Search Console API"</li>
                    <li>Go to "Credentials" → "Create Credentials" → "OAuth client ID"</li>
                    <li>Select "Web application" and add your redirect URI</li>
                    <li>Copy the Client ID and Client Secret</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input
                    value={credentials.googleClientId}
                    onChange={(e) =>
                      setCredentials((prev) => ({ ...prev, googleClientId: e.target.value }))
                    }
                    placeholder="xxxxx.apps.googleusercontent.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.googleClientSecret ? "text" : "password"}
                      value={credentials.googleClientSecret}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, googleClientSecret: e.target.value }))
                      }
                      placeholder="••••••••••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleShowSecret("googleClientSecret")}
                    >
                      {showSecrets.googleClientSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleTestGoogle}
                  disabled={testing === "google" || !credentials.googleClientId || !credentials.googleClientSecret}
                >
                  {testing === "google" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* PageSpeed Insights */}
            <AccordionItem value="pagespeed">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  PageSpeed Insights
                  {getStatusBadge("pagespeed")}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm">
                  <p className="font-medium mb-2">How to get a PageSpeed API key:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Enable the "PageSpeed Insights API"</li>
                    <li>Go to "Credentials" → "Create Credentials" → "API key"</li>
                    <li>Copy the generated API key</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.googlePagespeedKey ? "text" : "password"}
                      value={credentials.googlePagespeedKey}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, googlePagespeedKey: e.target.value }))
                      }
                      placeholder="AIza••••••••••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleShowSecret("googlePagespeedKey")}
                    >
                      {showSecrets.googlePagespeedKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleTestPageSpeed}
                  disabled={testing === "pagespeed" || !credentials.googlePagespeedKey}
                >
                  {testing === "pagespeed" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test API Key
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* SERP API */}
            <AccordionItem value="serp">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  SERP API (Rank Tracking)
                  {getStatusBadge("serp")}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm">
                  <p className="font-medium mb-2">How to get a SerpAPI key:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">SerpAPI.com <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Create an account (free tier available)</li>
                    <li>Go to your Dashboard</li>
                    <li>Copy your API key</li>
                  </ol>
                  <p className="mt-2 text-muted-foreground">
                    Without a SERP API key, rank tracking will use simulated data for demo purposes.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.serpApiKey ? "text" : "password"}
                      value={credentials.serpApiKey}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, serpApiKey: e.target.value }))
                      }
                      placeholder="••••••••••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleShowSecret("serpApiKey")}
                    >
                      {showSecrets.serpApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleTestSerp}
                  disabled={testing === "serp" || !credentials.serpApiKey}
                >
                  {testing === "serp" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test API Key
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Credentials
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credential Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            The system uses credentials in this priority order:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              <strong>Store-level</strong> - Credentials set on this page (highest priority)
            </li>
            <li>
              <strong>Organization-level</strong> - Shared credentials for all stores in your organization
            </li>
            <li>
              <strong>System defaults</strong> - Platform-provided credentials (demo mode)
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
