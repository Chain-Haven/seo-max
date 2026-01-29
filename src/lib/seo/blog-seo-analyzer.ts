/**
 * Advanced Blog SEO Analyzer
 * Comprehensive content analysis for SEO optimization
 * Includes keyword analysis, readability, E-E-A-T signals, and more
 */

import { getAIProvider } from "@/lib/ai/provider";

export interface HeadingInfo {
  level: number;
  text: string;
  position: number;
  id?: string;
}

export interface TableOfContents {
  items: Array<{
    id: string;
    text: string;
    level: number;
    children?: TableOfContents["items"];
  }>;
  htmlOutput: string;
  schemaOutput: object;
}

export interface KeywordAnalysis {
  keyword: string;
  count: number;
  density: number;
  inTitle: boolean;
  inFirstParagraph: boolean;
  inHeadings: boolean;
  inMetaDescription: boolean;
  positions: number[];
}

export interface ReadabilityAnalysis {
  fleschKincaid: number;
  fleschReadingEase: number;
  avgSentenceLength: number;
  avgWordLength: number;
  complexWords: number;
  complexWordPercentage: number;
  grade: "Easy" | "Standard" | "Difficult";
  suggestions: string[];
}

export interface EEATSignals {
  hasAuthor: boolean;
  hasAuthorBio: boolean;
  hasAuthorCredentials: boolean;
  hasPublishDate: boolean;
  hasModifiedDate: boolean;
  hasCitations: boolean;
  citationCount: number;
  hasExternalLinks: boolean;
  externalLinkCount: number;
  hasImages: boolean;
  imageCount: number;
  imagesWithAlt: number;
  score: number;
  recommendations: string[];
}

export interface ContentStructure {
  wordCount: number;
  paragraphCount: number;
  sentenceCount: number;
  headingCount: number;
  headingStructure: HeadingInfo[];
  hasH1: boolean;
  h1Count: number;
  listCount: number;
  imageCount: number;
  linkCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
}

export interface BlogSEOScore {
  overall: number;
  keyword: number;
  readability: number;
  structure: number;
  eeat: number;
  technical: number;
  breakdown: {
    titleOptimization: { score: number; issues: string[] };
    metaDescription: { score: number; issues: string[] };
    contentLength: { score: number; issues: string[] };
    keywordUsage: { score: number; issues: string[] };
    headingStructure: { score: number; issues: string[] };
    readability: { score: number; issues: string[] };
    internalLinks: { score: number; issues: string[] };
    images: { score: number; issues: string[] };
    eeatSignals: { score: number; issues: string[] };
  };
  grade: "A" | "B" | "C" | "D" | "F";
  prioritizedRecommendations: string[];
}

export interface OpenGraphMeta {
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  ogSiteName: string;
  ogLocale: string;
  ogArticlePublishedTime?: string;
  ogArticleModifiedTime?: string;
  ogArticleAuthor?: string;
  ogArticleSection?: string;
  ogArticleTags?: string[];
}

export interface TwitterCardMeta {
  twitterCard: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterImageAlt?: string;
}

// Utility functions

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function extractText(content: string): string {
  return content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate Table of Contents from content
 */
export function generateTableOfContents(content: string): TableOfContents {
  const headings: HeadingInfo[] = [];
  
  // Extract HTML headings
  const htmlRegex = /<h([2-6])[^>]*(?:id="([^"]*)")?[^>]*>([^<]+)<\/h[2-6]>/gi;
  let match;
  let position = 0;
  
  while ((match = htmlRegex.exec(content)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      text: match[3].trim(),
      position: position++,
      id: match[2] || slugify(match[3]),
    });
  }
  
  // Extract Markdown headings
  const mdRegex = /^(#{2,6})\s+(.+)$/gm;
  while ((match = mdRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
      position: position++,
      id: slugify(match[2]),
    });
  }
  
  // Sort by position
  headings.sort((a, b) => a.position - b.position);
  
  // Build nested structure
  const items: TableOfContents["items"] = [];
  const stack: Array<{ level: number; children: TableOfContents["items"] }> = [
    { level: 1, children: items },
  ];
  
  for (const heading of headings) {
    const item = {
      id: heading.id || slugify(heading.text),
      text: heading.text,
      level: heading.level,
      children: [],
    };
    
    while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }
    
    stack[stack.length - 1].children.push(item);
    stack.push({ level: heading.level, children: item.children! });
  }
  
  // Generate HTML output
  const renderItems = (items: TableOfContents["items"], level = 0): string => {
    if (items.length === 0) return "";
    
    const indent = "  ".repeat(level);
    let html = `${indent}<ul class="toc-list toc-level-${level}">\n`;
    
    for (const item of items) {
      html += `${indent}  <li class="toc-item">\n`;
      html += `${indent}    <a href="#${item.id}" class="toc-link">${item.text}</a>\n`;
      if (item.children && item.children.length > 0) {
        html += renderItems(item.children, level + 1);
      }
      html += `${indent}  </li>\n`;
    }
    
    html += `${indent}</ul>\n`;
    return html;
  };
  
  const htmlOutput = `<nav class="table-of-contents" aria-label="Table of Contents">
  <h2 class="toc-title">Table of Contents</h2>
${renderItems(items, 1)}
</nav>`;

  // Generate schema output
  const schemaOutput = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: headings.map((h, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: h.text,
      url: `#${h.id}`,
    })),
  };
  
  return { items, htmlOutput, schemaOutput };
}

