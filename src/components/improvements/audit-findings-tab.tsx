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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Loader2, FileSearch, ExternalLink, Check, X } from "lucide-react";
import { getPendingImprovements } from "@/lib/actions/content-freshness";
import { applyImprovementToWordPress, dismissImprovement } from "@/lib/actions/apply-improvements";
import { toast } from "sonner";
import Link from "next/link";

interface AuditFindingsTabProps {
  storeId: string;
}

const AUDIT_TYPES = [
  "missing_title",
  "missing_description",
  "thin_content",
  "missing_h1",
  "duplicate_h1",
  "images_missing_alt",
  "noindex_page",
  "crawl_issue",
];

function formatType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AuditFindingsTab({ storeId }: AuditFindingsTabProps) {
  const [improvements, setImprovements] = useState<Array<{
    id: string;
    type: string;
    entityType: string;
    entityId: string;
    entityTitle: string;
    currentValue: unknown;
    suggestedValue: unknown;
    priority: string;
    impactScore: number;
    reason: string;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const result = await getPendingImprovements(storeId);
    if (result.data) {
      setImprovements(
        result.data.filter((i) => AUDIT_TYPES.includes(i.type))
      );
    } else {
      setImprovements([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const handleApply = async (improvementId: string) => {
    setApplyingIds((prev) => new Set(prev).add(improvementId));
    try {
      const result = await applyImprovementToWordPress(storeId, improvementId);
      if (result.success) {
        toast.success("Improvement applied to WordPress");
        setImprovements((prev) => prev.filter((i) => i.id !== improvementId));
      } else {
        toast.error(result.error || "Failed to apply improvement");
      }
    } catch {
      toast.error("Failed to apply improvement");
    } finally {
      setApplyingIds((prev) => {
        const next = new Set(prev);
        next.delete(improvementId);
        return next;
      });
    }
  };

  const handleDismiss = async (improvementId: string) => {
    setDismissingIds((prev) => new Set(prev).add(improvementId));
    try {
      const result = await dismissImprovement(storeId, improvementId);
      if (result.success) {
        toast.success("Improvement dismissed");
        setImprovements((prev) => prev.filter((i) => i.id !== improvementId));
      } else {
        toast.error(result.error || "Failed to dismiss");
      }
    } catch {
      toast.error("Failed to dismiss improvement");
    } finally {
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(improvementId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Audit Findings
              </CardTitle>
              <CardDescription>
                SEO issues found by the site audit. Run a full audit from the Site Audit page to refresh.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : improvements.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <FileSearch className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p>No audit findings yet.</p>
              <p className="text-sm mt-1">
                Run a site audit from the{" "}
                <Link
                  href={`/dashboard/stores/${storeId}/audit`}
                  className="text-primary underline"
                >
                  Site Audit
                </Link>{" "}
                page to scan your site and generate improvements.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Page / Entity</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead className="max-w-[200px]">Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {improvements.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatType(i.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {i.entityType === "crawled_page" && typeof i.entityId === "string" && i.entityId.startsWith("http") ? (
                          <a
                            href={i.entityId}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {i.entityTitle || i.entityId}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          i.entityTitle || i.entityId
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            i.priority === "critical" || i.priority === "high"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {i.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{i.impactScore}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={i.reason}>
                        {i.reason}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApply(i.id)}
                            disabled={applyingIds.has(i.id) || dismissingIds.has(i.id)}
                            title="Apply to WordPress"
                          >
                            {applyingIds.has(i.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            <span className="ml-1 hidden sm:inline">Apply</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismiss(i.id)}
                            disabled={applyingIds.has(i.id) || dismissingIds.has(i.id)}
                            title="Dismiss"
                          >
                            {dismissingIds.has(i.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
