"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface StatItem {
  label: string;
  value: number;
  total?: number;
  description?: string;
}

interface SEOStatsProps {
  items: StatItem[];
}

export function SEOStats({ items }: SEOStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const percentage = item.total
          ? Math.round((item.value / item.total) * 100)
          : null;

        return (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </p>
                {percentage !== null && (
                  <span
                    className={`text-xs font-medium ${
                      percentage >= 80
                        ? "text-green-600"
                        : percentage >= 50
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {percentage}%
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-2xl font-bold">{item.value}</p>
                {item.total !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    / {item.total}
                  </p>
                )}
              </div>
              {percentage !== null && (
                <Progress value={percentage} className="mt-3 h-1.5" />
              )}
              {item.description && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.description}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