/**
 * Analyze keyword usage in content
 */
export function analyzeKeywords(
  content: string,
  keywords: string[],
  title: string,
  metaDescription: string
): KeywordAnalysis[] {
  const text = extractText(content).toLowerCase();
  const titleLower = title.toLowerCase();
  const metaLower = metaDescription.toLowerCase();
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  
  // Extract first paragraph
  const firstParagraph = content.match(/<p[^>]*>([^<]+)<\/p>/i)?.[1]?.toLowerCase() || 
    text.split(/\.\s/)[0]?.toLowerCase() || "";
  
  // Extract headings
  const headingsText = (content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [])
    .map((h) => h.replace(/<[^>]+>/g, "").toLowerCase())
    .join(" ");
  
  return keywords.map((keyword) => {
    const keywordLower = keyword.toLowerCase();
    const regex = new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    
    const matches: number[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match.index);
    }
    
    const count = matches.length;
    const density = wordCount > 0 ? (count / wordCount) * 100 : 0;
    
    return {
      keyword,
      count,
      density: Math.round(density * 100) / 100,
      inTitle: titleLower.includes(keywordLower),
      inFirstParagraph: firstParagraph.includes(keywordLower),
      inHeadings: headingsText.includes(keywordLower),
      inMetaDescription: metaLower.includes(keywordLower),
      positions: matches,
    };
  });
}

/**
 * Analyze content readability
 */
export function analyzeReadability(content: string): ReadabilityAnalysis {
  const text = extractText(content);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const totalCharacters = words.reduce((sum, word) => sum + word.length, 0);
  
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const avgWordLength = wordCount > 0 ? totalCharacters / wordCount : 0;
  const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;
  
  // Complex words (3+ syllables)
  const complexWords = words.filter((w) => countSyllables(w) >= 3).length;
  const complexWordPercentage = wordCount > 0 ? (complexWords / wordCount) * 100 : 0;
  
  // Flesch-Kincaid Grade Level
  const fleschKincaid =
    0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;
  
  // Flesch Reading Ease (0-100, higher is easier)
  const fleschReadingEase =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  
  const suggestions: string[] = [];
  let grade: ReadabilityAnalysis["grade"] = "Standard";
  
  if (fleschReadingEase >= 60) {
    grade = "Easy";
  } else if (fleschReadingEase >= 30) {
    grade = "Standard";
  } else {
    grade = "Difficult";
    suggestions.push("Consider simplifying complex sentences");
  }
  
  if (avgSentenceLength > 20) {
    suggestions.push("Break up long sentences (aim for 15-20 words average)");
  }
  
  if (complexWordPercentage > 20) {
    suggestions.push("Use simpler words where possible");
  }
  
  return {
    fleschKincaid: Math.round(fleschKincaid * 10) / 10,
    fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    complexWords,
    complexWordPercentage: Math.round(complexWordPercentage * 10) / 10,
    grade,
    suggestions,
  };
}

/**
 * Analyze E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals
 */
