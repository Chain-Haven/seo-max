import { getAIProvider } from "./provider";

export interface CompetitorResult {
  position: number;
  url: string;
  title: string;
  snippet: string;
  domain: string;
}

export interface ContentAnalysis {
  avgWordCount: number;
  commonHeadings: string[];
  commonTopics: string[];
  contentGaps: string[];
  keyEntities: string[];
  suggestedOutline: string[];
  featuredSnippetOpportunity: boolean;
  recommendedWordCount: { min: number; max: number };
}

export interface PeopleAlsoAsk {
  question: string;
  snippet?: string;
}

export interface SerpAnalysis {
  keyword: string;
  competitors: CompetitorResult[];
  peopleAlsoAsk: PeopleAlsoAsk[];
  relatedSearches: string[];
  contentAnalysis: ContentAnalysis;
  searchIntent: "informational" | "transactional" | "navigational" | "commercial";
}

// Simulate SERP data for development (replace with real API in production)
function generateSimulatedSerpData(keyword: string): {
  competitors: CompetitorResult[];
  peopleAlsoAsk: PeopleAlsoAsk[];
  relatedSearches: string[];
} {
  const domain = keyword.toLowerCase().replace(/\s+/g, "-");
  
  const competitors: CompetitorResult[] = [
    {
      position: 1,
      url: `https://www.example1.com/${domain}-guide`,
      title: `The Ultimate Guide to ${keyword} in 2024`,
      snippet: `Learn everything about ${keyword}. This comprehensive guide covers tips, best practices, and expert advice...`,
      domain: "example1.com",
    },
    {
      position: 2,
      url: `https://www.example2.com/${domain}`,
      title: `${keyword}: Complete Beginner's Guide`,
      snippet: `New to ${keyword}? Start here. We break down the basics and help you understand...`,
      domain: "example2.com",
    },
    {
      position: 3,
      url: `https://www.example3.com/blog/${domain}`,
      title: `10 Best ${keyword} Tips You Need to Know`,
      snippet: `Discover the top tips for ${keyword} that experts recommend. From basics to advanced strategies...`,
      domain: "example3.com",
    },
    {
      position: 4,
      url: `https://www.example4.com/${domain}-explained`,
      title: `${keyword} Explained: Everything You Should Know`,
      snippet: `A detailed explanation of ${keyword}, including how it works, benefits, and common mistakes...`,
      domain: "example4.com",
    },
    {
      position: 5,
      url: `https://www.example5.com/reviews/${domain}`,
      title: `${keyword} Review: Pros, Cons & Alternatives`,
      snippet: `Our honest review of ${keyword}. We tested and compared to help you make the best decision...`,
      domain: "example5.com",
    },
  ];

  const peopleAlsoAsk: PeopleAlsoAsk[] = [
    { question: `What is ${keyword}?`, snippet: `${keyword} is...` },
    { question: `How does ${keyword} work?`, snippet: `${keyword} works by...` },
    { question: `Is ${keyword} worth it?`, snippet: `Whether ${keyword} is worth it depends on...` },
    { question: `What are the benefits of ${keyword}?`, snippet: `The main benefits include...` },
    { question: `How much does ${keyword} cost?`, snippet: `${keyword} typically costs...` },
    { question: `What are alternatives to ${keyword}?`, snippet: `Popular alternatives include...` },
    { question: `How to choose the best ${keyword}?`, snippet: `When choosing ${keyword}, consider...` },
    { question: `Is ${keyword} safe?`, snippet: `${keyword} is generally considered safe when...` },
  ];

  const relatedSearches = [
    `${keyword} for beginners`,
    `best ${keyword} 2024`,
    `${keyword} vs alternatives`,
    `${keyword} tips and tricks`,
    `how to use ${keyword}`,
    `${keyword} reviews`,
    `${keyword} price comparison`,
    `${keyword} pros and cons`,
  ];

  return { competitors, peopleAlsoAsk, relatedSearches };
}

