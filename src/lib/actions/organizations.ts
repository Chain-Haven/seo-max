"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50) + "-" + Math.random().toString(36).substring(2, 8);
}

export async function createOrganization(name: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const slug = generateSlug(name);

  // Use service client to bypass RLS for organization creation
  // (user can't be a member of an org that doesn't exist yet)
  const serviceClient = await createServiceClient();

  // Verify service role key is available
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not set - cannot bypass RLS");
    return { error: "Server configuration error. Please contact support." };
  }

  // Create organization
  const { data: org, error: orgError } = await serviceClient
    .from("organizations")
    .insert({ name, slug })
    .select()
    .single();

  if (orgError) {
    console.error("Organization creation error:", orgError);
    return { error: orgError.message };
  }

  // Add user as owner (also use service client to bypass RLS)
  const { error: memberError } = await serviceClient
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    // Rollback org creation
    console.error("Member creation error:", memberError);
    await serviceClient.from("organizations").delete().eq("id", org.id);
    return { error: memberError.message };
  }

  revalidatePath("/dashboard");
  return { data: org };
}

export async function getUserOrganizations() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select(`
      role,
      organization:organizations (
        id,
        name,
        slug,
        settings,
        created_at
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

export async function getOrganization(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}
