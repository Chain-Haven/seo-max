import { getAIProvider } from "@/lib/ai/provider";

export interface CannibalizationIssue {
  keyword: string;
  competingPages: Array<{
    url: string;
    title: string;
    source: "product" | "page" | "blog";
    targetKeywords: string[];
    wordCount?: number;
    lastUpdated?: Date;
  }>;
  severity: "high" | "medium" | "low";
  recommendation: string;
  suggestedAction: "merge" | "differentiate" | "redirect" | "delete";
}

export interface CannibalizationReport {
  totalIssues: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  issues: CannibalizationIssue[];
  estimatedTrafficLoss: number;
  recommendations: string[];
}

// Detect cannibalization from page data
export function detectCannibalization(
  pages: Array<{
    url: string;
    title: string;
    source: "product" | "page" | "blog";
    targetKeyword?: string;
    keywords?: string[];
    metaDescription?: string;
    wordCount?: number;
    lastUpdated?: Date;
  }>
): CannibalizationReport {
  const issues: CannibalizationIssue[] = [];
  const keywordPageMap = new Map<string, typeof pages>();
  
  // Build keyword -> pages map
  for (const page of pages) {
    const pageKeywords = new Set<string>();
    
    // Add explicit target keyword
    if (page.targetKeyword) {
      pageKeywords.add(page.targetKeyword.toLowerCase().trim());
    }
    
    // Add other keywords
    if (page.keywords) {
      for (const kw of page.keywords) {
        pageKeywords.add(kw.toLowerCase().trim());
      }
    }
    
    // Extract keywords from title
    const titleKeywords = extractKeywordsFromTitle(page.title);
    for (const kw of titleKeywords) {
      pageKeywords.add(kw);
    }
    
    // Add to map
    for (const kw of pageKeywords) {
      if (kw.length < 3) continue; // Skip very short keywords
      
      const existing = keywordPageMap.get(kw) || [];
      existing.push(page);
      keywordPageMap.set(kw, existing);
    }
  }
  
  // Find cannibalization (keywords with multiple pages)
  for (const [keyword, competingPages] of keywordPageMap.entries()) {
    if (competingPages.length < 2) continue;
    
    // Calculate severity
    let severity: CannibalizationIssue["severity"] = "low";
    
    // High severity if same source type (e.g., two blog posts)
    const sourceTypes = new Set(competingPages.map((p) => p.source));
    if (sourceTypes.size < competingPages.length) {
      severity = "high";
    }
    
    // High severity if pages have similar titles
    const titleSimilarity = calculateTitleSimilarity(competingPages.map((p) => p.title));
    if (titleSimilarity > 0.7) {
      severity = "high";
    } else if (titleSimilarity > 0.5) {
      severity = severity === "high" ? "high" : "medium";
    }
    
    // Generate recommendation
    const { recommendation, action } = generateRecommendation(keyword, competingPages, severity);
    
    issues.push({
      keyword,
      competingPages: competingPages.map((p) => ({
        url: p.url,
        title: p.title,
        source: p.source,
        targetKeywords: p.keywords || [],
        wordCount: p.wordCount,
        lastUpdated: p.lastUpdated,
      })),
      severity,
      recommendation,
      suggestedAction: action,
    });
  }
  
  // Sort by severity
  issues.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  // Calculate stats
  const highSeverity = issues.filter((i) => i.severity === "high").length;
  const mediumSeverity = issues.filter((i) => i.severity === "medium").length;
  const lowSeverity = issues.filter((i) => i.severity === "low").length;
  
  // Estimate traffic loss (simplified)
  const estimatedTrafficLoss = highSeverity * 100 + mediumSeverity * 50 + lowSeverity * 10;
  
  // Generate overall recommendations
  const recommendations: string[] = [];
  
  if (highSeverity > 0) {
    recommendations.push(`Address ${highSeverity} high-severity cannibalization issues immediately`);
  }
  
  if (issues.some((i) => i.suggestedAction === "merge")) {
    recommendations.push("Consider consolidating duplicate content into comprehensive guides");
  }
  
  if (issues.some((i) => i.suggestedAction === "differentiate")) {
    recommendations.push("Update page titles and focus keywords to differentiate competing pages");
  }
  
  return {
    totalIssues: issues.length,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    issues,
    estimatedTrafficLoss,
    recommendations,
  };
}

// Extract likely target keywords from title
function extractKeywordsFromTitle(title: string): string[] {
  const keywords: string[] = [];
  const cleaned = title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Add full title as potential keyword
  if (cleaned.length > 10 && cleaned.length < 60) {
    keywords.push(cleaned);
  }
  
  // Extract n-grams (2-4 words)
  const words = cleaned.split(" ");
  
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(" ");
      if (ngram.length >= 10 && !isStopWordPhrase(ngram)) {
        keywords.push(ngram);
      }
    }
  }
  
  return keywords;
}

// Check if phrase is mostly stop words
function isStopWordPhrase(phrase: string): boolean {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "this", "that",
    "these", "those", "it", "its", "you", "your", "we", "our", "they", "their",
  ]);
  
  const words = phrase.split(" ");
  const stopWordCount = words.filter((w) => stopWords.has(w)).length;
  
  return stopWordCount / words.length > 0.6;
}

