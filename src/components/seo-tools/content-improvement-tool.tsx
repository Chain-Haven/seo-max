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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Sparkles,
  Copy,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { analyzeContentSEO, type SEOAnalysisResult } from "@/lib/ai/seo-analyzer";
import { getContentImprovements } from "@/lib/actions/seo-tools";

export function ContentImprovementTool() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [contentType, setContentType] = useState<"product" | "page" | "blog" | "category">("page");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [analysis, setAnalysis] = useState<SEOAnalysisResult | null>(null);
  const [improvedContent, setImprovedContent] = useState("");

  const handleAnalyzeAndImprove = async () => {
    if (!content.trim()) {
      toast.error("Please enter content to improve");
      return;
    }

    setIsAnalyzing(true);
    try {
      // First analyze
      const analysisResult = await analyzeContentSEO(content, {
        title,
        targetKeyword,
        contentType,
      });
      setAnalysis(analysisResult);

      // Then get improvements
      setIsImproving(true);
      const improvementResult = await getContentImprovements(
        content,
        analysisResult,
        targetKeyword
      );

      if (improvementResult.data) {
        setImprovedContent(improvementResult.data);
        toast.success("Content improved successfully");
      } else {
        toast.error(improvementResult.error || "Failed to improve content");
      }
    } catch {
      toast.error("Failed to analyze content");
    } finally {
      setIsAnalyzing(false);
      setIsImproving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const applyImprovements = () => {
    setContent(improvedContent);
    setImprovedContent("");
    setAnalysis(null);
    toast.success("Improvements applied. Run again to see new score.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Content Improvement
          </CardTitle>
          <CardDescription>
            Analyze your content and get AI-powered improvements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Content title"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Keyword</Label>
              <Input
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                placeholder="Main keyword"
              />
            </div>
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as typeof contentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">Page</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content to Improve</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your content here (HTML or plain text)"
              rows={8}
            />
          </div>

          <Button
            onClick={handleAnalyzeAndImprove}
            disabled={isAnalyzing || isImproving || !content.trim()}
            className="w-full"
          >
            {isAnalyzing || isImproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isAnalyzing ? "Analyzing..." : "Improving..."}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze & Improve Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {(analysis || improvedContent) && (
        <Tabs defaultValue="improved" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="improved">Improved Content</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="improved">
            {improvedContent ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">AI-Improved Content</CardTitle>
                      <CardDescription>
                        Review the improvements and apply them to your content
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(improvedContent)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                      <Button size="sm" onClick={applyImprovements}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Apply
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg border bg-muted/30 max-h-96 overflow-y-auto">
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: improvedContent }}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-48">
                  <p className="text-muted-foreground">
                    Improved content will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analysis">
            {analysis ? (
              <div className="space-y-4">
                {/* Score Overview */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Original SEO Score</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{analysis.score}</span>
                          <span className="text-muted-foreground">/100</span>
                        </div>
                      </div>
                      <Badge
                        className={
                          analysis.grade === "A"
                            ? "bg-green-500"
                            : analysis.grade === "B"
                            ? "bg-green-400"
                            : analysis.grade === "C"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }
                      >
                        Grade: {analysis.grade}
                      </Badge>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">{analysis.summary}</p>
                  </CardContent>
                </Card>

                {/* Issues Addressed */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Issues Addressed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysis.weaknesses.map((weakness, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                          <RefreshCw className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{weakness}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Keywords */}
                {analysis.keywordAnalysis.missingKeywords.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Keywords Added</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {analysis.keywordAnalysis.missingKeywords.map((kw, i) => (
                          <Badge key={i} variant="secondary">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations Implemented */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Recommendations Implemented</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysis.recommendations
                        .filter((r) => r.priority === "high")
                        .map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-sm font-medium">{rec.title}</span>
                              <p className="text-xs text-muted-foreground">{rec.action}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-48">
                  <p className="text-muted-foreground">
                    Analysis will appear here
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
