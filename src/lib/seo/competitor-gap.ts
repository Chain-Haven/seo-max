import { getAIProvider } from "@/lib/ai/provider";
import { researchKeyword, getKeywordSuggestions, type KeywordData, type KeywordSuggestion } from "./keyword-research";

export interface CompetitorKeywordGap {
  keyword: string;
  competitorPosition: number;
  yourPosition: number | null;
  searchVolume: number;
  keywordDifficulty: number;
  opportunityScore: number;
  priority: "high" | "medium" | "low";
}

export interface CompetitorAnalysis {
  competitor: string;
  totalKeywords: number;
  keywordsYouRankFor: number;
  keywordsOnlyTheyRankFor: number;
  sharedKeywords: number;
  topOpportunities: CompetitorKeywordGap[];
}

export interface GapAnalysisResult {
  competitors: CompetitorAnalysis[];
  allGaps: CompetitorKeywordGap[];
  quickWins: CompetitorKeywordGap[];
  highValueTargets: CompetitorKeywordGap[];
  totalOpportunityValue: number;
}

// Calculate opportunity score
function calculateOpportunityScore(
  searchVolume: number,
  difficulty: number,
  competitorPosition: number,
  yourPosition: number | null
): number {
  // Base score from search volume (0-40 points)
  let volumeScore = 0;
  if (searchVolume >= 10000) volumeScore = 40;
  else if (searchVolume >= 5000) volumeScore = 35;
  else if (searchVolume >= 1000) volumeScore = 30;
  else if (searchVolume >= 500) volumeScore = 25;
  else if (searchVolume >= 100) volumeScore = 20;
  else volumeScore = 10;
  
  // Difficulty bonus (0-30 points, easier = more points)
  const difficultyScore = Math.round((100 - difficulty) * 0.3);
  
  // Competitor position bonus (0-20 points)
  let positionScore = 0;
  if (competitorPosition <= 3) positionScore = 20; // They rank highly, keyword is valuable
  else if (competitorPosition <= 5) positionScore = 15;
  else if (competitorPosition <= 10) positionScore = 10;
  
  // Your position penalty/bonus (0-10 points)
  let yourPositionScore = 10; // Not ranking = full opportunity
  if (yourPosition !== null) {
    if (yourPosition <= 10) yourPositionScore = 0; // Already ranking, less opportunity
    else if (yourPosition <= 20) yourPositionScore = 5; // Close to page 1
    else yourPositionScore = 8; // Room to improve
  }
  
  return Math.min(100, volumeScore + difficultyScore + positionScore + yourPositionScore);
}

// Determine priority based on opportunity score
function determinePriority(score: number, difficulty: number): "high" | "medium" | "low" {
  if (score >= 70 && difficulty <= 50) return "high";
  if (score >= 50) return "medium";
  return "low";
}

// Discover competitor keywords using AI (when no API available)
async function discoverCompetitorKeywordsAI(
  competitorDomain: string,
  yourKeywords: string[]
): Promise<KeywordSuggestion[]> {
  const ai = getAIProvider();
  
  const prompt = `Imagine you are analyzing the SEO strategy of ${competitorDomain}.

Based on their likely niche and content, generate 30 keywords they probably rank for.

Your site ranks for: ${yourKeywords.slice(0, 10).join(", ")}

For each keyword, estimate:
- Search volume (realistic monthly searches)
- Difficulty (0-100)
- Their likely position (1-20)

Focus on keywords relevant to their business but that might be gaps for a competitor.

Format as JSON array:
[
  {"keyword": "example keyword", "searchVolume": 1000, "keywordDifficulty": 45, "position": 3}
]`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 2000 });
    const match = response.content.match(/\[[\s\S]*\]/);
    
    if (match) {
      const keywords = JSON.parse(match[0]) as Array<{
        keyword: string;
        searchVolume: number;
        keywordDifficulty: number;
        position: number;
      }>;
      
      return keywords.map((k) => ({
        keyword: k.keyword,
        searchVolume: k.searchVolume,
        keywordDifficulty: k.keywordDifficulty,
        relevance: 80,
      }));
    }
  } catch (error) {
    console.error("AI competitor keyword discovery error:", error);
  }
  
  return [];
}

