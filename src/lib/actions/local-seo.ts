"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface BusinessLocation {
  id: string;
  storeId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  gmbConnected: boolean;
  hours: BusinessHours | null;
  categories: string[];
}

export interface BusinessHours {
  monday?: { open: string; close: string } | null;
  tuesday?: { open: string; close: string } | null;
  wednesday?: { open: string; close: string } | null;
  thursday?: { open: string; close: string } | null;
  friday?: { open: string; close: string } | null;
  saturday?: { open: string; close: string } | null;
  sunday?: { open: string; close: string } | null;
}

// Get all locations for a store
export async function getBusinessLocations(
  storeId: string
): Promise<{ data: BusinessLocation[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_locations")
    .select("*")
    .eq("store_id", storeId)
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((loc) => ({
      id: loc.id,
      storeId: loc.store_id,
      name: loc.name,
      address: loc.address,
      city: loc.city,
      state: loc.state,
      postalCode: loc.postal_code,
      country: loc.country,
      phone: loc.phone,
      email: loc.email,
      website: loc.website,
      latitude: loc.latitude ? parseFloat(loc.latitude) : null,
      longitude: loc.longitude ? parseFloat(loc.longitude) : null,
      googlePlaceId: loc.google_place_id,
      gmbConnected: loc.gmb_connected,
      hours: loc.hours,
      categories: loc.categories || [],
    })),
    error: null,
  };
}

// Create a new location
export async function createBusinessLocation(
  storeId: string,
  data: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    latitude?: number;
    longitude?: number;
    hours?: BusinessHours;
    categories?: string[];
  }
): Promise<{ data: BusinessLocation | null; error: string | null }> {
  const supabase = await createClient();

  const { data: location, error } = await supabase
    .from("business_locations")
    .insert({
      store_id: storeId,
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      postal_code: data.postalCode,
      country: data.country || "US",
      phone: data.phone,
      email: data.email,
      website: data.website,
      latitude: data.latitude,
      longitude: data.longitude,
      hours: data.hours,
      categories: data.categories || [],
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath(`/dashboard/stores/${storeId}/local`);
  return {
    data: {
      id: location.id,
      storeId: location.store_id,
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      postalCode: location.postal_code,
      country: location.country,
      phone: location.phone,
      email: location.email,
      website: location.website,
      latitude: location.latitude ? parseFloat(location.latitude) : null,
      longitude: location.longitude ? parseFloat(location.longitude) : null,
      googlePlaceId: location.google_place_id,
      gmbConnected: location.gmb_connected,
      hours: location.hours,
      categories: location.categories || [],
    },
    error: null,
  };
}

// Update location
export async function updateBusinessLocation(
  locationId: string,
  data: Partial<{
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    latitude: number;
    longitude: number;
    hours: BusinessHours;
    categories: string[];
  }>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.postalCode !== undefined) updateData.postal_code = data.postalCode;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.latitude !== undefined) updateData.latitude = data.latitude;
  if (data.longitude !== undefined) updateData.longitude = data.longitude;
  if (data.hours !== undefined) updateData.hours = data.hours;
  if (data.categories !== undefined) updateData.categories = data.categories;
  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("business_locations")
    .update(updateData)
    .eq("id", locationId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Delete location
export async function deleteBusinessLocation(
  locationId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("business_locations")
    .delete()
    .eq("id", locationId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Generate LocalBusiness schema for location
export function generateLocalBusinessSchema(location: BusinessLocation): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: location.name,
  };

  if (location.address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: location.address,
      addressLocality: location.city,
      addressRegion: location.state,
      postalCode: location.postalCode,
      addressCountry: location.country,
    };
  }

  if (location.phone) schema.telephone = location.phone;
  if (location.email) schema.email = location.email;
  if (location.website) schema.url = location.website;

  if (location.latitude && location.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }

  if (location.hours) {
    const openingHours: string[] = [];
    const dayMap: Record<string, string> = {
      monday: "Mo",
      tuesday: "Tu",
      wednesday: "We",
      thursday: "Th",
      friday: "Fr",
      saturday: "Sa",
      sunday: "Su",
    };

    for (const [day, hours] of Object.entries(location.hours)) {
      if (hours) {
        openingHours.push(`${dayMap[day]} ${hours.open}-${hours.close}`);
      }
    }

    if (openingHours.length > 0) {
      schema.openingHours = openingHours;
    }
  }

  return schema;
}

// NAP Consistency checker
export interface NAPResult {
  source: string;
  name: string;
  address: string;
  phone: string;
  isConsistent: boolean;
  issues: string[];
}

export async function checkNAPConsistency(
  location: BusinessLocation
): Promise<{ data: NAPResult[] | null; error: string | null }> {
  // In production, this would check various directories
  // For now, return simulated data
  const results: NAPResult[] = [
    {
      source: "Google Business Profile",
      name: location.name,
      address: `${location.address}, ${location.city}, ${location.state}`,
      phone: location.phone || "",
      isConsistent: true,
      issues: [],
    },
    {
      source: "Yelp",
      name: location.name,
      address: `${location.address}, ${location.city}`,
      phone: location.phone || "",
      isConsistent: !location.state,
      issues: location.state ? [] : ["Missing state in address"],
    },
    {
      source: "Facebook",
      name: location.name,
      address: `${location.address}, ${location.city}, ${location.state}`,
      phone: location.phone?.replace(/-/g, "") || "",
      isConsistent: true,
      issues: [],
    },
  ];

  return { data: results, error: null };
}
