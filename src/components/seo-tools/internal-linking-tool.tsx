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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Link2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Copy,
  Sparkles,
  FileWarning,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzeTextInternalLinks,
  detectStoreOrphanPages,
  getStoreLinkStats,
  getStoreLinkableContent,
} from "@/lib/actions/internal-linking";
import type { InternalLinkAnalysis, OrphanPage, LinkSuggestion } from "@/lib/ai/internal-linking";

interface InternalLinkingToolProps {
  stores: Array<{ id: string; name: string; url: string }>;
}

export function InternalLinkingTool({ stores }: InternalLinkingToolProps) {
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [content, setContent] = useState("");
  const [contentTitle, setContentTitle] = useState("");
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<InternalLinkAnalysis | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  
  // Orphan pages state
  const [isLoadingOrphans, setIsLoadingOrphans] = useState(false);
  const [orphanPages, setOrphanPages] = useState<OrphanPage[]>([]);
  
  // Stats state
  const [linkStats, setLinkStats] = useState<{
    totalPages: number;
    orphanPages: number;
    averageLinksPerPage: number;
    pagesWithFewLinks: number;
  } | null>(null);

  const handleAnalyze = async () => {
    if (!selectedStore) {
      toast.error("Please select a store");
      return;
    }
    if (!content.trim()) {
      toast.error("Please enter content to analyze");
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setSelectedSuggestions(new Set());

    try {
      const result = await analyzeTextInternalLinks(selectedStore, content, contentTitle);
      if (result.data) {
        setAnalysis(result.data);
        toast.success(`Found ${result.data.suggestions.length} link opportunities`);
      } else {
        toast.error(result.error || "Analysis failed");
      }
    } catch {
      toast.error("Failed to analyze content");
    } finally {
      setIsAnalyzing(false);
    }
  };

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

      if (orphanResult.data) {
        setOrphanPages(orphanResult.data);
      }
      if (statsResult.data) {
        setLinkStats(statsResult.data);
      }
      toast.success("Orphan page analysis complete");
    } catch {
      toast.error("Failed to detect orphan pages");
    } finally {
      setIsLoadingOrphans(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const selectAllSuggestions = () => {
    if (!analysis) return;
    setSelectedSuggestions(new Set(analysis.suggestions.map((_, i) => i)));
  };

  const copyWithLinks = () => {
    if (!analysis) return;

    let updatedContent = content;
    const selectedSuggestionsArray = analysis.suggestions.filter((_, i) =>
      selectedSuggestions.has(i)
    );

    for (const suggestion of selectedSuggestionsArray) {
      const linkHtml = `<a href="${suggestion.targetUrl}">${suggestion.anchorText}</a>`;
      updatedContent = updatedContent.replace(
        new RegExp(`\\b${escapeRegex(suggestion.anchorText)}\\b`, "i"),
        linkHtml
      );
    }

    navigator.clipboard.writeText(updatedContent);
    toast.success(`Copied content with ${selectedSuggestions.size} links added`);
  };

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Store Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Internal Linking Tool
          </CardTitle>
          <CardDescription>
            AI-powered suggestions for internal links to improve SEO and user navigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Select Store</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-full md:w-80">
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
        </CardContent>
      </Card>

      {selectedStore && (
        <Tabs defaultValue="analyze" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analyze">Analyze Content</TabsTrigger>
            <TabsTrigger value="orphans">Orphan Pages</TabsTrigger>
          </TabsList>

          {/* Analyze Content Tab */}
          <TabsContent value="analyze" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Content Title</Label>
                  <Input
                    value={contentTitle}
                    onChange={(e) => setContentTitle(e.target.value)}
                    placeholder="e.g., How to Choose Running Shoes"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content to Analyze</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your blog post, product description, or page content here..."
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI will suggest where to add internal links to your other products, pages, and blog posts.
                  </p>
                </div>

                <Button onClick={handleAnalyze} disabled={isAnalyzing || !content.trim()}>
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Find Link Opportunities
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysis && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Current Links</p>
                      <p className="text-2xl font-bold">{analysis.currentLinkCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Suggestions</p>
                      <p className="text-2xl font-bold text-primary">{analysis.suggestedLinkCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Link Density</p>
                      <p className="text-2xl font-bold">{analysis.linkDensity}</p>
                      <p className="text-xs text-muted-foreground">per 1000 words</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Status</p>
                      {analysis.orphanWarning ? (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-medium">No links</span>
                        </div>
                      ) : analysis.overlinkedWarning ? (
                        <div className="flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-medium">Over-linked</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Good</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Suggestions */}
                {analysis.suggestions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Link Suggestions</CardTitle>
                          <CardDescription>
                            Select links to add to your content
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={selectAllSuggestions}>
                            Select All
                          </Button>
                          <Button
                            size="sm"
                            onClick={copyWithLinks}
                            disabled={selectedSuggestions.size === 0}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy with Links ({selectedSuggestions.size})
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border transition-colors ${
                              selectedSuggestions.has(index)
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedSuggestions.has(index)}
                                onCheckedChange={() => toggleSuggestion(index)}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <code className="px-2 py-1 bg-muted rounded text-sm font-medium">
                                    {suggestion.anchorText}
                                  </code>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{suggestion.targetTitle}</span>
                                  <Badge variant={getPriorityColor(suggestion.priority) as "default" | "secondary" | "destructive" | "outline"}>
                                    {suggestion.priority}
                                  </Badge>
                                  <Badge variant="outline">{suggestion.targetType}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground italic">
                                  &quot;{suggestion.context}&quot;
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Why:</span> {suggestion.reason}
                                </p>
                                <a
                                  href={suggestion.targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  {suggestion.targetUrl}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {analysis.suggestions.length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-500 opacity-50" />
                      <p className="mt-4 text-muted-foreground">
                        No additional link opportunities found. Your content may already be well-linked!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
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
                      <FileWarning className="mr-2 h-4 w-4" />
                    )}
                    Scan for Orphan Pages
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
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
                      value={linkStats.totalPages > 0 
                        ? ((linkStats.totalPages - linkStats.orphanPages) / linkStats.totalPages) * 100 
                        : 100
                      }
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Orphan Pages List */}
            {orphanPages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Orphan Pages Found ({orphanPages.length})
                  </CardTitle>
                  <CardDescription>
                    These pages have no incoming internal links and may be harder for search engines to find
                  </CardDescription>
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
                            <p className="text-sm text-muted-foreground mt-1">{page.url}</p>
                            {page.suggestedLinkFrom.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground">
                                  Suggested to link from:
                                </p>
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
                          <Badge variant="destructive">0 incoming links</Badge>
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
                  <p className="mt-4 font-medium">No orphan pages detected!</p>
                  <p className="text-muted-foreground">
                    All your pages have at least one incoming internal link.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
