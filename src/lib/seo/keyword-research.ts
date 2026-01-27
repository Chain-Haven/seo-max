import { getAIProvider } from "@/lib/ai/provider";

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  competition: number;
  trend: number[]; // 12 months of search volume
  searchIntent: "informational" | "transactional" | "navigational" | "commercial";
  serpFeatures: string[];
}

export interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  relevance: number;
}

export interface QuestionKeyword {
  question: string;
  searchVolume: number;
  difficulty: number;
}

// DataForSEO API client
class DataForSEOClient {
  private baseUrl = "https://api.dataforseo.com/v3";
  private auth: string;

  constructor(login: string, password: string) {
    this.auth = Buffer.from(`${login}:${password}`).toString("base64");
  }

  private async request(endpoint: string, data: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    return response.json();
  }

  async getKeywordData(
    keywords: string[],
    location: string = "United States",
    language: string = "en"
  ): Promise<KeywordData[]> {
    const locationCode = this.getLocationCode(location);
    
    const result = await this.request("/keywords_data/google_ads/search_volume/live", [
      {
        keywords,
        location_code: locationCode,
        language_code: language,
        include_serp_info: true,
      },
    ]) as { tasks?: Array<{ result?: Array<{ keyword: string; search_volume: number; competition: number; cpc: number; monthly_searches?: Array<{ search_volume: number }> }> }> };

    if (!result.tasks?.[0]?.result) {
      return [];
    }

    return result.tasks[0].result.map((item) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume || 0,
      keywordDifficulty: Math.round((item.competition || 0) * 100),
      cpc: item.cpc || 0,
      competition: item.competition || 0,
      trend: item.monthly_searches?.map((m) => m.search_volume) || [],
      searchIntent: this.detectIntent(item.keyword),
      serpFeatures: [],
    }));
  }

  async getKeywordSuggestions(
    seedKeyword: string,
    location: string = "United States",
    limit: number = 50
  ): Promise<KeywordSuggestion[]> {
    const locationCode = this.getLocationCode(location);
    
    const result = await this.request("/keywords_data/google_ads/keywords_for_keywords/live", [
      {
        keywords: [seedKeyword],
        location_code: locationCode,
        language_code: "en",
        include_serp_info: true,
        limit,
      },
    ]) as { tasks?: Array<{ result?: Array<{ keyword: string; search_volume: number; competition: number }> }> };

    if (!result.tasks?.[0]?.result) {
      return [];
    }

    return result.tasks[0].result.map((item) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume || 0,
      keywordDifficulty: Math.round((item.competition || 0) * 100),
      relevance: this.calculateRelevance(seedKeyword, item.keyword),
    }));
  }

  async getQuestionKeywords(
    topic: string,
    location: string = "United States"
  ): Promise<QuestionKeyword[]> {
    const locationCode = this.getLocationCode(location);
    
    // Use keyword suggestions filtered for questions
    const result = await this.request("/keywords_data/google_ads/keywords_for_keywords/live", [
      {
        keywords: [topic],
        location_code: locationCode,
        language_code: "en",
        limit: 100,
      },
    ]) as { tasks?: Array<{ result?: Array<{ keyword: string; search_volume: number; competition: number }> }> };

    if (!result.tasks?.[0]?.result) {
      return [];
    }

    const questionWords = ["what", "how", "why", "when", "where", "who", "which", "can", "does", "is", "are"];
    
    return result.tasks[0].result
      .filter((item) => {
        const lower = item.keyword.toLowerCase();
        return questionWords.some((q) => lower.startsWith(q)) || lower.includes("?");
      })
      .map((item) => ({
        question: item.keyword,
        searchVolume: item.search_volume || 0,
        difficulty: Math.round((item.competition || 0) * 100),
      }));
  }

  async getSerpAnalysis(
    keyword: string,
    location: string = "United States"
  ): Promise<{
    serpFeatures: string[];
    topResults: Array<{ position: number; url: string; title: string; domain: string }>;
    difficulty: number;
  }> {
    const locationCode = this.getLocationCode(location);
    
    const result = await this.request("/serp/google/organic/live/regular", [
      {
        keyword,
        location_code: locationCode,
        language_code: "en",
        depth: 10,
      },
    ]) as { tasks?: Array<{ result?: Array<{ items?: Array<{ type: string; rank_group: number; url: string; title: string; domain: string }>; item_types?: string[] }> }> };

    if (!result.tasks?.[0]?.result?.[0]) {
      return { serpFeatures: [], topResults: [], difficulty: 50 };
    }

    const serpResult = result.tasks[0].result[0];
    const items = serpResult.items || [];
    
    return {
      serpFeatures: serpResult.item_types || [],
      topResults: items
        .filter((item) => item.type === "organic")
        .slice(0, 10)
        .map((item) => ({
          position: item.rank_group,
          url: item.url,
          title: item.title,
          domain: item.domain,
        })),
      difficulty: this.calculateDifficulty(items),
    };
  }

  private getLocationCode(location: string): number {
    const locations: Record<string, number> = {
      "United States": 2840,
      "United Kingdom": 2826,
      "Canada": 2124,
      "Australia": 2036,
      "Germany": 2276,
      "France": 2250,
      "Spain": 2724,
      "Italy": 2380,
    };
    return locations[location] || 2840;
  }

  private detectIntent(keyword: string): KeywordData["searchIntent"] {
    const lower = keyword.toLowerCase();
    
    if (lower.match(/buy|price|cheap|discount|deal|coupon|order|purchase|shop/)) {
      return "transactional";
    }
    if (lower.match(/best|top|review|vs|comparison|alternative/)) {
      return "commercial";
    }
    if (lower.match(/how|what|why|when|guide|tutorial|learn|example/)) {
      return "informational";
    }
    if (lower.match(/login|sign in|official|website|contact/)) {
      return "navigational";
    }
    
    return "informational";
  }

  private calculateRelevance(seed: string, keyword: string): number {
    const seedWords = seed.toLowerCase().split(/\s+/);
    const keywordWords = keyword.toLowerCase().split(/\s+/);
    const matches = seedWords.filter((w) => keywordWords.includes(w)).length;
    return Math.round((matches / seedWords.length) * 100);
  }

  private calculateDifficulty(items: Array<{ type: string; domain?: string }>): number {
    // Simplified difficulty based on SERP features and domain authority
    const organicCount = items.filter((i) => i.type === "organic").length;
    const hasFeatures = items.some((i) => i.type !== "organic");
    
    let difficulty = 50;
    if (hasFeatures) difficulty += 10;
    if (organicCount < 10) difficulty += 15;
    
    // Check for big domains
    const bigDomains = ["wikipedia", "amazon", "youtube", "facebook", "reddit"];
    const hasBigDomain = items.some((i) => 
      bigDomains.some((d) => i.domain?.includes(d))
    );
    if (hasBigDomain) difficulty += 15;
    
    return Math.min(100, difficulty);
  }
}

