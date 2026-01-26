/**
 * Answer Engine Optimization (AEO) Tools
 * Optimize content for AI-driven search results (ChatGPT, Bing Chat, voice assistants)
 */

import { getAIProvider } from "./provider";

export interface AEOAnalysis {
  score: number; // 0-100
  directAnswerability: number;
  structuredDataReady: boolean;
  voiceSearchReady: boolean;
  issues: AEOIssue[];
  recommendations: string[];
  suggestedQA: QAPair[];
}

export interface AEOIssue {
  type: "missing_qa" | "no_direct_answer" | "poor_structure" | "missing_schema" | "too_complex";
  severity: "high" | "medium" | "low";
  description: string;
  fix: string;
}

export interface QAPair {
  question: string;
  answer: string;
  answerType: "definition" | "how_to" | "list" | "comparison" | "fact";
}

export interface FeaturedSnippetOpportunity {
  type: "paragraph" | "list" | "table" | "video";
  targetQuery: string;
  currentContent: string;
  optimizedContent: string;
  probability: "high" | "medium" | "low";
}

// Analyze content for AEO optimization
export async function analyzeAEO(
  content: string,
  options: {
    title?: string;
    targetQueries?: string[];
    contentType: "product" | "page" | "blog" | "faq";
  }
): Promise<AEOAnalysis> {
  const ai = getAIProvider();

  const prompt = `You are an Answer Engine Optimization (AEO) expert. Analyze this content for optimization in AI-driven search (ChatGPT, Google SGE, Bing Chat, voice search).

CONTENT:
Title: ${options.title || "Not provided"}
Type: ${options.contentType}
Target Queries: ${options.targetQueries?.join(", ") || "Not specified"}

CONTENT BODY:
${content.substring(0, 6000)}

Analyze and return JSON:
{
  "score": <0-100 AEO readiness score>,
  "directAnswerability": <0-100 how well content provides direct answers>,
  "structuredDataReady": <boolean - has proper structure for AI extraction>,
  "voiceSearchReady": <boolean - suitable for voice search responses>,
  "issues": [
    {
      "type": "missing_qa|no_direct_answer|poor_structure|missing_schema|too_complex",
      "severity": "high|medium|low",
      "description": "<issue description>",
      "fix": "<how to fix>"
    }
  ],
  "recommendations": ["<recommendation 1>", ...],
  "suggestedQA": [
    {
      "question": "<question this content should answer>",
      "answer": "<concise answer extracted/generated from content>",
      "answerType": "definition|how_to|list|comparison|fact"
    }
  ]
}

Consider:
1. Does content directly answer likely questions?
2. Are answers concise (40-60 words for featured snippets)?
3. Is there proper Q&A structure?
4. Could AI easily extract key information?
5. Is language natural for voice queries?

Return ONLY valid JSON.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 2000,
    temperature: 0.3,
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
    score: 50,
    directAnswerability: 50,
    structuredDataReady: false,
    voiceSearchReady: false,
    issues: [
      {
        type: "poor_structure",
        severity: "medium",
        description: "Content could be better structured for AI extraction",
        fix: "Add clear headings and Q&A sections",
      },
    ],
    recommendations: [
      "Add FAQ section with common questions",
      "Include direct, concise answers to key questions",
      "Use clear heading hierarchy",
    ],
    suggestedQA: [],
  };
}

// Generate Q&A pairs from content
export async function generateQAPairs(
  content: string,
  options: {
    topic: string;
    targetAudience?: string;
    numPairs?: number;
  }
): Promise<QAPair[]> {
  const ai = getAIProvider();

  const prompt = `Generate ${options.numPairs || 5} Q&A pairs from this content that would be valuable for:
1. Featured snippets
2. Voice search answers
3. AI chatbot responses

TOPIC: ${options.topic}
AUDIENCE: ${options.targetAudience || "General"}

CONTENT:
${content.substring(0, 4000)}

Return JSON array:
[
  {
    "question": "<natural question users would ask>",
    "answer": "<concise, direct answer (40-60 words)>",
    "answerType": "definition|how_to|list|comparison|fact"
  }
]

Questions should:
- Start with What, How, Why, When, Where, Who
- Match natural voice search queries
- Have clear, factual answers

Return ONLY valid JSON array.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 1500,
    temperature: 0.5,
  });

  try {
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // ignore
  }

  return [];
}

