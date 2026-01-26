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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Download,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  createRedirect,
  deleteRedirect,
  createRedirectFromBrokenLink,
  markBrokenLinkFixed,
  exportRedirectRules,
  type Redirect,
  type BrokenLink,
} from "@/lib/actions/redirects";

interface RedirectsDashboardProps {
  storeId: string;
  initialRedirects: Redirect[];
  initialBrokenLinks: BrokenLink[];
}

export function RedirectsDashboard({
  storeId,
  initialRedirects,
  initialBrokenLinks,
}: RedirectsDashboardProps) {
  const [redirects, setRedirects] = useState(initialRedirects);
  const [brokenLinks, setBrokenLinks] = useState(initialBrokenLinks);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // New redirect form
  const [sourceUrl, setSourceUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [redirectType, setRedirectType] = useState<"301" | "302">("301");

  const handleAddRedirect = async () => {
    if (!sourceUrl || !targetUrl) {
      toast.error("Please fill in both URLs");
      return;
    }

    setIsAdding(true);
    const result = await createRedirect(storeId, {
      sourceUrl,
      targetUrl,
      redirectType,
    });

    if (result.data) {
      setRedirects((prev) => [result.data!, ...prev]);
      setSourceUrl("");
      setTargetUrl("");
      setIsAddDialogOpen(false);
      toast.success("Redirect created");
    } else {
      toast.error(result.error || "Failed to create redirect");
    }
    setIsAdding(false);
  };

  const handleDeleteRedirect = async (id: string) => {
    const result = await deleteRedirect(id);
    if (result.success) {
      setRedirects((prev) => prev.filter((r) => r.id !== id));
      toast.success("Redirect deleted");
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  const handleFixBrokenLink = async (brokenLink: BrokenLink, targetUrl: string) => {
    const result = await createRedirectFromBrokenLink(brokenLink.id, targetUrl);
    if (result.success) {
      setBrokenLinks((prev) => prev.filter((b) => b.id !== brokenLink.id));
      toast.success("Redirect created and link marked as fixed");
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to fix");
    }
  };

  const handleMarkFixed = async (id: string) => {
    const result = await markBrokenLinkFixed(id);
    if (result.success) {
      setBrokenLinks((prev) => prev.filter((b) => b.id !== id));
      toast.success("Marked as fixed");
    }
  };

  const handleExport = async (format: "htaccess" | "nginx" | "vercel" | "nextjs") => {
    const result = await exportRedirectRules(storeId, format);
    if (result.data) {
      const blob = new Blob([result.data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `redirects.${format === "htaccess" ? "htaccess" : format === "vercel" ? "json" : format === "nextjs" ? "js" : "conf"}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Redirects</p>
                <p className="text-2xl font-bold">{redirects.filter((r) => r.isActive).length}</p>
              </div>
              <ArrowRight className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Broken Links</p>
                <p className="text-2xl font-bold text-red-500">{brokenLinks.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Hits</p>
                <p className="text-2xl font-bold">
                  {redirects.reduce((sum, r) => sum + r.hitCount, 0).toLocaleString()}
                </p>
              </div>
              <ExternalLink className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="redirects">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="redirects">Redirects</TabsTrigger>
            <TabsTrigger value="broken">
              Broken Links
              {brokenLinks.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {brokenLinks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Select onValueChange={(v) => handleExport(v as "htaccess" | "nginx" | "vercel" | "nextjs")}>
              <SelectTrigger className="w-32">
                <Download className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="htaccess">.htaccess</SelectItem>
                <SelectItem value="nginx">nginx</SelectItem>
                <SelectItem value="vercel">vercel.json</SelectItem>
                <SelectItem value="nextjs">next.config.js</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Redirect
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Redirect</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Source URL</Label>
                    <Input
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="/old-page"
                    />
                  </div>
                  <div>
                    <Label>Target URL</Label>
                    <Input
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="/new-page"
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={redirectType} onValueChange={(v) => setRedirectType(v as "301" | "302")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="301">301 (Permanent)</SelectItem>
                        <SelectItem value="302">302 (Temporary)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddRedirect} disabled={isAdding} className="w-full">
                    {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Redirect
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="redirects">
          <Card>
            <CardContent className="pt-6">
              {redirects.length === 0 ? (
                <div className="text-center py-8">
                  <ArrowRight className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-4 text-muted-foreground">No redirects configured</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead></TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Hits</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redirects.map((redirect) => (
                      <TableRow key={redirect.id}>
                        <TableCell className="font-mono text-sm">{redirect.sourceUrl}</TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{redirect.targetUrl}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{redirect.redirectType}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{redirect.hitCount}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRedirect(redirect.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broken">
          <Card>
            <CardHeader>
              <CardTitle>Broken Links</CardTitle>
              <CardDescription>
                URLs returning 404 errors that need to be fixed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brokenLinks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 opacity-50" />
                  <p className="mt-4 text-muted-foreground">No broken links detected</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Broken URL</TableHead>
                      <TableHead>Found On</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brokenLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell className="font-mono text-sm max-w-xs truncate">
                          {link.url}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {link.foundOnPage || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{link.statusCode || 404}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(link.firstDetectedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const target = prompt("Enter target URL for redirect:");
                                if (target) handleFixBrokenLink(link, target);
                              }}
                            >
                              Create Redirect
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkFixed(link.id)}
                            >
                              Mark Fixed
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