// Calculate similarity between titles
function calculateTitleSimilarity(titles: string[]): number {
  if (titles.length < 2) return 0;
  
  let totalSimilarity = 0;
  let comparisons = 0;
  
  for (let i = 0; i < titles.length; i++) {
    for (let j = i + 1; j < titles.length; j++) {
      totalSimilarity += cosineSimilarity(titles[i], titles[j]);
      comparisons++;
    }
  }
  
  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

// Simple cosine similarity using word overlap
function cosineSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  
  const magnitude1 = Math.sqrt(words1.size);
  const magnitude2 = Math.sqrt(words2.size);
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return intersection.size / (magnitude1 * magnitude2);
}

// Generate recommendation based on competing pages
function generateRecommendation(
  keyword: string,
  pages: Array<{ source: string; title: string; wordCount?: number; lastUpdated?: Date }>,
  severity: string
): { recommendation: string; action: CannibalizationIssue["suggestedAction"] } {
  const sources = new Set(pages.map((p) => p.source));
  const hasMultipleSameSource = sources.size < pages.length;
  
  // If same content type and high severity, suggest merge
  if (hasMultipleSameSource && severity === "high") {
    const longestPage = pages.reduce((a, b) => 
      (a.wordCount || 0) > (b.wordCount || 0) ? a : b
    );
    return {
      recommendation: `Merge competing ${pages[0].source}s into "${longestPage.title}" and redirect others`,
      action: "merge",
    };
  }
  
  // If different content types, suggest differentiation
  if (sources.size === pages.length) {
    return {
      recommendation: `Differentiate focus: Update titles and target different variations of "${keyword}"`,
      action: "differentiate",
    };
  }
  
  // If one page is clearly older/shorter, suggest redirect
  const newestPage = pages.reduce((a, b) => {
    if (!a.lastUpdated) return b;
    if (!b.lastUpdated) return a;
    return a.lastUpdated > b.lastUpdated ? a : b;
  });
  
  return {
    recommendation: `Keep "${newestPage.title}" as primary, redirect or delete others`,
    action: "redirect",
  };
}

// AI-powered deeper analysis
export async function analyzeCanibalizationWithAI(
  issues: CannibalizationIssue[]
): Promise<Array<{
  keyword: string;
  analysis: string;
  suggestedTitles: string[];
  contentStrategy: string;
}>> {
  if (issues.length === 0) return [];
  
  const ai = getAIProvider();
  
  const issuesSummary = issues.slice(0, 10).map((issue) => ({
    keyword: issue.keyword,
    pages: issue.competingPages.map((p) => ({
      title: p.title,
      source: p.source,
    })),
  }));
  
  const prompt = `Analyze these keyword cannibalization issues and provide strategic recommendations:

${JSON.stringify(issuesSummary, null, 2)}

For each keyword, provide:
1. Why this cannibalization is harmful
2. Suggested new titles to differentiate each page
3. Content strategy to eliminate competition

Format as JSON array:
[
  {
    "keyword": "keyword here",
    "analysis": "Why this is a problem",
    "suggestedTitles": ["New title for page 1", "New title for page 2"],
    "contentStrategy": "How to differentiate"
  }
]`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 2000 });
    const match = response.content.match(/\[[\s\S]*\]/);
    
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (error) {
    console.error("AI cannibalization analysis error:", error);
  }
  
  return [];
}

// Get resolution suggestions
export function getResolutionSuggestions(
  issue: CannibalizationIssue
): Array<{
  action: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  steps: string[];
}> {
  const suggestions: Array<{
    action: string;
    effort: "low" | "medium" | "high";
    impact: "low" | "medium" | "high";
    steps: string[];
  }> = [];
  
  // Always suggest differentiation
  suggestions.push({
    action: "Differentiate Focus Keywords",
    effort: "low",
    impact: "medium",
    steps: [
      `Update title of secondary pages to target related but different keywords`,
      `Modify meta descriptions to reflect new focus`,
      `Update H1 and first paragraph to emphasize new keyword`,
      `Add internal link from secondary page to primary page`,
    ],
  });
  
  // Suggest merge if multiple same-type pages
  if (issue.competingPages.filter((p) => p.source === issue.competingPages[0].source).length > 1) {
    suggestions.push({
      action: "Merge Into Single Comprehensive Page",
      effort: "high",
      impact: "high",
      steps: [
        `Identify the strongest performing page as the target`,
        `Combine unique content from all competing pages`,
        `Set up 301 redirects from merged pages to target`,
        `Update internal links to point to consolidated page`,
      ],
    });
  }
  
  // Suggest canonical if different URLs serve same content
  suggestions.push({
    action: "Implement Canonical Tags",
    effort: "low",
    impact: "medium",
    steps: [
      `Choose the primary page for this keyword`,
      `Add canonical tag pointing to primary page on all other pages`,
      `Consider adding noindex to secondary pages if truly duplicate`,
    ],
  });
  
  return suggestions;
}
