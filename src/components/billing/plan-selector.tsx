"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { type BillingPlan, formatPrice } from "@/lib/billing/plans";
import { updateBillingPlan } from "@/lib/actions/billing";

interface PlanSelectorProps {
  plans: BillingPlan[];
  currentPlanId: string;
  organizationId: string;
  isOwner: boolean;
}

export function PlanSelector({
  plans,
  currentPlanId,
  organizationId,
  isOwner,
}: PlanSelectorProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (!isOwner) {
      toast.error("Only organization owners can change the billing plan");
      return;
    }

    if (planId === currentPlanId) {
      toast.info("This is your current plan");
      return;
    }

    setIsLoading(planId);
    try {
      const result = await updateBillingPlan(organizationId, planId);
      if (result.success) {
        toast.success(`Switched to ${result.plan?.name} plan`);
      } else {
        toast.error(result.error || "Failed to update plan");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing Period Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="billing-period" className={!isYearly ? "font-semibold" : ""}>
          Monthly
        </Label>
        <Switch
          id="billing-period"
          checked={isYearly}
          onCheckedChange={setIsYearly}
        />
        <Label htmlFor="billing-period" className={isYearly ? "font-semibold" : ""}>
          Yearly
          <Badge variant="secondary" className="ml-2">
            Save 20%
          </Badge>
        </Label>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const price = isYearly ? plan.priceYearly : plan.priceMonthly;
          const monthlyEquivalent = isYearly ? plan.priceYearly / 12 : plan.priceMonthly;

          return (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular ? "border-primary shadow-lg" : ""
              } ${isCurrent ? "bg-primary/5" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-4xl font-bold">
                    {formatPrice(monthlyEquivalent)}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                  {isYearly && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatPrice(price)} billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4 border-t space-y-1 text-xs text-muted-foreground">
                  <p>
                    {plan.limits.stores === -1
                      ? "Unlimited"
                      : plan.limits.stores}{" "}
                    store{plan.limits.stores !== 1 ? "s" : ""}
                  </p>
                  <p>
                    {plan.limits.aiGenerationsPerMonth === -1
                      ? "Unlimited"
                      : plan.limits.aiGenerationsPerMonth.toLocaleString()}{" "}
                    AI generations/mo
                  </p>
                  <p>
                    {plan.limits.blogPostsPerMonth === -1
                      ? "Unlimited"
                      : plan.limits.blogPostsPerMonth}{" "}
                    blog posts/mo
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                  disabled={isCurrent || isLoading !== null || !isOwner}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isLoading === plan.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isCurrent ? "Current Plan" : "Select Plan"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {!isOwner && (
        <p className="text-center text-sm text-muted-foreground">
          Only organization owners can change the billing plan
        </p>
      )}
    </div>
  );
}
