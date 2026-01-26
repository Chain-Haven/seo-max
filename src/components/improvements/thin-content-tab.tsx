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
  FileText,
  RefreshCw,
  Loader2,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzeThinContent,
  generateExpandedContent,
  applyContentExpansion,
} from "@/lib/actions/thin-content";
import { dismissImprovement } from "@/lib/actions/content-freshness";

interface ThinContentTabProps {
  storeId: string;
}

interface ThinContentItem {
  id: string;
  type: string;
  title: string;
  url?: string;
  wordCount: number;
  suggestedMinWords: number;
  priority: string;
}

export function ThinContentTab({ storeId }: ThinContentTabProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [thinContent, setThinContent] = useState<ThinContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ThinContentItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expansion, setExpansion] = useState<{
    expandedContent: string;
    addedSections: string[];
    improvementId?: string;
  } | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzeThinContent(storeId);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setThinContent(result.data);
      
      if (result.data.length === 0) {
        toast.success("No thin content found!");
      } else {
        toast.info(`Found ${result.data.length} items with thin content`);
      }
    }
    setIsAnalyzing(false);
  };

  const handleGenerateExpansion = async (item: ThinContentItem) => {
    setSelectedItem(item);
    setIsGenerating(true);
    setExpansion(null);

    const result = await generateExpandedContent(storeId, item.type, item.id);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setExpansion({
        expandedContent: result.data.expandedContent,
        addedSections: result.data.addedSections,
      });
    }
    setIsGenerating(false);
  };

  const handleApply = async (improvementId: string) => {
    setIsApplying(true);
    const result = await applyContentExpansion(storeId, improvementId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Content expanded successfully!");
      setSelectedItem(null);
      setExpansion(null);
      setThinContent((prev) => prev.filter((c) => c.id !== selectedItem?.id));
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
      setExpansion(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      default: return "bg-blue-500";
    }
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
                <FileText className="h-5 w-5" />
                Thin Content Analysis
              </CardTitle>
              <CardDescription>
                Find pages with insufficient content that may be hurting your SEO rankings
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

        {thinContent.length > 0 && (
          <CardContent>
            <div className="flex gap-6 mb-6">
              <div>
                <p className="text-2xl font-bold text-red-500">
                  {thinContent.filter((c) => c.priority === "critical").length}
                </p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">
                  {thinContent.filter((c) => c.priority === "high").length}
                </p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500">
                  {thinContent.filter((c) => c.priority === "medium").length}
                </p>
                <p className="text-sm text-muted-foreground">Medium</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">
                  {thinContent.filter((c) => c.priority === "low").length}
                </p>
                <p className="text-sm text-muted-foreground">Low</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {thinContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Thin Content Items</CardTitle>
            <CardDescription>
              These items have insufficient content. Click to generate AI expansion suggestions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {thinContent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleGenerateExpansion(item)}
                >
                  <div className="flex items-center gap-4">
                    <Badge className={getPriorityColor(item.priority)}>
                      {item.priority}
                    </Badge>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">{getTypeLabel(item.type)}</Badge>
                        <span>•</span>
                        <span className="text-red-500 font-medium">{item.wordCount} words</span>
                        <span>•</span>
                        <span>Target: {item.suggestedMinWords}+ words</span>
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

      {/* Expansion Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Expand Content for "{selectedItem?.title}"
            </DialogTitle>
            <DialogDescription>
              AI-generated content expansion to improve SEO ({selectedItem?.wordCount} → {selectedItem?.suggestedMinWords}+ words)
            </DialogDescription>
          </DialogHeader>

          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-muted-foreground">Generating expanded content...</p>
            </div>
          ) : expansion ? (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-6 pr-4">
                {/* Added Sections */}
                <div>
                  <h4 className="font-medium mb-2">Sections Added</h4>
                  <ul className="space-y-2">
                    {expansion.addedSections.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Plus className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Word Count */}
                <div className="flex items-center gap-4 p-3 bg-green-500/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">
                      {expansion.expandedContent.split(/\s+/).filter(Boolean).length} words
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expanded from {selectedItem?.wordCount} words
                    </p>
                  </div>
                </div>

                {/* Expanded Content Preview */}
                <div>
                  <h4 className="font-medium mb-2">Expanded Content Preview</h4>
                  <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                    {expansion.expandedContent}
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Click an item to generate expansion</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancel
            </Button>
            {expansion && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => expansion.improvementId && handleDismiss(expansion.improvementId)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Dismiss
                </Button>
                <Button
                  onClick={() => expansion.improvementId && handleApply(expansion.improvementId)}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Apply Expansion
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
