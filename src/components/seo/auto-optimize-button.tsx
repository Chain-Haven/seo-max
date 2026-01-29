"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Search,
  Wrench,
  Rocket,
  Clock,
  FileSearch,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import {
  runAutonomousSEO,
  getLatestAutoSEOStatus,
  scheduleAutoSEO,
  type AutoSEOResult,
} from "@/lib/actions/autonomous-seo";

interface AutoOptimizeButtonProps {
  storeId: string;
  storeName: string;
  storeStatus: string;
}

type Stage = "idle" | "crawl" | "analysis" | "apply" | "complete" | "error";

const stageLabels: Record<Stage, string> = {
  idle: "Ready",
  crawl: "Scanning Site",
  analysis: "Analyzing SEO",
  apply: "Applying Fixes",
  complete: "Complete",
  error: "Error",
};

const stageIcons: Record<Stage, React.ReactNode> = {
  idle: <Sparkles className="h-5 w-5" />,
  crawl: <Search className="h-5 w-5 animate-pulse" />,
  analysis: <FileSearch className="h-5 w-5 animate-pulse" />,
  apply: <Wrench className="h-5 w-5 animate-pulse" />,
  complete: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
};

export function AutoOptimizeButton({
  storeId,
  storeName,
  storeStatus,
}: AutoOptimizeButtonProps) {
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<AutoSEOResult | null>(null);

  // Options
  const [autoApply, setAutoApply] = useState(true);
  const [maxPages, setMaxPages] = useState(100);
  const [priorityThreshold, setPriorityThreshold] = useState<"all" | "high" | "high_medium">("high_medium");
  const [schedule, setSchedule] = useState<"daily" | "weekly" | "monthly" | "disabled">("disabled");

  // Poll for status updates during run
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      interval = setInterval(async () => {
        const { data } = await getLatestAutoSEOStatus(storeId);
        if (data) {
          setProgress(data.progress);
          setStatusMessage(data.lastMessage);

          if (data.currentStage) {
            setCurrentStage(data.currentStage as Stage);
          }

          if (data.status === "completed" && data.result) {
            setResult(data.result);
            setIsRunning(false);
            setCurrentStage("complete");
          } else if (data.status === "failed") {
            setIsRunning(false);
            setCurrentStage("error");
          }
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, storeId]);

  const handleRunOptimization = async () => {
    if (storeStatus !== "connected") {
      toast.error("Store not connected", {
        description: "Please connect the WordPress plugin first.",
      });
      return;
    }

    setIsRunning(true);
    setCurrentStage("crawl");
    setProgress(0);
    setStatusMessage("Starting autonomous SEO optimization...");
    setResult(null);

    try {
      const optimizationResult = await runAutonomousSEO(storeId, {
        applyImprovements: autoApply,
        maxPagesToScan: maxPages,
        priorityThreshold,
      });

      setResult(optimizationResult);

      if (optimizationResult.success) {
        setCurrentStage("complete");
        toast.success("SEO Optimization Complete!", {
          description: `Applied ${optimizationResult.summary.improvementsApplied} improvements across ${optimizationResult.summary.pagesScanned} pages.`,
        });
      } else {
        setCurrentStage("error");
        toast.error("Optimization Failed", {
          description: optimizationResult.error || "An error occurred during optimization.",
        });
      }
    } catch (error) {
      setCurrentStage("error");
      toast.error("Optimization Failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleScheduleChange = async (value: typeof schedule) => {
    setSchedule(value);
    const result = await scheduleAutoSEO(storeId, value);
    if (result.success) {
      toast.success("Schedule Updated", {
        description: value === "disabled" ? "Automatic optimization disabled." : `Optimization will run ${value}.`,
      });
    } else {
      toast.error("Failed to update schedule", {
        description: result.error,
      });
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg"
          disabled={storeStatus !== "connected"}
        >
          <Zap className="mr-2 h-5 w-5" />
          Auto-Optimize SEO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Autonomous SEO Optimization
          </DialogTitle>
          <DialogDescription>
            Automatically scan, analyze, and fix SEO issues on {storeName}.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Display */}
        {(isRunning || result) && (
          <Card className={result?.success ? "border-green-500/50 bg-green-500/5" : result ? "border-red-500/50 bg-red-500/5" : "border-primary/50 bg-primary/5"}>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {stageIcons[currentStage]}
                    <span className="font-medium">{stageLabels[currentStage]}</span>
                  </div>
                  <Badge variant={isRunning ? "secondary" : result?.success ? "default" : "destructive"}>
                    {isRunning ? "Running" : result?.success ? "Success" : "Failed"}
                  </Badge>
                </div>

                {isRunning && (
                  <>
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground">{statusMessage}</p>
                  </>
                )}

                {result && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center p-3 rounded-lg bg-background/50">
                      <p className="text-2xl font-bold">{result.summary.pagesScanned}</p>
                      <p className="text-xs text-muted-foreground">Pages Scanned</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-background/50">
                      <p className="text-2xl font-bold">{result.summary.issuesFound}</p>
                      <p className="text-xs text-muted-foreground">Issues Found</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-background/50">
                      <p className="text-2xl font-bold text-green-500">{result.summary.improvementsApplied}</p>
                      <p className="text-xs text-muted-foreground">Fixes Applied</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-background/50">
                      <p className="text-2xl font-bold">{formatDuration(result.summary.duration)}</p>
                      <p className="text-xs text-muted-foreground">Duration</p>
                    </div>
                  </div>
                )}

                {result && result.stages.apply.errors && result.stages.apply.errors.length > 0 && (
                  <div className="pt-2">
                    <p className="text-sm font-medium text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Some improvements could not be applied:
                    </p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      {result.stages.apply.errors.slice(0, 3).map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                      {result.stages.apply.errors.length > 3 && (
                        <li>• ...and {result.stages.apply.errors.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Options */}
        {!isRunning && !result && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Optimization Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-apply">Auto-Apply Fixes</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically apply safe improvements to WordPress
                    </p>
                  </div>
                  <Switch
                    id="auto-apply"
                    checked={autoApply}
                    onCheckedChange={setAutoApply}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Maximum Pages to Scan</Label>
                  <Select
                    value={maxPages.toString()}
                    onValueChange={(v) => setMaxPages(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 pages</SelectItem>
                      <SelectItem value="50">50 pages</SelectItem>
                      <SelectItem value="100">100 pages</SelectItem>
                      <SelectItem value="200">200 pages</SelectItem>
                      <SelectItem value="500">500 pages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Apply Improvements with Priority</Label>
                  <Select
                    value={priorityThreshold}
                    onValueChange={(v) => setPriorityThreshold(v as typeof priorityThreshold)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High only</SelectItem>
                      <SelectItem value="high_medium">High & Medium</SelectItem>
                      <SelectItem value="all">All priorities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Scheduled Optimization
                </CardTitle>
                <CardDescription className="text-xs">
                  Run automatic optimization on a schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={schedule}
                  onValueChange={(v) => handleScheduleChange(v as typeof schedule)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="daily">Daily (3 AM)</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
              <p className="font-medium mb-1">What will be optimized:</p>
              <ul className="space-y-0.5">
                <li>• Missing or duplicate meta titles & descriptions</li>
                <li>• Missing H1 headings and heading structure</li>
                <li>• Images without alt text</li>
                <li>• Missing schema markup (Product, Article, FAQ)</li>
                <li>• Open Graph & social meta tags</li>
                <li>• Internal linking opportunities</li>
                <li>• Content freshness issues</li>
                <li>• And 20+ more SEO factors...</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {result && (
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setCurrentStage("idle");
                setProgress(0);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Again
            </Button>
          )}
          <Button
            onClick={handleRunOptimization}
            disabled={isRunning || storeStatus !== "connected"}
            className="bg-gradient-to-r from-primary to-purple-600"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : result ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                View Results
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Start Optimization
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