// Optimize content for featured snippets
export async function optimizeForFeaturedSnippet(
  content: string,
  targetQuery: string,
  snippetType: "paragraph" | "list" | "table"
): Promise<FeaturedSnippetOpportunity> {
  const ai = getAIProvider();

  const prompt = `Optimize this content to win the featured snippet for "${targetQuery}".

TARGET SNIPPET TYPE: ${snippetType}

CURRENT CONTENT:
${content.substring(0, 2000)}

${snippetType === "paragraph" ? `
For PARAGRAPH snippets:
- Provide a direct answer in 40-60 words
- Start with a definition or direct statement
- Include the query terms naturally
` : snippetType === "list" ? `
For LIST snippets:
- Create a numbered or bulleted list
- 5-8 items work best
- Each item should be concise (under 10 words)
- Start with an intro sentence
` : `
For TABLE snippets:
- Create a comparison table
- Include 3-5 columns
- 4-8 rows of data
- Clear headers
`}

Return JSON:
{
  "type": "${snippetType}",
  "targetQuery": "${targetQuery}",
  "currentContent": "<relevant excerpt from current content>",
  "optimizedContent": "<optimized version for featured snippet>",
  "probability": "high|medium|low"
}

Return ONLY valid JSON.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 1000,
    temperature: 0.4,
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
    type: snippetType,
    targetQuery,
    currentContent: content.substring(0, 200),
    optimizedContent: content.substring(0, 200),
    probability: "low",
  };
}

// Generate voice search optimized content
export async function optimizeForVoiceSearch(
  content: string,
  targetQueries: string[]
): Promise<{
  optimizedContent: string;
  speakableHighlights: string[];
  voiceSearchScore: number;
}> {
  const ai = getAIProvider();

  const prompt = `Optimize this content for voice search and AI assistants.

TARGET VOICE QUERIES:
${targetQueries.map((q) => `- "${q}"`).join("\n")}

CURRENT CONTENT:
${content.substring(0, 4000)}

Create content that:
1. Uses natural, conversational language
2. Provides direct answers to voice queries
3. Uses simple sentence structure
4. Includes "speakable" highlights AI can read aloud

Return JSON:
{
  "optimizedContent": "<full optimized content with voice-friendly structure>",
  "speakableHighlights": ["<key sentence 1 for AI to speak>", "<key sentence 2>", ...],
  "voiceSearchScore": <0-100>
}

Return ONLY valid JSON.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 3000,
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
    optimizedContent: content,
    speakableHighlights: [],
    voiceSearchScore: 50,
  };
}

// Generate structured summary for AI extraction
export async function generateAISummary(
  content: string,
  options: {
    title: string;
    entityType: "product" | "service" | "article" | "how_to" | "faq";
  }
): Promise<{
  summary: string;
  keyFacts: string[];
  entities: Array<{ name: string; type: string; description: string }>;
  citations: string[];
}> {
  const ai = getAIProvider();

  const prompt = `Create a structured summary of this content that AI systems can easily parse and cite.

TITLE: ${options.title}
TYPE: ${options.entityType}

CONTENT:
${content.substring(0, 5000)}

Return JSON:
{
  "summary": "<2-3 sentence summary AI can quote>",
  "keyFacts": ["<fact 1>", "<fact 2>", ...],
  "entities": [
    {"name": "<entity name>", "type": "<person|organization|product|concept>", "description": "<brief description>"}
  ],
  "citations": ["<quotable statement 1>", "<quotable statement 2>", ...]
}

Make content:
- Factual and verifiable
- Easy to quote/cite
- Properly attributed
- Neutral in tone

Return ONLY valid JSON.`;

  const response = await ai.generateText(prompt, {
    maxTokens: 1500,
    temperature: 0.3,
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
    summary: content.substring(0, 200),
    keyFacts: [],
    entities: [],
    citations: [],
  };
}
