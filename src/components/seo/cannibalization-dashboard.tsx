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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Loader2,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  detectCannibalizationAction,
  resolveCannibalizationIssue,
} from "@/lib/actions/advanced-seo";

interface CannibalizationDashboardProps {
  storeId: string;
  issues: Array<{
    keyword: string;
    competing_pages: Array<{
      url: string;
      title: string;
      source: string;
    }>;
    severity: string;
    recommendation: string;
    status: string;
  }>;
}

export function CannibalizationDashboard({
  storeId,
  issues: initialIssues,
}: CannibalizationDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState(initialIssues);

  const handleDetect = async () => {
    setIsLoading(true);
    try {
      const result = await detectCannibalizationAction(storeId);
      if (result.data) {
        toast.success(`Found ${result.data.totalIssues} cannibalization issues`);
        // Refresh page to get updated data
        window.location.reload();
      } else {
        toast.error(result.error || "Detection failed");
      }
    } catch {
      toast.error("Detection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (keyword: string, status: "resolved" | "ignored") => {
    const result = await resolveCannibalizationIssue(storeId, keyword, status);
    if (result.success) {
      setIssues(issues.filter((i) => i.keyword !== keyword));
      toast.success(`Issue ${status}`);
    } else {
      toast.error(result.error || "Failed to update");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  const highCount = issues.filter((i) => i.severity === "high").length;
  const mediumCount = issues.filter((i) => i.severity === "medium").length;
  const lowCount = issues.filter((i) => i.severity === "low").length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{issues.length}</div>
            <div className="text-sm text-muted-foreground">Total Issues</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{highCount}</div>
            <div className="text-sm text-muted-foreground">High Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{mediumCount}</div>
            <div className="text-sm text-muted-foreground">Medium Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">{lowCount}</div>
            <div className="text-sm text-muted-foreground">Low Severity</div>
          </CardContent>
        </Card>
      </div>

      {/* Detect Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Keyword Cannibalization Detector
          </CardTitle>
          <CardDescription>
            Find pages competing for the same keywords, which can hurt your rankings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDetect} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Analyzing..." : "Detect Cannibalization"}
          </Button>
        </CardContent>
      </Card>

      {/* Issues List */}
      {issues.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cannibalization Issues ({issues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {issues.map((issue, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                          <span className="font-medium">{issue.keyword}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {issue.competing_pages.length} pages competing for this keyword
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(issue.keyword, "resolved")}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Resolved
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolve(issue.keyword, "ignored")}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Ignore
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {issue.competing_pages.map((page, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-2 text-sm p-2 bg-muted rounded"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{page.source}</Badge>
                          <span className="flex-1 truncate">{page.title}</span>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <span>{issue.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium">No cannibalization issues detected</p>
              <p className="text-sm">Run a detection to check for conflicts</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
