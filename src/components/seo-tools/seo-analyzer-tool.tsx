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
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { analyzeContentSEO, type SEOAnalysisResult } from "@/lib/ai/seo-analyzer";

interface SEOAnalyzerToolProps {
  stores: Array<{ id: string; name: string; url: string }>;
}

export function SEOAnalyzerTool({ stores }: SEOAnalyzerToolProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [contentType, setContentType] = useState<"product" | "page" | "blog" | "category">("page");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SEOAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error("Please enter content to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeContentSEO(content, {
        title,
        metaDescription,
        targetKeyword,
        contentType,
      });
      setAnalysis(result);
      toast.success("Analysis complete");
    } catch {
      toast.error("Failed to analyze content");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-500";
      case "B": return "bg-green-400";
      case "C": return "bg-yellow-500";
      case "D": return "bg-orange-500";
      case "F": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            SEO Content Analyzer
          </CardTitle>
          <CardDescription>
            Analyze your content for SEO optimization opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter page title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type</Label>
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
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Input
              id="metaDescription"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Enter meta description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetKeyword">Target Keyword (optional)</Label>
            <Input
              id="targetKeyword"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="Main keyword to optimize for"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your content here (HTML or plain text)"
              rows={10}
            />
          </div>

          <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full">
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Panel */}
      <div className="space-y-4">
        {analysis ? (
          <>
            {/* Score Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">SEO Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{analysis.score}</span>
                      <span className="text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white ${getGradeColor(analysis.grade)}`}>
                    {analysis.grade}
                  </div>
                </div>
                <Progress value={analysis.score} className="mt-4" />
                <p className="mt-2 text-sm text-muted-foreground">{analysis.summary}</p>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Word Count</p>
                  <p className="text-xl font-bold">{analysis.contentLength.wordCount}</p>
                  <Badge variant={analysis.contentLength.status === "optimal" ? "default" : "secondary"}>
                    {analysis.contentLength.status}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Readability</p>
                  <p className="text-xl font-bold">{analysis.readabilityScore}</p>
                  <Badge variant={analysis.readabilityScore >= 70 ? "default" : "secondary"}>
                    {analysis.readabilityScore >= 70 ? "Good" : "Needs Work"}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Keyword Density</p>
                  <p className="text-xl font-bold">{analysis.keywordAnalysis.keywordDensity}%</p>
                  <Badge variant={analysis.keywordAnalysis.keywordDensity <= 3 ? "default" : "destructive"}>
                    {analysis.keywordAnalysis.keywordDensity <= 3 ? "Optimal" : "Too High"}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Structure Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Content Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(analysis.structureAnalysis).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                      {value ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 rounded-lg border">
                      <div className="flex items-start gap-3">
                        {rec.priority === "high" ? (
                          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rec.title}</span>
                            <Badge variant={getPriorityColor(rec.priority) as "default" | "secondary" | "destructive" | "outline"}>
                              {rec.priority}
                            </Badge>
                            <Badge variant="outline">{rec.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                          <p className="text-sm mt-2">
                            <strong>Action:</strong> {rec.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="h-full">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <Search className="h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">
                Enter content and click analyze to see SEO insights
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
