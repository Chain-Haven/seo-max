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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  RefreshCw,
  Loader2,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzeContentFreshness,
  generateRefreshSuggestions,
  applyContentRefresh,
  dismissImprovement,
} from "@/lib/actions/content-freshness";

interface ContentFreshnessTabProps {
  storeId: string;
}

interface ContentItem {
  id: string;
  type: string;
  title: string;
  url?: string;
  wordCount: number;
  lastModified: string;
  daysSinceUpdate: number;
  freshnessScore: number;
}

export function ContentFreshnessTab({ storeId }: ContentFreshnessTabProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [staleContent, setStaleContent] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<{ total: number; avgScore: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    suggestions: string[];
    updatedContent: string;
    improvementId?: string;
  } | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzeContentFreshness(storeId);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setStaleContent(result.data.staleContent);
      setStats({
        total: result.data.totalAnalyzed,
        avgScore: result.data.averageFreshnessScore,
      });
      
      if (result.data.staleContent.length === 0) {
        toast.success("All content is fresh!");
      } else {
        toast.info(`Found ${result.data.staleContent.length} items that could be refreshed`);
      }
    }
    setIsAnalyzing(false);
  };

  const handleGenerateSuggestions = async (item: ContentItem) => {
    setSelectedItem(item);
    setIsGenerating(true);
    setSuggestions(null);

    const result = await generateRefreshSuggestions(storeId, item.type, item.id);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setSuggestions({
        suggestions: result.data.suggestions,
        updatedContent: result.data.updatedContent,
      });
    }
    setIsGenerating(false);
  };

  const handleApply = async (improvementId: string) => {
    setIsApplying(true);
    const result = await applyContentRefresh(storeId, improvementId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Content updated successfully!");
      setSelectedItem(null);
      setSuggestions(null);
      // Remove from list
      setStaleContent((prev) => prev.filter((c) => c.id !== selectedItem?.id));
    }
    setIsApplying(false);
  };

  const handleDismiss = async (improvementId: string) => {
    const result = await dismissImprovement(improvementId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Suggestion dismissed");
      setSelectedItem(null);
      setSuggestions(null);
    }
  };

  const getFreshnessColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "product": return "Product";
      case "page": return "Page";
      case "blog_post": return "Blog Post";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Content Freshness Analysis
              </CardTitle>
              <CardDescription>
                Find content that hasn't been updated recently and may be hurting your SEO
              </CardDescription>
            </div>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Analyze Content
            </Button>
          </div>
        </CardHeader>

        {stats && (
          <CardContent>
            <div className="flex gap-6 mb-6">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${getFreshnessColor(stats.avgScore)}`}>
                  {stats.avgScore}%
                </p>
                <p className="text-sm text-muted-foreground">Avg Freshness</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{staleContent.length}</p>
                <p className="text-sm text-muted-foreground">Need Refresh</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {staleContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stale Content</CardTitle>
            <CardDescription>
              These items haven't been updated recently. Click to generate AI refresh suggestions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staleContent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleGenerateSuggestions(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold ${getFreshnessColor(item.freshnessScore)}`}>
                      {item.freshnessScore}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">{getTypeLabel(item.type)}</Badge>
                        <span>•</span>
                        <span>{item.daysSinceUpdate} days old</span>
                        <span>•</span>
                        <span>{item.wordCount} words</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Refresh Suggestions for "{selectedItem?.title}"
            </DialogTitle>
            <DialogDescription>
              AI-generated suggestions to update and improve this content
            </DialogDescription>
          </DialogHeader>

          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-muted-foreground">Generating refresh suggestions...</p>
            </div>
          ) : suggestions ? (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-6 pr-4">
                {/* Suggestions */}
                <div>
                  <h4 className="font-medium mb-2">Suggested Updates</h4>
                  <ul className="space-y-2">
                    {suggestions.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Updated Content Preview */}
                <div>
                  <h4 className="font-medium mb-2">Updated Content Preview</h4>
                  <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                    {suggestions.updatedContent}
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Click a content item to generate suggestions</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancel
            </Button>
            {suggestions && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => suggestions.improvementId && handleDismiss(suggestions.improvementId)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Dismiss
                </Button>
                <Button
                  onClick={() => suggestions.improvementId && handleApply(suggestions.improvementId)}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Apply Changes
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