// Fallback AI-based keyword research when no API key
async function aiKeywordResearch(
  seedKeyword: string,
  count: number = 20
): Promise<KeywordSuggestion[]> {
  const ai = getAIProvider();
  
  const prompt = `Generate ${count} keyword suggestions related to "${seedKeyword}" for SEO.

For each keyword, estimate:
- Search volume (monthly, realistic numbers like 100, 500, 1000, 5000, etc.)
- Difficulty (0-100, where 100 is hardest)

Format as JSON array:
[
  {"keyword": "example keyword", "searchVolume": 1000, "keywordDifficulty": 45}
]

Include a mix of:
- Long-tail variations
- Question-based keywords
- Commercial intent keywords
- Informational keywords`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 2000 });
    const match = response.content.match(/\[[\s\S]*\]/);
    
    if (match) {
      const keywords = JSON.parse(match[0]) as Array<{ keyword: string; searchVolume: number; keywordDifficulty: number }>;
      return keywords.map((k) => ({
        keyword: k.keyword,
        searchVolume: k.searchVolume,
        keywordDifficulty: k.keywordDifficulty,
        relevance: 80,
      }));
    }
  } catch (error) {
    console.error("AI keyword research error:", error);
  }
  
  return [];
}

// Main export functions
export async function researchKeyword(
  keyword: string,
  options: {
    location?: string;
    apiLogin?: string;
    apiPassword?: string;
  } = {}
): Promise<KeywordData | null> {
  const { location = "United States", apiLogin, apiPassword } = options;
  
  if (apiLogin && apiPassword) {
    try {
      const client = new DataForSEOClient(apiLogin, apiPassword);
      const results = await client.getKeywordData([keyword], location);
      return results[0] || null;
    } catch (error) {
      console.error("DataForSEO error:", error);
    }
  }
  
  // Fallback to AI estimation
  const ai = getAIProvider();
  const prompt = `Estimate SEO metrics for the keyword "${keyword}":
- Monthly search volume (realistic number)
- Keyword difficulty (0-100)
- CPC (in dollars)
- Competition level (0-1)
- Search intent (informational, transactional, navigational, commercial)
- Common SERP features that appear for this keyword

Format as JSON:
{
  "searchVolume": 1000,
  "keywordDifficulty": 45,
  "cpc": 1.50,
  "competition": 0.45,
  "searchIntent": "informational",
  "serpFeatures": ["featured_snippet", "people_also_ask"]
}`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 500 });
    const match = response.content.match(/\{[\s\S]*\}/);
    
    if (match) {
      const data = JSON.parse(match[0]);
      return {
        keyword,
        searchVolume: data.searchVolume || 0,
        keywordDifficulty: data.keywordDifficulty || 50,
        cpc: data.cpc || 0,
        competition: data.competition || 0.5,
        trend: Array(12).fill(data.searchVolume || 0),
        searchIntent: data.searchIntent || "informational",
        serpFeatures: data.serpFeatures || [],
      };
    }
  } catch (error) {
    console.error("AI keyword estimation error:", error);
  }
  
  return null;
}

