/**
 * Real-time Content Optimization
 * Live SEO scoring and suggestions as content is being written
 */

export interface ContentOptimizationResult {
  score: number; // 0-100
  suggestions: ContentSuggestion[];
  keywordAnalysis: KeywordAnalysis;
  readability: ReadabilityScore;
  seoChecks: SEOCheck[];
}

export interface ContentSuggestion {
  type: "error" | "warning" | "improvement";
  category: string;
  message: string;
  fix?: string;
}

export interface KeywordAnalysis {
  focusKeyword: string | null;
  keywordDensity: number;
  keywordInTitle: boolean;
  keywordInDescription: boolean;
  keywordInH1: boolean;
  keywordInFirstParagraph: boolean;
  keywordCount: number;
  optimalCount: { min: number; max: number };
  variations: string[];
}

export interface ReadabilityScore {
  score: number; // 0-100
  grade: string; // e.g., "7th grade"
  fleschKincaid: number;
  avgSentenceLength: number;
  avgWordLength: number;
  passiveVoicePercentage: number;
  suggestions: string[];
}

export interface SEOCheck {
  name: string;
  passed: boolean;
  message: string;
  weight: number; // Impact on overall score
}

export function optimizeContent(
  content: string,
  metadata: {
    title?: string;
    description?: string;
    focusKeyword?: string;
  }
): ContentOptimizationResult {
  const suggestions: ContentSuggestion[] = [];
  const seoChecks: SEOCheck[] = [];

  // Extract content elements
  const wordCount = countWords(content);
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const headings = extractHeadings(content);

  // Keyword analysis
  const keywordAnalysis = analyzeKeywords(content, metadata.title, metadata.description, metadata.focusKeyword);

  // Readability
  const readability = calculateReadability(content);

  // SEO Checks
  
  // 1. Word count
  if (wordCount < 300) {
    seoChecks.push({
      name: "Word Count",
      passed: false,
      message: `Content is too short (${wordCount} words). Aim for at least 300 words.`,
      weight: 15,
    });
    suggestions.push({
      type: "error",
      category: "Content Length",
      message: `Add ${300 - wordCount} more words to meet minimum content length`,
    });
  } else if (wordCount < 600) {
    seoChecks.push({
      name: "Word Count",
      passed: true,
      message: `Good content length (${wordCount} words)`,
      weight: 15,
    });
    suggestions.push({
      type: "improvement",
      category: "Content Length",
      message: "Consider expanding to 1000+ words for better SEO performance",
    });
  } else {
    seoChecks.push({
      name: "Word Count",
      passed: true,
      message: `Excellent content length (${wordCount} words)`,
      weight: 15,
    });
  }

  // 2. Title optimization
  if (!metadata.title) {
    seoChecks.push({
      name: "SEO Title",
      passed: false,
      message: "Missing SEO title",
      weight: 20,
    });
    suggestions.push({
      type: "error",
      category: "Title",
      message: "Add an SEO title (50-60 characters)",
    });
  } else if (metadata.title.length < 30) {
    seoChecks.push({
      name: "SEO Title",
      passed: false,
      message: "Title is too short",
      weight: 20,
    });
    suggestions.push({
      type: "warning",
      category: "Title",
      message: `Title is ${metadata.title.length} characters. Aim for 50-60 characters.`,
    });
  } else if (metadata.title.length > 60) {
    seoChecks.push({
      name: "SEO Title",
      passed: false,
      message: "Title may be truncated in search results",
      weight: 20,
    });
    suggestions.push({
      type: "warning",
      category: "Title",
      message: `Title is ${metadata.title.length} characters. Keep under 60 to avoid truncation.`,
    });
  } else {
    seoChecks.push({
      name: "SEO Title",
      passed: true,
      message: "Title length is optimal",
      weight: 20,
    });
  }

  // 3. Meta description
  if (!metadata.description) {
    seoChecks.push({
      name: "Meta Description",
      passed: false,
      message: "Missing meta description",
      weight: 15,
    });
    suggestions.push({
      type: "error",
      category: "Meta Description",
      message: "Add a meta description (120-160 characters)",
    });
  } else if (metadata.description.length < 120) {
    seoChecks.push({
      name: "Meta Description",
      passed: false,
      message: "Meta description is too short",
      weight: 15,
    });
  } else if (metadata.description.length > 160) {
    seoChecks.push({
      name: "Meta Description",
      passed: false,
      message: "Meta description may be truncated",
      weight: 15,
    });
  } else {
    seoChecks.push({
      name: "Meta Description",
      passed: true,
      message: "Meta description length is optimal",
      weight: 15,
    });
  }

  // 4. Headings structure
  if (headings.h1.length === 0) {
    seoChecks.push({
      name: "H1 Tag",
      passed: false,
      message: "Missing H1 heading",
      weight: 10,
    });
    suggestions.push({
      type: "error",
      category: "Headings",
      message: "Add an H1 heading at the beginning of your content",
    });
  } else if (headings.h1.length > 1) {
    seoChecks.push({
      name: "H1 Tag",
      passed: false,
      message: "Multiple H1 tags detected",
      weight: 10,
    });
    suggestions.push({
      type: "warning",
      category: "Headings",
      message: "Use only one H1 tag per page",
    });
  } else {
    seoChecks.push({
      name: "H1 Tag",
      passed: true,
      message: "H1 structure is correct",
      weight: 10,
    });
  }

  if (headings.h2.length === 0) {
    suggestions.push({
      type: "warning",
      category: "Headings",
      message: "Add H2 subheadings to break up your content",
    });
  }

  // 5. Keyword usage
  if (keywordAnalysis.focusKeyword) {
    const keywordScore =
      (keywordAnalysis.keywordInTitle ? 25 : 0) +
      (keywordAnalysis.keywordInDescription ? 20 : 0) +
      (keywordAnalysis.keywordInH1 ? 15 : 0) +
      (keywordAnalysis.keywordInFirstParagraph ? 20 : 0) +
      (keywordAnalysis.keywordDensity >= 0.5 && keywordAnalysis.keywordDensity <= 2.5 ? 20 : 0);

    seoChecks.push({
      name: "Keyword Optimization",
      passed: keywordScore >= 60,
      message: `Keyword optimization score: ${keywordScore}%`,
      weight: 20,
    });

    if (!keywordAnalysis.keywordInTitle && metadata.title) {
      suggestions.push({
        type: "error",
        category: "Keywords",
        message: `Include "${keywordAnalysis.focusKeyword}" in your title`,
      });
    }

    if (keywordAnalysis.keywordDensity < 0.5) {
      suggestions.push({
        type: "warning",
        category: "Keywords",
        message: `Keyword density is low (${keywordAnalysis.keywordDensity.toFixed(2)}%). Use "${keywordAnalysis.focusKeyword}" more naturally in the content.`,
      });
    } else if (keywordAnalysis.keywordDensity > 2.5) {
      suggestions.push({
        type: "warning",
        category: "Keywords",
        message: `Keyword density is too high (${keywordAnalysis.keywordDensity.toFixed(2)}%). Reduce usage to avoid keyword stuffing.`,
      });
    }
  }

  // 6. Readability
  seoChecks.push({
    name: "Readability",
    passed: readability.score >= 60,
    message: `Readability score: ${readability.score} (${readability.grade})`,
    weight: 10,
  });

  if (readability.avgSentenceLength > 20) {
    suggestions.push({
      type: "improvement",
      category: "Readability",
      message: "Some sentences are too long. Break them into shorter sentences for better readability.",
    });
  }

  if (readability.passiveVoicePercentage > 10) {
    suggestions.push({
      type: "improvement",
      category: "Readability",
      message: `${readability.passiveVoicePercentage.toFixed(1)}% passive voice detected. Use more active voice.`,
    });
  }

  // Calculate overall score
  let score = 0;
  let totalWeight = 0;
  for (const check of seoChecks) {
    if (check.passed) score += check.weight;
    totalWeight += check.weight;
  }
  score = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;

  return {
    score,
    suggestions,
    keywordAnalysis,
    readability,
    seoChecks,
  };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function extractHeadings(content: string): { h1: string[]; h2: string[]; h3: string[] } {
  const h1Matches = content.match(/^#\s+(.+)$/gm) || [];
  const h2Matches = content.match(/^##\s+(.+)$/gm) || [];
  const h3Matches = content.match(/^###\s+(.+)$/gm) || [];

  return {
    h1: h1Matches.map((h) => h.replace(/^#\s+/, "")),
    h2: h2Matches.map((h) => h.replace(/^##\s+/, "")),
    h3: h3Matches.map((h) => h.replace(/^###\s+/, "")),
  };
}

function analyzeKeywords(
  content: string,
  title: string = "",
  description: string = "",
  focusKeyword?: string
): KeywordAnalysis {
  if (!focusKeyword) {
    return {
      focusKeyword: null,
      keywordDensity: 0,
      keywordInTitle: false,
      keywordInDescription: false,
      keywordInH1: false,
      keywordInFirstParagraph: false,
      keywordCount: 0,
      optimalCount: { min: 0, max: 0 },
      variations: [],
    };
  }

  const lowerContent = content.toLowerCase();
  const lowerKeyword = focusKeyword.toLowerCase();
  const wordCount = countWords(content);

  // Count keyword occurrences
  const regex = new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  const keywordCount = (lowerContent.match(regex) || []).length;

  // Calculate density
  const keywordDensity = (keywordCount / wordCount) * 100;

  // Optimal count (0.5% - 2.5% density)
  const optimalCount = {
    min: Math.ceil(wordCount * 0.005),
    max: Math.floor(wordCount * 0.025),
  };

  // Check locations
  const keywordInTitle = title.toLowerCase().includes(lowerKeyword);
  const keywordInDescription = description.toLowerCase().includes(lowerKeyword);
  
  const firstParagraph = content.split(/\n\n/)[0] || "";
  const keywordInFirstParagraph = firstParagraph.toLowerCase().includes(lowerKeyword);

  const h1s = extractHeadings(content).h1;
  const keywordInH1 = h1s.some((h) => h.toLowerCase().includes(lowerKeyword));

  return {
    focusKeyword,
    keywordDensity,
    keywordInTitle,
    keywordInDescription,
    keywordInH1,
    keywordInFirstParagraph,
    keywordCount,
    optimalCount,
    variations: [],
  };
}

function calculateReadability(content: string): ReadabilityScore {
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = content.split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
  const avgSyllablesPerWord = words.length > 0 ? syllables / words.length : 0;

  // Flesch-Kincaid Reading Ease
  const fleschKincaid = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  // Grade level
  const gradeLevel = Math.round(0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59);

  // Passive voice detection (simplified)
  const passiveCount = (content.match(/\b(is|are|was|were|been|being)\s+\w+ed\b/gi) || []).length;
  const passiveVoicePercentage = (passiveCount / sentences.length) * 100;

  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

  const score = Math.max(0, Math.min(100, fleschKincaid));

  const suggestions: string[] = [];
  if (avgSentenceLength > 20) suggestions.push("Break long sentences into shorter ones");
  if (passiveVoicePercentage > 10) suggestions.push("Use more active voice");
  if (avgWordLength > 6) suggestions.push("Use simpler words where possible");

  return {
    score,
    grade: `${Math.max(1, Math.min(12, gradeLevel))}th grade`,
    fleschKincaid: Math.round(fleschKincaid * 10) / 10,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    passiveVoicePercentage: Math.round(passiveVoicePercentage * 10) / 10,
    suggestions,
  };
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;

  const vowels = "aeiouy";
  let count = 0;
  let prevWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    
    if (isVowel && !prevWasVowel) {
      count++;
    }
    
    prevWasVowel = isVowel;
  }

  // Handle silent 'e'
  if (word.endsWith("e")) count--;

  return Math.max(1, count);
}
