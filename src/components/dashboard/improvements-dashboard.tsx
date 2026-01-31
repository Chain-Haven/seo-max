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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Shield,
  Bug,
  Gauge,
  Sparkles,
  GitCommit,
  Activity,
  Settings,
  Code,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import {
  runImprovementCycle,
  type SystemHealthMetrics,
  type ImprovementTask,
} from "@/lib/actions/continuous-improvement";

interface Props {
  health: SystemHealthMetrics | null;
  queue: ImprovementTask[];
  history: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    completedAt: string | null;
    commitSha: string | null;
  }>;
}

export function ImprovementsDashboard({ health, queue, history }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<{
    tasksDetected: number;
    tasksExecuted: number;
    tasksCompleted: number;
    details: Array<{
      task: string;
      status: string;
      commitSha?: string;
      error?: string;
    }>;
  } | null>(null);

  const handleRunCycle = async () => {
    setIsRunning(true);
    setRunResult(null);

    try {
      toast.info("Starting improvement cycle... This may take several minutes.");

      const result = await runImprovementCycle({
        maxTasks: 3,
        minPriority: "medium",
      });

      setRunResult({
        tasksDetected: result.tasksDetected,
        tasksExecuted: result.tasksExecuted,
        tasksCompleted: result.tasksCompleted,
        details: result.details,
      });

      if (result.tasksCompleted > 0) {
        toast.success(`Completed ${result.tasksCompleted} improvements!`);
      } else if (result.tasksExecuted > 0) {
        toast.info("Cycle complete. No changes needed at this time.");
      } else {
        toast.info("No improvements to make right now.");
      }
    } catch (error) {
      toast.error("Error running improvement cycle");
    } finally {
      setIsRunning(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug_fix": return <Bug className="h-4 w-4" />;
      case "performance": return <Gauge className="h-4 w-4" />;
      case "security": return <Shield className="h-4 w-4" />;
      case "ux": return <Sparkles className="h-4 w-4" />;
      case "code_quality": return <Code className="h-4 w-4" />;
      case "feature": return <Zap className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "bug_fix": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "performance": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "security": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "ux": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "code_quality": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400";
      case "feature": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "skipped": return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Run Improvement Cycle */}
      <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Continuous Improvement Engine
          </CardTitle>
          <CardDescription>
            AI automatically detects issues, prioritizes improvements, and implements fixes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleRunCycle}
              disabled={isRunning}
              className="bg-gradient-to-r from-primary to-purple-600"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Cycle...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Run Improvement Cycle
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              Runs automatically daily at 1 AM UTC
            </span>
          </div>

          {/* Run Results */}
          {runResult && (
            <div className="mt-4 p-4 border rounded-lg bg-background">
              <h4 className="font-medium mb-2">Cycle Results</h4>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{runResult.tasksDetected}</p>
                  <p className="text-xs text-muted-foreground">Detected</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{runResult.tasksExecuted}</p>
                  <p className="text-xs text-muted-foreground">Attempted</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{runResult.tasksCompleted}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
              {runResult.details.length > 0 && (
                <div className="space-y-2">
                  {runResult.details.map((detail, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                      <span>{detail.task}</span>
                      <div className="flex items-center gap-2">
                        {detail.status === "completed" && (
                          <Badge className="bg-green-100 text-green-800">Completed</Badge>
                        )}
                        {detail.status === "failed" && (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                        {detail.status === "skipped" && (
                          <Badge variant="secondary">Skipped</Badge>
                        )}
                        {detail.commitSha && (
                          <code className="text-xs bg-muted px-1 rounded">{detail.commitSha.substring(0, 7)}</code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Metrics */}
      {health && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Error Rate (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.errorRate}</div>
              <p className="text-xs text-muted-foreground">errors detected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{health.pendingTasks}</div>
              <p className="text-xs text-muted-foreground">in queue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{health.completedToday}</div>
              <p className="text-xs text-muted-foreground">improvements</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Last Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {health.lastImprovement
                  ? new Date(health.lastImprovement).toLocaleDateString()
                  : "Never"}
              </div>
              <p className="text-xs text-muted-foreground">
                {health.lastImprovement
                  ? new Date(health.lastImprovement).toLocaleTimeString()
                  : "No improvements yet"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Improvement Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Improvement Queue ({queue.length})
          </CardTitle>
          <CardDescription>
            Pending improvements prioritized by importance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No improvements pending. The system is running smoothly!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detected By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.slice(0, 10).map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Badge className={getTypeColor(task.type)}>
                        {getTypeIcon(task.type)}
                        <span className="ml-1">{task.type.replace("_", " ")}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(task.status)}
                        <span className="text-sm capitalize">{task.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {task.detectedBy.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Improvement History
          </CardTitle>
          <CardDescription>
            Recent autonomous improvements made to the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No improvements have been made yet.
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 15).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 border rounded ${
                    item.status === "completed"
                      ? "border-green-500/30 bg-green-50 dark:bg-green-900/10"
                      : item.status === "failed"
                      ? "border-red-500/30 bg-red-50 dark:bg-red-900/10"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getTypeColor(item.type)} variant="secondary">
                          {item.type.replace("_", " ")}
                        </Badge>
                        {item.completedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {item.commitSha && (
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {item.commitSha.substring(0, 7)}
                    </code>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
