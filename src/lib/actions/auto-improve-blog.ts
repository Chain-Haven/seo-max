"use server";

/**
 * Auto-Improve Blog to 90+ SEO Score
 * Iteratively improves content and generates new features until target score is reached
 */

import { getAIProvider } from "@/lib/ai/provider";
import {
  calculateBlogSEOScore,
  analyzeKeywords,
  analyzeReadability,
  generateTableOfContents,
  type BlogSEOScore,
} from "@/lib/seo/blog-seo-analyzer";

export interface AutoImproveProgress {
  iteration: number;
  currentScore: number;
  targetScore: number;
  action: string;
  details?: string;
}

export interface AutoImproveResult {
  success: boolean;
  content: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  finalScore: BlogSEOScore;
  iterations: number;
  improvements: string[];
  addedFeatures: string[];
  faqItems?: Array<{ question: string; answer: string }>;
  tableOfContents?: string;
  error?: string;
}

interface ContentState {
  content: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  faqItems: Array<{ question: string; answer: string }>;
}

const MAX_ITERATIONS = 10;
const TARGET_SCORE = 90;

/**
 * Auto-improve blog content until it reaches target SEO score (90+)
 * Generates new features like FAQ, expanded sections, better meta if needed
 */
export async function autoImproveToTargetScore(
  content: string,
  title: string,
  metaTitle: string,
  metaDescription: string,
  keywords: string[],
  options: {
    targetScore?: number;
    maxIterations?: number;
    onProgress?: (progress: AutoImproveProgress) => void;
  } = {}
): Promise<AutoImproveResult> {
  const targetScore = options.targetScore || TARGET_SCORE;
  const maxIterations = options.maxIterations || MAX_ITERATIONS;
  
  const ai = getAIProvider();
  const improvements: string[] = [];
  const addedFeatures: string[] = [];
  
  let state: ContentState = {
    content,
    title,
    metaTitle,
    metaDescription,
    faqItems: [],
  };
  
  let iteration = 0;
  let currentScore: BlogSEOScore;
  
  try {
    // Initial score calculation
    currentScore = calculateBlogSEOScore(
      state.content,
      state.title,
      state.metaDescription,
      keywords,
      { targetWordCount: { min: 1500, max: 3000 } }
    );
    
    console.log(`[AutoImprove] Starting score: ${currentScore.overall}`);
    
    // Iterate until target score or max iterations
    while (currentScore.overall < targetScore && iteration < maxIterations) {
      iteration++;
      
      // Identify the biggest issue to fix
      const topIssue = identifyTopIssue(currentScore);
      
      console.log(`[AutoImprove] Iteration ${iteration}: Fixing "${topIssue.category}" (current: ${currentScore.overall})`);
      
      options.onProgress?.({
        iteration,
        currentScore: currentScore.overall,
        targetScore,
        action: topIssue.category,
        details: topIssue.issue,
      });
      
      // Apply the appropriate fix
      const result = await applyFix(ai, state, keywords, topIssue, currentScore);
      
      if (result.improved) {
        state = result.state;
        improvements.push(result.improvement);
        if (result.addedFeature) {
          addedFeatures.push(result.addedFeature);
        }
      }
      
      // Recalculate score
      currentScore = calculateBlogSEOScore(
        state.content,
        state.title,
        state.metaDescription,
        keywords,
        { targetWordCount: { min: 1500, max: 3000 } }
      );
      
      console.log(`[AutoImprove] After fix: ${currentScore.overall}`);
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Final pass: Generate FAQ if not present and score still below target
    if (currentScore.overall < targetScore && state.faqItems.length === 0) {
      console.log(`[AutoImprove] Adding FAQ section to boost score`);
      const faqResult = await generateFAQSection(ai, state.content, keywords[0]);
      if (faqResult.faqItems.length > 0) {
        state.faqItems = faqResult.faqItems;
        state.content = addFAQToContent(state.content, faqResult.faqItems);
        addedFeatures.push("FAQ Section");
        improvements.push("Added FAQ section with common questions");
        
        currentScore = calculateBlogSEOScore(
          state.content,
          state.title,
          state.metaDescription,
          keywords,
          { targetWordCount: { min: 1500, max: 3000 } }
        );
      }
    }
    
    // Generate table of contents
    const toc = generateTableOfContents(state.content);
    
    return {
      success: currentScore.overall >= targetScore,
      content: state.content,
      title: state.title,
      metaTitle: state.metaTitle,
      metaDescription: state.metaDescription,
      finalScore: currentScore,
      iterations: iteration,
      improvements,
      addedFeatures,
      faqItems: state.faqItems.length > 0 ? state.faqItems : undefined,
      tableOfContents: toc.htmlOutput,
    };
  } catch (error) {
    console.error("[AutoImprove] Error:", error);
    return {
      success: false,
      content: state.content,
      title: state.title,
      metaTitle: state.metaTitle,
      metaDescription: state.metaDescription,
      finalScore: currentScore!,
      iterations: iteration,
      improvements,
      addedFeatures,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

interface Issue {
  category: string;
  issue: string;
  priority: number;
}

function identifyTopIssue(score: BlogSEOScore): Issue {
  const issues: Issue[] = [];
  
  // Check each breakdown category
  if (score.breakdown.titleOptimization.issues.length > 0) {
    issues.push({
      category: "title",
      issue: score.breakdown.titleOptimization.issues[0],
      priority: 15 - score.breakdown.titleOptimization.score,
    });
  }
  
  if (score.breakdown.metaDescription.issues.length > 0) {
    issues.push({
      category: "metaDescription",
      issue: score.breakdown.metaDescription.issues[0],
      priority: 10 - score.breakdown.metaDescription.score,
    });
  }
  
  if (score.breakdown.contentLength.issues.length > 0) {
    issues.push({
      category: "contentLength",
      issue: score.breakdown.contentLength.issues[0],
      priority: 15 - score.breakdown.contentLength.score,
    });
  }
  
  if (score.breakdown.keywordUsage.issues.length > 0) {
    issues.push({
      category: "keywordUsage",
      issue: score.breakdown.keywordUsage.issues[0],
      priority: 15 - score.breakdown.keywordUsage.score,
    });
  }
  
  if (score.breakdown.headingStructure.issues.length > 0) {
    issues.push({
      category: "headingStructure",
      issue: score.breakdown.headingStructure.issues[0],
      priority: 10 - score.breakdown.headingStructure.score,
    });
  }
  
  if (score.breakdown.readability.issues.length > 0) {
    issues.push({
      category: "readability",
      issue: score.breakdown.readability.issues[0],
      priority: 10 - score.breakdown.readability.score,
    });
  }
  
  if (score.breakdown.internalLinks.issues.length > 0) {
    issues.push({
      category: "internalLinks",
      issue: score.breakdown.internalLinks.issues[0],
      priority: 10 - score.breakdown.internalLinks.score,
    });
  }
  
  if (score.breakdown.images.issues.length > 0) {
    issues.push({
      category: "images",
      issue: score.breakdown.images.issues[0],
      priority: 10 - score.breakdown.images.score,
    });
  }
  
  // Sort by priority (highest first) and return top issue
  issues.sort((a, b) => b.priority - a.priority);
  
  return issues[0] || { category: "general", issue: "Improve overall content quality", priority: 5 };
}

async function applyFix(
  ai: ReturnType<typeof getAIProvider>,
  state: ContentState,
  keywords: string[],
  issue: Issue,
  currentScore: BlogSEOScore
): Promise<{
  improved: boolean;
  state: ContentState;
  improvement: string;
  addedFeature?: string;
}> {
  const primaryKeyword = keywords[0] || "";
  
  switch (issue.category) {
    case "title": {
      const newTitle = await improveTitle(ai, state.title, primaryKeyword, issue.issue);
      return {
        improved: true,
        state: { ...state, title: newTitle, metaTitle: newTitle.substring(0, 60) },
        improvement: `Improved title: "${newTitle}"`,
      };
    }
    
    case "metaDescription": {
      const newMeta = await improveMetaDescription(ai, state.content, primaryKeyword, state.metaDescription);
      return {
        improved: true,
        state: { ...state, metaDescription: newMeta },
        improvement: `Improved meta description for better CTR`,
      };
    }
    
    case "contentLength": {
      const expandedContent = await expandContent(ai, state.content, primaryKeyword, 500);
      return {
        improved: true,
        state: { ...state, content: expandedContent },
        improvement: `Expanded content by ~500 words`,
        addedFeature: "Expanded Content Sections",
      };
    }
    
    case "keywordUsage": {
      const optimizedContent = await optimizeKeywordUsage(ai, state.content, primaryKeyword, issue.issue);
      return {
        improved: true,
        state: { ...state, content: optimizedContent },
        improvement: `Optimized keyword placement: "${primaryKeyword}"`,
      };
    }
    
    case "headingStructure": {
      const structuredContent = await improveHeadingStructure(ai, state.content, primaryKeyword);
      return {
        improved: true,
        state: { ...state, content: structuredContent },
        improvement: `Improved heading structure with proper H1/H2/H3 hierarchy`,
        addedFeature: "Improved Heading Structure",
      };
    }
    
    case "readability": {
      const readableContent = await improveReadability(ai, state.content);
      return {
        improved: true,
        state: { ...state, content: readableContent },
        improvement: `Improved readability with shorter sentences and simpler words`,
      };
    }
    
    case "internalLinks": {
      const linkedContent = await addInternalLinkPlaceholders(ai, state.content, primaryKeyword);
      return {
        improved: true,
        state: { ...state, content: linkedContent },
        improvement: `Added internal link opportunities`,
        addedFeature: "Internal Link Suggestions",
      };
    }
    
    case "images": {
      const contentWithImages = await addImagePlaceholders(ai, state.content, primaryKeyword);
      return {
        improved: true,
        state: { ...state, content: contentWithImages },
        improvement: `Added image placeholders with SEO-optimized alt text`,
        addedFeature: "Image Placeholders",
      };
    }
    
    default: {
      // General improvement
      const improvedContent = await generalImprovement(ai, state.content, primaryKeyword, currentScore.prioritizedRecommendations);
      return {
        improved: true,
        state: { ...state, content: improvedContent },
        improvement: `Applied general SEO improvements`,
      };
    }
  }
}

async function improveTitle(
  ai: ReturnType<typeof getAIProvider>,
  currentTitle: string,
  keyword: string,
  issue: string
): Promise<string> {
  const prompt = `Improve this blog post title for SEO:

Current title: "${currentTitle}"
Target keyword: "${keyword}"
Issue to fix: "${issue}"

Requirements:
- Include the keyword naturally (preferably at the start)
- Keep between 50-60 characters
- Make it compelling and click-worthy
- Use power words if appropriate

Return ONLY the improved title, nothing else.`;

  const response = await ai.generateText(prompt, { maxTokens: 100 });
  return response.content.trim().replace(/^["']|["']$/g, "");
}

async function improveMetaDescription(
  ai: ReturnType<typeof getAIProvider>,
  content: string,
  keyword: string,
  currentMeta: string
): Promise<string> {
  const prompt = `Write a compelling meta description for this blog post:

Content preview: "${content.substring(0, 500)}"
Target keyword: "${keyword}"
Current meta: "${currentMeta}"

Requirements:
- Between 150-160 characters
- Include the keyword naturally
- Include a call-to-action
- Make it enticing to click
- Summarize the main value

Return ONLY the meta description, nothing else.`;

  const response = await ai.generateText(prompt, { maxTokens: 100 });
  return response.content.trim().replace(/^["']|["']$/g, "");
}

async function expandContent(
  ai: ReturnType<typeof getAIProvider>,
  content: string,
  keyword: string,
  targetWordsToAdd: number
): Promise<string> {
  const prompt = `Expand this blog post by adding approximately ${targetWordsToAdd} more words.

Current content:
${content}

Target keyword: "${keyword}"

Requirements:
- Add a new section with valuable information
- Include practical examples or tips
- Maintain the same writing style and tone
- Include the keyword naturally
- Add subheadings (H2 or H3) for the new section
- Keep the existing content intact
- Place new content in a logical position

Return the FULL expanded content (including original content) in Markdown format.`;

  const response = await ai.generateText(prompt, { maxTokens: 5000 });
  return response.content;
}

async function optimizeKeywordUsage(
  ai: ReturnType<typeof getAIProvider>,
  content: string,
  keyword: string,
  issue: string
): Promise<string> {
  const prompt = `Optimize keyword usage in this blog post:

Content:
${content}

Target keyword: "${keyword}"
Issue: "${issue}"

Requirements:
- Add the keyword to the first paragraph if not present
- Include keyword in at least one subheading
- Maintain natural keyword density (1-2%)
- Don't keyword stuff - keep it natural
- Preserve the original meaning and flow

Return the FULL optimized content in Markdown format.`;

  const response = await ai.generateText(prompt, { maxTokens: 5000 });
  return response.content;
}

async function improveHeadingStructure(
  ai: ReturnType<typeof getAIProvider>,
  content: string,
  keyword: string
): Promise<string> {
  const prompt = `Improve the heading structure of this blog post:

Content:
${content}

Target keyword: "${keyword}"

Requirements:
- Ensure exactly ONE H1 at the beginning (the title)
- Use H2 for main sections
- Use H3 for subsections
- Include the keyword in at least one H2
- Make headings descriptive and scannable
- Maintain logical hierarchy (no skipping levels)

Return the FULL content with improved headings in Markdown format.
Use # for H1, ## for H2, ### for H3.`;

  const response = await ai.generateText(prompt, { maxTokens: 5000 });
  return response.content;
}

async function improveReadability(
  ai: ReturnType<typeof getAIProvider>,
  content: string
): Promise<string> {
  const prompt = `Improve the readability of this blog post:

Content:
${content}

Requirements:
- Break up long sentences (aim for 15-20 words average)
- Use simpler words where possible
- Add transition words between paragraphs
- Use bullet points or numbered lists where appropriate
- Add short paragraphs (2-3 sentences max)
- Make it easy to scan

Return the FULL content with improved readability in Markdown format.`;

  const response = await ai.generateText(prompt, { maxTokens: 5000 });
  return response.content;
}

async function addInternalLinkPlaceholders(
  ai: ReturnType<typeof getAIProvider>,
  content: string,
  keyword: string
): Promise<string> {
  const prompt = `Add internal link placeholders to this blog post:

Content:
${content}

Topic: "${keyword}"

Requirements:
- Add 3-5 placeholder links in natural positions
- Use format: [anchor text](INTERNAL_LINK_PLACEHOLDER: related topic)
- Links should be to related topics that would exist on an e-commerce site
- Place links in context where they add value
- Don't disrupt the flow of the content

Return the FULL content with link placeholders in Markdown format.`;

  const response = await ai.generateText(prompt, { maxTokens: 5000 });
  return response.content;
}

async function addImagePlaceholders(
  ai: ReturnType<typeof getAIProvider>,
  content: string,
  keyword: string
): Promise<string> {
  const prompt = `Add image placeholders to this blog post:

Content:
${content}

Topic: "${keyword}"

Requirements:
- Add 2-3 image placeholders in strategic positions
- Use format: ![SEO-optimized alt text describing the image](IMAGE_PLACEHOLDER)
- Alt text should include the keyword naturally where appropriate
- Place images after key sections for visual breaks
- Suggest relevant image types (infographic, product photo, diagram, etc.)

Return the FULL content with image placeholders in Markdown format.`;

  const response = await ai.generateText(prompt, { maxTokens: 5000 });
  return response.content;
}

async function generalImprovement(
  ai: ReturnType<typeof getAIProvider>,
  content: string,
  keyword: string,
  recommendations: string[]
): Promise<string> {
  const prompt = `Improve this blog post based on these SEO recommendations:

Content:
${content}

Target keyword: "${keyword}"

Recommendations to address:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Requirements:
- Address as many recommendations as possible
- Maintain the original meaning and structure
- Keep it natural and reader-friendly
- Improve overall quality

Return the FULL improved content in Markdown format.`;

  const response = await ai.generateText(prompt, { maxTokens: 5000 });
  return response.content;
}

async function generateFAQSection(
  ai: ReturnType<typeof getAIProvider>,
  content: string,
  keyword: string
): Promise<{ faqItems: Array<{ question: string; answer: string }> }> {
  const prompt = `Generate a FAQ section for this blog post:

Content preview:
${content.substring(0, 1500)}

Topic: "${keyword}"

Requirements:
- Generate 5-6 relevant questions people would ask
- Provide concise, helpful answers (2-3 sentences each)
- Questions should relate to the content topic
- Include the keyword in at least 2 questions naturally
- Make answers informative and valuable

Return as JSON array:
[
  { "question": "Question 1?", "answer": "Answer 1." },
  { "question": "Question 2?", "answer": "Answer 2." }
]`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 1500 });
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return { faqItems: JSON.parse(jsonMatch[0]) };
    }
  } catch (error) {
    console.error("Error generating FAQ:", error);
  }
  
  return { faqItems: [] };
}

function addFAQToContent(
  content: string,
  faqItems: Array<{ question: string; answer: string }>
): string {
  const faqSection = `

## Frequently Asked Questions

${faqItems.map(faq => `### ${faq.question}

${faq.answer}`).join("\n\n")}
`;

  // Add before the conclusion if it exists, otherwise at the end
  if (content.toLowerCase().includes("## conclusion")) {
    return content.replace(
      /## conclusion/i,
      `${faqSection}\n\n## Conclusion`
    );
  }
  
  return content + faqSection;
}

/**
 * Quick improve - run a single improvement pass
 */
export async function quickImprove(
  content: string,
  keyword: string,
  suggestions: string[]
): Promise<{ data: string | null; error: string | null }> {
  try {
    const ai = getAIProvider();
    
    const prompt = `Improve this article based on these SEO suggestions:

Suggestions:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Target keyword: "${keyword}"

Current content:
${content}

Rewrite the article to address ALL suggestions while maintaining the original meaning and structure.
Make improvements naturally without making it obvious they were AI-generated.
Keep the same format (Markdown) and improve the overall quality.

Return the FULL improved content.`;

    const response = await ai.generateText(prompt, { maxTokens: 5000 });
    return { data: response.content, error: null };
  } catch (error) {
    console.error("Error improving article:", error);
    return { data: null, error: "Failed to improve article" };
  }
}
