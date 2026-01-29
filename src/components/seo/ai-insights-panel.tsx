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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Brain,
  Loader2,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Link as LinkIcon,
  Search,
  FileText,
  Settings,
  Sparkles,
  ArrowRight,
  Database,
  BarChart3,
  Target,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  aggregateAllAPIData,
  applyIntelligentImprovements,
  type AIAnalysisResult,
  type AggregatedInsight,
} from "@/lib/actions/ai-insights";

interface Props {
  storeId: string;
  storeName: string;
  storeUrl: string;
}

export function AIInsightsPanel({ storeId, storeName, storeUrl }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [analysisData, setAnalysisData] = useState<AIAnalysisResult | null>(null);
  const [selectedInsights, setSelectedInsights] = useState<Set<string>>(new Set());
  
  // Improvement options
  const [fixOptions, setFixOptions] = useState({
    fixMetaTitles: true,
    fixMetaDescriptions: true,
    optimizeContent: false,
    addSchemaMarkup: false,
  });

  const [improvements, setImprovements] = useState<Array<{
    type: string;
    target: string;
    before: string;
    after: string;
    status: "applied" | "failed";
  }>>([]);

  useEffect(() => {
    loadAnalysis();
  }, [storeId]);

  const loadAnalysis = async () => {
    setIsLoading(true);
    try {
      const result = await aggregateAllAPIData(storeId);
      if (result.data) {
        setAnalysisData(result.data);
      } else {
        toast.error(result.error || "Failed to load analysis");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImprovements = async () => {
    setIsApplying(true);
    setImprovements([]);
    
    try {
      toast.info("Applying improvements... This may take a few minutes.");
      
      const result = await applyIntelligentImprovements(storeId, {
        ...fixOptions,
        targetInsightIds: Array.from(selectedInsights),
      });

      if (result.success) {
        setImprovements(result.improvements);
        const applied = result.improvements.filter(i => i.status === "applied").length;
        toast.success(`Applied ${applied} improvements!`);
        
        // Refresh analysis
        loadAnalysis();
      } else {
        toast.error(result.error || "Failed to apply improvements");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsApplying(false);
    }
  };

  const getStatusIcon = (status: "connected" | "simulated" | "error") => {
    switch (status) {
      case "connected": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "simulated": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getPriorityColor = (priority: AggregatedInsight["priority"]) => {
    switch (priority) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-green-500 text-white";
    }
  };

  const getCategoryIcon = (category: AggregatedInsight["category"]) => {
    switch (category) {
      case "content": return <FileText className="h-4 w-4" />;
      case "technical": return <Settings className="h-4 w-4" />;
      case "backlinks": return <LinkIcon className="h-4 w-4" />;
      case "keywords": return <Search className="h-4 w-4" />;
      case "competitors": return <Target className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Aggregating data from all APIs...</p>
          <p className="text-xs text-muted-foreground mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Failed to load analysis</p>
          <Button onClick={loadAnalysis} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalDataPoints = analysisData.dataSources.reduce((sum, ds) => sum + ds.dataPoints, 0);
  const connectedSources = analysisData.dataSources.filter(ds => ds.status === "connected").length;
  const actionableInsights = analysisData.insights.filter(i => i.autoFixAvailable).length;

  return (
    <div className="space-y-6">
      {/* 1-Click Improvement Banner */}
      <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">1-Click Intelligent Improvements</h2>
                <p className="text-sm text-muted-foreground">
                  AI analyzes all {totalDataPoints} data points from {connectedSources} APIs to optimize your site
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleApplyImprovements}
              disabled={isApplying}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            >
              {isApplying ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Zap className="mr-2 h-5 w-5" />
              )}
              Apply All Improvements
            </Button>
          </div>

          {/* Options */}
          <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={fixOptions.fixMetaTitles}
                onCheckedChange={(c) => setFixOptions(prev => ({ ...prev, fixMetaTitles: !!c }))}
              />
              <span className="text-sm">Fix Meta Titles</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={fixOptions.fixMetaDescriptions}
                onCheckedChange={(c) => setFixOptions(prev => ({ ...prev, fixMetaDescriptions: !!c }))}
              />
              <span className="text-sm">Fix Meta Descriptions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={fixOptions.optimizeContent}
                onCheckedChange={(c) => setFixOptions(prev => ({ ...prev, optimizeContent: !!c }))}
              />
              <span className="text-sm">Optimize Content</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={fixOptions.addSchemaMarkup}
                onCheckedChange={(c) => setFixOptions(prev => ({ ...prev, addSchemaMarkup: !!c }))}
              />
              <span className="text-sm">Add Schema</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources & Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Connected Data Sources
            </CardTitle>
            <CardDescription>
              {connectedSources} of {analysisData.dataSources.length} APIs contributing data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysisData.dataSources.map((source, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(source.status)}
                    <span className="font-medium">{source.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{source.dataPoints} points</Badge>
                    <Badge variant={source.status === "connected" ? "default" : source.status === "simulated" ? "secondary" : "destructive"}>
                      {source.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Aggregated Metrics
            </CardTitle>
            <CardDescription>
              Combined insights from all sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 border rounded">
                <p className="text-2xl font-bold text-primary">{analysisData.metrics.healthScore}</p>
                <p className="text-xs text-muted-foreground">Health Score</p>
              </div>
              <div className="text-center p-3 border rounded">
                <p className="text-2xl font-bold text-blue-600">{analysisData.metrics.domainAuthority}</p>
                <p className="text-xs text-muted-foreground">Domain Authority</p>
              </div>
              <div className="text-center p-3 border rounded">
                <p className="text-2xl font-bold text-green-600">{analysisData.metrics.totalBacklinks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Backlinks</p>
              </div>
              <div className="text-center p-3 border rounded">
                <p className="text-2xl font-bold text-orange-600">{analysisData.metrics.avgPosition || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Avg Position</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applied Improvements */}
      {improvements.length > 0 && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Improvements Applied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {improvements.map((imp, i) => (
                <div key={i} className={`p-3 border rounded ${
                  imp.status === "applied" ? "border-green-500/30 bg-green-50 dark:bg-green-900/10" : "border-red-500/30 bg-red-50 dark:bg-red-900/10"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={imp.status === "applied" ? "default" : "destructive"}>
                      {imp.type}
                    </Badge>
                    {imp.status === "applied" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{imp.target}</p>
                  {imp.status === "applied" && (
                    <div className="mt-2 text-xs">
                      <p className="text-muted-foreground line-through">{imp.before}</p>
                      <p className="text-green-600">{imp.after}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Insights, Quick Wins, Competitor Gaps */}
      <Tabs defaultValue="insights">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Insights ({analysisData.insights.length})
          </TabsTrigger>
          <TabsTrigger value="quickwins" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Wins ({analysisData.quickWins.length})
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Competitor Gaps ({analysisData.competitorGaps.length})
          </TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI-Generated Insights</CardTitle>
                  <CardDescription>
                    {actionableInsights} actionable insights with auto-fix available
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadAnalysis}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisData.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-4 border rounded-lg ${
                      insight.autoFixAvailable ? "border-primary/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getCategoryIcon(insight.category)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getPriorityColor(insight.priority)}>
                              {insight.priority}
                            </Badge>
                            <Badge variant="outline">{insight.category}</Badge>
                            {insight.autoFixAvailable && (
                              <Badge className="bg-green-100 text-green-800">
                                <Zap className="h-3 w-3 mr-1" />
                                Auto-fix
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {insight.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Impact: {insight.impact}</span>
                            <span>Effort: {insight.effort}</span>
                            {insight.estimatedTrafficGain && (
                              <span className="text-green-600">
                                +{insight.estimatedTrafficGain.toLocaleString()} visits/mo
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {insight.sources.map((source, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      {insight.autoFixAvailable && (
                        <Checkbox
                          checked={selectedInsights.has(insight.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedInsights);
                            if (checked) {
                              newSelected.add(insight.id);
                            } else {
                              newSelected.delete(insight.id);
                            }
                            setSelectedInsights(newSelected);
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
                {analysisData.insights.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No insights generated yet. Click refresh to analyze.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Wins Tab */}
        <TabsContent value="quickwins">
          <Card>
            <CardHeader>
              <CardTitle>Quick Wins</CardTitle>
              <CardDescription>
                Issues that can be fixed immediately with 1 click
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysisData.quickWins.map((win) => (
                  <div key={win.id} className="p-3 border rounded flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={win.impact === "high" ? "destructive" : win.impact === "medium" ? "default" : "secondary"}>
                        {win.impact}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{win.title}</p>
                        <p className="text-xs text-muted-foreground">{win.description}</p>
                        {win.targetUrl && (
                          <p className="text-xs text-primary truncate max-w-md">{win.targetUrl}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">{win.fixType}</Badge>
                  </div>
                ))}
                {analysisData.quickWins.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No quick wins found - your site is well optimized!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competitor Gaps Tab */}
        <TabsContent value="gaps">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Keyword Gaps</CardTitle>
              <CardDescription>
                Keywords where competitors outrank you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysisData.competitorGaps.map((gap, i) => (
                  <div key={i} className="p-4 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="text-sm">{gap.keyword}</Badge>
                      <span className="text-sm text-green-600 font-medium">
                        {gap.searchVolume.toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Your Position</p>
                        <p className="font-bold text-lg">
                          {gap.yourPosition ? `#${gap.yourPosition}` : "Not ranking"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Competitor</p>
                        <p className="font-bold text-lg text-red-600">#{gap.competitorPosition}</p>
                        <p className="text-xs text-muted-foreground">{gap.competitorDomain}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Difficulty</p>
                        <Progress value={gap.difficulty} className="h-2 mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">{gap.difficulty}/100</p>
                      </div>
                    </div>
                    <p className="text-sm text-primary mt-3 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {gap.opportunity}
                    </p>
                  </div>
                ))}
                {analysisData.competitorGaps.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No competitor gaps found. Add tracked keywords to see opportunities.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
