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
  DollarSign,
  Loader2,
  TrendingUp,
  RefreshCw,
  BarChart3,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { calculateTrafficValueAction } from "@/lib/actions/advanced-seo";

interface TrafficValueDashboardProps {
  storeId: string;
  valueHistory: Array<{
    month: string;
    organic_sessions: number;
    estimated_value: number;
    top_keywords: Array<{ keyword: string; monthlyValue: number }>;
    calculation_details: {
      valueByIntent: {
        transactional: number;
        commercial: number;
        informational: number;
        navigational: number;
      };
      recommendations: string[];
    };
  }>;
  keywords: Array<{
    keyword: string;
    current_position: number | null;
    search_volume: number | null;
  }>;
}

export function TrafficValueDashboard({
  storeId,
  valueHistory,
  keywords,
}: TrafficValueDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentValue, setCurrentValue] = useState(
    valueHistory.length > 0 ? valueHistory[valueHistory.length - 1] : null
  );

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const result = await calculateTrafficValueAction(storeId);
      if (result.data) {
        toast.success(`Traffic value: $${result.data.estimatedMonthlyValue}/month`);
        // Refresh to get updated data
        window.location.reload();
      } else {
        toast.error(result.error || "Calculation failed");
      }
    } catch {
      toast.error("Calculation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const latestValue = currentValue?.estimated_value || 0;
  const latestTraffic = currentValue?.organic_sessions || 0;
  const valueByIntent = currentValue?.calculation_details?.valueByIntent;
  const recommendations = currentValue?.calculation_details?.recommendations || [];
  const topKeywords = currentValue?.top_keywords || [];

  // Calculate growth from history
  let growth = 0;
  if (valueHistory.length >= 2) {
    const prev = valueHistory[valueHistory.length - 2].estimated_value;
    const curr = valueHistory[valueHistory.length - 1].estimated_value;
    growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  }

  // Total value by intent
  const totalIntentValue = valueByIntent
    ? valueByIntent.transactional + valueByIntent.commercial + valueByIntent.informational + valueByIntent.navigational
    : 0;

  return (
    <div className="space-y-6">
      {/* Main Value Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(latestValue)}
                </div>
                <div className="text-sm text-muted-foreground">Monthly Traffic Value</div>
              </div>
            </div>
            {growth !== 0 && (
              <div className={`mt-2 text-sm ${growth > 0 ? "text-green-600" : "text-red-600"}`}>
                {growth > 0 ? "+" : ""}{growth.toFixed(1)}% from last month
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-3xl font-bold">{latestTraffic.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Estimated Monthly Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-3xl font-bold">{keywords.length}</div>
                <div className="text-sm text-muted-foreground">Tracked Keywords</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculate Button */}
      <Card>
        <CardHeader>
          <CardTitle>Calculate Traffic Value</CardTitle>
          <CardDescription>
            Estimate the monetary value of your organic search traffic based on keyword positions and search volumes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCalculate} disabled={isLoading || keywords.length === 0}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {keywords.length === 0 ? "Add tracked keywords first" : "Calculate Value"}
          </Button>
        </CardContent>
      </Card>

      {/* Value by Intent */}
      {valueByIntent && totalIntentValue > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Value by Search Intent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>💰 Transactional</span>
                <span>{formatCurrency(valueByIntent.transactional)}</span>
              </div>
              <Progress
                value={(valueByIntent.transactional / totalIntentValue) * 100}
                className="h-2 bg-green-100"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>🛒 Commercial</span>
                <span>{formatCurrency(valueByIntent.commercial)}</span>
              </div>
              <Progress
                value={(valueByIntent.commercial / totalIntentValue) * 100}
                className="h-2 bg-blue-100"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>📚 Informational</span>
                <span>{formatCurrency(valueByIntent.informational)}</span>
              </div>
              <Progress
                value={(valueByIntent.informational / totalIntentValue) * 100}
                className="h-2 bg-purple-100"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>🧭 Navigational</span>
                <span>{formatCurrency(valueByIntent.navigational)}</span>
              </div>
              <Progress
                value={(valueByIntent.navigational / totalIntentValue) * 100}
                className="h-2 bg-gray-100"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Growth Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Top Keywords by Value */}
      {topKeywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Keywords by Value</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Monthly Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topKeywords.slice(0, 10).map((kw, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell className="text-right">{formatCurrency(kw.monthlyValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Value History Chart (Simplified) */}
      {valueHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Value Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {valueHistory.map((item, i) => {
                const maxValue = Math.max(...valueHistory.map((v) => v.estimated_value));
                const height = maxValue > 0 ? (item.estimated_value / maxValue) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-green-500 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">
                      {new Date(item.month).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {keywords.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No tracked keywords yet</p>
              <p className="text-sm">Add keywords to track their value</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