export function analyzeEEATSignals(
  content: string,
  meta: {
    hasAuthor?: boolean;
    authorBio?: string;
    authorCredentials?: string;
    publishDate?: string;
    modifiedDate?: string;
  }
): EEATSignals {
  const recommendations: string[] = [];
  let score = 0;
  
  // Check for author
  const hasAuthor = meta.hasAuthor || false;
  const hasAuthorBio = !!meta.authorBio && meta.authorBio.length > 50;
  const hasAuthorCredentials = !!meta.authorCredentials;
  
  if (hasAuthor) score += 15;
  else recommendations.push("Add author attribution to build trust");
  
  if (hasAuthorBio) score += 10;
  else recommendations.push("Add detailed author bio with expertise background");
  
  if (hasAuthorCredentials) score += 10;
  else recommendations.push("Include author credentials or qualifications");
  
  // Check for dates
  const hasPublishDate = !!meta.publishDate;
  const hasModifiedDate = !!meta.modifiedDate;
  
  if (hasPublishDate) score += 10;
  else recommendations.push("Add publication date");
  
  if (hasModifiedDate) score += 5;
  else recommendations.push("Show last modified date for freshness signals");
  
  // Check for citations/references
  const citationPatterns = [
    /\[(\d+)\]/g, // [1] style citations
    /\(([^)]+,\s*\d{4})\)/g, // (Author, 2024) style
    /<cite[^>]*>/gi, // cite tags
    /according to/gi,
    /research shows/gi,
    /studies indicate/gi,
    /source:/gi,
  ];
  
  let citationCount = 0;
  for (const pattern of citationPatterns) {
    const matches = content.match(pattern);
    if (matches) citationCount += matches.length;
  }
  
  const hasCitations = citationCount > 0;
  if (hasCitations) score += 15;
  else recommendations.push("Add citations or references to authoritative sources");
  
  // Check for external links
  const externalLinkRegex = /<a[^>]+href=["']https?:\/\/(?!(?:www\.)?[^"']+\.[^"']+)[^"']+["'][^>]*>/gi;
  const externalLinks = content.match(externalLinkRegex) || [];
  const externalLinkCount = externalLinks.length;
  const hasExternalLinks = externalLinkCount > 0;
  
  if (hasExternalLinks) score += 10;
  else recommendations.push("Link to authoritative external sources");
  
  // Check for images
  const imageRegex = /<img[^>]+>/gi;
  const images = content.match(imageRegex) || [];
  const imageCount = images.length;
  const hasImages = imageCount > 0;
  
  const altRegex = /alt=["'][^"']+["']/gi;
  const imagesWithAlt = images.filter((img) => altRegex.test(img)).length;
  
  if (hasImages) score += 10;
  else recommendations.push("Add relevant images to enhance content");
  
  if (imageCount > 0 && imagesWithAlt < imageCount) {
    recommendations.push("Add alt text to all images");
  } else if (imagesWithAlt > 0) {
    score += 5;
  }
  
  // Expertise indicators in content
  const expertiseIndicators = [
    /years of experience/gi,
    /certified/gi,
    /expert/gi,
    /professional/gi,
    /specialist/gi,
    /research/gi,
    /data shows/gi,
    /tested/gi,
    /reviewed by/gi,
  ];
  
  let expertiseCount = 0;
  for (const pattern of expertiseIndicators) {
    if (pattern.test(content)) expertiseCount++;
  }
  
  if (expertiseCount >= 3) score += 10;
  else if (expertiseCount >= 1) score += 5;
  else recommendations.push("Include expertise indicators (data, research, testing)");
  
  return {
    hasAuthor,
    hasAuthorBio,
    hasAuthorCredentials,
    hasPublishDate,
    hasModifiedDate,
    hasCitations,
    citationCount,
    hasExternalLinks,
    externalLinkCount,
    hasImages,
    imageCount,
    imagesWithAlt,
    score: Math.min(100, score),
    recommendations,
  };
}

/**
 * Analyze content structure
 */