// Analyze competitor content using AI
export async function analyzeCompetitorContent(
  keyword: string,
  productContext?: { name: string; category: string; description: string }
): Promise<SerpAnalysis> {
  const ai = getAIProvider();
  
  // Get SERP data (simulated for now, can integrate real API)
  const serpData = generateSimulatedSerpData(keyword);
  
  // Use AI to analyze and provide recommendations
  const analysisPrompt = `Analyze the search intent and content requirements for the keyword: "${keyword}"
${productContext ? `\nProduct context: ${productContext.name} - ${productContext.category}\n${productContext.description}` : ""}

Top ranking titles:
${serpData.competitors.map((c, i) => `${i + 1}. ${c.title}`).join("\n")}

People Also Ask questions:
${serpData.peopleAlsoAsk.map((p) => `- ${p.question}`).join("\n")}

Based on this data, provide:
1. Search intent (informational, transactional, navigational, or commercial)
2. Recommended word count range
3. Key topics that should be covered
4. Common headings/sections used
5. Content gaps (topics competitors might be missing)
6. Key entities to include
7. A suggested outline for a comprehensive article

Format your response as JSON:
{
  "searchIntent": "informational",
  "wordCount": { "min": 1500, "max": 2500 },
  "commonTopics": ["topic1", "topic2"],
  "commonHeadings": ["heading1", "heading2"],
  "contentGaps": ["gap1", "gap2"],
  "keyEntities": ["entity1", "entity2"],
  "suggestedOutline": ["H2: Section 1", "H3: Subsection", "H2: Section 2"],
  "featuredSnippetOpportunity": true
}`;

  try {
    const response = await ai.generateText(analysisPrompt, { maxTokens: 1500 });
    
    // Parse AI response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    let analysis: ContentAnalysis;
    let searchIntent: SerpAnalysis["searchIntent"] = "informational";
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      searchIntent = parsed.searchIntent || "informational";
      analysis = {
        avgWordCount: (parsed.wordCount?.min + parsed.wordCount?.max) / 2 || 2000,
        commonHeadings: parsed.commonHeadings || [],
        commonTopics: parsed.commonTopics || [],
        contentGaps: parsed.contentGaps || [],
        keyEntities: parsed.keyEntities || [],
        suggestedOutline: parsed.suggestedOutline || [],
        featuredSnippetOpportunity: parsed.featuredSnippetOpportunity || false,
        recommendedWordCount: parsed.wordCount || { min: 1500, max: 2500 },
      };
    } else {
      // Fallback defaults
      analysis = {
        avgWordCount: 2000,
        commonHeadings: [],
        commonTopics: [keyword],
        contentGaps: [],
        keyEntities: [],
        suggestedOutline: [],
        featuredSnippetOpportunity: false,
        recommendedWordCount: { min: 1500, max: 2500 },
      };
    }

    return {
      keyword,
      competitors: serpData.competitors,
      peopleAlsoAsk: serpData.peopleAlsoAsk,
      relatedSearches: serpData.relatedSearches,
      contentAnalysis: analysis,
      searchIntent,
    };
  } catch (error) {
    console.error("Error analyzing competitors:", error);
    
    // Return basic analysis on error
    return {
      keyword,
      competitors: serpData.competitors,
      peopleAlsoAsk: serpData.peopleAlsoAsk,
      relatedSearches: serpData.relatedSearches,
      contentAnalysis: {
        avgWordCount: 2000,
        commonHeadings: [],
        commonTopics: [keyword],
        contentGaps: [],
        keyEntities: [],
        suggestedOutline: [],
        featuredSnippetOpportunity: false,
        recommendedWordCount: { min: 1500, max: 2500 },
      },
      searchIntent: "informational",
    };
  }
}

// Get People Also Ask questions for a keyword
export async function getPeopleAlsoAsk(keyword: string): Promise<PeopleAlsoAsk[]> {
  // In production, this would call a real SERP API
  // For now, generate relevant questions using AI
  const ai = getAIProvider();
  
  const prompt = `Generate 8 realistic "People Also Ask" questions that would appear in Google search results for the keyword: "${keyword}"

These should be actual questions people search for. Format as JSON array:
[
  { "question": "Question 1?" },
  { "question": "Question 2?" }
]`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 500 });
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Error getting PAA:", error);
  }
  
  // Fallback
  return generateSimulatedSerpData(keyword).peopleAlsoAsk;
}
