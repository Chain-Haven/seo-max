"use server";

import { createClient } from "@/lib/supabase/server";
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

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, slug })
    .select()
    .single();

  if (orgError) {
    return { error: orgError.message };
  }

  // Add user as owner
  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    // Rollback org creation
    await supabase.from("organizations").delete().eq("id", org.id);
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
