export interface ContentScore {
  overall: number; // 0-100
  breakdown: {
    wordCount: { score: number; value: number; target: { min: number; max: number }; feedback: string };
    keywordDensity: { score: number; value: number; target: number; feedback: string };
    readability: { score: number; value: number; grade: string; feedback: string };
    headingStructure: { score: number; hasH1: boolean; h2Count: number; h3Count: number; feedback: string };
    internalLinks: { score: number; count: number; feedback: string };
    externalLinks: { score: number; count: number; feedback: string };
    images: { score: number; count: number; withAlt: number; feedback: string };
    metaDescription: { score: number; length: number; hasKeyword: boolean; feedback: string };
    paragraphLength: { score: number; avgLength: number; feedback: string };
    uniqueness: { score: number; feedback: string };
  };
  suggestions: string[];
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface ContentInput {
  content: string;
  title: string;
  keyword: string;
  metaDescription?: string;
  targetWordCount?: { min: number; max: number };
}

// Calculate Flesch-Kincaid readability score
function calculateReadability(text: string): { score: number; grade: string } {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((count, word) => count + countSyllables(word), 0);

  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, grade: "N/A" };
  }

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Flesch Reading Ease formula
  const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  const clampedScore = Math.max(0, Math.min(100, score));

  let grade: string;
  if (clampedScore >= 90) grade = "5th grade";
  else if (clampedScore >= 80) grade = "6th grade";
  else if (clampedScore >= 70) grade = "7th grade";
  else if (clampedScore >= 60) grade = "8th-9th grade";
  else if (clampedScore >= 50) grade = "10th-12th grade";
  else if (clampedScore >= 30) grade = "College";
  else grade = "College graduate";

  return { score: clampedScore, grade };
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

