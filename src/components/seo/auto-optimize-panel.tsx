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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  FileText,
  Newspaper,
  Sparkles,
  Zap,
  BarChart3,
  Settings,
  Send,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  bulkOptimizeContent,
  type ContentItem,
  type OptimizationResult,
} from "@/lib/actions/bulk-optimize";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Props {
  storeId: string;
  storeName: string;
  storeStatus: string;
  items: ContentItem[];
  stats: {
    total: number;
    optimized: number;
    needsAttention: number;
    averageScore: number;
    byType: {
      products: { total: number; optimized: number };
      pages: { total: number; optimized: number };
      posts: { total: number; optimized: number };
    };
  };
}

export function AutoOptimizePanel({
  storeId,
  storeName,
  storeStatus,
  items,
  stats,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState("");
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "products" | "pages" | "posts">("all");
  
  // Options
  const [pushToWordPress, setPushToWordPress] = useState(true);
  const [optimizeMetaTitle, setOptimizeMetaTitle] = useState(true);
  const [optimizeMetaDescription, setOptimizeMetaDescription] = useState(true);

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "products") return item.type === "product";
    if (activeTab === "pages") return item.type === "page";
    if (activeTab === "posts") return item.type === "post";
    return true;
  });

  const needsOptimizationItems = filteredItems.filter((item) => item.seoScore < 80);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const toggleSelectNeedsOptimization = () => {
    setSelectedIds(new Set(needsOptimizationItems.map((i) => i.id)));
  };

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleOptimize = async () => {
    if (selectedIds.size === 0) {
      toast.error("No items selected");
      return;
    }

    if (storeStatus !== "connected") {
      toast.error("Store not connected", {
        description: "Please connect your WordPress plugin first.",
      });
      return;
    }

    setIsOptimizing(true);
    setProgress(0);
    setResults([]);
    setShowResults(false);

    try {
      const itemIds = Array.from(selectedIds);
      
      // Simulate progress as we process
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 2, 95));
      }, 500);

      const result = await bulkOptimizeContent(storeId, itemIds, {
        optimizeMetaTitle,
        optimizeMetaDescription,
        pushToWordPress,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setResults(result.results);
        setShowResults(true);
        
        toast.success(`Optimization complete!`, {
          description: `${result.successful} of ${result.totalProcessed} items optimized successfully.`,
        });
      } else {
        toast.error("Optimization failed", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Optimization failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "product":
        return <Package className="h-4 w-4" />;
      case "page":
        return <FileText className="h-4 w-4" />;
      case "post":
        return <Newspaper className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.byType.products.total} products, {stats.byType.pages.total} pages, {stats.byType.posts.total} posts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Optimized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.optimized}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.optimized / stats.total) * 100) : 0}% of content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.needsAttention}</div>
            <p className="text-xs text-muted-foreground">SEO score below 60</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
              {stats.averageScore}
            </div>
            <Progress value={stats.averageScore} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Bulk Content Optimizer
              </CardTitle>
              <CardDescription>
                Select content to optimize with AI-powered SEO improvements
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectNeedsOptimization}
                disabled={isOptimizing}
              >
                Select Low Scores ({needsOptimizationItems.length})
              </Button>
              <Button
                onClick={handleOptimize}
                disabled={isOptimizing || selectedIds.size === 0 || storeStatus !== "connected"}
                className="bg-gradient-to-r from-primary to-purple-600"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Optimize {selectedIds.size > 0 ? `(${selectedIds.size})` : "Selected"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Options */}
          <Collapsible className="mb-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Optimization Options
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="meta-title" className="flex flex-col gap-1">
                  <span>Optimize Meta Titles</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Generate SEO-optimized meta titles (50-60 characters)
                  </span>
                </Label>
                <Switch
                  id="meta-title"
                  checked={optimizeMetaTitle}
                  onCheckedChange={setOptimizeMetaTitle}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="meta-desc" className="flex flex-col gap-1">
                  <span>Optimize Meta Descriptions</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Generate compelling meta descriptions (150-160 characters)
                  </span>
                </Label>
                <Switch
                  id="meta-desc"
                  checked={optimizeMetaDescription}
                  onCheckedChange={setOptimizeMetaDescription}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="push-wp" className="flex flex-col gap-1">
                  <span>Push to WordPress</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Automatically update your WordPress site with optimizations
                  </span>
                </Label>
                <Switch
                  id="push-wp"
                  checked={pushToWordPress}
                  onCheckedChange={setPushToWordPress}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Progress */}
          {isOptimizing && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Optimizing content...</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentItem && (
                <p className="text-xs text-muted-foreground mt-2">{currentItem}</p>
              )}
            </div>
          )}

          {/* Results */}
          {showResults && results.length > 0 && (
            <div className="mb-4 p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">Optimization Complete</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {results.filter((r) => r.success).length} of {results.length} items optimized
              </p>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    View Details
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className={`p-2 rounded text-sm ${
                          result.success
                            ? "bg-white dark:bg-gray-800"
                            : "bg-red-50 dark:bg-red-900/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{result.title}</span>
                          {result.success ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Optimized
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                        {result.success && Object.keys(result.changes).length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {result.changes.metaTitle && "• New meta title "}
                            {result.changes.metaDescription && "• New meta description"}
                          </div>
                        )}
                        {result.error && (
                          <p className="mt-1 text-xs text-red-600">{result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="all">
                All ({items.length})
              </TabsTrigger>
              <TabsTrigger value="products">
                <Package className="mr-1 h-4 w-4" />
                Products ({stats.byType.products.total})
              </TabsTrigger>
              <TabsTrigger value="pages">
                <FileText className="mr-1 h-4 w-4" />
                Pages ({stats.byType.pages.total})
              </TabsTrigger>
              <TabsTrigger value="posts">
                <Newspaper className="mr-1 h-4 w-4" />
                Posts ({stats.byType.posts.total})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No content found. Sync your store to import content.
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Meta Title</TableHead>
                        <TableHead>Meta Description</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead>Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={() => toggleItem(item.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(item.type)}
                              <div>
                                <p className="font-medium text-sm">{item.title}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {item.type}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.metaTitle ? (
                              <span className="text-sm">
                                {item.metaTitle.substring(0, 40)}
                                {item.metaTitle.length > 40 && "..."}
                              </span>
                            ) : (
                              <span className="text-sm text-red-500">Missing</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.metaDescription ? (
                              <span className="text-sm">
                                {item.metaDescription.substring(0, 50)}
                                {item.metaDescription.length > 50 && "..."}
                              </span>
                            ) : (
                              <span className="text-sm text-red-500">Missing</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={getScoreBadge(item.seoScore)}>
                              {item.seoScore}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.issues.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.issues.slice(0, 2).map((issue, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {issue}
                                  </Badge>
                                ))}
                                {item.issues.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{item.issues.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
