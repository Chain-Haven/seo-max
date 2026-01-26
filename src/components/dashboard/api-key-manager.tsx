"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { regenerateApiKey } from "@/lib/actions/stores";
import { Loader2, Copy, Check, Key, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  last_used_at: string | null;
  created_at: string;
}

interface ApiKeyManagerProps {
  storeId: string;
  apiKeys: ApiKey[];
}

export function ApiKeyManager({ storeId, apiKeys }: ApiKeyManagerProps) {
  const [loading, setLoading] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const result = await regenerateApiKey(storeId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        setNewApiKey(result.data.apiKey);
        toast.success("API key regenerated successfully!");
      }
    } catch {
      toast.error("Failed to regenerate API key");
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = async () => {
    if (!newApiKey) return;
    await navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {newApiKey && (
        <Alert>
          <Key className="h-4 w-4" />
          <AlertTitle>New API Key Generated</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Copy this key now - you won&apos;t be able to see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded text-sm font-mono break-all">
                {newApiKey}
              </code>
              <Button variant="outline" size="icon" onClick={copyApiKey}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for authenticating the WordPress plugin.
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate Key
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will invalidate the current API key. The WordPress plugin
                    will need to be reconfigured with the new key. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRegenerate}>
                    Regenerate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API keys found. Click &quot;Regenerate Key&quot; to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-sm">{key.key_prefix}...</code>
                    </TableCell>
                    <TableCell>
                      {key.permissions.join(", ")}
                    </TableCell>
                    <TableCell>
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {new Date(key.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
