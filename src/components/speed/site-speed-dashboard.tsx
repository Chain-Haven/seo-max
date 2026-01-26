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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Gauge,
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { analyzePageSpeed } from "@/lib/actions/analytics";
import type { SpeedMetrics } from "@/lib/integrations/site-speed";

interface SiteSpeedDashboardProps {
  storeId: string;
  storeUrl: string;
  initialHistory: Array<{
    id: string;
    url: string;
    device: string;
    performanceScore: number;
    lcp: number;
    fcp: number;
    cls: number;
    checkedAt: string;
  }>;
}

export function SiteSpeedDashboard({
  storeId,
  storeUrl,
  initialHistory,
}: SiteSpeedDashboardProps) {
  const [url, setUrl] = useState(storeUrl);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<SpeedMetrics | null>(null);
  const [history] = useState(initialHistory);

  const handleAnalyze = async () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsAnalyzing(true);
    const result = await analyzePageSpeed(storeId, url, device);

    if (result.data) {
      setMetrics(result.data);
      toast.success("Analysis complete");
    } else {
      toast.error(result.error || "Analysis failed");
    }
    setIsAnalyzing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: "A", color: "bg-green-500" };
    if (score >= 80) return { grade: "B", color: "bg-lime-500" };
    if (score >= 70) return { grade: "C", color: "bg-yellow-500" };
    if (score >= 50) return { grade: "D", color: "bg-orange-500" };
    return { grade: "F", color: "bg-red-500" };
  };

  const getCWVStatus = (metric: string, value: number) => {
    const thresholds: Record<string, { good: number; poor: number }> = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 },
    };

    const t = thresholds[metric];
    if (!t) return "unknown";
    if (value <= t.good) return "good";
    if (value <= t.poor) return "needs-improvement";
    return "poor";
  };

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label>URL to Analyze</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <Tabs value={device} onValueChange={(v) => setDevice(v as "mobile" | "desktop")}>
              <TabsList>
                <TabsTrigger value="mobile">
                  <Smartphone className="h-4 w-4 mr-1" />
                  Mobile
                </TabsTrigger>
                <TabsTrigger value="desktop">
                  <Monitor className="h-4 w-4 mr-1" />
                  Desktop
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Gauge className="mr-2 h-4 w-4" />
              )}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {metrics && (
        <>
          {/* Performance Score */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardContent className="py-6 text-center">
                <div className="relative inline-flex">
                  <svg className="w-32 h-32">
                    <circle
                      className="text-muted stroke-current"
                      strokeWidth="8"
                      fill="transparent"
                      r="56"
                      cx="64"
                      cy="64"
                    />
                    <circle
                      className={`${getScoreColor(metrics.performanceScore)} stroke-current`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      fill="transparent"
                      r="56"
                      cx="64"
                      cy="64"
                      strokeDasharray={`${metrics.performanceScore * 3.52} 352`}
                      transform="rotate(-90 64 64)"
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-4xl font-bold ${getScoreColor(metrics.performanceScore)}`}>
                    {metrics.performanceScore}
                  </span>
                </div>
                <p className="mt-2 text-lg font-medium">Performance Score</p>
                <Badge className={getScoreGrade(metrics.performanceScore).color}>
                  Grade {getScoreGrade(metrics.performanceScore).grade}
                </Badge>
              </CardContent>
            </Card>

            {/* Core Web Vitals */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Core Web Vitals</CardTitle>
                <CardDescription>Key metrics that affect user experience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* LCP */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Largest Contentful Paint</span>
                      <Badge variant={getCWVStatus("lcp", metrics.coreWebVitals.lcp) === "good" ? "default" : "destructive"}>
                        {(metrics.coreWebVitals.lcp / 1000).toFixed(1)}s
                      </Badge>
                    </div>
                    <Progress
                      value={Math.min(100, (2500 / metrics.coreWebVitals.lcp) * 100)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">Target: &lt;2.5s</p>
                  </div>

                  {/* FID */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">First Input Delay</span>
                      <Badge variant={getCWVStatus("fid", metrics.coreWebVitals.fid) === "good" ? "default" : "destructive"}>
                        {metrics.coreWebVitals.fid}ms
                      </Badge>
                    </div>
                    <Progress
                      value={Math.min(100, (100 / metrics.coreWebVitals.fid) * 100)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">Target: &lt;100ms</p>
                  </div>

                  {/* CLS */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Cumulative Layout Shift</span>
                      <Badge variant={getCWVStatus("cls", metrics.coreWebVitals.cls) === "good" ? "default" : "destructive"}>
                        {metrics.coreWebVitals.cls}
                      </Badge>
                    </div>
                    <Progress
                      value={Math.min(100, (0.1 / metrics.coreWebVitals.cls) * 100)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">Target: &lt;0.1</p>
                  </div>

                  {/* FCP */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">First Contentful Paint</span>
                      <Badge variant={getCWVStatus("fcp", metrics.coreWebVitals.fcp) === "good" ? "default" : "destructive"}>
                        {(metrics.coreWebVitals.fcp / 1000).toFixed(1)}s
                      </Badge>
                    </div>
                    <Progress
                      value={Math.min(100, (1800 / metrics.coreWebVitals.fcp) * 100)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">Target: &lt;1.8s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Opportunities & Diagnostics */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Opportunities
                </CardTitle>
                <CardDescription>Suggestions to improve load time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.opportunities.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No issues found!</p>
                  ) : (
                    metrics.opportunities.map((opp, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                        {opp.impact === "high" ? (
                          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        ) : opp.impact === "medium" ? (
                          <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{opp.title}</p>
                          {opp.savings && (
                            <p className="text-xs text-muted-foreground">
                              Potential savings: {opp.savings}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{opp.impact}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Diagnostics</CardTitle>
                <CardDescription>Additional performance information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.diagnostics.map((diag, i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <p className="font-medium text-sm">{diag.title}</p>
                      {diag.displayValue && (
                        <p className="text-sm text-muted-foreground">{diag.displayValue}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 10).map((test) => (
                <div key={test.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {test.device === "mobile" ? (
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm truncate max-w-xs">{test.url}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getScoreGrade(test.performanceScore).color}>
                      {test.performanceScore}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(test.checkedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
