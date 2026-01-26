/**
 * AI-Powered SEO Content Analyzer
 * Analyzes content for SEO optimization and provides actionable recommendations
 */

import { getAIProvider } from "./provider";

export interface SEOAnalysisResult {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: SEORecommendation[];
  keywordAnalysis: KeywordAnalysis;
  readabilityScore: number;
  contentLength: ContentLengthAnalysis;
  structureAnalysis: StructureAnalysis;
}

export interface SEORecommendation {
  priority: "high" | "medium" | "low";
  category: "content" | "keywords" | "structure" | "technical" | "aeo";
  title: string;
  description: string;
  impact: string;
  action: string;
}

export interface KeywordAnalysis {
  primaryKeyword: string | null;
  keywordDensity: number;
  relatedKeywords: string[];
  missingKeywords: string[];
  overusedKeywords: string[];
}

export interface ContentLengthAnalysis {
  wordCount: number;
  recommended: number;
  status: "too_short" | "optimal" | "too_long";
}

export interface StructureAnalysis {
  hasH1: boolean;
  headingHierarchy: boolean;
  hasFAQ: boolean;
  hasLists: boolean;
  hasImages: boolean;
  hasInternalLinks: boolean;
  hasExternalLinks: boolean;
}

// Analyze content for SEO optimization
export async function analyzeContentSEO(
  content: string,
  options: {
    title?: string;
    metaDescription?: string;
    targetKeyword?: string;
    contentType: "product" | "page" | "blog" | "category";
    industry?: string;
  }
): Promise<SEOAnalysisResult> {
  const ai = getAIProvider();

  const prompt = `You are an expert SEO analyst. Analyze the following content and provide a comprehensive SEO assessment.

CONTENT TO ANALYZE:
Title: ${options.title || "Not provided"}
Meta Description: ${options.metaDescription || "Not provided"}
Target Keyword: ${options.targetKeyword || "Not specified"}
Content Type: ${options.contentType}
Industry: ${options.industry || "General"}

CONTENT:
${content.substring(0, 8000)}

Provide your analysis in the following JSON format:
{
  "score": <number 0-100>,
  "summary": "<2-3 sentence summary of SEO health>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "content|keywords|structure|technical|aeo",
      "title": "<recommendation title>",
      "description": "<detailed description>",
      "impact": "<expected SEO impact>",
      "action": "<specific action to take>"
    }
  ],
  "keywordAnalysis": {
    "primaryKeyword": "<detected or suggested primary keyword>",
    "keywordDensity": <percentage>,
    "relatedKeywords": ["<keyword 1>", "<keyword 2>", ...],
    "missingKeywords": ["<keyword that should be added>", ...],
    "overusedKeywords": ["<overused keyword>", ...]
  },
  "readabilityScore": <number 0-100>,
  "contentLength": {
    "wordCount": <number>,
    "recommended": <recommended word count for this content type>,
    "status": "too_short|optimal|too_long"
  },
  "structureAnalysis": {
    "hasH1": <boolean>,
    "headingHierarchy": <boolean - proper H1>H2>H3 structure>,
    "hasFAQ": <boolean>,
    "hasLists": <boolean>,
    "hasImages": <boolean - mentions of images or img tags>,
    "hasInternalLinks": <boolean>,
    "hasExternalLinks": <boolean>
  }
}

Consider:
1. Keyword optimization and placement
2. Content structure and hierarchy
3. Answer Engine Optimization (AEO) - is content structured for AI/voice search?
4. User intent alignment
5. E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness)
6. Featured snippet opportunities
7. Content comprehensiveness

Return ONLY valid JSON, no additional text.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 2000,
    temperature: 0.3,
  });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Calculate grade from score
    const grade = getGradeFromScore(analysis.score);

    return {
      ...analysis,
      grade,
    };
  } catch {
    // Return default analysis if parsing fails
    return getDefaultAnalysis(content, options);
  }
}

function getGradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getDefaultAnalysis(
  content: string,
  options: { contentType: string }
): SEOAnalysisResult {
  const wordCount = content.split(/\s+/).length;
  const recommendedLength =
    options.contentType === "blog"
      ? 1500
      : options.contentType === "product"
      ? 300
      : 500;

  return {
    score: 50,
    grade: "C",
    summary: "Unable to perform detailed analysis. Basic metrics shown.",
    strengths: [],
    weaknesses: ["Could not analyze content in detail"],
    recommendations: [
      {
        priority: "medium",
        category: "content",
        title: "Review content manually",
        description: "Automated analysis encountered issues",
        impact: "Unknown",
        action: "Review content structure and keywords manually",
      },
    ],
    keywordAnalysis: {
      primaryKeyword: null,
      keywordDensity: 0,
      relatedKeywords: [],
      missingKeywords: [],
      overusedKeywords: [],
    },
    readabilityScore: 70,
    contentLength: {
      wordCount,
      recommended: recommendedLength,
      status:
        wordCount < recommendedLength * 0.5
          ? "too_short"
          : wordCount > recommendedLength * 2
          ? "too_long"
          : "optimal",
    },
    structureAnalysis: {
      hasH1: content.includes("<h1") || content.includes("# "),
      headingHierarchy: true,
      hasFAQ: content.toLowerCase().includes("faq") || content.includes("?"),
      hasLists: content.includes("<ul") || content.includes("<ol") || content.includes("- "),
      hasImages: content.includes("<img") || content.includes("!["),
      hasInternalLinks: content.includes('href="/') || content.includes("](/"),
      hasExternalLinks: content.includes('href="http'),
    },
  };
}

// Generate content improvement suggestions
export async function generateContentImprovements(
  content: string,
  analysis: SEOAnalysisResult,
  targetKeyword?: string
): Promise<string> {
  const ai = getAIProvider();

  const prompt = `Based on this SEO analysis, rewrite and improve the following content.

CURRENT SEO SCORE: ${analysis.score}/100
WEAKNESSES TO ADDRESS:
${analysis.weaknesses.map((w) => `- ${w}`).join("\n")}

TOP RECOMMENDATIONS:
${analysis.recommendations
  .filter((r) => r.priority === "high")
  .map((r) => `- ${r.title}: ${r.action}`)
  .join("\n")}

MISSING KEYWORDS TO INCLUDE:
${analysis.keywordAnalysis.missingKeywords.join(", ") || "None specified"}

TARGET KEYWORD: ${targetKeyword || analysis.keywordAnalysis.primaryKeyword || "Not specified"}

ORIGINAL CONTENT:
${content.substring(0, 6000)}

Provide an improved version that:
1. Addresses the identified weaknesses
2. Incorporates missing keywords naturally
3. Improves structure with proper headings
4. Adds FAQ section if missing
5. Optimizes for featured snippets where possible
6. Maintains the original message and brand voice

Return the improved content in HTML format.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 4000,
    temperature: 0.7,
  });
  
  return response.content;
}

