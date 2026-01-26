"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Store,
  Sparkles,
  FileText,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { type BillingPlan } from "@/lib/billing/plans";

interface UsageStatsProps {
  plan: BillingPlan | undefined;
  usage: {
    stores: number;
    blogPostsThisMonth: number;
    aiGenerationsThisMonth: number;
  };
}

export function UsageStats({ plan, usage }: UsageStatsProps) {
  if (!plan) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No billing plan configured</p>
        </CardContent>
      </Card>
    );
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const usageItems = [
    {
      label: "Connected Stores",
      icon: Store,
      used: usage.stores,
      limit: plan.limits.stores,
      description: "WooCommerce/WordPress stores connected to your account",
    },
    {
      label: "AI Generations",
      icon: Sparkles,
      used: usage.aiGenerationsThisMonth,
      limit: plan.limits.aiGenerationsPerMonth,
      description: "Meta titles, descriptions, and content generations",
      period: "this month",
    },
    {
      label: "Blog Posts",
      icon: FileText,
      used: usage.blogPostsThisMonth,
      limit: plan.limits.blogPostsPerMonth,
      description: "AI-generated blog posts created",
      period: "this month",
    },
  ];

  // Calculate days remaining in billing period
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = endOfMonth.getDate() - now.getDate();

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Summary
          </CardTitle>
          <CardDescription>
            Your resource usage for the current billing period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Billing Period</p>
              <p className="font-medium">
                {new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString()} -{" "}
                {endOfMonth.toLocaleDateString()}
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {daysRemaining} days remaining
            </Badge>
          </div>

          <div className="space-y-6">
            {usageItems.map((item) => {
              const percentage = getUsagePercentage(item.used, item.limit);
              const isUnlimited = item.limit === -1;
              const isNearLimit = percentage >= 75;

              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                      {item.period && (
                        <Badge variant="secondary" className="text-xs">
                          {item.period}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isNearLimit && !isUnlimited && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="font-mono text-sm">
                        {item.used.toLocaleString()}
                        {!isUnlimited && (
                          <span className="text-muted-foreground">
                            {" "}
                            / {item.limit.toLocaleString()}
                          </span>
                        )}
                        {isUnlimited && (
                          <span className="text-muted-foreground"> / ∞</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {!isUnlimited && (
                    <div className="relative">
                      <Progress
                        value={percentage}
                        className={`h-2 ${getUsageColor(percentage)}`}
                      />
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Usage Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>
                AI generations reset on the 1st of each month. Unused generations
                don&apos;t roll over.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>
                Each blog post creation typically uses 3 AI generations (topic,
                outline, content).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>
                Upgrade your plan anytime to get more resources instantly.
              </span>
            </li>
            {usage.aiGenerationsThisMonth > plan.limits.aiGenerationsPerMonth * 0.75 && (
              <li className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>
                  You&apos;re approaching your AI generation limit. Consider upgrading
                  to avoid interruption.
                </span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