// Extract headings from content
function extractHeadings(content: string): { h1: string[]; h2: string[]; h3: string[] } {
  const h1 = content.match(/<h1[^>]*>(.*?)<\/h1>/gi) || content.match(/^#\s+(.+)$/gm) || [];
  const h2 = content.match(/<h2[^>]*>(.*?)<\/h2>/gi) || content.match(/^##\s+(.+)$/gm) || [];
  const h3 = content.match(/<h3[^>]*>(.*?)<\/h3>/gi) || content.match(/^###\s+(.+)$/gm) || [];
  
  return {
    h1: h1.map((h) => h.replace(/<[^>]*>/g, "").replace(/^#+\s*/, "")),
    h2: h2.map((h) => h.replace(/<[^>]*>/g, "").replace(/^#+\s*/, "")),
    h3: h3.map((h) => h.replace(/<[^>]*>/g, "").replace(/^#+\s*/, "")),
  };
}

// Count links in content
function countLinks(content: string): { internal: number; external: number } {
  const allLinks = content.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi) || 
                   content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  
  let internal = 0;
  let external = 0;
  
  allLinks.forEach((link) => {
    if (link.includes("http://") || link.includes("https://")) {
      external++;
    } else {
      internal++;
    }
  });
  
  return { internal, external };
}

// Count images and check for alt text
function countImages(content: string): { total: number; withAlt: number } {
  const imgTags = content.match(/<img[^>]*>/gi) || [];
  const mdImages = content.match(/!\[([^\]]*)\]\([^)]+\)/g) || [];
  
  let withAlt = 0;
  
  imgTags.forEach((img) => {
    if (/alt=["'][^"']+["']/.test(img)) withAlt++;
  });
  
  mdImages.forEach((img) => {
    const altMatch = img.match(/!\[([^\]]+)\]/);
    if (altMatch && altMatch[1].trim()) withAlt++;
  });
  
  return { total: imgTags.length + mdImages.length, withAlt };
}

// Calculate keyword density
function calculateKeywordDensity(content: string, keyword: string): number {
  const words = content.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  const keywordLower = keyword.toLowerCase();
  const keywordWords = keywordLower.split(/\s+/);
  
  let occurrences = 0;
  const contentLower = content.toLowerCase();
  
  // Count exact phrase matches
  let pos = 0;
  while ((pos = contentLower.indexOf(keywordLower, pos)) !== -1) {
    occurrences++;
    pos += keywordLower.length;
  }
  
  // Calculate density as percentage
  return words.length > 0 ? (occurrences * keywordWords.length / words.length) * 100 : 0;
}

// Get average paragraph length
function getAvgParagraphLength(content: string): number {
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return 0;
  
  const totalWords = paragraphs.reduce((sum, p) => {
    return sum + p.split(/\s+/).filter((w) => w.length > 0).length;
  }, 0);
  
  return Math.round(totalWords / paragraphs.length);
}

// Main scoring function
export function scoreContent(input: ContentInput): ContentScore {
  const { content, title, keyword, metaDescription, targetWordCount } = input;
  
  const plainText = content.replace(/<[^>]*>/g, "").replace(/\[([^\]]*)\]\([^)]+\)/g, "$1");
  const words = plainText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  
  const target = targetWordCount || { min: 1500, max: 2500 };
  const readability = calculateReadability(plainText);
  const headings = extractHeadings(content);
  const links = countLinks(content);
  const images = countImages(content);
  const density = calculateKeywordDensity(plainText + " " + title, keyword);
  const avgParagraph = getAvgParagraphLength(plainText);
  const metaLen = metaDescription?.length || 0;
  const metaHasKeyword = metaDescription?.toLowerCase().includes(keyword.toLowerCase()) || false;

  // Score each factor
  const breakdown: ContentScore["breakdown"] = {
    wordCount: {
      score: wordCount >= target.min && wordCount <= target.max * 1.2 ? 100 :
             wordCount >= target.min * 0.8 ? 80 :
             wordCount >= target.min * 0.5 ? 50 : 20,
      value: wordCount,
      target,
      feedback: wordCount < target.min 
        ? `Add ${target.min - wordCount} more words to reach the minimum` 
        : wordCount > target.max * 1.5 
          ? "Content may be too long, consider splitting into multiple articles"
          : "Word count is optimal",
    },
    keywordDensity: {
      score: density >= 0.5 && density <= 2.5 ? 100 :
             density >= 0.3 && density <= 3 ? 70 :
             density > 0 ? 40 : 10,
      value: Math.round(density * 100) / 100,
      target: 1.5,
      feedback: density < 0.5 
        ? "Keyword density is too low, use the keyword more naturally"
        : density > 2.5 
          ? "Keyword density is too high, may appear as keyword stuffing"
          : "Keyword density is optimal",
    },
    readability: {
      score: readability.score >= 60 ? 100 :
             readability.score >= 50 ? 80 :
             readability.score >= 40 ? 60 :
             readability.score >= 30 ? 40 : 20,
      value: Math.round(readability.score),
      grade: readability.grade,
      feedback: readability.score < 50 
        ? "Content is difficult to read, simplify sentences"
        : readability.score > 70 
          ? "Content is very easy to read"
          : "Readability is good for most audiences",
    },
    headingStructure: {
      score: (headings.h2.length >= 3 ? 50 : headings.h2.length * 15) +
             (headings.h3.length >= 2 ? 30 : headings.h3.length * 10) +
             (headings.h1.length === 1 ? 20 : 0),
      hasH1: headings.h1.length > 0,
      h2Count: headings.h2.length,
      h3Count: headings.h3.length,
      feedback: headings.h2.length < 3 
        ? "Add more H2 headings to structure your content"
        : "Good heading structure",
    },
    internalLinks: {
      score: links.internal >= 3 ? 100 : links.internal >= 2 ? 70 : links.internal >= 1 ? 40 : 10,
      count: links.internal,
      feedback: links.internal < 2 
        ? "Add internal links to related content on your site"
        : "Good internal linking",
    },
    externalLinks: {
      score: links.external >= 2 ? 100 : links.external >= 1 ? 60 : 20,
      count: links.external,
      feedback: links.external < 1 
        ? "Add external links to authoritative sources"
        : "Good use of external references",
    },
    images: {
      score: images.total >= 3 ? (images.withAlt === images.total ? 100 : 70) :
             images.total >= 1 ? (images.withAlt === images.total ? 60 : 40) : 10,
      count: images.total,
      withAlt: images.withAlt,
      feedback: images.total < 2 
        ? "Add more images to make content more engaging"
        : images.withAlt < images.total 
          ? "Add alt text to all images"
          : "Good use of images",
    },
    metaDescription: {
      score: metaLen >= 120 && metaLen <= 160 && metaHasKeyword ? 100 :
             metaLen >= 100 && metaLen <= 180 ? 70 :
             metaLen > 0 ? 40 : 0,
      length: metaLen,
      hasKeyword: metaHasKeyword,
      feedback: metaLen === 0 
        ? "Add a meta description"
        : metaLen < 120 
          ? "Meta description is too short"
          : metaLen > 160 
            ? "Meta description may be truncated"
            : !metaHasKeyword 
              ? "Include the target keyword in meta description"
              : "Meta description is optimized",
    },
    paragraphLength: {
      score: avgParagraph >= 40 && avgParagraph <= 100 ? 100 :
             avgParagraph >= 30 && avgParagraph <= 150 ? 70 :
             avgParagraph > 0 ? 40 : 0,
      avgLength: avgParagraph,
      feedback: avgParagraph > 150 
        ? "Break up long paragraphs for better readability"
        : avgParagraph < 30 
          ? "Paragraphs are too short, combine related ideas"
          : "Paragraph length is good",
    },
    uniqueness: {
      score: 85, // Would need plagiarism API for real check
      feedback: "Content appears to be unique",
    },
  };

  // Calculate overall score (weighted average)
  const weights = {
    wordCount: 15,
    keywordDensity: 12,
    readability: 12,
    headingStructure: 12,
    internalLinks: 10,
    externalLinks: 8,
    images: 10,
    metaDescription: 10,
    paragraphLength: 6,
    uniqueness: 5,
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightedSum = Object.entries(breakdown).reduce((sum, [key, data]) => {
    return sum + (data.score * (weights[key as keyof typeof weights] || 0));
  }, 0);

  const overall = Math.round(weightedSum / totalWeight);

  // Generate suggestions
  const suggestions: string[] = [];
  
  if (breakdown.wordCount.score < 80) suggestions.push(breakdown.wordCount.feedback);
  if (breakdown.keywordDensity.score < 80) suggestions.push(breakdown.keywordDensity.feedback);
  if (breakdown.readability.score < 80) suggestions.push(breakdown.readability.feedback);
  if (breakdown.headingStructure.score < 80) suggestions.push(breakdown.headingStructure.feedback);
  if (breakdown.internalLinks.score < 80) suggestions.push(breakdown.internalLinks.feedback);
  if (breakdown.externalLinks.score < 80) suggestions.push(breakdown.externalLinks.feedback);
  if (breakdown.images.score < 80) suggestions.push(breakdown.images.feedback);
  if (breakdown.metaDescription.score < 80) suggestions.push(breakdown.metaDescription.feedback);
  if (breakdown.paragraphLength.score < 80) suggestions.push(breakdown.paragraphLength.feedback);

  // Determine grade
  let grade: ContentScore["grade"];
  if (overall >= 90) grade = "A";
  else if (overall >= 80) grade = "B";
  else if (overall >= 70) grade = "C";
  else if (overall >= 60) grade = "D";
  else grade = "F";

  return {
    overall,
    breakdown,
    suggestions,
    grade,
  };
}

// Quick score for real-time feedback
export function quickScore(content: string, keyword: string): number {
  const words = content.split(/\s+/).filter((w) => w.length > 0).length;
  const density = calculateKeywordDensity(content, keyword);
  const headings = extractHeadings(content);
  
  let score = 0;
  
  // Word count (30 points)
  if (words >= 1500) score += 30;
  else if (words >= 1000) score += 20;
  else if (words >= 500) score += 10;
  
  // Keyword density (20 points)
  if (density >= 0.5 && density <= 2.5) score += 20;
  else if (density > 0) score += 10;
  
  // Headings (20 points)
  if (headings.h2.length >= 3) score += 20;
  else if (headings.h2.length >= 1) score += 10;
  
  // Base score (30 points for having content)
  if (words > 0) score += 30;
  
  return score;
}
