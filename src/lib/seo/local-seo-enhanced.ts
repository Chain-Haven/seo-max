/**
 * Enhanced Local SEO Tools
 * Local rank tracking, GMB optimization, NAP consistency
 */

export interface LocalRankingData {
  keyword: string;
  location: string; // City, State or ZIP
  position: number | null;
  inMapPack: boolean;
  mapPackPosition: number | null;
  localPackVisible: boolean;
  competitors: Array<{
    name: string;
    position: number;
    rating: number;
    reviewCount: number;
  }>;
}

export interface NAPData {
  name: string;
  address: string;
  phone: string;
}

export interface NAPConsistencyCheck {
  source: string;
  nap: NAPData;
  isConsistent: boolean;
  issues: string[];
}

export interface GMBOptimization {
  profileUrl: string;
  completionScore: number;
  missingFields: string[];
  photoCount: number;
  recommendedPhotoCount: number;
  postFrequency: string;
  responseRate: number;
  recommendations: string[];
}

// Check local rankings
export async function checkLocalRanking(
  keyword: string,
  location: string,
  siteUrl: string
): Promise<LocalRankingData> {
  // In production, use DataForSEO or similar API for local SERP data
  
  return {
    keyword,
    location,
    position: null,
    inMapPack: false,
    mapPackPosition: null,
    localPackVisible: true,
    competitors: [],
  };
}

// NAP Consistency Checker
export async function checkNAPConsistency(
  businessName: string,
  sources: string[] // URLs to check
): Promise<{
  isConsistent: boolean;
  canonicalNAP: NAPData;
  checks: NAPConsistencyCheck[];
  inconsistencies: number;
}> {
  const checks: NAPConsistencyCheck[] = [];
  const napVariations: NAPData[] = [];

  for (const source of sources) {
    try {
      const nap = await extractNAPFromPage(source);
      
      if (nap) {
        napVariations.push(nap);
        checks.push({
          source,
          nap,
          isConsistent: true, // Will be determined later
          issues: [],
        });
      }
    } catch (error) {
      checks.push({
        source,
        nap: { name: "", address: "", phone: "" },
        isConsistent: false,
        issues: ["Failed to fetch or parse NAP data"],
      });
    }
  }

  // Determine canonical NAP (most common)
  const canonicalNAP = napVariations[0] || { name: businessName, address: "", phone: "" };

  // Check consistency
  let inconsistencies = 0;
  
  for (const check of checks) {
    const issues: string[] = [];

    if (check.nap.name !== canonicalNAP.name) {
      issues.push(`Business name mismatch: "${check.nap.name}" vs "${canonicalNAP.name}"`);
    }

    if (normalizeAddress(check.nap.address) !== normalizeAddress(canonicalNAP.address)) {
      issues.push("Address formatting differs");
    }

    if (normalizePhone(check.nap.phone) !== normalizePhone(canonicalNAP.phone)) {
      issues.push(`Phone number differs: "${check.nap.phone}" vs "${canonicalNAP.phone}"`);
    }

    if (issues.length > 0) {
      check.issues = issues;
      check.isConsistent = false;
      inconsistencies++;
    }
  }

  return {
    isConsistent: inconsistencies === 0,
    canonicalNAP,
    checks,
    inconsistencies,
  };
}

async function extractNAPFromPage(url: string): Promise<NAPData | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const html = await response.text();

    // Simple extraction (in production, use more sophisticated parsing)
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const addressMatch = html.match(/(\d+\s+[A-Za-z\s]+,\s+[A-Z]{2}\s+\d{5})/);
    const phoneMatch = html.match(/(\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);

    return {
      name: nameMatch?.[1] || "",
      address: addressMatch?.[1] || "",
      phone: phoneMatch?.[1] || "",
    };
  } catch {
    return null;
  }
}

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/,/g, "")
    .replace(/\./g, "")
    .replace(/street|st|avenue|ave|road|rd|boulevard|blvd/g, "")
    .trim();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Generate local SEO checklist
export function generateLocalSEOChecklist(businessInfo: {
  hasGMB: boolean;
  hasNAP: boolean;
  hasSchema: boolean;
  hasLocalContent: boolean;
  hasReviews: boolean;
  reviewCount: number;
  citationCount: number;
}): Array<{
  item: string;
  completed: boolean;
  priority: "critical" | "high" | "medium" | "low";
  description: string;
}> {
  return [
    {
      item: "Google Business Profile Setup",
      completed: businessInfo.hasGMB,
      priority: "critical",
      description: "Claim and verify your Google Business Profile",
    },
    {
      item: "NAP Consistency",
      completed: businessInfo.hasNAP,
      priority: "critical",
      description: "Ensure Name, Address, Phone are consistent across all platforms",
    },
    {
      item: "Local Business Schema",
      completed: businessInfo.hasSchema,
      priority: "high",
      description: "Add LocalBusiness schema markup to your website",
    },
    {
      item: "Location-Specific Content",
      completed: businessInfo.hasLocalContent,
      priority: "high",
      description: "Create content targeting your service areas",
    },
    {
      item: "Customer Reviews",
      completed: businessInfo.reviewCount >= 10,
      priority: "high",
      description: `Get more reviews (current: ${businessInfo.reviewCount}, target: 10+)`,
    },
    {
      item: "Local Citations",
      completed: businessInfo.citationCount >= 20,
      priority: "medium",
      description: `Build citations in local directories (current: ${businessInfo.citationCount}, target: 20+)`,
    },
    {
      item: "Local Keywords",
      completed: false,
      priority: "medium",
      description: 'Target keywords like "your service + city name"',
    },
    {
      item: "Service Area Pages",
      completed: false,
      priority: "medium",
      description: "Create dedicated pages for each service area you serve",
    },
  ];
}

// Find local citation opportunities
export function findLocalCitationOpportunities(
  businessCategory: string,
  country: string = "US"
): Array<{
  directory: string;
  url: string;
  domainAuthority: number;
  priority: "high" | "medium" | "low";
}> {
  const directories = [
    { directory: "Google Business Profile", url: "https://business.google.com", domainAuthority: 100, priority: "high" as const },
    { directory: "Bing Places", url: "https://www.bingplaces.com", domainAuthority: 95, priority: "high" as const },
    { directory: "Apple Maps", url: "https://mapsconnect.apple.com", domainAuthority: 95, priority: "high" as const },
    { directory: "Yelp", url: "https://biz.yelp.com", domainAuthority: 93, priority: "high" as const },
    { directory: "Facebook Business", url: "https://business.facebook.com", domainAuthority: 96, priority: "high" as const },
    { directory: "Better Business Bureau", url: "https://www.bbb.org", domainAuthority: 88, priority: "medium" as const },
    { directory: "YellowPages", url: "https://www.yellowpages.com", domainAuthority: 87, priority: "medium" as const },
    { directory: "Foursquare", url: "https://foursquare.com", domainAuthority: 91, priority: "medium" as const },
    { directory: "MapQuest", url: "https://www.mapquest.com", domainAuthority: 76, priority: "low" as const },
    { directory: "Angie's List", url: "https://www.angieslist.com", domainAuthority: 82, priority: "medium" as const },
  ];

  return directories;
}
