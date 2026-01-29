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
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Code,
  FileText,
  Link as LinkIcon,
  TrendingUp,
  Gauge,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  calculateSEOHealthScore,
  type SEOHealthScore,
} from "@/lib/actions/seo-apis";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  storeId: string;
  storeName: string;
  storeUrl: string;
  initialScore: SEOHealthScore | null;
}

export function SEOHealthPanel({
  storeId,
  storeName,
  storeUrl,
  initialScore,
}: Props) {
  const [healthScore, setHealthScore] = useState<SEOHealthScore | null>(initialScore);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["recommendations"])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await calculateSEOHealthScore(storeId);
      if (data) {
        setHealthScore(data);
        toast.success("SEO health score updated");
      } else {
        toast.error(error || "Failed to refresh");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-green-500";
      case "B":
        return "bg-blue-500";
      case "C":
        return "bg-yellow-500";
      case "D":
        return "bg-orange-500";
      default:
        return "bg-red-500";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "technical":
        return <Code className="h-5 w-5" />;
      case "content":
        return <FileText className="h-5 w-5" />;
      case "backlinks":
        return <LinkIcon className="h-5 w-5" />;
      case "rankings":
        return <TrendingUp className="h-5 w-5" />;
      case "speed":
        return <Gauge className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getPriorityBadge = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High Priority</Badge>;
      case "medium":
        return <Badge variant="default" className="bg-yellow-500">Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  if (!healthScore) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            No SEO health data available. Run a site crawl first to analyze your SEO health.
          </p>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Calculate Health Score
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className={`border-2 ${getScoreColor(healthScore.overall).replace("text-", "border-")}/30`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div
                  className={`w-32 h-32 rounded-full flex items-center justify-center ${getScoreBg(
                    healthScore.overall
                  )}`}
                >
                  <div className="text-center">
                    <span
                      className={`text-4xl font-bold ${getScoreColor(
                        healthScore.overall
                      )}`}
                    >
                      {healthScore.overall}
                    </span>
                    <span className="text-lg text-muted-foreground">/100</span>
                  </div>
                </div>
                <Badge
                  className={`absolute -top-2 -right-2 text-lg px-3 py-1 ${getGradeColor(
                    healthScore.grade
                  )}`}
                >
                  {healthScore.grade}
                </Badge>
              </div>

              <div>
                <h2 className="text-2xl font-bold">SEO Health Score</h2>
                <p className="text-muted-foreground">
                  {healthScore.grade === "A"
                    ? "Excellent! Your site is well optimized"
                    : healthScore.grade === "B"
                    ? "Good! Minor improvements recommended"
                    : healthScore.grade === "C"
                    ? "Average. Several improvements needed"
                    : healthScore.grade === "D"
                    ? "Poor. Significant work required"
                    : "Critical. Major SEO issues detected"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Last checked: {new Date(healthScore.lastChecked).toLocaleString()}
                </p>
              </div>
            </div>

            <Button onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Scores */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(healthScore.categories).map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 capitalize">
                {getCategoryIcon(key)}
                {key}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreColor(value.score)}`}>
                {value.score}
              </div>
              <Progress value={value.score} className="h-2 mt-2" />
              <div className="mt-2 flex items-center gap-2 text-xs">
                {value.issues.length > 0 ? (
                  <span className="text-red-600">
                    {value.issues.length} issue{value.issues.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    All good
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Categories */}
      <div className="space-y-4">
        {Object.entries(healthScore.categories).map(([key, value]) => (
          <Collapsible
            key={key}
            open={expandedCategories.has(key)}
            onOpenChange={() => toggleCategory(key)}
          >
            <Card>
              <CardHeader className="pb-0">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full text-left">
                    <CardTitle className="flex items-center gap-2 capitalize">
                      {getCategoryIcon(key)}
                      {key} SEO
                      <Badge
                        variant="outline"
                        className={`ml-2 ${getScoreColor(value.score)}`}
                      >
                        {value.score}/100
                      </Badge>
                    </CardTitle>
                    {expandedCategories.has(key) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Issues */}
                    <div>
                      <h4 className="font-medium text-red-600 flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4" />
                        Issues ({value.issues.length})
                      </h4>
                      {value.issues.length > 0 ? (
                        <ul className="space-y-1">
                          {value.issues.map((issue, i) => (
                            <li
                              key={i}
                              className="text-sm text-muted-foreground flex items-start gap-2"
                            >
                              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No issues found</p>
                      )}
                    </div>

                    {/* Passed */}
                    <div>
                      <h4 className="font-medium text-green-600 flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Passed ({value.passed.length})
                      </h4>
                      {value.passed.length > 0 ? (
                        <ul className="space-y-1">
                          {value.passed.map((item, i) => (
                            <li
                              key={i}
                              className="text-sm text-muted-foreground flex items-start gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No checks passed yet
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Recommendations */}
      <Collapsible
        open={expandedCategories.has("recommendations")}
        onOpenChange={() => toggleCategory("recommendations")}
      >
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Top Recommendations
                  </CardTitle>
                  <CardDescription>
                    Prioritized actions to improve your SEO health score
                  </CardDescription>
                </div>
                {expandedCategories.has("recommendations") ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {healthScore.recommendations.length > 0 ? (
                  healthScore.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getPriorityBadge(rec.priority)}
                            <Badge variant="outline">{rec.category}</Badge>
                          </div>
                          <h4 className="font-medium">{rec.issue}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Fix:</strong> {rec.fix}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <strong>Impact:</strong> {rec.impact}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No recommendations - your site is well optimized!
                  </p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
