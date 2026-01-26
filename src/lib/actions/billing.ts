"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getMercuryClient, type MercuryLineItem } from "@/lib/billing/mercury";
import { BILLING_PLANS, getPlanById, formatPrice } from "@/lib/billing/plans";

// Get organization billing info
export async function getOrganizationBilling(organizationId: string) {
  const supabase = await createClient();

  // Get organization with billing settings
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, settings")
    .eq("id", organizationId)
    .single();

  if (error || !org) {
    return { data: null, error: error?.message || "Organization not found" };
  }

  const settings = (org.settings as Record<string, unknown>) || {};
  const planId = (settings.billing_plan as string) || "starter";
  const plan = getPlanById(planId);

  // Get billing records
  const { data: records } = await supabase
    .from("billing_records")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(12);

  // Calculate current month usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: storeCount } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  // Get AI generation count from usage logs (if we had them)
  // For now, we'll estimate from blog posts created this month
  const { count: blogPostsThisMonth } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfMonth.toISOString());

  return {
    data: {
      organization: org,
      plan,
      planId,
      billingRecords: records || [],
      usage: {
        stores: storeCount || 0,
        blogPostsThisMonth: blogPostsThisMonth || 0,
        aiGenerationsThisMonth: (blogPostsThisMonth || 0) * 3, // Estimate: 3 AI calls per post
      },
      mercuryRecipientId: settings.mercury_recipient_id as string | null,
    },
    error: null,
  };
}

// Update organization billing plan
export async function updateBillingPlan(organizationId: string, planId: string) {
  const supabase = await createClient();

  const plan = getPlanById(planId);
  if (!plan) {
    return { success: false, error: "Invalid plan" };
  }

  // Get current settings
  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  const currentSettings = (org?.settings as Record<string, unknown>) || {};

  // Update settings with new plan
  const { error } = await supabase
    .from("organizations")
    .update({
      settings: {
        ...currentSettings,
        billing_plan: planId,
        billing_plan_updated_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/billing");
  return { success: true, plan };
}

// Set up billing recipient in Mercury
export async function setupBillingRecipient(
  organizationId: string,
  billingInfo: {
    name: string;
    email: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  }
) {
  const mercury = getMercuryClient();
  if (!mercury) {
    // If Mercury is not configured, just save locally
    const supabase = await createClient();

    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", organizationId)
      .single();

    const currentSettings = (org?.settings as Record<string, unknown>) || {};

    await supabase
      .from("organizations")
      .update({
        settings: {
          ...currentSettings,
          billing_name: billingInfo.name,
          billing_email: billingInfo.email,
          billing_address: billingInfo.address,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId);

    return { success: true, recipientId: null };
  }

  // Create recipient in Mercury
  const result = await mercury.createRecipient({
    name: billingInfo.name,
    email: billingInfo.email,
    address: billingInfo.address,
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  // Save recipient ID to organization
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  const currentSettings = (org?.settings as Record<string, unknown>) || {};

  await supabase
    .from("organizations")
    .update({
      settings: {
        ...currentSettings,
        mercury_recipient_id: result.data.id,
        billing_name: billingInfo.name,
        billing_email: billingInfo.email,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  revalidatePath("/dashboard/billing");
  return { success: true, recipientId: result.data.id };
}

// Generate an invoice
export async function generateInvoice(
  organizationId: string,
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
    customLineItems?: MercuryLineItem[];
  }
) {
  const supabase = await createServiceClient();

  // Get organization billing info
  const { data: org } = await supabase
    .from("organizations")
    .select("name, settings")
    .eq("id", organizationId)
    .single();

  if (!org) {
    return { success: false, error: "Organization not found" };
  }

  const settings = (org.settings as Record<string, unknown>) || {};
  const planId = (settings.billing_plan as string) || "starter";
  const plan = getPlanById(planId);

  if (!plan) {
    return { success: false, error: "No billing plan configured" };
  }

  // Calculate period
  const periodEnd = options?.periodEnd || new Date();
  const periodStart =
    options?.periodStart ||
    new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

  // Build line items
  const lineItems: MercuryLineItem[] = options?.customLineItems || [
    {
      description: `${plan.name} Plan - Monthly Subscription`,
      quantity: 1,
      unitPrice: plan.priceMonthly,
    },
  ];

  const total = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // Create billing record
  const { data: record, error: recordError } = await supabase
    .from("billing_records")
    .insert({
      organization_id: organizationId,
      amount: total,
      currency: "USD",
      status: "pending",
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      metadata: {
        plan_id: planId,
        line_items: lineItems,
      },
    })
    .select()
    .single();

  if (recordError) {
    return { success: false, error: recordError.message };
  }

  // If Mercury is configured and recipient exists, create invoice
  const mercury = getMercuryClient();
  const recipientId = settings.mercury_recipient_id as string | undefined;

  if (mercury && recipientId) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

    const invoiceResult = await mercury.createInvoice({
      recipientId,
      dueDate: dueDate.toISOString().split("T")[0],
      lineItems: lineItems.map((item) => ({
        ...item,
        total: item.quantity * item.unitPrice,
      })),
      notes: `Invoice for ${org.name} - ${plan.name} Plan`,
      memo: `Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
    });

    if (invoiceResult.success && invoiceResult.data) {
      // Update billing record with invoice ID
      await supabase
        .from("billing_records")
        .update({
          invoice_id: invoiceResult.data.id,
          metadata: {
            ...((record.metadata as object) || {}),
            mercury_invoice: invoiceResult.data,
          },
        })
        .eq("id", record.id);

      // Send the invoice
      await mercury.sendInvoice(invoiceResult.data.id!);
    }
  }

  revalidatePath("/dashboard/billing");
  return { success: true, record };
}

// Get invoices for organization
export async function getOrganizationInvoices(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("billing_records")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

// Update invoice status (called by webhook or manually)
export async function updateInvoiceStatus(
  invoiceId: string,
  status: "pending" | "paid" | "failed" | "refunded"
) {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("billing_records")
    .update({
      status,
      ...(status === "paid" ? { metadata: { paid_at: new Date().toISOString() } } : {}),
    })
    .eq("invoice_id", invoiceId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/billing");
  return { success: true };
}

// Get billing plans
export async function getBillingPlans() {
  return BILLING_PLANS;
}

// Track usage (AI generations)
export async function trackUsage(
  organizationId: string,
  type: "ai_generation" | "blog_post" | "sync",
  count: number = 1
) {
  const supabase = await createServiceClient();

  // For now, we'll just log this. In production, you'd want a dedicated usage table
  console.log(`Usage tracked: ${organizationId} - ${type} - ${count}`);

  return { success: true };
}
