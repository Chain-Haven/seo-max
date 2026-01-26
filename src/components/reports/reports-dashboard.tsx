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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  FileText,
  Download,
  Send,
  Eye,
  Calendar,
  TrendingUp,
  MousePointer,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { generateSEOReport, type SEOReport } from "@/lib/actions/reports";
import { generateReportHTML } from "@/lib/reports/html-generator";

interface ReportsDashboardProps {
  storeId: string;
  storeName: string;
  initialReports: SEOReport[];
}

export function ReportsDashboard({
  storeId,
  storeName,
  initialReports,
}: ReportsDashboardProps) {
  const [reports, setReports] = useState(initialReports);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState<"weekly" | "monthly">("monthly");
  const [selectedReport, setSelectedReport] = useState<SEOReport | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const result = await generateSEOReport(storeId, { type: reportType });

    if (result.data) {
      setReports((prev) => [result.data!, ...prev]);
      toast.success("Report generated successfully");
    } else {
      toast.error(result.error || "Failed to generate report");
    }
    setIsGenerating(false);
  };

  const handleDownload = (report: SEOReport) => {
    const html = generateReportHTML(report);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo-report-${report.periodStart}-${report.periodEnd}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Generate Report */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
          <CardDescription>
            Create a comprehensive SEO performance report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">
                No reports generated yet. Create your first report above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold ${getScoreColor(report.reportData.summary.overallScore)}`}>
                      {report.reportData.summary.overallScore}
                    </div>
                    <div>
                      <p className="font-medium">
                        {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Report
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {report.periodStart} to {report.periodEnd}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="flex items-center gap-1">
                        <MousePointer className="h-3 w-3" />
                        {report.reportData.traffic.totalClicks.toLocaleString()} clicks
                      </p>
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <LinkIcon className="h-3 w-3" />
                        {report.reportData.backlinks.total} backlinks
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedReport(report)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(report)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Preview Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              SEO Report: {selectedReport?.periodStart} to {selectedReport?.periodEnd}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className={`text-3xl font-bold ${getScoreColor(selectedReport.reportData.summary.overallScore)}`}>
                      {selectedReport.reportData.summary.overallScore}
                    </p>
                    <p className="text-xs text-muted-foreground">Overall Score</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold">
                      {selectedReport.reportData.traffic.totalClicks.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold">
                      {selectedReport.reportData.rankings.top10}
                    </p>
                    <p className="text-xs text-muted-foreground">Top 10 Rankings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold">
                      {selectedReport.reportData.backlinks.total}
                    </p>
                    <p className="text-xs text-muted-foreground">Backlinks</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Queries */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Queries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedReport.reportData.traffic.topQueries.slice(0, 5).map((q, i) => (
                      <div key={i} className="flex justify-between p-2 rounded bg-muted/50">
                        <span>{q.query}</span>
                        <span className="font-medium">{q.clicks} clicks</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedReport.reportData.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
                <Button onClick={() => handleDownload(selectedReport)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download HTML
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
