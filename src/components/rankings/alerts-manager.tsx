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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Loader2,
  Plus,
  Trash2,
  Bell,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Trophy,
  XCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  createKeywordAlert,
  deleteKeywordAlert,
  getKeywordAlerts,
} from "@/lib/actions/rank-tracking";
import type { KeywordAlert, AlertHistoryItem } from "@/lib/serp/types";

interface AlertsManagerProps {
  storeId: string;
  initialAlerts: AlertHistoryItem[];
}

const ALERT_TYPES = [
  { value: "rank_drop", label: "Rank Drop", icon: TrendingDown, description: "Alert when position drops by X positions" },
  { value: "rank_gain", label: "Rank Gain", icon: TrendingUp, description: "Alert when position improves by X positions" },
  { value: "lost_top_10", label: "Lost Top 10", icon: XCircle, description: "Alert when keyword drops out of top 10" },
  { value: "entered_top_10", label: "Entered Top 10", icon: Trophy, description: "Alert when keyword enters top 10" },
  { value: "lost_first_page", label: "Lost Ranking", icon: AlertTriangle, description: "Alert when keyword stops ranking entirely" },
  { value: "new_ranking", label: "New Ranking", icon: Sparkles, description: "Alert when keyword starts ranking" },
];

export function AlertsManager({ storeId, initialAlerts }: AlertsManagerProps) {
  const [alerts, setAlerts] = useState<KeywordAlert[]>([]);
  const [alertHistory] = useState(initialAlerts);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Create alert state
  const [newAlertType, setNewAlertType] = useState<string>("");
  const [newThreshold, setNewThreshold] = useState(5);
  const [emailNotification, setEmailNotification] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Load alerts on mount
  useState(() => {
    loadAlerts();
  });

  const loadAlerts = async () => {
    setIsLoading(true);
    const result = await getKeywordAlerts(storeId);
    if (result.data) {
      setAlerts(result.data);
    }
    setIsLoading(false);
  };

  const handleCreateAlert = async () => {
    if (!newAlertType) {
      toast.error("Please select an alert type");
      return;
    }

    setIsCreating(true);
    const result = await createKeywordAlert(storeId, {
      alertType: newAlertType as KeywordAlert["alertType"],
      threshold: newThreshold,
      emailNotification,
    });

    if (result.data) {
      setAlerts((prev) => [...prev, result.data!]);
      setIsCreateDialogOpen(false);
      setNewAlertType("");
      setNewThreshold(5);
      toast.success("Alert created");
    } else {
      toast.error(result.error || "Failed to create alert");
    }
    setIsCreating(false);
  };

  const handleDeleteAlert = async (alertId: string) => {
    const result = await deleteKeywordAlert(alertId);
    if (result.success) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success("Alert deleted");
    } else {
      toast.error(result.error || "Failed to delete alert");
    }
  };

  const getAlertTypeInfo = (type: string) => {
    return ALERT_TYPES.find((t) => t.value === type);
  };

  return (
    <div className="space-y-6">
      {/* Alert History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Alerts
              </CardTitle>
              <CardDescription>
                Notifications about ranking changes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {alertHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto opacity-50" />
              <p className="mt-4">No alerts yet. Configure alerts below to start receiving notifications.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertHistory.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${alert.isRead ? "bg-muted/30" : "bg-primary/5 border-primary"}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!alert.isRead && <Badge>New</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alert Settings</CardTitle>
              <CardDescription>
                Configure when to receive ranking notifications
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Alert
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Alert</DialogTitle>
                  <DialogDescription>
                    Get notified when keyword rankings change
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Alert Type</Label>
                    <Select value={newAlertType} onValueChange={setNewAlertType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select alert type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ALERT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newAlertType && (
                      <p className="text-xs text-muted-foreground">
                        {getAlertTypeInfo(newAlertType)?.description}
                      </p>
                    )}
                  </div>

                  {(newAlertType === "rank_drop" || newAlertType === "rank_gain") && (
                    <div className="space-y-2">
                      <Label>Threshold (positions)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(parseInt(e.target.value) || 5)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Alert when position changes by at least {newThreshold} positions
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive alerts via email
                      </p>
                    </div>
                    <Switch
                      checked={emailNotification}
                      onCheckedChange={setEmailNotification}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAlert} disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Alert
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No alerts configured. Add an alert to get notified of ranking changes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const typeInfo = getAlertTypeInfo(alert.alertType);
                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {typeInfo && <typeInfo.icon className="h-5 w-5 text-muted-foreground" />}
                      <div>
                        <p className="font-medium">{typeInfo?.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {(alert.alertType === "rank_drop" || alert.alertType === "rank_gain") &&
                            `Threshold: ${alert.threshold} positions`}
                          {alert.emailNotification && " • Email enabled"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.isActive ? "default" : "secondary"}>
                        {alert.isActive ? "Active" : "Paused"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
