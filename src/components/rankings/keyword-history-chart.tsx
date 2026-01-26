"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KeywordRankingHistory } from "@/lib/serp/types";

interface KeywordHistoryChartProps {
  data: KeywordRankingHistory[];
}

export function KeywordHistoryChart({ data }: KeywordHistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No ranking data available
      </div>
    );
  }

  // Get min and max positions for scaling
  const positions = data
    .map((d) => d.position)
    .filter((p): p is number => p !== null);
  
  const minPos = Math.min(...positions, 1);
  const maxPos = Math.max(...positions, 100);
  const range = maxPos - minPos || 1;

  // Calculate chart dimensions
  const chartHeight = 200;
  const chartWidth = "100%";
  const padding = 40;

  // Generate path for line chart
  const getY = (position: number | null) => {
    if (position === null) return chartHeight;
    // Invert so lower positions are higher on chart
    return padding + ((position - minPos) / range) * (chartHeight - padding * 2);
  };

  // Create path string
  const pathPoints = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const y = getY(d.position);
      return `${i === 0 ? "M" : "L"} ${x}% ${y}`;
    })
    .join(" ");

  // Get latest and first positions
  const firstPosition = data[0]?.position;
  const latestPosition = data[data.length - 1]?.position;
  const totalChange = firstPosition && latestPosition ? firstPosition - latestPosition : 0;

  // Find best and worst positions
  const bestPosition = positions.length > 0 ? Math.min(...positions) : null;
  const worstPosition = positions.length > 0 ? Math.max(...positions) : null;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-2xl font-bold">
              {latestPosition !== null ? `#${latestPosition}` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Best</p>
            <p className="text-2xl font-bold text-green-500">
              {bestPosition !== null ? `#${bestPosition}` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Worst</p>
            <p className="text-2xl font-bold text-red-500">
              {worstPosition !== null ? `#${worstPosition}` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">30d Change</p>
            <p className={`text-2xl font-bold ${totalChange > 0 ? "text-green-500" : totalChange < 0 ? "text-red-500" : ""}`}>
              {totalChange > 0 ? `+${totalChange}` : totalChange}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative" style={{ height: chartHeight, width: chartWidth }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-xs text-muted-foreground">
              <span>#{minPos}</span>
              <span>#{Math.round((minPos + maxPos) / 2)}</span>
              <span>#{maxPos}</span>
            </div>

            {/* Grid lines */}
            <svg className="absolute inset-0 ml-10" style={{ width: "calc(100% - 40px)" }}>
              {/* Horizontal grid lines */}
              {[0, 0.5, 1].map((ratio, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={`${padding + ratio * (chartHeight - padding * 2)}px`}
                  x2="100%"
                  y2={`${padding + ratio * (chartHeight - padding * 2)}px`}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                />
              ))}

              {/* Line chart */}
              <path
                d={pathPoints}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {data.map((d, i) => {
                if (d.position === null) return null;
                const x = (i / (data.length - 1 || 1)) * 100;
                const y = getY(d.position);
                return (
                  <circle
                    key={i}
                    cx={`${x}%`}
                    cy={y}
                    r="4"
                    fill="hsl(var(--primary))"
                    className="hover:r-6 cursor-pointer"
                  >
                    <title>
                      {new Date(d.checkedAt).toLocaleDateString()}: #{d.position}
                    </title>
                  </circle>
                );
              })}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-muted-foreground mt-2 ml-10">
            <span>{new Date(data[0]?.checkedAt).toLocaleDateString()}</span>
            <span>{new Date(data[data.length - 1]?.checkedAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Position</th>
                  <th className="text-left py-2">Change</th>
                  <th className="text-left py-2">Features</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().slice(0, 10).map((item) => {
                  const change = item.previousPosition && item.position
                    ? item.previousPosition - item.position
                    : 0;
                  return (
                    <tr key={item.id} className="border-t">
                      <td className="py-2">{new Date(item.checkedAt).toLocaleDateString()}</td>
                      <td className="py-2">
                        {item.position !== null ? `#${item.position}` : "-"}
                      </td>
                      <td className="py-2">
                        {change > 0 && <span className="text-green-500">+{change}</span>}
                        {change < 0 && <span className="text-red-500">{change}</span>}
                        {change === 0 && <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          {item.featuredSnippet && (
                            <Badge variant="outline" className="text-xs">Featured</Badge>
                          )}
                          {item.localPack && (
                            <Badge variant="outline" className="text-xs">Local</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