export function analyzeContentStructure(
  content: string,
  siteUrl?: string
): ContentStructure {
  const text = extractText(content);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphs = content.split(/<\/p>|<br\s*\/?>\s*<br\s*\/?>/i).filter((p) => p.trim().length > 0);
  
  // Extract headings
  const headingStructure: HeadingInfo[] = [];
  const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
  let match;
  let position = 0;
  
  while ((match = headingRegex.exec(content)) !== null) {
    headingStructure.push({
      level: parseInt(match[1]),
      text: match[2].trim(),
      position: position++,
    });
  }
  
  // Count H1s
  const h1Count = headingStructure.filter((h) => h.level === 1).length;
  
  // Count lists
  const listRegex = /<[ou]l[^>]*>[\s\S]*?<\/[ou]l>/gi;
  const listCount = (content.match(listRegex) || []).length;
  
  // Count images
  const imageCount = (content.match(/<img[^>]+>/gi) || []).length;
  
  // Count links
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const links: string[] = [];
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  
  const siteUrlClean = siteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const internalLinks = links.filter((link) => {
    if (link.startsWith("/") || link.startsWith("#")) return true;
    if (siteUrlClean && link.includes(siteUrlClean)) return true;
    return false;
  });
  
  return {
    wordCount: words.length,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    headingCount: headingStructure.length,
    headingStructure,
    hasH1: h1Count > 0,
    h1Count,
    listCount,
    imageCount,
    linkCount: links.length,
    internalLinkCount: internalLinks.length,
    externalLinkCount: links.length - internalLinks.length,
  };
}

/**
 * Generate comprehensive SEO score
 */
