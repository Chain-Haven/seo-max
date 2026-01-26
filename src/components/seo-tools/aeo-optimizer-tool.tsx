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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  MessageSquare,
  Mic,
  CheckCircle,
  AlertTriangle,
  Copy,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzeContentAEO,
  generateFAQPairs,
  generateSnippetContent,
} from "@/lib/actions/seo-tools";
import type { AEOAnalysis, QAPair } from "@/lib/ai/aeo";

interface AEOOptimizerToolProps {
  stores: Array<{ id: string; name: string; url: string }>;
}

export function AEOOptimizerTool({ stores }: AEOOptimizerToolProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [targetQueries, setTargetQueries] = useState("");
  const [contentType, setContentType] = useState<"product" | "page" | "blog" | "faq">("page");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AEOAnalysis | null>(null);

  // FAQ generation state
  const [faqTopic, setFaqTopic] = useState("");
  const [isGeneratingFAQ, setIsGeneratingFAQ] = useState(false);
  const [generatedFAQ, setGeneratedFAQ] = useState<QAPair[]>([]);

  // Featured snippet state
  const [snippetQuery, setSnippetQuery] = useState("");
  const [snippetType, setSnippetType] = useState<"paragraph" | "list" | "table">("paragraph");
  const [isOptimizingSnippet, setIsOptimizingSnippet] = useState(false);
  const [snippetResult, setSnippetResult] = useState<{ optimizedContent: string; probability: string } | null>(null);

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error("Please enter content to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeContentAEO(content, {
        title,
        targetQueries: targetQueries.split(",").map((q) => q.trim()).filter(Boolean),
        contentType,
      });
      if (result.data) {
        setAnalysis(result.data);
        toast.success("AEO analysis complete");
      } else {
        toast.error(result.error || "Analysis failed");
      }
    } catch {
      toast.error("Failed to analyze content");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateFAQ = async () => {
    if (!content.trim() || !faqTopic.trim()) {
      toast.error("Please enter content and topic");
      return;
    }

    setIsGeneratingFAQ(true);
    try {
      const result = await generateFAQPairs(content, faqTopic);
      if (result.data) {
        setGeneratedFAQ(result.data);
        toast.success("FAQ pairs generated");
      } else {
        toast.error(result.error || "Failed to generate FAQ");
      }
    } catch {
      toast.error("Failed to generate FAQ");
    } finally {
      setIsGeneratingFAQ(false);
    }
  };

  const handleOptimizeSnippet = async () => {
    if (!content.trim() || !snippetQuery.trim()) {
      toast.error("Please enter content and target query");
      return;
    }

    setIsOptimizingSnippet(true);
    try {
      const result = await generateSnippetContent(content, snippetQuery, snippetType);
      if (result.data) {
        setSnippetResult(result.data);
        toast.success("Snippet optimized");
      } else {
        toast.error(result.error || "Optimization failed");
      }
    } catch {
      toast.error("Failed to optimize snippet");
    } finally {
      setIsOptimizingSnippet(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Content Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Answer Engine Optimization
          </CardTitle>
          <CardDescription>
            Optimize content for AI search (ChatGPT, Google SGE, voice assistants)
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
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as typeof contentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">Page</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="faq">FAQ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Queries (comma-separated)</Label>
              <Input
                value={targetQueries}
                onChange={(e) => setTargetQueries(e.target.value)}
                placeholder="What is..., How to..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your content here"
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tools Tabs */}
      <Tabs defaultValue="analyze" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyze">AEO Analysis</TabsTrigger>
          <TabsTrigger value="faq">FAQ Generator</TabsTrigger>
          <TabsTrigger value="snippet">Featured Snippet</TabsTrigger>
        </TabsList>

        {/* AEO Analysis Tab */}
        <TabsContent value="analyze" className="space-y-4">
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !content.trim()}>
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Analyze for AEO
              </>
            )}
          </Button>

          {analysis && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Scores */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">AEO Readiness</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Score</span>
                      <span>{analysis.score}/100</span>
                    </div>
                    <Progress value={analysis.score} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Direct Answerability</span>
                      <span>{analysis.directAnswerability}/100</span>
                    </div>
                    <Progress value={analysis.directAnswerability} />
                  </div>
                  <div className="flex gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      {analysis.structuredDataReady ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-sm">Schema Ready</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic className={`h-4 w-4 ${analysis.voiceSearchReady ? "text-green-500" : "text-yellow-500"}`} />
                      <span className="text-sm">Voice Search</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Issues */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Issues Found</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis.issues.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.issues.map((issue, i) => (
                        <div key={i} className="p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Badge variant={issue.severity === "high" ? "destructive" : "secondary"}>
                              {issue.severity}
                            </Badge>
                            <span className="text-sm font-medium">{issue.description}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{issue.fix}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No major issues found</p>
                  )}
                </CardContent>
              </Card>

              {/* Suggested Q&A */}
              {analysis.suggestedQA.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Suggested Q&A to Add</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.suggestedQA.map((qa, i) => (
                        <div key={i} className="p-3 rounded-lg border">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">Q: {qa.question}</p>
                              <p className="text-sm text-muted-foreground mt-1">A: {qa.answer}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{qa.answerType}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(`Q: ${qa.question}\nA: ${qa.answer}`)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* FAQ Generator Tab */}
        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Topic for FAQ</Label>
                  <Input
                    value={faqTopic}
                    onChange={(e) => setFaqTopic(e.target.value)}
                    placeholder="e.g., Product features, shipping, returns"
                    className="mt-2"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleGenerateFAQ} disabled={isGeneratingFAQ || !content.trim()}>
                    {isGeneratingFAQ ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate FAQ
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {generatedFAQ.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Generated FAQ Pairs</CardTitle>
                <CardDescription>Copy these to add to your content with FAQ schema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {generatedFAQ.map((qa, i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium">Q: {qa.question}</p>
                          <p className="text-sm text-muted-foreground mt-1">A: {qa.answer}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(`<h3>${qa.question}</h3>\n<p>${qa.answer}</p>`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Featured Snippet Tab */}
        <TabsContent value="snippet" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Target Search Query</Label>
                  <Input
                    value={snippetQuery}
                    onChange={(e) => setSnippetQuery(e.target.value)}
                    placeholder="e.g., How to clean leather shoes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Snippet Type</Label>
                  <Select value={snippetType} onValueChange={(v) => setSnippetType(v as typeof snippetType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paragraph">Paragraph</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                      <SelectItem value="table">Table</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleOptimizeSnippet} disabled={isOptimizingSnippet || !content.trim()} className="mt-4">
                {isOptimizingSnippet ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Optimize for Snippet
              </Button>
            </CardContent>
          </Card>

          {snippetResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Optimized Content</CardTitle>
                  <Badge variant={snippetResult.probability === "high" ? "default" : "secondary"}>
                    {snippetResult.probability} probability
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/50 relative">
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: snippetResult.optimizedContent }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(snippetResult.optimizedContent)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
