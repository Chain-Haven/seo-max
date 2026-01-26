/**
 * SERP API Client
 * Abstraction layer for rank checking services
 * Can be configured to use SerpAPI, DataForSEO, or simulated data
 */

import type { SerpResponse, SerpResult, SerpFeatures } from "./types";

export interface SerpClientConfig {
  provider: "serpapi" | "dataforseo" | "simulated";
  apiKey?: string;
}

export class SerpClient {
  private provider: string;
  private apiKey?: string;

  constructor(config: SerpClientConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;
  }

  async checkRanking(
    keyword: string,
    domain: string,
    options: {
      location?: string;
      device?: "desktop" | "mobile";
      searchEngine?: "google" | "bing";
    } = {}
  ): Promise<SerpResponse> {
    const {
      location = "United States",
      device = "desktop",
      searchEngine = "google",
    } = options;

    switch (this.provider) {
      case "serpapi":
        return this.checkWithSerpApi(keyword, domain, location, device);
      case "dataforseo":
        return this.checkWithDataForSeo(keyword, domain, location, device);
      case "simulated":
      default:
        return this.simulateRankCheck(keyword, domain, location, device, searchEngine);
    }
  }

  private async checkWithSerpApi(
    keyword: string,
    domain: string,
    location: string,
    device: string
  ): Promise<SerpResponse> {
    if (!this.apiKey) {
      throw new Error("SerpAPI key required");
    }

    const params = new URLSearchParams({
      api_key: this.apiKey,
      q: keyword,
      location,
      device,
      engine: "google",
      num: "100",
    });

    const response = await fetch(
      `https://serpapi.com/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseSerpApiResponse(data, keyword, location, device as "desktop" | "mobile");
  }

  private parseSerpApiResponse(
    data: Record<string, unknown>,
    keyword: string,
    location: string,
    device: "desktop" | "mobile"
  ): SerpResponse {
    const organicResults = (data.organic_results as Array<Record<string, unknown>>) || [];
    const results: SerpResult[] = organicResults.map((r, i) => ({
      position: i + 1,
      url: (r.link as string) || "",
      title: (r.title as string) || "",
      snippet: (r.snippet as string) || "",
      domain: this.extractDomain((r.link as string) || ""),
    }));

    const answerBox = data.answer_box as Record<string, unknown> | undefined;
    const relatedQuestions = data.related_questions as Array<Record<string, unknown>> | undefined;

    const features: SerpFeatures = {
      featuredSnippet: answerBox
        ? {
            position: 0,
            url: (answerBox.link as string) || "",
            title: (answerBox.title as string) || "",
            snippet: (answerBox.snippet as string) || (answerBox.answer as string) || "",
            domain: this.extractDomain((answerBox.link as string) || ""),
          }
        : null,
      peopleAlsoAsk: relatedQuestions?.map((q) => (q.question as string) || "") || [],
      localPack: !!data.local_results,
      knowledgePanel: !!data.knowledge_graph,
      imageCarousel: !!data.images_results,
      videoCarousel: !!data.video_results,
      topStories: !!data.top_stories,
      shoppingResults: !!data.shopping_results,
    };

    return {
      keyword,
      location,
      device,
      searchEngine: "google",
      results,
      features,
      checkedAt: new Date(),
    };
  }

  private async checkWithDataForSeo(
    keyword: string,
    domain: string,
    location: string,
    device: string
  ): Promise<SerpResponse> {
    // DataForSEO implementation would go here
    // For now, fall back to simulated
    return this.simulateRankCheck(keyword, domain, location, device as "desktop" | "mobile", "google");
  }

  private async simulateRankCheck(
    keyword: string,
    domain: string,
    location: string,
    device: "desktop" | "mobile",
    searchEngine: "google" | "bing"
  ): Promise<SerpResponse> {
    // Generate realistic simulated SERP results
    const competitors = [
      "amazon.com",
      "walmart.com",
      "target.com",
      "ebay.com",
      "bestbuy.com",
      "homedepot.com",
      "lowes.com",
      "costco.com",
      "wayfair.com",
      "overstock.com",
    ];

    // Simulate domain position (random but consistent for same keyword)
    const keywordHash = this.hashCode(keyword + domain);
    const basePosition = Math.abs(keywordHash % 50) + 1;
    
    const results: SerpResult[] = [];
    let domainAdded = false;

    for (let i = 1; i <= 100; i++) {
      if (i === basePosition && !domainAdded) {
        results.push({
          position: i,
          url: `https://${domain}/${keyword.toLowerCase().replace(/\s+/g, "-")}`,
          title: `${keyword} - ${domain}`,
          snippet: `Find the best ${keyword} at ${domain}. Shop our selection of quality products.`,
          domain,
        });
        domainAdded = true;
      } else {
        const competitorDomain = competitors[(i - 1) % competitors.length];
        results.push({
          position: i,
          url: `https://${competitorDomain}/${keyword.toLowerCase().replace(/\s+/g, "-")}`,
          title: `${keyword} | ${competitorDomain}`,
          snippet: `Shop for ${keyword} at ${competitorDomain}. Great prices and fast shipping.`,
          domain: competitorDomain,
        });
      }
    }

    // Sort by position
    results.sort((a, b) => a.position - b.position);

    const hasFeaturedSnippet = Math.abs(keywordHash % 4) === 0;
    const features: SerpFeatures = {
      featuredSnippet: hasFeaturedSnippet
        ? {
            position: 0,
            url: results[0].url,
            title: results[0].title,
            snippet: `The best ${keyword} options include various brands and price points...`,
            domain: results[0].domain,
          }
        : null,
      peopleAlsoAsk: [
        `What is the best ${keyword}?`,
        `How much does ${keyword} cost?`,
        `Where to buy ${keyword}?`,
        `Is ${keyword} worth it?`,
      ],
      localPack: Math.abs(keywordHash % 3) === 0,
      knowledgePanel: false,
      imageCarousel: true,
      videoCarousel: Math.abs(keywordHash % 2) === 0,
      topStories: false,
      shoppingResults: true,
    };

    return {
      keyword,
      location,
      device,
      searchEngine,
      searchVolume: Math.abs(keywordHash % 10000) + 100,
      results,
      features,
      checkedAt: new Date(),
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  // Find position for a specific domain in results
  findDomainPosition(results: SerpResult[], domain: string): SerpResult | null {
    const normalizedDomain = domain.replace("www.", "").toLowerCase();
    return (
      results.find(
        (r) => r.domain.toLowerCase() === normalizedDomain || r.url.includes(normalizedDomain)
      ) || null
    );
  }
}

// Singleton instance
let serpClient: SerpClient | null = null;

export function getSerpClient(): SerpClient {
  if (!serpClient) {
    const apiKey = process.env.SERP_API_KEY;
    serpClient = new SerpClient({
      provider: apiKey ? "serpapi" : "simulated",
      apiKey,
    });
  }
  return serpClient;
}
