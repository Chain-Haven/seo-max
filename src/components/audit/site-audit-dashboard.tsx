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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bug,
  Loader2,
  Play,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Image,
  Link2,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  startSiteCrawl,
  getCrawlStatus,
  runQuickHealthCheck,
} from "@/lib/actions/site-crawler";
import type { CrawlSummary } from "@/lib/seo/site-crawler";

interface SiteAuditDashboardProps {
  storeId: string;
  siteUrl: string;
  latestCrawl: {
    id: string;
    status: string;
    pages_crawled: number;
    summary: CrawlSummary | null;
    completed_at: string | null;
  } | null;
  crawlHistory: Array<{
    id: string;
    status: string;
    pages_crawled: number;
    summary: CrawlSummary | null;
    completed_at: string | null;
    created_at: string;
  }>;
  crawledPages: Array<{
    url: string;
    status_code: number;
    title: string | null;
    meta_description: string | null;
    issues: Array<{ type: string; severity: string; message: string }>;
  }>;
}

export function SiteAuditDashboard({
  storeId,
  siteUrl,
  latestCrawl,
  crawlHistory,
  crawledPages,
}: SiteAuditDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [crawlId, setCrawlId] = useState<string | null>(latestCrawl?.id || null);
  const [crawlStatus, setCrawlStatus] = useState<string>(latestCrawl?.status || "");
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<CrawlSummary | null>(latestCrawl?.summary || null);
  const [filterIssue, setFilterIssue] = useState<string | null>(null);
  const [healthCheck, setHealthCheck] = useState<{
    healthy: boolean;
    score: number;
    criticalIssues: Array<{ type: string; severity: string; message: string }>;
    recommendations: string[];
  } | null>(null);

  // Poll for crawl status
  useEffect(() => {
    if (!crawlId || crawlStatus === "completed" || crawlStatus === "failed") return;

    const interval = setInterval(async () => {
      const result = await getCrawlStatus(crawlId);
      if (result.data) {
        setCrawlStatus(result.data.status);
        setProgress((result.data.pagesCrawled / result.data.pagesTotal) * 100);
        
        if (result.data.status === "completed") {
          setSummary(result.data.summary);
          toast.success("Site audit completed!");
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [crawlId, crawlStatus]);

  // Start full crawl
  const handleStartCrawl = async () => {
    if (!siteUrl) {
      toast.error("No site URL configured");
      return;
    }

    setIsLoading(true);
    setCrawlStatus("running");
    setProgress(0);

    try {
      const result = await startSiteCrawl(storeId, siteUrl, 100);
      if (result.crawlId) {
        setCrawlId(result.crawlId);
        toast.success("Site audit started!");
      } else {
        toast.error(result.error || "Failed to start crawl");
        setCrawlStatus("");
      }
    } catch {
      toast.error("Failed to start crawl");
      setCrawlStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick health check
  const handleHealthCheck = async () => {
    if (!siteUrl) {
      toast.error("No site URL configured");
      return;
    }

    setIsLoading(true);
    try {
      const result = await runQuickHealthCheck(storeId, siteUrl);
      if (result.data) {
        setHealthCheck(result.data);
        toast.success("Health check complete!");
      } else {
        toast.error(result.error || "Health check failed");
      }
    } catch {
      toast.error("Health check failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getIssueIcon = (type: string) => {
    if (type.includes("title") || type.includes("meta")) return <FileText className="h-4 w-4" />;
    if (type.includes("image") || type.includes("alt")) return <Image className="h-4 w-4" />;
    if (type.includes("link")) return <Link2 className="h-4 w-4" />;
    if (type.includes("slow") || type.includes("time")) return <Clock className="h-4 w-4" />;
    return <Bug className="h-4 w-4" />;
  };

  const filteredPages = filterIssue
    ? crawledPages.filter((p) => p.issues.some((i) => i.type === filterIssue))
    : crawledPages;

  const issueTypes = Array.from(
    new Set(crawledPages.flatMap((p) => p.issues.map((i) => i.type)))
  );

  return (
    <div className="space-y-6">
      {/* Quick Health Check */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Quick Health Check
            </CardTitle>
            <CardDescription>
              Check your homepage for critical SEO issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthCheck ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`text-4xl font-bold ${
                      healthCheck.score >= 80
                        ? "text-green-500"
                        : healthCheck.score >= 60
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  >
                    {healthCheck.score}
                  </div>
                  <div>
                    <p className="font-medium">
                      {healthCheck.healthy ? "Healthy" : "Issues Found"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {healthCheck.criticalIssues.length} critical issues
                    </p>
                  </div>
                </div>
                {healthCheck.recommendations.length > 0 && (
                  <div className="space-y-1">
                    {healthCheck.recommendations.slice(0, 3).map((rec, i) => (
                      <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        {rec}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Run a quick check to see your site health score</p>
            )}
            <Button onClick={handleHealthCheck} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Run Health Check
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Full Site Audit
            </CardTitle>
            <CardDescription>
              Crawl your entire site to find all SEO issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {crawlStatus === "running" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Crawling...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            ) : summary ? (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{summary.totalPages}</div>
                  <div className="text-sm text-muted-foreground">Pages Crawled</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{summary.criticalIssues}</div>
                  <div className="text-sm text-muted-foreground">Critical Issues</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{summary.warnings}</div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{summary.avgLoadTime}ms</div>
                  <div className="text-sm text-muted-foreground">Avg Load Time</div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Start a full crawl to audit your entire site</p>
            )}
            <Button
              onClick={handleStartCrawl}
              disabled={isLoading || crawlStatus === "running"}
              className="w-full"
            >
              {crawlStatus === "running" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {crawlStatus === "running" ? "Crawling..." : "Start Full Audit"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Issues Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Issues Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <div
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  filterIssue === null ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
                onClick={() => setFilterIssue(null)}
              >
                <div className="text-2xl font-bold">{summary.totalPages}</div>
                <div className="text-sm text-muted-foreground">All Pages</div>
              </div>
              <div
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  filterIssue === "missing_title" ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
                onClick={() => setFilterIssue("missing_title")}
              >
                <div className="text-2xl font-bold text-red-500">{summary.pagesWithMissingTitle}</div>
                <div className="text-sm text-muted-foreground">Missing Title</div>
              </div>
              <div
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  filterIssue === "missing_meta_description" ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
                onClick={() => setFilterIssue("missing_meta_description")}
              >
                <div className="text-2xl font-bold text-red-500">{summary.pagesWithMissingDescription}</div>
                <div className="text-sm text-muted-foreground">Missing Description</div>
              </div>
              <div
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  filterIssue === "missing_h1" ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
                onClick={() => setFilterIssue("missing_h1")}
              >
                <div className="text-2xl font-bold text-red-500">{summary.pagesWithMissingH1}</div>
                <div className="text-sm text-muted-foreground">Missing H1</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crawled Pages */}
      {crawledPages.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Crawled Pages ({filteredPages.length})</CardTitle>
              <CardDescription>
                {filterIssue ? `Filtered by: ${filterIssue.replace(/_/g, " ")}` : "All crawled pages"}
              </CardDescription>
            </div>
            {filterIssue && (
              <Button variant="outline" size="sm" onClick={() => setFilterIssue(null)}>
                <XCircle className="mr-2 h-4 w-4" />
                Clear Filter
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPages.map((page, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          {new URL(page.url).pathname}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {page.title || <span className="text-red-500">Missing</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={page.status_code === 200 ? "default" : "destructive"}
                        >
                          {page.status_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {page.issues.slice(0, 3).map((issue, j) => (
                            <span key={j} title={issue.message}>
                              {getSeverityIcon(issue.severity)}
                            </span>
                          ))}
                          {page.issues.length > 3 && (
                            <Badge variant="outline">+{page.issues.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Crawl History */}
      {crawlHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audit History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {crawlHistory.map((crawl) => (
                <div
                  key={crawl.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {crawl.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : crawl.status === "failed" ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    )}
                    <div>
                      <p className="font-medium">{crawl.pages_crawled} pages crawled</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(crawl.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {(crawl.summary as CrawlSummary)?.criticalIssues !== undefined && (
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-500">
                          {(crawl.summary as CrawlSummary).criticalIssues}
                        </div>
                        <div className="text-xs text-muted-foreground">Critical</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-500">
                          {(crawl.summary as CrawlSummary).warnings}
                        </div>
                        <div className="text-xs text-muted-foreground">Warnings</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