export async function getKeywordSuggestions(
  seedKeyword: string,
  options: {
    location?: string;
    limit?: number;
    apiLogin?: string;
    apiPassword?: string;
  } = {}
): Promise<KeywordSuggestion[]> {
  const { location = "United States", limit = 50, apiLogin, apiPassword } = options;
  
  if (apiLogin && apiPassword) {
    try {
      const client = new DataForSEOClient(apiLogin, apiPassword);
      return await client.getKeywordSuggestions(seedKeyword, location, limit);
    } catch (error) {
      console.error("DataForSEO error:", error);
    }
  }
  
  // Fallback to AI
  return aiKeywordResearch(seedKeyword, limit);
}

export async function getQuestionKeywords(
  topic: string,
  options: {
    location?: string;
    apiLogin?: string;
    apiPassword?: string;
  } = {}
): Promise<QuestionKeyword[]> {
  const { location = "United States", apiLogin, apiPassword } = options;
  
  if (apiLogin && apiPassword) {
    try {
      const client = new DataForSEOClient(apiLogin, apiPassword);
      return await client.getQuestionKeywords(topic, location);
    } catch (error) {
      console.error("DataForSEO error:", error);
    }
  }
  
  // Fallback to AI
  const ai = getAIProvider();
  const prompt = `Generate 15 question-based keywords related to "${topic}" that people search for.

For each, estimate search volume and difficulty.

Format as JSON array:
[
  {"question": "how to do X?", "searchVolume": 500, "difficulty": 30}
]`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 1000 });
    const match = response.content.match(/\[[\s\S]*\]/);
    
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (error) {
    console.error("AI question keywords error:", error);
  }
  
  return [];
}

