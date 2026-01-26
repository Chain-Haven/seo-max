"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import {
  Loader2,
  Link2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Sparkles,
  FileWarning,
  ArrowRight,
  Play,
  Eye,
  Rocket,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzeContentInternalLinks,
  detectStoreOrphanPages,
  getStoreLinkStats,
  getStoreLinkableContent,
  bulkApplyLinkSuggestions,
} from "@/lib/actions/internal-linking";
import type { InternalLinkAnalysis, OrphanPage, LinkSuggestion, LinkableContent } from "@/lib/ai/internal-linking";

interface InternalLinkingToolProps {
  stores: Array<{ id: string; name: string; url: string }>;
}

interface ContentItem {
  id: string;
  type: "product" | "page" | "blog_post";
  title: string;
  url: string;
  currentLinks: number;
  status: "pending" | "analyzing" | "analyzed" | "applied";
  analysis?: InternalLinkAnalysis;
  selectedSuggestions?: Set<number>;
}

export function InternalLinkingTool({ stores }: InternalLinkingToolProps) {
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Batch analysis state
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  // Preview dialog state
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const [previewContent, setPreviewContent] = useState<{ before: string; after: string } | null>(null);
  
  // Orphan pages state
  const [isLoadingOrphans, setIsLoadingOrphans] = useState(false);
  const [orphanPages, setOrphanPages] = useState<OrphanPage[]>([]);
  const [linkStats, setLinkStats] = useState<{
    totalPages: number;
    orphanPages: number;
    averageLinksPerPage: number;
    pagesWithFewLinks: number;
  } | null>(null);

  // Load content when store changes
  useEffect(() => {
    if (selectedStore) {
      loadStoreContent();
    }
  }, [selectedStore]);

  const loadStoreContent = async () => {
    setIsLoading(true);
    try {
      const result = await getStoreLinkableContent(selectedStore);
      if (result.data) {
        const items: ContentItem[] = result.data.map((item: LinkableContent) => ({
          id: item.id,
          type: item.type as "product" | "page" | "blog_post",
          title: item.title,
          url: item.url,
          currentLinks: 0,
          status: "pending" as const,
        }));
        setContentItems(items);
      }
    } catch {
      toast.error("Failed to load store content");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    if (selectedItems.size === contentItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(contentItems.map((item) => item.id)));
    }
  };

  // Analyze selected items
  const analyzeSelected = async () => {
    const itemsToAnalyze = contentItems.filter((item) => selectedItems.has(item.id));
    if (itemsToAnalyze.length === 0) {
      toast.error("Please select items to analyze");
      return;
    }

    setIsAnalyzingBatch(true);
    setAnalysisProgress(0);

    let completed = 0;
    const updatedItems = [...contentItems];

    for (const item of itemsToAnalyze) {
      const index = updatedItems.findIndex((i) => i.id === item.id);
      updatedItems[index] = { ...updatedItems[index], status: "analyzing" };
      setContentItems([...updatedItems]);

      try {
        const result = await analyzeContentInternalLinks(
          selectedStore,
          item.type,
          item.id
        );

        if (result.data) {
          updatedItems[index] = {
            ...updatedItems[index],
            status: "analyzed",
            analysis: result.data,
            currentLinks: result.data.currentLinkCount,
            selectedSuggestions: new Set(
              result.data.suggestions.map((_, i) => i) // Select all by default
            ),
          };
        } else {
          updatedItems[index] = { ...updatedItems[index], status: "pending" };
        }
      } catch {
        updatedItems[index] = { ...updatedItems[index], status: "pending" };
      }

      completed++;
      setAnalysisProgress((completed / itemsToAnalyze.length) * 100);
      setContentItems([...updatedItems]);
    }

    setIsAnalyzingBatch(false);
    toast.success(`Analyzed ${completed} items`);
  };

  // Apply improvements to a single item
  const applyImprovements = async (item: ContentItem) => {
    if (!item.analysis || !item.selectedSuggestions) return;

    const suggestionsToApply = item.analysis.suggestions.filter((_, i) =>
      item.selectedSuggestions!.has(i)
    );

    if (suggestionsToApply.length === 0) {
      toast.error("No suggestions selected");
      return;
    }

    try {
      const result = await bulkApplyLinkSuggestions(
        selectedStore,
        item.type,
        item.id,
        suggestionsToApply
      );

      if (result.success) {
        const updatedItems = contentItems.map((i) =>
          i.id === item.id ? { ...i, status: "applied" as const } : i
        );
        setContentItems(updatedItems);
        toast.success(`Applied ${result.appliedCount} links to "${item.title}"`);
      } else {
        toast.error(result.error || "Failed to apply links");
      }
    } catch {
      toast.error("Failed to apply improvements");
    }
  };

  // Apply all improvements
  const applyAllImprovements = async () => {
    const itemsWithAnalysis = contentItems.filter(
      (item) => item.status === "analyzed" && item.selectedSuggestions && item.selectedSuggestions.size > 0
    );

    if (itemsWithAnalysis.length === 0) {
      toast.error("No items with selected improvements");
      return;
    }

    let applied = 0;
    for (const item of itemsWithAnalysis) {
      await applyImprovements(item);
      applied++;
    }

    toast.success(`Applied improvements to ${applied} items`);
  };

  // Generate before/after preview
  const showPreview = (item: ContentItem) => {
    if (!item.analysis) return;

    // Simulated before content (in real app, fetch from DB)
    const beforeContent = `<p>This is the original content for "${item.title}". It contains product information and details about features.</p>`;
    
    // Generate after content with links
    let afterContent = beforeContent;
    const selectedSuggestions = item.analysis.suggestions.filter((_, i) =>
      item.selectedSuggestions?.has(i)
    );

    for (const suggestion of selectedSuggestions) {
      const linkHtml = `<a href="${suggestion.targetUrl}" class="internal-link">${suggestion.anchorText}</a>`;
      afterContent = afterContent.replace(
        new RegExp(`\\b${escapeRegex(suggestion.anchorText)}\\b`, "i"),
        linkHtml
      );
    }

    setPreviewContent({ before: beforeContent, after: afterContent });
    setPreviewItem(item);
  };

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Toggle suggestion for an item
  const toggleSuggestion = (itemId: string, suggestionIndex: number) => {
    setContentItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId && item.selectedSuggestions) {
          const newSet = new Set(item.selectedSuggestions);
          if (newSet.has(suggestionIndex)) {
            newSet.delete(suggestionIndex);
          } else {
            newSet.add(suggestionIndex);
          }
          return { ...item, selectedSuggestions: newSet };
        }
        return item;
      })
    );
  };

  // Load orphan pages
  const handleLoadOrphans = async () => {
    if (!selectedStore) {
      toast.error("Please select a store");
      return;
    }

    setIsLoadingOrphans(true);
    try {
      const [orphanResult, statsResult] = await Promise.all([
        detectStoreOrphanPages(selectedStore),
        getStoreLinkStats(selectedStore),
      ]);

      if (orphanResult.data) setOrphanPages(orphanResult.data);
      if (statsResult.data) setLinkStats(statsResult.data);
      toast.success("Orphan page analysis complete");
    } catch {
      toast.error("Failed to detect orphan pages");
    } finally {
      setIsLoadingOrphans(false);
    }
  };

  const getTotalSuggestions = () => {
    return contentItems.reduce((sum, item) => {
      return sum + (item.analysis?.suggestions.length || 0);
    }, 0);
  };

  const getTotalSelectedSuggestions = () => {
    return contentItems.reduce((sum, item) => {
      return sum + (item.selectedSuggestions?.size || 0);
    }, 0);
  };

  const getAnalyzedCount = () => {
    return contentItems.filter((item) => item.status === "analyzed" || item.status === "applied").length;
  };

  return (
    <div className="space-y-6">
      {/* Store Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Automated Internal Linking
          </CardTitle>
          <CardDescription>
            Automatically analyze and improve internal links across your entire store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-sm">
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a store..." />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStore && (
              <Button variant="outline" onClick={loadStoreContent} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedStore && (
        <Tabs defaultValue="auto" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto">
              <Zap className="mr-2 h-4 w-4" />
              Auto-Optimize
            </TabsTrigger>
            <TabsTrigger value="orphans">
              <FileWarning className="mr-2 h-4 w-4" />
              Orphan Pages
            </TabsTrigger>
          </TabsList>

          {/* Auto-Optimize Tab */}
          <TabsContent value="auto" className="space-y-4">
            {/* Stats Summary */}
            <div className="grid gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Total Content</p>
                  <p className="text-2xl font-bold">{contentItems.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Analyzed</p>
                  <p className="text-2xl font-bold text-blue-500">{getAnalyzedCount()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Link Opportunities</p>
                  <p className="text-2xl font-bold text-primary">{getTotalSuggestions()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Selected</p>
                  <p className="text-2xl font-bold text-green-500">{getTotalSelectedSuggestions()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    onClick={analyzeSelected}
                    disabled={isAnalyzingBatch || selectedItems.size === 0}
                  >
                    {isAnalyzingBatch ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing ({Math.round(analysisProgress)}%)
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Analyze Selected ({selectedItems.size})
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="default"
                    onClick={applyAllImprovements}
                    disabled={getTotalSelectedSuggestions() === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    Apply All Improvements ({getTotalSelectedSuggestions()})
                  </Button>

                  {isAnalyzingBatch && (
                    <Progress value={analysisProgress} className="flex-1 max-w-xs" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Content Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Content Items</CardTitle>
                  <Button variant="ghost" size="sm" onClick={selectAllItems}>
                    {selectedItems.size === contentItems.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : contentItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No content found. Connect a store with products, pages, or blog posts.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedItems.size === contentItems.length && contentItems.length > 0}
                            onCheckedChange={selectAllItems}
                          />
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Current Links</TableHead>
                        <TableHead>Suggestions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contentItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={() => toggleItemSelection(item.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium max-w-xs truncate">
                            {item.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.type.replace("_", " ")}</Badge>
                          </TableCell>
                          <TableCell>{item.currentLinks}</TableCell>
                          <TableCell>
                            {item.analysis ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-primary">
                                  {item.analysis.suggestions.length}
                                </span>
                                {item.selectedSuggestions && item.selectedSuggestions.size > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.selectedSuggestions.size} selected
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.status === "pending" && (
                              <Badge variant="outline">Pending</Badge>
                            )}
                            {item.status === "analyzing" && (
                              <Badge variant="secondary">
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Analyzing
                              </Badge>
                            )}
                            {item.status === "analyzed" && (
                              <Badge className="bg-blue-500">Analyzed</Badge>
                            )}
                            {item.status === "applied" && (
                              <Badge className="bg-green-500">Applied</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.analysis && item.analysis.suggestions.length > 0 && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => showPreview(item)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {item.status !== "applied" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => applyImprovements(item)}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Rocket className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Expanded Suggestions for Analyzed Items */}
            {contentItems.some((item) => item.status === "analyzed" && item.analysis) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Link Suggestions</CardTitle>
                  <CardDescription>
                    Review and select which links to add. Uncheck any you don&apos;t want.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {contentItems
                    .filter((item) => item.status === "analyzed" && item.analysis && item.analysis.suggestions.length > 0)
                    .map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {item.selectedSuggestions?.size || 0} of {item.analysis!.suggestions.length} selected
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => showPreview(item)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => applyImprovements(item)}
                              disabled={!item.selectedSuggestions?.size}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Rocket className="mr-2 h-4 w-4" />
                              Apply
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {item.analysis!.suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className={`flex items-start gap-3 p-3 rounded-lg border ${
                                item.selectedSuggestions?.has(index)
                                  ? "border-primary bg-primary/5"
                                  : "bg-muted/30"
                              }`}
                            >
                              <Checkbox
                                checked={item.selectedSuggestions?.has(index)}
                                onCheckedChange={() => toggleSuggestion(item.id, index)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <code className="px-2 py-0.5 bg-muted rounded text-sm">
                                    {suggestion.anchorText}
                                  </code>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm">{suggestion.targetTitle}</span>
                                  <Badge
                                    variant={
                                      suggestion.priority === "high"
                                        ? "destructive"
                                        : suggestion.priority === "medium"
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {suggestion.priority}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {suggestion.reason}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Orphan Pages Tab */}
          <TabsContent value="orphans" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Orphan Page Detection</h3>
                    <p className="text-sm text-muted-foreground">
                      Find pages with no incoming internal links
                    </p>
                  </div>
                  <Button onClick={handleLoadOrphans} disabled={isLoadingOrphans}>
                    {isLoadingOrphans ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Scan for Orphans
                  </Button>
                </div>
              </CardContent>
            </Card>

            {linkStats && (
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Total Pages</p>
                    <p className="text-2xl font-bold">{linkStats.totalPages}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Orphan Pages</p>
                    <p className="text-2xl font-bold text-red-500">{linkStats.orphanPages}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Avg Links/Page</p>
                    <p className="text-2xl font-bold">{linkStats.averageLinksPerPage}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Health</p>
                    <Progress
                      value={
                        linkStats.totalPages > 0
                          ? ((linkStats.totalPages - linkStats.orphanPages) / linkStats.totalPages) * 100
                          : 100
                      }
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {orphanPages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Orphan Pages ({orphanPages.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orphanPages.map((page) => (
                      <div key={page.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{page.title}</span>
                              <Badge variant="outline">{page.type}</Badge>
                            </div>
                            {page.suggestedLinkFrom.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground">Link from:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {page.suggestedLinkFrom.map((from, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {from}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <Badge variant="destructive">0 links</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {orphanPages.length === 0 && linkStats && (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                  <p className="mt-4 font-medium">No orphan pages!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Before & After Preview</DialogTitle>
            <DialogDescription>
              {previewItem?.title} - {previewItem?.selectedSuggestions?.size || 0} links will be added
            </DialogDescription>
          </DialogHeader>

          {previewItem?.analysis && (
            <div className="space-y-4">
              {/* Link Summary */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">Links to Add</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewItem.analysis.suggestions
                      .filter((_, i) => previewItem.selectedSuggestions?.has(i))
                      .map((s, i) => (
                        <Badge key={i} variant="secondary">
                          {s.anchorText} → {s.targetTitle}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>

              {/* Before/After Comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Before
                  </h4>
                  <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: previewContent?.before || "" }}
                    />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    After
                  </h4>
                  <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: previewContent?.after || "" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewItem(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewItem) {
                  applyImprovements(previewItem);
                  setPreviewItem(null);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
