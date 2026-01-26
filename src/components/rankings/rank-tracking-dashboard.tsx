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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Bell,
  History,
  Trophy,
  Target,
  AlertTriangle,
  ExternalLink,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  addTrackedKeyword,
  removeTrackedKeyword,
  bulkAddKeywords,
  checkKeywordRanking,
  checkAllKeywordRankings,
  getKeywordRankingHistory,
} from "@/lib/actions/rank-tracking";
import type { TrackedKeyword, AlertHistoryItem, KeywordRankingHistory } from "@/lib/serp/types";
import { KeywordHistoryChart } from "./keyword-history-chart";
import { AlertsManager } from "./alerts-manager";

interface RankTrackingDashboardProps {
  storeId: string;
  storeDomain: string;
  initialKeywords: TrackedKeyword[];
  initialSummary: {
    totalKeywords: number;
    avgPosition: number;
    top3: number;
    top10: number;
    top100: number;
    notRanking: number;
    improved: number;
    declined: number;
    unchanged: number;
  } | null;
  initialAlerts: AlertHistoryItem[];
}

export function RankTrackingDashboard({
  storeId,
  storeDomain,
  initialKeywords,
  initialSummary,
  initialAlerts,
}: RankTrackingDashboardProps) {
  const [keywords, setKeywords] = useState<TrackedKeyword[]>(initialKeywords);
  const [summary, setSummary] = useState(initialSummary);
  const [alerts] = useState(initialAlerts);

  // Add keyword state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [bulkKeywords, setBulkKeywords] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Checking state
  const [checkingKeywords, setCheckingKeywords] = useState<Set<string>>(new Set());
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // History state
  const [selectedKeyword, setSelectedKeyword] = useState<TrackedKeyword | null>(null);
  const [historyData, setHistoryData] = useState<KeywordRankingHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;

    setIsAdding(true);
    const result = await addTrackedKeyword(storeId, { keyword: newKeyword.trim() });

    if (result.data) {
      setKeywords((prev) => [result.data!, ...prev]);
      setNewKeyword("");
      toast.success(`Added "${result.data.keyword}"`);
    } else {
      toast.error(result.error || "Failed to add keyword");
    }
    setIsAdding(false);
  };

  const handleBulkAdd = async () => {
    const keywordList = bulkKeywords
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywordList.length === 0) return;

    setIsAdding(true);
    const result = await bulkAddKeywords(storeId, keywordList);

    if (result.added > 0) {
      toast.success(`Added ${result.added} keywords`);
      // Refresh keywords
      window.location.reload();
    }
    if (result.errors.length > 0) {
      toast.error(`${result.errors.length} keywords failed: ${result.errors.slice(0, 2).join(", ")}`);
    }

    setBulkKeywords("");
    setIsAddDialogOpen(false);
    setIsAdding(false);
  };

  const handleRemoveKeyword = async (keywordId: string) => {
    const result = await removeTrackedKeyword(storeId, keywordId);
    if (result.success) {
      setKeywords((prev) => prev.filter((k) => k.id !== keywordId));
      toast.success("Keyword removed");
    } else {
      toast.error(result.error || "Failed to remove keyword");
    }
  };

  const handleCheckKeyword = async (keyword: TrackedKeyword) => {
    setCheckingKeywords((prev) => new Set([...prev, keyword.id]));

    const result = await checkKeywordRanking(storeId, keyword.id);

    if (result.data) {
      setKeywords((prev) =>
        prev.map((k) =>
          k.id === keyword.id
            ? {
                ...k,
                currentPosition: result.data!.position,
                previousPosition: result.data!.previousPosition,
                change: result.data!.change,
                url: result.data!.url,
                featuredSnippet: result.data!.featuredSnippet,
                lastChecked: new Date().toISOString(),
              }
            : k
        )
      );
      toast.success(`Checked "${keyword.keyword}": #${result.data.position || "Not ranking"}`);
    } else {
      toast.error(result.error || "Failed to check ranking");
    }

    setCheckingKeywords((prev) => {
      const newSet = new Set(prev);
      newSet.delete(keyword.id);
      return newSet;
    });
  };

  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    const result = await checkAllKeywordRankings(storeId);
    toast.success(`Checked ${result.checked} keywords${result.errors > 0 ? ` (${result.errors} errors)` : ""}`);
    window.location.reload();
  };

  const handleViewHistory = async (keyword: TrackedKeyword) => {
    setSelectedKeyword(keyword);
    setIsLoadingHistory(true);

    const result = await getKeywordRankingHistory(keyword.id, 30);
    if (result.data) {
      setHistoryData(result.data);
    }
    setIsLoadingHistory(false);
  };

  const getPositionBadge = (position: number | null | undefined) => {
    if (position === null || position === undefined) {
      return <Badge variant="outline">Not ranking</Badge>;
    }
    if (position <= 3) {
      return <Badge className="bg-yellow-500"># {position}</Badge>;
    }
    if (position <= 10) {
      return <Badge className="bg-green-500"># {position}</Badge>;
    }
    if (position <= 20) {
      return <Badge className="bg-blue-500"># {position}</Badge>;
    }
    return <Badge variant="secondary"># {position}</Badge>;
  };

  const getChangeIndicator = (change: number | undefined) => {
    if (!change || change === 0) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    if (change > 0) {
      return (
        <div className="flex items-center text-green-500">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">+{change}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-red-500">
        <TrendingDown className="h-4 w-4 mr-1" />
        <span className="text-sm font-medium">{change}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Keywords</p>
                  <p className="text-2xl font-bold">{summary.totalKeywords}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Position</p>
                  <p className="text-2xl font-bold">{summary.avgPosition || "-"}</p>
                </div>
                <Search className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Top 10</p>
                  <p className="text-2xl font-bold text-green-500">{summary.top10}</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Changes</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-green-500 font-medium">↑{summary.improved}</span>
                    <span className="text-red-500 font-medium">↓{summary.declined}</span>
                    <span className="text-muted-foreground">={summary.unchanged}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="keywords" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts
              {alerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCheckAll}
              disabled={isCheckingAll || keywords.length === 0}
            >
              {isCheckingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Check All
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Keywords
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Keywords to Track</DialogTitle>
                  <DialogDescription>
                    Track keyword rankings for {storeDomain}
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="single">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single">Single</TabsTrigger>
                    <TabsTrigger value="bulk">Bulk</TabsTrigger>
                  </TabsList>

                  <TabsContent value="single" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Keyword</Label>
                      <Input
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="e.g., leather boots"
                        onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                      />
                    </div>
                    <Button onClick={handleAddKeyword} disabled={isAdding || !newKeyword.trim()}>
                      {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Keyword
                    </Button>
                  </TabsContent>

                  <TabsContent value="bulk" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Keywords (one per line)</Label>
                      <Textarea
                        value={bulkKeywords}
                        onChange={(e) => setBulkKeywords(e.target.value)}
                        placeholder={"leather boots\nwinter jacket\nrunning shoes"}
                        rows={6}
                      />
                    </div>
                    <Button onClick={handleBulkAdd} disabled={isAdding || !bulkKeywords.trim()}>
                      {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add {bulkKeywords.split("\n").filter((k) => k.trim()).length} Keywords
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Keywords Tab */}
        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <CardTitle>Tracked Keywords</CardTitle>
              <CardDescription>
                Monitor your search engine rankings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keywords.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-4 text-muted-foreground">
                    No keywords tracked yet. Add keywords to start monitoring.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Last Checked</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keywords.map((keyword) => (
                      <TableRow key={keyword.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{keyword.keyword}</span>
                            {keyword.url && (
                              <a
                                href={keyword.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                              >
                                {keyword.url.substring(0, 40)}...
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getPositionBadge(keyword.currentPosition)}</TableCell>
                        <TableCell>{getChangeIndicator(keyword.change)}</TableCell>
                        <TableCell>
                          {keyword.featuredSnippet && (
                            <Badge variant="outline" className="gap-1">
                              <Star className="h-3 w-3" />
                              Featured
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {keyword.lastChecked
                            ? new Date(keyword.lastChecked).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewHistory(keyword)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCheckKeyword(keyword)}
                              disabled={checkingKeywords.has(keyword.id)}
                            >
                              {checkingKeywords.has(keyword.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveKeyword(keyword.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <AlertsManager storeId={storeId} initialAlerts={alerts} />
        </TabsContent>
      </Tabs>

      {/* History Dialog */}
      <Dialog open={!!selectedKeyword} onOpenChange={() => setSelectedKeyword(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ranking History: {selectedKeyword?.keyword}</DialogTitle>
            <DialogDescription>
              Position changes over the last 30 days
            </DialogDescription>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : historyData.length > 0 ? (
            <KeywordHistoryChart data={historyData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No ranking history available. Check the keyword to start tracking.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedKeyword(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
