"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface WhiteLabelSettings {
  id: string;
  organizationId: string;
  companyName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  footerText: string | null;
}

// Get white label settings
export async function getWhiteLabelSettings(
  organizationId: string
): Promise<{ data: WhiteLabelSettings | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("white_label_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  if (error && error.code !== "PGRST116") {
    return { data: null, error: error.message };
  }

  if (!data) {
    // Return defaults
    return {
      data: {
        id: "",
        organizationId,
        companyName: null,
        logoUrl: null,
        primaryColor: "#0066FF",
        secondaryColor: "#1a1a1a",
        customDomain: null,
        emailFromName: null,
        emailFromAddress: null,
        footerText: null,
      },
      error: null,
    };
  }

  return {
    data: {
      id: data.id,
      organizationId: data.organization_id,
      companyName: data.company_name,
      logoUrl: data.logo_url,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      customDomain: data.custom_domain,
      emailFromName: data.email_from_name,
      emailFromAddress: data.email_from_address,
      footerText: data.footer_text,
    },
    error: null,
  };
}

// Update white label settings
export async function updateWhiteLabelSettings(
  organizationId: string,
  settings: Partial<{
    companyName: string;
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    customDomain: string;
    emailFromName: string;
    emailFromAddress: string;
    footerText: string;
  }>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (settings.companyName !== undefined) updateData.company_name = settings.companyName;
  if (settings.logoUrl !== undefined) updateData.logo_url = settings.logoUrl;
  if (settings.primaryColor !== undefined) updateData.primary_color = settings.primaryColor;
  if (settings.secondaryColor !== undefined) updateData.secondary_color = settings.secondaryColor;
  if (settings.customDomain !== undefined) updateData.custom_domain = settings.customDomain;
  if (settings.emailFromName !== undefined) updateData.email_from_name = settings.emailFromName;
  if (settings.emailFromAddress !== undefined) updateData.email_from_address = settings.emailFromAddress;
  if (settings.footerText !== undefined) updateData.footer_text = settings.footerText;
  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("white_label_settings")
    .upsert({
      organization_id: organizationId,
      ...updateData,
    })
    .eq("organization_id", organizationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true, error: null };
}

// Generate CSS variables for white label
export function generateWhiteLabelCSS(settings: WhiteLabelSettings): string {
  return `
:root {
  --wl-primary: ${settings.primaryColor};
  --wl-secondary: ${settings.secondaryColor};
}
  `.trim();
}

// Check custom domain availability
export async function checkCustomDomain(
  domain: string
): Promise<{ available: boolean; error: string | null }> {
  // Basic validation
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return { available: false, error: "Invalid domain format" };
  }

  const supabase = await createClient();

  // Check if domain is already in use
  const { data } = await supabase
    .from("white_label_settings")
    .select("id")
    .eq("custom_domain", domain)
    .single();

  return {
    available: !data,
    error: data ? "Domain is already in use" : null,
  };
}