export function calculateBlogSEOScore(
  content: string,
  title: string,
  metaDescription: string,
  keywords: string[],
  options: {
    siteUrl?: string;
    hasAuthor?: boolean;
    authorBio?: string;
    publishDate?: string;
    modifiedDate?: string;
    targetWordCount?: { min: number; max: number };
  } = {}
): BlogSEOScore {
  const structure = analyzeContentStructure(content, options.siteUrl);
  const keywordAnalysis = analyzeKeywords(content, keywords, title, metaDescription);
  const readability = analyzeReadability(content);
  const eeat = analyzeEEATSignals(content, options);
  
  const primaryKeyword = keywordAnalysis[0];
  const breakdown: BlogSEOScore["breakdown"] = {
    titleOptimization: { score: 0, issues: [] },
    metaDescription: { score: 0, issues: [] },
    contentLength: { score: 0, issues: [] },
    keywordUsage: { score: 0, issues: [] },
    headingStructure: { score: 0, issues: [] },
    readability: { score: 0, issues: [] },
    internalLinks: { score: 0, issues: [] },
    images: { score: 0, issues: [] },
    eeatSignals: { score: 0, issues: [] },
  };
  
  // Title optimization (15 points max)
  if (title.length >= 30 && title.length <= 60) {
    breakdown.titleOptimization.score += 5;
  } else {
    breakdown.titleOptimization.issues.push(
      title.length < 30 ? "Title too short (aim for 30-60 chars)" : "Title too long (aim for 30-60 chars)"
    );
  }
  
  if (primaryKeyword?.inTitle) {
    breakdown.titleOptimization.score += 10;
  } else {
    breakdown.titleOptimization.issues.push("Include primary keyword in title");
  }
  
  // Meta description (10 points max)
  if (metaDescription.length >= 120 && metaDescription.length <= 160) {
    breakdown.metaDescription.score += 5;
  } else {
    breakdown.metaDescription.issues.push(
      metaDescription.length < 120 ? "Meta description too short" : "Meta description too long"
    );
  }
  
  if (primaryKeyword?.inMetaDescription) {
    breakdown.metaDescription.score += 5;
  } else {
    breakdown.metaDescription.issues.push("Include primary keyword in meta description");
  }
  
  // Content length (15 points max)
  const targetMin = options.targetWordCount?.min || 1000;
  const targetMax = options.targetWordCount?.max || 3000;
  
  if (structure.wordCount >= targetMin && structure.wordCount <= targetMax) {
    breakdown.contentLength.score = 15;
  } else if (structure.wordCount >= targetMin * 0.7) {
    breakdown.contentLength.score = 10;
    breakdown.contentLength.issues.push(`Content slightly below target (${targetMin}-${targetMax} words)`);
  } else {
    breakdown.contentLength.score = 5;
    breakdown.contentLength.issues.push(`Content too short (aim for ${targetMin}+ words)`);
  }
  
  // Keyword usage (15 points max)
  if (primaryKeyword) {
    if (primaryKeyword.density >= 0.5 && primaryKeyword.density <= 2.5) {
      breakdown.keywordUsage.score += 5;
    } else {
      breakdown.keywordUsage.issues.push(
        primaryKeyword.density < 0.5 ? "Increase keyword density" : "Reduce keyword stuffing"
      );
    }
    
    if (primaryKeyword.inFirstParagraph) {
      breakdown.keywordUsage.score += 5;
    } else {
      breakdown.keywordUsage.issues.push("Add keyword to first paragraph");
    }
    
    if (primaryKeyword.inHeadings) {
      breakdown.keywordUsage.score += 5;
    } else {
      breakdown.keywordUsage.issues.push("Include keyword in at least one heading");
    }
  }
  
  // Heading structure (10 points max)
  if (structure.h1Count === 1) {
    breakdown.headingStructure.score += 5;
  } else if (structure.h1Count === 0) {
    breakdown.headingStructure.issues.push("Add exactly one H1 heading");
  } else {
    breakdown.headingStructure.issues.push("Use only one H1 heading");
  }
  
  if (structure.headingCount >= 3) {
    breakdown.headingStructure.score += 5;
  } else {
    breakdown.headingStructure.issues.push("Add more subheadings to structure content");
  }
  
  // Readability (10 points max)
  if (readability.grade === "Easy" || readability.grade === "Standard") {
    breakdown.readability.score = 10;
  } else {
    breakdown.readability.score = 5;
    breakdown.readability.issues = readability.suggestions;
  }
  
  // Internal links (10 points max)
  if (structure.internalLinkCount >= 3) {
    breakdown.internalLinks.score = 10;
  } else if (structure.internalLinkCount >= 1) {
    breakdown.internalLinks.score = 5;
    breakdown.internalLinks.issues.push("Add more internal links (aim for 3+)");
  } else {
    breakdown.internalLinks.issues.push("Add internal links to related content");
  }
  
  // Images (10 points max)
  if (structure.imageCount >= 2) {
    breakdown.images.score = 10;
  } else if (structure.imageCount >= 1) {
    breakdown.images.score = 5;
    breakdown.images.issues.push("Add more relevant images");
  } else {
    breakdown.images.issues.push("Add images to enhance content");
  }
  
  // E-E-A-T signals (5 points max based on eeat.score)
  breakdown.eeatSignals.score = Math.round(eeat.score / 20); // Scale from 0-100 to 0-5
  breakdown.eeatSignals.issues = eeat.recommendations.slice(0, 3);
  
  // Calculate totals
  const keywordScore = breakdown.keywordUsage.score + breakdown.titleOptimization.score + breakdown.metaDescription.score;
  const structureScore = breakdown.headingStructure.score + breakdown.contentLength.score + breakdown.internalLinks.score;
  const readabilityScore = breakdown.readability.score;
  const technicalScore = breakdown.images.score;
  const eeatScore = breakdown.eeatSignals.score;
  
  const overall = Object.values(breakdown).reduce((sum, item) => sum + item.score, 0);
  
  // Determine grade
  let grade: BlogSEOScore["grade"];
  if (overall >= 90) grade = "A";
  else if (overall >= 75) grade = "B";
  else if (overall >= 60) grade = "C";
  else if (overall >= 45) grade = "D";
  else grade = "F";
  
  // Prioritize recommendations
  const allIssues: Array<{ issue: string; weight: number }> = [];
  
  if (breakdown.titleOptimization.issues.length) {
    allIssues.push(...breakdown.titleOptimization.issues.map((i) => ({ issue: i, weight: 3 })));
  }
  if (breakdown.keywordUsage.issues.length) {
    allIssues.push(...breakdown.keywordUsage.issues.map((i) => ({ issue: i, weight: 3 })));
  }
  if (breakdown.contentLength.issues.length) {
    allIssues.push(...breakdown.contentLength.issues.map((i) => ({ issue: i, weight: 2 })));
  }
  if (breakdown.headingStructure.issues.length) {
    allIssues.push(...breakdown.headingStructure.issues.map((i) => ({ issue: i, weight: 2 })));
  }
  if (breakdown.metaDescription.issues.length) {
    allIssues.push(...breakdown.metaDescription.issues.map((i) => ({ issue: i, weight: 2 })));
  }
  if (breakdown.internalLinks.issues.length) {
    allIssues.push(...breakdown.internalLinks.issues.map((i) => ({ issue: i, weight: 1 })));
  }
  if (breakdown.images.issues.length) {
    allIssues.push(...breakdown.images.issues.map((i) => ({ issue: i, weight: 1 })));
  }
  if (breakdown.readability.issues.length) {
    allIssues.push(...breakdown.readability.issues.map((i) => ({ issue: i, weight: 1 })));
  }
  if (breakdown.eeatSignals.issues.length) {
    allIssues.push(...breakdown.eeatSignals.issues.map((i) => ({ issue: i, weight: 1 })));
  }
  
  allIssues.sort((a, b) => b.weight - a.weight);
  
  return {
    overall,
    keyword: keywordScore,
    readability: readabilityScore * 10, // Scale to match others
    structure: structureScore,
    eeat: eeat.score,
    technical: technicalScore * 10,
    breakdown,
    grade,
    prioritizedRecommendations: allIssues.slice(0, 5).map((i) => i.issue),
  };
}

