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
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
  TrendingUp,
  TrendingDown,
  Search,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import {
  addBacklink,
  deleteBacklink,
  discoverBacklinks,
  type Backlink,
  type BacklinkStats,
} from "@/lib/actions/backlinks";

interface BacklinksDashboardProps {
  storeId: string;
  initialBacklinks: Backlink[];
  initialStats: BacklinkStats | null;
  initialDomains: Array<{ domain: string; backlinks: number; avgDa: number }>;
}

export function BacklinksDashboard({
  storeId,
  initialBacklinks,
  initialStats,
  initialDomains,
}: BacklinksDashboardProps) {
  const [backlinks, setBacklinks] = useState(initialBacklinks);
  const [stats] = useState(initialStats);
  const [domains] = useState(initialDomains);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Add form
  const [sourceUrl, setSourceUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [anchorText, setAnchorText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddBacklink = async () => {
    if (!sourceUrl || !targetUrl) {
      toast.error("Please fill in source and target URLs");
      return;
    }

    setIsAdding(true);
    const result = await addBacklink(storeId, {
      sourceUrl,
      targetUrl,
      anchorText: anchorText || undefined,
    });

    if (result.success) {
      toast.success("Backlink added");
      setIsAddDialogOpen(false);
      setSourceUrl("");
      setTargetUrl("");
      setAnchorText("");
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to add backlink");
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteBacklink(id);
    if (result.success) {
      setBacklinks((prev) => prev.filter((b) => b.id !== id));
      toast.success("Backlink removed");
    }
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    const result = await discoverBacklinks(storeId);
    if (result.discovered > 0) {
      toast.success(`Discovered ${result.discovered} new backlinks`);
      window.location.reload();
    } else {
      toast.info("No new backlinks found");
    }
    setIsDiscovering(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Backlinks</p>
                <p className="text-2xl font-bold">{stats?.totalBacklinks || 0}</p>
              </div>
              <LinkIcon className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unique Domains</p>
                <p className="text-2xl font-bold">{stats?.uniqueDomains || 0}</p>
              </div>
              <Globe className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Domain Authority</p>
                <p className="text-2xl font-bold">{stats?.avgDomainAuthority || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">This Month</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-green-500 font-medium">+{stats?.gainedThisMonth || 0}</span>
                  <span className="text-red-500 font-medium">-{stats?.lostThisMonth || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dofollow vs Nofollow */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Link Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Dofollow</span>
                  <span>{stats.dofollow} ({Math.round((stats.dofollow / stats.totalBacklinks) * 100)}%)</span>
                </div>
                <Progress value={(stats.dofollow / stats.totalBacklinks) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Nofollow</span>
                  <span>{stats.nofollow} ({Math.round((stats.nofollow / stats.totalBacklinks) * 100)}%)</span>
                </div>
                <Progress value={(stats.nofollow / stats.totalBacklinks) * 100} className="h-2 [&>div]:bg-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Referring Domains */}
      {domains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Referring Domains</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {domains.map((domain, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                    <div>
                      <p className="font-medium">{domain.domain}</p>
                      <p className="text-sm text-muted-foreground">{domain.backlinks} backlinks</p>
                    </div>
                  </div>
                  <Badge variant="outline">DA {domain.avgDa}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backlinks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Backlinks</CardTitle>
              <CardDescription>Links pointing to your site</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDiscover} disabled={isDiscovering}>
                {isDiscovering ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Discover
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Backlink
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Backlink</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Source URL (linking page)</Label>
                      <Input
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://example.com/article"
                      />
                    </div>
                    <div>
                      <Label>Target URL (your page)</Label>
                      <Input
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://yoursite.com/page"
                      />
                    </div>
                    <div>
                      <Label>Anchor Text (optional)</Label>
                      <Input
                        value={anchorText}
                        onChange={(e) => setAnchorText(e.target.value)}
                        placeholder="click here"
                      />
                    </div>
                    <Button onClick={handleAddBacklink} disabled={isAdding} className="w-full">
                      {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Backlink
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {backlinks.length === 0 ? (
            <div className="text-center py-8">
              <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">No backlinks tracked yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Anchor Text</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>DA</TableHead>
                  <TableHead>First Seen</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backlinks.map((backlink) => (
                  <TableRow key={backlink.id} className={backlink.isLost ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <a
                          href={backlink.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:text-primary flex items-center gap-1"
                        >
                          {backlink.sourceDomain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {backlink.sourceUrl}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {backlink.anchorText || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={backlink.isDofollow ? "default" : "secondary"}>
                        {backlink.isDofollow ? "dofollow" : "nofollow"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {backlink.domainAuthority || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(backlink.firstSeenAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(backlink.id)}
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
    </div>
  );
}
