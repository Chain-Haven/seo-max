"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { type BillingPlan, formatPrice } from "@/lib/billing/plans";

interface BillingOverviewProps {
  plan: BillingPlan | undefined;
  usage: {
    stores: number;
    blogPostsThisMonth: number;
    aiGenerationsThisMonth: number;
  };
  organizationId: string;
  isOwner: boolean;
}

export function BillingOverview({
  plan,
  usage,
  organizationId,
  isOwner,
}: BillingOverviewProps) {
  if (!plan) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No billing plan configured</p>
        </CardContent>
      </Card>
    );
  }

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  nextBillingDate.setDate(1);

  const storeUsagePercent =
    plan.limits.stores === -1
      ? 0
      : Math.min(100, (usage.stores / plan.limits.stores) * 100);

  const aiUsagePercent =
    plan.limits.aiGenerationsPerMonth === -1
      ? 0
      : Math.min(
          100,
          (usage.aiGenerationsThisMonth / plan.limits.aiGenerationsPerMonth) * 100
        );

  const blogUsagePercent =
    plan.limits.blogPostsPerMonth === -1
      ? 0
      : Math.min(
          100,
          (usage.blogPostsThisMonth / plan.limits.blogPostsPerMonth) * 100
        );

  const isNearingLimit = storeUsagePercent > 80 || aiUsagePercent > 80 || blogUsagePercent > 80;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>Your active subscription</CardDescription>
            </div>
            {isOwner && (
              <Link href="/dashboard/billing?tab=plans">
                <Button variant="outline">Change Plan</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                {plan.popular && <Badge>Most Popular</Badge>}
              </div>
              <p className="text-muted-foreground mt-1">{plan.description}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatPrice(plan.priceMonthly)}</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Next billing: {nextBillingDate.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              {isNearingLimit ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-600">Nearing usage limits</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">All systems normal</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Usage Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{usage.stores}</span>
              <span className="text-muted-foreground">
                / {plan.limits.stores === -1 ? "∞" : plan.limits.stores}
              </span>
            </div>
            {plan.limits.stores !== -1 && (
              <Progress value={storeUsagePercent} className="mt-2 h-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {usage.aiGenerationsThisMonth}
              </span>
              <span className="text-muted-foreground">
                /{" "}
                {plan.limits.aiGenerationsPerMonth === -1
                  ? "∞"
                  : plan.limits.aiGenerationsPerMonth.toLocaleString()}
              </span>
            </div>
            {plan.limits.aiGenerationsPerMonth !== -1 && (
              <Progress value={aiUsagePercent} className="mt-2 h-2" />
            )}
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{usage.blogPostsThisMonth}</span>
              <span className="text-muted-foreground">
                /{" "}
                {plan.limits.blogPostsPerMonth === -1
                  ? "∞"
                  : plan.limits.blogPostsPerMonth}
              </span>
            </div>
            {plan.limits.blogPostsPerMonth !== -1 && (
              <Progress value={blogUsagePercent} className="mt-2 h-2" />
            )}
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 md:grid-cols-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