/**
 * Generate Open Graph metadata
 */
export function generateOpenGraphMeta(input: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  siteName: string;
  type?: string;
  locale?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}): OpenGraphMeta {
  return {
    ogTitle: input.title.substring(0, 60),
    ogDescription: input.description.substring(0, 200),
    ogImage: input.imageUrl || "",
    ogUrl: input.url,
    ogType: input.type || "article",
    ogSiteName: input.siteName,
    ogLocale: input.locale || "en_US",
    ogArticlePublishedTime: input.publishedTime,
    ogArticleModifiedTime: input.modifiedTime,
    ogArticleAuthor: input.author,
    ogArticleSection: input.section,
    ogArticleTags: input.tags,
  };
}

/**
 * Generate Twitter Card metadata
 */
export function generateTwitterCardMeta(input: {
  title: string;
  description: string;
  imageUrl?: string;
  site?: string;
  creator?: string;
  imageAlt?: string;
}): TwitterCardMeta {
  return {
    twitterCard: input.imageUrl ? "summary_large_image" : "summary",
    twitterSite: input.site,
    twitterCreator: input.creator,
    twitterTitle: input.title.substring(0, 70),
    twitterDescription: input.description.substring(0, 200),
    twitterImage: input.imageUrl || "",
    twitterImageAlt: input.imageAlt,
  };
}

/**
 * Generate all social meta tags as HTML
 */
export function generateSocialMetaTags(
  og: OpenGraphMeta,
  twitter: TwitterCardMeta
): string {
  const tags: string[] = [];
  
  // Open Graph tags
  tags.push(`<meta property="og:title" content="${og.ogTitle}" />`);
  tags.push(`<meta property="og:description" content="${og.ogDescription}" />`);
  tags.push(`<meta property="og:url" content="${og.ogUrl}" />`);
  tags.push(`<meta property="og:type" content="${og.ogType}" />`);
  tags.push(`<meta property="og:site_name" content="${og.ogSiteName}" />`);
  tags.push(`<meta property="og:locale" content="${og.ogLocale}" />`);
  
  if (og.ogImage) {
    tags.push(`<meta property="og:image" content="${og.ogImage}" />`);
    tags.push(`<meta property="og:image:width" content="1200" />`);
    tags.push(`<meta property="og:image:height" content="630" />`);
  }
  
  if (og.ogArticlePublishedTime) {
    tags.push(`<meta property="article:published_time" content="${og.ogArticlePublishedTime}" />`);
  }
  if (og.ogArticleModifiedTime) {
    tags.push(`<meta property="article:modified_time" content="${og.ogArticleModifiedTime}" />`);
  }
  if (og.ogArticleAuthor) {
    tags.push(`<meta property="article:author" content="${og.ogArticleAuthor}" />`);
  }
  if (og.ogArticleSection) {
    tags.push(`<meta property="article:section" content="${og.ogArticleSection}" />`);
  }
  if (og.ogArticleTags) {
    for (const tag of og.ogArticleTags) {
      tags.push(`<meta property="article:tag" content="${tag}" />`);
    }
  }
  
  // Twitter Card tags
  tags.push(`<meta name="twitter:card" content="${twitter.twitterCard}" />`);
  tags.push(`<meta name="twitter:title" content="${twitter.twitterTitle}" />`);
  tags.push(`<meta name="twitter:description" content="${twitter.twitterDescription}" />`);
  
  if (twitter.twitterSite) {
    tags.push(`<meta name="twitter:site" content="${twitter.twitterSite}" />`);
  }
  if (twitter.twitterCreator) {
    tags.push(`<meta name="twitter:creator" content="${twitter.twitterCreator}" />`);
  }
  if (twitter.twitterImage) {
    tags.push(`<meta name="twitter:image" content="${twitter.twitterImage}" />`);
  }
  if (twitter.twitterImageAlt) {
    tags.push(`<meta name="twitter:image:alt" content="${twitter.twitterImageAlt}" />`);
  }
  
  return tags.join("\n");
}
