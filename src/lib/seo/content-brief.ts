import { getAIProvider } from "@/lib/ai/provider";
import { analyzeSERP, getQuestionKeywords, type KeywordData } from "./keyword-research";

export interface ContentBrief {
  targetKeyword: string;
  searchIntent: string;
  titleSuggestions: string[];
  metaDescriptionSuggestion: string;
  recommendedWordCount: { min: number; max: number };
  outline: OutlineSection[];
  questionsToAnswer: string[];
  entitiesToInclude: string[];
  internalLinksToAdd: Array<{ anchorText: string; suggestedUrl: string }>;
  competitorInsights: {
    avgWordCount: number;
    commonHeadings: string[];
    contentGaps: string[];
    topCompetitors: Array<{ domain: string; title: string; wordCount: number }>;
  };
  serpFeatures: {
    hasFeaturedSnippet: boolean;
    hasPeopleAlsoAsk: boolean;
    hasLocalPack: boolean;
    hasVideo: boolean;
    recommendations: string[];
  };
  keywordVariations: string[];
  estimatedDifficulty: number;
  estimatedTrafficPotential: number;
}

export interface OutlineSection {
  type: "h2" | "h3" | "h4";
  title: string;
  description: string;
  suggestedWordCount: number;
  keyPoints: string[];
}

