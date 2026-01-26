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
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Package,
  FileText,
  Newspaper,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { getStoreSEOAudit } from "@/lib/actions/seo";

interface SEOIssue {
  type: string;
  id: string;
  name: string;
  issue: string;
  severity: string;
  count?: number;
}

interface SEOStats {
  totalProducts: number;
  totalPages: number;
  totalPosts: number;
  issuesCount: number;
  highSeverity: number;
  mediumSeverity: number;
}

interface SEOAuditPanelProps {
  storeId: string;
}

const issueLabels: Record<string, string> = {
  missing_meta_title: "Missing meta title",
  missing_meta_description: "Missing meta description",
  missing_image_alt: "Images without alt text",
};

const typeIcons: Record<string, React.ReactNode> = {
  product: <Package className="h-4 w-4" />,
  page: <FileText className="h-4 w-4" />,
  blog_post: <Newspaper className="h-4 w-4" />,
};

export function SEOAuditPanel({ storeId }: SEOAuditPanelProps) {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<SEOIssue[]>([]);
  const [stats, setStats] = useState<SEOStats | null>(null);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const result = await getStoreSEOAudit(storeId);
      setIssues(result.issues);
      setStats(result.stats);
    } catch (error) {
      console.error("Failed to load SEO audit:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [storeId]);

  const getHealthScore = () => {
    if (!stats) return 0;
    const totalItems = stats.totalProducts + stats.totalPages + stats.totalPosts;
    if (totalItems === 0) return 100;

    // Each high severity issue counts as 2, medium as 1
    const penaltyPoints = stats.highSeverity * 2 + stats.mediumSeverity;
    const maxPenalty = totalItems * 2; // Maximum possible penalty

    const score = Math.max(0, 100 - (penaltyPoints / maxPenalty) * 100);
    return Math.round(score);
  };

  const healthScore = getHealthScore();

  const getHealthColor = () => {
    if (healthScore >= 80) return "text-green-600";
    if (healthScore >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthBg = () => {
    if (healthScore >= 80) return "bg-green-600";
    if (healthScore >= 50) return "bg-yellow-600";
    return "bg-red-600";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Running SEO audit...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SEO Health Score</CardTitle>
              <CardDescription>
                Based on meta titles, descriptions, and image alt texts
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadAudit}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className={`text-5xl font-bold ${getHealthColor()}`}>
              {healthScore}
            </div>
            <div className="flex-1 space-y-2">
              <Progress value={healthScore} className={`h-3 ${getHealthBg()}`} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {healthScore >= 80
                    ? "Your SEO is in great shape!"
                    : healthScore >= 50
                    ? "There's room for improvement"
                    : "Several issues need attention"}
                </span>
                <span>{stats?.issuesCount || 0} issues found</span>
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-semibold">{stats.totalProducts}</div>
                <div className="text-xs text-muted-foreground">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{stats.totalPages}</div>
                <div className="text-xs text-muted-foreground">Pages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{stats.totalPosts}</div>
                <div className="text-xs text-muted-foreground">Blog Posts</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Issues Found
              </CardTitle>
              <div className="flex gap-2">
                {stats?.highSeverity ? (
                  <Badge variant="destructive">
                    {stats.highSeverity} High
                  </Badge>
                ) : null}
                {stats?.mediumSeverity ? (
                  <Badge variant="secondary">
                    {stats.mediumSeverity} Medium
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {issues.slice(0, 10).map((issue, index) => (
                <div
                  key={`${issue.type}-${issue.id}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {issue.severity === "high" ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        {typeIcons[issue.type]}
                        <span className="font-medium">{issue.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {issueLabels[issue.issue] || issue.issue}
                        {issue.count && ` (${issue.count} images)`}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/stores/${storeId}/${
                      issue.type === "product"
                        ? "products"
                        : issue.type === "page"
                        ? "pages"
                        : "blog"
                    }`}
                  >
                    <Button variant="ghost" size="sm">
                      Fix
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}

              {issues.length > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  And {issues.length - 10} more issues...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {issues.length === 0 && stats && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="font-semibold text-lg">All Clear!</h3>
              <p className="text-muted-foreground">
                No SEO issues found. Your store is well optimized.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