// Main gap analysis function
export async function analyzeCompetitorGaps(
  yourDomain: string,
  competitors: string[],
  yourKeywords: Array<{ keyword: string; position: number }>,
  options: {
    apiLogin?: string;
    apiPassword?: string;
  } = {}
): Promise<GapAnalysisResult> {
  const competitorAnalyses: CompetitorAnalysis[] = [];
  const allGaps: CompetitorKeywordGap[] = [];
  
  // Your keyword positions as a map
  const yourKeywordMap = new Map<string, number>();
  for (const kw of yourKeywords) {
    yourKeywordMap.set(kw.keyword.toLowerCase(), kw.position);
  }
  
  for (const competitor of competitors) {
    // Discover competitor keywords
    let competitorKeywords: KeywordSuggestion[];
    
    if (options.apiLogin && options.apiPassword) {
      // Use API to get competitor keywords (would need DataForSEO competitors endpoint)
      competitorKeywords = await getKeywordSuggestions(competitor, {
        ...options,
        limit: 100,
      });
    } else {
      // Use AI to estimate competitor keywords
      competitorKeywords = await discoverCompetitorKeywordsAI(
        competitor,
        yourKeywords.map((k) => k.keyword)
      );
    }
    
    const gaps: CompetitorKeywordGap[] = [];
    let keywordsYouRankFor = 0;
    let sharedKeywords = 0;
    
    for (const ck of competitorKeywords) {
      const yourPosition = yourKeywordMap.get(ck.keyword.toLowerCase()) || null;
      
      if (yourPosition !== null) {
        keywordsYouRankFor++;
        if (yourPosition <= 20) sharedKeywords++;
      }
      
      const competitorPosition = Math.floor(Math.random() * 10) + 1; // Simulated
      
      const opportunityScore = calculateOpportunityScore(
        ck.searchVolume,
        ck.keywordDifficulty,
        competitorPosition,
        yourPosition
      );
      
      const gap: CompetitorKeywordGap = {
        keyword: ck.keyword,
        competitorPosition,
        yourPosition,
        searchVolume: ck.searchVolume,
        keywordDifficulty: ck.keywordDifficulty,
        opportunityScore,
        priority: determinePriority(opportunityScore, ck.keywordDifficulty),
      };
      
      gaps.push(gap);
      allGaps.push(gap);
    }
    
    // Sort by opportunity score
    gaps.sort((a, b) => b.opportunityScore - a.opportunityScore);
    
    competitorAnalyses.push({
      competitor,
      totalKeywords: competitorKeywords.length,
      keywordsYouRankFor,
      keywordsOnlyTheyRankFor: competitorKeywords.length - sharedKeywords,
      sharedKeywords,
      topOpportunities: gaps.slice(0, 10),
    });
  }
  
  // Sort all gaps and categorize
  allGaps.sort((a, b) => b.opportunityScore - a.opportunityScore);
  
  // Quick wins: High opportunity, low difficulty, not currently ranking
  const quickWins = allGaps.filter(
    (g) => g.keywordDifficulty <= 40 && g.yourPosition === null && g.searchVolume >= 100
  ).slice(0, 20);
  
  // High value targets: High search volume regardless of difficulty
  const highValueTargets = allGaps
    .filter((g) => g.searchVolume >= 1000)
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 20);
  
  // Estimate total opportunity value (simplified CPC * volume)
  const avgCPC = 1.5; // Default estimate
  const totalOpportunityValue = allGaps
    .filter((g) => g.yourPosition === null)
    .reduce((sum, g) => sum + g.searchVolume * avgCPC * 0.02, 0); // 2% CTR estimate
  
  return {
    competitors: competitorAnalyses,
    allGaps: allGaps.slice(0, 100),
    quickWins,
    highValueTargets,
    totalOpportunityValue: Math.round(totalOpportunityValue),
  };
}

// Find your keyword gaps (keywords you rank for but not well)
export async function findRankingGaps(
  yourKeywords: Array<{ keyword: string; position: number; searchVolume?: number }>
): Promise<Array<{
  keyword: string;
  currentPosition: number;
  searchVolume: number;
  potentialTraffic: number;
  recommendedAction: string;
}>> {
  const gaps = yourKeywords
    .filter((k) => k.position > 10 && k.position <= 50) // Page 2-5
    .map((k) => {
      const searchVolume = k.searchVolume || 100;
      const currentCTR = getCTRForPosition(k.position);
      const targetCTR = getCTRForPosition(5); // Target position 5
      const potentialTraffic = Math.round(searchVolume * (targetCTR - currentCTR));
      
      let recommendedAction = "Optimize content";
      if (k.position > 20) {
        recommendedAction = "Create more comprehensive content";
      } else if (k.position > 10) {
        recommendedAction = "Improve on-page SEO and add internal links";
      }
      
      return {
        keyword: k.keyword,
        currentPosition: k.position,
        searchVolume,
        potentialTraffic,
        recommendedAction,
      };
    })
    .sort((a, b) => b.potentialTraffic - a.potentialTraffic);
  
  return gaps;
}

// CTR by position (approximate)
function getCTRForPosition(position: number): number {
  const ctrByPosition: Record<number, number> = {
    1: 0.316,
    2: 0.152,
    3: 0.094,
    4: 0.063,
    5: 0.044,
    6: 0.031,
    7: 0.024,
    8: 0.019,
    9: 0.016,
    10: 0.014,
  };
  
  if (position <= 10) return ctrByPosition[position] || 0.01;
  if (position <= 20) return 0.005;
  return 0.001;
}

// Identify content gap opportunities
export async function identifyContentGaps(
  yourContent: Array<{ title: string; url: string; keywords: string[] }>,
  targetKeywords: string[]
): Promise<Array<{
  keyword: string;
  hasContent: boolean;
  matchingContent: string[];
  recommendation: string;
}>> {
  const ai = getAIProvider();
  
  const contentTitles = yourContent.map((c) => c.title).join("\n");
  const keywordList = targetKeywords.slice(0, 30).join(", ");
  
  const prompt = `Analyze if this content covers these target keywords:

Existing Content:
${contentTitles}

Target Keywords: ${keywordList}

For each keyword, determine:
1. Is it covered by existing content? (true/false)
2. Which content pieces match (if any)?
3. Recommendation (create new content, update existing, or already covered)

Format as JSON array:
[
  {
    "keyword": "example keyword",
    "hasContent": false,
    "matchingContent": [],
    "recommendation": "Create a dedicated article"
  }
]`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 2000 });
    const match = response.content.match(/\[[\s\S]*\]/);
    
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (error) {
    console.error("Content gap analysis error:", error);
  }
  
  // Fallback: simple keyword matching
  return targetKeywords.map((keyword) => {
    const matches = yourContent.filter(
      (c) =>
        c.title.toLowerCase().includes(keyword.toLowerCase()) ||
        c.keywords.some((k) => k.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    return {
      keyword,
      hasContent: matches.length > 0,
      matchingContent: matches.map((m) => m.title),
      recommendation: matches.length > 0
        ? "Update existing content to better target this keyword"
        : "Create new content targeting this keyword",
    };
  });
}
