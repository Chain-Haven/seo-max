import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationBilling, getBillingPlans } from "@/lib/actions/billing";
import { BillingOverview } from "@/components/billing/billing-overview";
import { PlanSelector } from "@/components/billing/plan-selector";
import { InvoiceHistory } from "@/components/billing/invoice-history";
import { UsageStats } from "@/components/billing/usage-stats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Receipt, BarChart3, Settings } from "lucide-react";

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/dashboard");
  }

  const { data: billingData, error } = await getOrganizationBilling(
    membership.organization_id
  );

  if (error || !billingData) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Failed to load billing information</p>
      </div>
    );
  }

  const plans = await getBillingPlans();
  const isOwner = membership.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <CreditCard className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Settings className="mr-2 h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="usage">
            <BarChart3 className="mr-2 h-4 w-4" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="mr-2 h-4 w-4" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <BillingOverview
            plan={billingData.plan}
            usage={billingData.usage}
            organizationId={membership.organization_id}
            isOwner={isOwner}
          />
        </TabsContent>

        <TabsContent value="plans">
          <PlanSelector
            plans={plans}
            currentPlanId={billingData.planId}
            organizationId={membership.organization_id}
            isOwner={isOwner}
          />
        </TabsContent>

        <TabsContent value="usage">
          <UsageStats
            plan={billingData.plan}
            usage={billingData.usage}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceHistory
            invoices={billingData.billingRecords}
            organizationId={membership.organization_id}
            isOwner={isOwner}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