// Generate comprehensive content brief
export async function generateContentBrief(
  targetKeyword: string,
  options: {
    existingContent?: Array<{ title: string; url: string }>;
    productInfo?: { name: string; category: string; description: string };
    apiLogin?: string;
    apiPassword?: string;
  } = {}
): Promise<ContentBrief> {
  const ai = getAIProvider();
  
  // Get SERP analysis
  const serpAnalysis = await analyzeSERP(targetKeyword, {
    apiLogin: options.apiLogin,
    apiPassword: options.apiPassword,
  });
  
  // Get question keywords
  const questions = await getQuestionKeywords(targetKeyword, {
    apiLogin: options.apiLogin,
    apiPassword: options.apiPassword,
  });
  
  // Generate comprehensive brief using AI
  const prompt = `Create a detailed content brief for the keyword: "${targetKeyword}"

${options.productInfo ? `Product context: ${options.productInfo.name} (${options.productInfo.category}) - ${options.productInfo.description}` : ""}

SERP Analysis:
- Difficulty: ${serpAnalysis.difficulty}/100
- SERP Features: ${serpAnalysis.serpFeatures.join(", ") || "None detected"}
- Top Results: ${serpAnalysis.topResults.slice(0, 3).map((r) => r.title).join("; ")}

Related Questions:
${questions.slice(0, 5).map((q) => `- ${q.question}`).join("\n")}

Create a comprehensive content brief including:

1. TITLE SUGGESTIONS (3 options, SEO-optimized, under 60 chars)
2. META DESCRIPTION (compelling, under 160 chars, includes keyword)
3. RECOMMENDED WORD COUNT (based on competition)
4. DETAILED OUTLINE with H2/H3 structure and key points for each section
5. KEY ENTITIES to mention (brands, people, concepts)
6. INTERNAL LINKING opportunities
7. CONTENT GAPS (what competitors miss)
8. KEYWORD VARIATIONS to include naturally

Format as JSON:
{
  "titleSuggestions": ["Title 1", "Title 2", "Title 3"],
  "metaDescriptionSuggestion": "Meta description here",
  "recommendedWordCount": {"min": 1500, "max": 2500},
  "outline": [
    {
      "type": "h2",
      "title": "Section Title",
      "description": "What to cover",
      "suggestedWordCount": 300,
      "keyPoints": ["Point 1", "Point 2"]
    }
  ],
  "questionsToAnswer": ["Question 1?", "Question 2?"],
  "entitiesToInclude": ["Entity 1", "Entity 2"],
  "internalLinks": [{"anchorText": "anchor", "suggestedUrl": "/related-page"}],
  "competitorGaps": ["Gap 1", "Gap 2"],
  "keywordVariations": ["variation 1", "variation 2"],
  "estimatedTrafficPotential": 500
}`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 3000 });
    const match = response.content.match(/\{[\s\S]*\}/);
    
    if (match) {
      const parsed = JSON.parse(match[0]);
      
      return {
        targetKeyword,
        searchIntent: detectSearchIntent(targetKeyword),
        titleSuggestions: parsed.titleSuggestions || [],
        metaDescriptionSuggestion: parsed.metaDescriptionSuggestion || "",
        recommendedWordCount: parsed.recommendedWordCount || { min: 1500, max: 2500 },
        outline: parsed.outline || [],
        questionsToAnswer: parsed.questionsToAnswer || questions.map((q) => q.question),
        entitiesToInclude: parsed.entitiesToInclude || [],
        internalLinksToAdd: parsed.internalLinks || [],
        competitorInsights: {
          avgWordCount: parsed.recommendedWordCount?.max || 2000,
          commonHeadings: parsed.outline?.map((o: OutlineSection) => o.title) || [],
          contentGaps: parsed.competitorGaps || [],
          topCompetitors: serpAnalysis.topResults.slice(0, 5).map((r) => ({
            domain: r.domain,
            title: r.title,
            wordCount: 1500, // Estimated
          })),
        },
        serpFeatures: {
          hasFeaturedSnippet: serpAnalysis.serpFeatures.includes("featured_snippet"),
          hasPeopleAlsoAsk: serpAnalysis.serpFeatures.includes("people_also_ask"),
          hasLocalPack: serpAnalysis.serpFeatures.includes("local_pack"),
          hasVideo: serpAnalysis.serpFeatures.includes("video"),
          recommendations: serpAnalysis.recommendations,
        },
        keywordVariations: parsed.keywordVariations || [],
        estimatedDifficulty: serpAnalysis.difficulty,
        estimatedTrafficPotential: parsed.estimatedTrafficPotential || 500,
      };
    }
  } catch (error) {
    console.error("Content brief generation error:", error);
  }
  
  // Return minimal brief on error
  return {
    targetKeyword,
    searchIntent: detectSearchIntent(targetKeyword),
    titleSuggestions: [targetKeyword],
    metaDescriptionSuggestion: `Learn everything about ${targetKeyword}. Comprehensive guide with expert insights.`,
    recommendedWordCount: { min: 1500, max: 2500 },
    outline: [],
    questionsToAnswer: questions.map((q) => q.question),
    entitiesToInclude: [],
    internalLinksToAdd: [],
    competitorInsights: {
      avgWordCount: 2000,
      commonHeadings: [],
      contentGaps: [],
      topCompetitors: [],
    },
    serpFeatures: {
      hasFeaturedSnippet: false,
      hasPeopleAlsoAsk: questions.length > 0,
      hasLocalPack: false,
      hasVideo: false,
      recommendations: [],
    },
    keywordVariations: [],
    estimatedDifficulty: 50,
    estimatedTrafficPotential: 500,
  };
}

// Detect search intent
function detectSearchIntent(keyword: string): string {
  const lower = keyword.toLowerCase();
  
  if (lower.match(/buy|price|cheap|discount|deal|coupon|order|purchase|shop/)) {
    return "transactional";
  }
  if (lower.match(/best|top|review|vs|comparison|alternative/)) {
    return "commercial";
  }
  if (lower.match(/how|what|why|when|where|who|which|guide|tutorial|learn/)) {
    return "informational";
  }
  if (lower.match(/login|sign in|official|website|contact/)) {
    return "navigational";
  }
  
  return "informational";
}

// Generate outline from brief
export function briefToOutlineText(brief: ContentBrief): string {
  let outline = `# ${brief.titleSuggestions[0] || brief.targetKeyword}\n\n`;
  outline += `*Target: ${brief.recommendedWordCount.min}-${brief.recommendedWordCount.max} words*\n\n`;
  
  for (const section of brief.outline) {
    const prefix = section.type === "h2" ? "## " : section.type === "h3" ? "### " : "#### ";
    outline += `${prefix}${section.title}\n`;
    outline += `${section.description}\n`;
    outline += `*${section.suggestedWordCount} words*\n`;
    
    if (section.keyPoints.length > 0) {
      outline += "\nKey points:\n";
      for (const point of section.keyPoints) {
        outline += `- ${point}\n`;
      }
    }
    outline += "\n";
  }
  
  if (brief.questionsToAnswer.length > 0) {
    outline += "## FAQ Section\n\n";
    for (const question of brief.questionsToAnswer.slice(0, 5)) {
      outline += `### ${question}\n\n`;
    }
  }
  
  return outline;
}

