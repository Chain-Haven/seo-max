/**
 * Auto-keyword suggestion from content analysis
 */

import { getAIProvider } from "@/lib/ai/provider";

export interface KeywordSuggestion {
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  relevance: number; // 0-100
  reason: string;
}

/**
 * Extract and suggest keywords from page content
 */
export async function suggestKeywordsFromContent(
  content: {
    title: string | null;
    h1Tags: string[];
    h2Tags: string[];
    metaDescription: string | null;
    wordCount: number;
    url: string;
  },
  maxSuggestions: number = 10
): Promise<KeywordSuggestion[]> {
  const ai = getAIProvider();

  // Build content summary
  const contentText = [
    content.title,
    ...content.h1Tags,
    ...content.h2Tags.slice(0, 5),
    content.metaDescription,
  ]
    .filter(Boolean)
    .join(" ");

  if (!contentText || contentText.length < 10) {
    return [];
  }

  const prompt = `Analyze this page content and suggest ${maxSuggestions} relevant SEO keywords.

PAGE CONTENT:
Title: ${content.title || "N/A"}
H1: ${content.h1Tags[0] || "N/A"}
Meta Description: ${content.metaDescription || "N/A"}
H2 Headings: ${content.h2Tags.slice(0, 5).join(", ") || "N/A"}
URL: ${content.url}
Word Count: ${content.wordCount}

Suggest ${maxSuggestions} SEO keywords that:
1. Are relevant to the page content
2. Have good search potential
3. Match user intent
4. Include primary and long-tail variations

Return as JSON array:
[
  {
    "keyword": "primary keyword",
    "relevance": 95,
    "reason": "Why this keyword is relevant"
  },
  ...
]

Return ONLY valid JSON array, no additional text.`;

  try {
    const response = await ai.generateText(prompt, {
      maxTokens: 1000,
      temperature: 0.3,
    });

    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]) as Array<{
        keyword: string;
        relevance: number;
        reason: string;
      }>;

      return suggestions.map((s) => ({
        keyword: s.keyword,
        searchVolume: null, // Would need API call to get actual volume
        difficulty: null, // Would need API call to get actual difficulty
        relevance: s.relevance,
        reason: s.reason,
      }));
    }
  } catch (error) {
    console.error("Keyword suggestion error:", error);
  }

  // Fallback: simple keyword extraction
  return extractSimpleKeywords(contentText, maxSuggestions);
}

/**
 * Simple keyword extraction fallback
 */
function extractSimpleKeywords(text: string, max: number): KeywordSuggestion[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const stopWords = new Set([
    "this", "that", "these", "those", "with", "from", "have", "been", "will",
    "would", "should", "could", "what", "which", "when", "where", "there",
  ]);

  const wordFreq = new Map<string, number>();
  for (const word of words) {
    if (!stopWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  // Create 2-3 word phrases
  const phrases = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
    }
  }

  // Combine and sort
  const allKeywords = Array.from(phrases.entries())
    .map(([keyword, count]) => ({
      keyword,
      relevance: Math.min(100, count * 10),
      reason: `Appears ${count} times in content`,
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, max);

  return allKeywords.map((k) => ({
    keyword: k.keyword,
    searchVolume: null,
    difficulty: null,
    relevance: k.relevance,
    reason: k.reason,
  }));
}