export async function analyzeSERP(
  keyword: string,
  options: {
    location?: string;
    apiLogin?: string;
    apiPassword?: string;
  } = {}
): Promise<{
  serpFeatures: string[];
  topResults: Array<{ position: number; url: string; title: string; domain: string }>;
  difficulty: number;
  recommendations: string[];
}> {
  const { location = "United States", apiLogin, apiPassword } = options;
  
  if (apiLogin && apiPassword) {
    try {
      const client = new DataForSEOClient(apiLogin, apiPassword);
      const analysis = await client.getSerpAnalysis(keyword, location);
      return {
        ...analysis,
        recommendations: generateRecommendations(analysis),
      };
    } catch (error) {
      console.error("DataForSEO error:", error);
    }
  }
  
  // Fallback to AI analysis
  const ai = getAIProvider();
  const prompt = `Analyze the likely SERP (Search Engine Results Page) for the keyword "${keyword}".

Provide:
1. What SERP features likely appear (featured_snippet, people_also_ask, local_pack, video, images, etc.)
2. Top 5 types of pages that would rank (e.g., listicles, guides, product pages)
3. Estimated difficulty (0-100)
4. Recommendations for ranking

Format as JSON:
{
  "serpFeatures": ["featured_snippet", "people_also_ask"],
  "topResults": [
    {"position": 1, "url": "example.com/guide", "title": "Example Guide", "domain": "example.com"}
  ],
  "difficulty": 55,
  "recommendations": ["Create comprehensive guide", "Include FAQ section"]
}`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 1000 });
    const match = response.content.match(/\{[\s\S]*\}/);
    
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (error) {
    console.error("AI SERP analysis error:", error);
  }
  
  return {
    serpFeatures: [],
    topResults: [],
    difficulty: 50,
    recommendations: [],
  };
}

function generateRecommendations(analysis: {
  serpFeatures: string[];
  topResults: Array<{ position: number; url: string; title: string; domain: string }>;
  difficulty: number;
}): string[] {
  const recommendations: string[] = [];
  
  if (analysis.serpFeatures.includes("featured_snippet")) {
    recommendations.push("Format content for featured snippets (lists, tables, definitions)");
  }
  if (analysis.serpFeatures.includes("people_also_ask")) {
    recommendations.push("Include FAQ section answering related questions");
  }
  if (analysis.serpFeatures.includes("video")) {
    recommendations.push("Consider creating video content for this topic");
  }
  if (analysis.serpFeatures.includes("local_pack")) {
    recommendations.push("Optimize Google Business Profile for local searches");
  }
  
  if (analysis.difficulty > 70) {
    recommendations.push("High competition - focus on long-tail variations");
    recommendations.push("Build quality backlinks before targeting this keyword");
  } else if (analysis.difficulty < 30) {
    recommendations.push("Low competition - good opportunity for quick wins");
  }
  
  return recommendations;
}

// Keyword clustering
export async function clusterKeywords(
  keywords: KeywordSuggestion[]
): Promise<Map<string, KeywordSuggestion[]>> {
  const ai = getAIProvider();
  
  const keywordList = keywords.map((k) => k.keyword).join("\n");
  
  const prompt = `Group these keywords into logical clusters based on search intent and topic similarity.

Keywords:
${keywordList}

Format as JSON object where keys are cluster names and values are arrays of keywords:
{
  "buying guides": ["best X", "top X", "X reviews"],
  "how-to tutorials": ["how to X", "X tutorial"],
  "comparisons": ["X vs Y", "X comparison"]
}`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 1500 });
    const match = response.content.match(/\{[\s\S]*\}/);
    
    if (match) {
      const clusters = JSON.parse(match[0]) as Record<string, string[]>;
      const result = new Map<string, KeywordSuggestion[]>();
      
      for (const [clusterName, clusterKeywords] of Object.entries(clusters)) {
        const matchedKeywords = keywords.filter((k) =>
          clusterKeywords.some((ck) => k.keyword.toLowerCase().includes(ck.toLowerCase()) || ck.toLowerCase().includes(k.keyword.toLowerCase()))
        );
        if (matchedKeywords.length > 0) {
          result.set(clusterName, matchedKeywords);
        }
      }
      
      return result;
    }
  } catch (error) {
    console.error("Keyword clustering error:", error);
  }
  
  return new Map();
}