// Analyze competitor content
export async function analyzeCompetitorContent(
  yourContent: string,
  competitorUrls: string[],
  targetKeyword: string
): Promise<{
  gaps: string[];
  opportunities: string[];
  competitorStrengths: string[];
  recommendations: string[];
}> {
  const ai = getAIProvider();

  const prompt = `You are an SEO competitive analyst. Analyze how to improve this content to outrank competitors.

TARGET KEYWORD: ${targetKeyword}

YOUR CONTENT (excerpt):
${yourContent.substring(0, 3000)}

COMPETITOR URLS TO CONSIDER:
${competitorUrls.join("\n")}

Based on typical competitor content for "${targetKeyword}", identify:
1. Content gaps - topics your content is missing
2. Opportunities - areas where you could provide better coverage
3. Competitor strengths - what top-ranking content typically includes
4. Specific recommendations - actionable items to improve rankings

Return as JSON:
{
  "gaps": ["<gap 1>", "<gap 2>", ...],
  "opportunities": ["<opportunity 1>", ...],
  "competitorStrengths": ["<strength 1>", ...],
  "recommendations": ["<recommendation 1>", ...]
}

Return ONLY valid JSON.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 1500,
    temperature: 0.5,
  });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // ignore
  }

  return {
    gaps: [],
    opportunities: [],
    competitorStrengths: [],
    recommendations: ["Unable to analyze competitor content"],
  };
}