// Convert brief to content generation prompt
export function briefToPrompt(brief: ContentBrief): string {
  return `Write a comprehensive article about "${brief.targetKeyword}".

Search Intent: ${brief.searchIntent}

Title: ${brief.titleSuggestions[0]}

Structure to follow:
${brief.outline.map((s) => `${s.type === "h2" ? "##" : s.type === "h3" ? "###" : "####"} ${s.title}\n- ${s.description}\n- Include: ${s.keyPoints.join(", ")}\n- Target: ${s.suggestedWordCount} words`).join("\n\n")}

Questions to answer:
${brief.questionsToAnswer.map((q) => `- ${q}`).join("\n")}

Entities to mention naturally:
${brief.entitiesToInclude.join(", ")}

Keyword variations to include:
${brief.keywordVariations.join(", ")}

${brief.serpFeatures.hasFeaturedSnippet ? "IMPORTANT: Format key definitions and lists for featured snippet opportunity." : ""}
${brief.serpFeatures.hasPeopleAlsoAsk ? "IMPORTANT: Include FAQ section with schema-ready Q&A pairs." : ""}

Target length: ${brief.recommendedWordCount.min}-${brief.recommendedWordCount.max} words

Write in a clear, authoritative tone. Use proper heading hierarchy. Include specific examples and data where relevant.`;
}

// Analyze existing content against brief
export async function analyzeContentAgainstBrief(
  content: string,
  brief: ContentBrief
): Promise<{
  score: number;
  missingElements: string[];
  improvements: string[];
  wordCountStatus: "short" | "optimal" | "long";
}> {
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  
  const missingElements: string[] = [];
  const improvements: string[] = [];
  
  // Check word count
  let wordCountStatus: "short" | "optimal" | "long" = "optimal";
  if (wordCount < brief.recommendedWordCount.min) {
    wordCountStatus = "short";
    missingElements.push(`Content is ${brief.recommendedWordCount.min - wordCount} words short of minimum`);
  } else if (wordCount > brief.recommendedWordCount.max * 1.5) {
    wordCountStatus = "long";
    improvements.push("Content may be too long - consider splitting into multiple articles");
  }
  
  // Check for outline sections
  const contentLower = content.toLowerCase();
  for (const section of brief.outline) {
    const titleLower = section.title.toLowerCase();
    if (!contentLower.includes(titleLower) && !contentLower.includes(titleLower.replace(/\s+/g, " "))) {
      missingElements.push(`Missing section: ${section.title}`);
    }
  }
  
  // Check for questions
  for (const question of brief.questionsToAnswer.slice(0, 5)) {
    if (!contentLower.includes(question.toLowerCase().replace("?", ""))) {
      missingElements.push(`Doesn't answer: ${question}`);
    }
  }
  
  // Check for entities
  for (const entity of brief.entitiesToInclude.slice(0, 5)) {
    if (!contentLower.includes(entity.toLowerCase())) {
      improvements.push(`Consider mentioning: ${entity}`);
    }
  }
  
  // Check for keyword variations
  const keywordVariationsFound = brief.keywordVariations.filter((v) =>
    contentLower.includes(v.toLowerCase())
  ).length;
  if (keywordVariationsFound < brief.keywordVariations.length / 2) {
    improvements.push("Include more keyword variations for semantic coverage");
  }
  
  // Calculate score
  let score = 100;
  score -= missingElements.length * 10;
  score -= improvements.length * 5;
  score = Math.max(0, Math.min(100, score));
  
  return {
    score,
    missingElements,
    improvements,
    wordCountStatus,
  };
}
