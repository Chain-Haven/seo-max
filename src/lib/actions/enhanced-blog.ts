"use server";

import { revalidatePath } from "next/cache";
import { analyzeCompetitorContent, getPeopleAlsoAsk, type SerpAnalysis } from "@/lib/ai/competitor-analysis";
import { scoreContent, type ContentScore } from "@/lib/ai/content-scoring";
import { generateImage, generateArticleImages, type GeneratedImage } from "@/lib/ai/image-generation";
import {
  ARTICLE_TEMPLATES,
  suggestTemplate,
  generateOutlineFromTemplate,
  generateArticleFromTemplate,
  generateMetaDescription,
  type ArticleTemplate,
  type TemplateInfo,
} from "@/lib/ai/content-templates";
import { getAIProvider } from "@/lib/ai/provider";

// Analyze keyword and get competitor insights
export async function analyzeKeyword(
  keyword: string,
  productContext?: { name: string; category: string; description: string }
): Promise<{ data: SerpAnalysis | null; error: string | null }> {
  try {
    const analysis = await analyzeCompetitorContent(keyword, productContext);
    return { data: analysis, error: null };
  } catch (error) {
    console.error("Error analyzing keyword:", error);
    return { data: null, error: "Failed to analyze keyword" };
  }
}

// Get suggested template for keyword
export async function getSuggestedTemplate(
  keyword: string,
  searchIntent?: "informational" | "transactional" | "navigational" | "commercial"
): Promise<{ data: { template: TemplateInfo; reason: string } | null; error: string | null }> {
  try {
    const suggestion = await suggestTemplate(keyword, searchIntent);
    return { data: suggestion, error: null };
  } catch (error) {
    console.error("Error suggesting template:", error);
    return { data: null, error: "Failed to suggest template" };
  }
}

// Get all available templates
export async function getAvailableTemplates(): Promise<TemplateInfo[]> {
  return ARTICLE_TEMPLATES;
}

// Generate outline based on template and analysis
export async function generateEnhancedOutline(
  keyword: string,
  templateId: ArticleTemplate,
  options: {
    productContext?: { name: string; category: string; description: string };
    paaQuestions?: string[];
    competitorTopics?: string[];
  } = {}
): Promise<{ data: string[] | null; error: string | null }> {
  try {
    const template = ARTICLE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return { data: null, error: "Template not found" };
    }

    const outline = await generateOutlineFromTemplate(
      keyword,
      template,
      options.productContext,
      options.paaQuestions
    );

    return { data: outline, error: null };
  } catch (error) {
    console.error("Error generating outline:", error);
    return { data: null, error: "Failed to generate outline" };
  }
}

// Generate full article with all enhancements
export async function generateEnhancedArticle(
  keyword: string,
  templateId: ArticleTemplate,
  outline: string[],
  options: {
    productContext?: { name: string; category: string; description: string };
    paaQuestions?: Array<{ question: string; answer?: string }>;
    competitorTopics?: string[];
    targetWordCount?: number;
    tone?: "professional" | "casual" | "friendly" | "authoritative";
    includeImages?: boolean;
  } = {}
): Promise<{
  data: {
    content: string;
    metaDescription: string;
    images: GeneratedImage[];
    score: ContentScore;
  } | null;
  error: string | null;
}> {
  try {
    const template = ARTICLE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return { data: null, error: "Template not found" };
    }

    // Generate article content
    const content = await generateArticleFromTemplate(keyword, template, outline, options);

    // Generate meta description
    const title = outline.find((o) => o.startsWith("H2:"))?.replace("H2: ", "") || keyword;
    const metaDescription = generateMetaDescription(title, keyword, templateId);

    // Generate images if requested
    let images: GeneratedImage[] = [];
    if (options.includeImages) {
      images = await generateArticleImages({
        articleTitle: title,
        articleTopic: keyword,
        productInfo: options.productContext,
        style: "professional",
        imageTypes: ["hero", "illustration"],
      });
    }

    // Score the content
    const score = scoreContent({
      content,
      title,
      keyword,
      metaDescription,
      targetWordCount: options.targetWordCount ? { min: options.targetWordCount * 0.8, max: options.targetWordCount * 1.2 } : template.avgWordCount,
    });

    return {
      data: { content, metaDescription, images, score },
      error: null,
    };
  } catch (error) {
    console.error("Error generating article:", error);
    return { data: null, error: "Failed to generate article" };
  }
}

// Score existing content
export async function scoreExistingContent(
  content: string,
  title: string,
  keyword: string,
  metaDescription?: string
): Promise<{ data: ContentScore | null; error: string | null }> {
  try {
    const score = scoreContent({
      content,
      title,
      keyword,
      metaDescription,
    });
    return { data: score, error: null };
  } catch (error) {
    console.error("Error scoring content:", error);
    return { data: null, error: "Failed to score content" };
  }
}

// Generate a single image for article
export async function generateArticleImage(
  articleTitle: string,
  articleTopic: string,
  imageType: "hero" | "infographic" | "product" | "illustration" | "diagram",
  productInfo?: { name: string; category: string; description: string }
): Promise<{ data: GeneratedImage | null; error: string | null }> {
  try {
    const image = await generateImage({
      articleTitle,
      articleTopic,
      productInfo,
      style: "professional",
    }, imageType);
    return { data: image, error: null };
  } catch (error) {
    console.error("Error generating image:", error);
    return { data: null, error: "Failed to generate image" };
  }
}

// Get People Also Ask questions
export async function fetchPeopleAlsoAsk(
  keyword: string
): Promise<{ data: Array<{ question: string; snippet?: string }> | null; error: string | null }> {
  try {
    const questions = await getPeopleAlsoAsk(keyword);
    return { data: questions, error: null };
  } catch (error) {
    console.error("Error fetching PAA:", error);
    return { data: null, error: "Failed to fetch questions" };
  }
}

// Improve article based on score suggestions
export async function improveArticle(
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

Rewrite the article to address these suggestions while maintaining the original meaning and structure.
Keep the same format (Markdown) and improve naturally.`;

    const response = await ai.generateText(prompt, { maxTokens: 4000 });
    return { data: response.content, error: null };
  } catch (error) {
    console.error("Error improving article:", error);
    return { data: null, error: "Failed to improve article" };
  }
}

// Expand a specific section
export async function expandSection(
  sectionTitle: string,
  sectionContent: string,
  keyword: string,
  targetWords: number
): Promise<{ data: string | null; error: string | null }> {
  try {
    const ai = getAIProvider();
    
    const prompt = `Expand this section to approximately ${targetWords} words while maintaining quality and relevance.

Section: ${sectionTitle}
Keyword: ${keyword}

Current content:
${sectionContent}

Requirements:
- Add more detail, examples, and explanations
- Maintain the same tone and style
- Include the keyword naturally
- Make it comprehensive and valuable
- Keep Markdown formatting`;

    const response = await ai.generateText(prompt, { maxTokens: 1500 });
    return { data: response.content, error: null };
  } catch (error) {
    console.error("Error expanding section:", error);
    return { data: null, error: "Failed to expand section" };
  }
}

// Generate product-focused content
export async function generateProductContent(
  product: { name: string; category: string; description: string; features?: string[] },
  contentType: "description" | "benefits" | "use-cases" | "comparison"
): Promise<{ data: string | null; error: string | null }> {
  try {
    const ai = getAIProvider();
    
    const prompts: Record<string, string> = {
      description: `Write a compelling, SEO-optimized product description for:
Product: ${product.name}
Category: ${product.category}
Details: ${product.description}
${product.features?.length ? `Features: ${product.features.join(", ")}` : ""}

Requirements:
- 150-200 words
- Highlight key benefits
- Include sensory and emotional language
- Natural keyword integration
- End with a subtle call-to-action`,

      benefits: `Write a "Key Benefits" section for:
Product: ${product.name}
Description: ${product.description}

Format as a bulleted list with 5-7 benefits.
Each benefit should:
- Start with a strong action verb
- Explain the "what" and "why"
- Be 1-2 sentences`,

      "use-cases": `Write 4-5 compelling use cases for:
Product: ${product.name}
Category: ${product.category}
Description: ${product.description}

Each use case should:
- Have a descriptive title
- Explain the scenario (2-3 sentences)
- Show how the product solves it
- Be relatable to the target audience`,

      comparison: `Write a "Why Choose ${product.name}" comparison section.

Product: ${product.name}
Category: ${product.category}
Description: ${product.description}

Compare against typical alternatives in this category.
Include a comparison table and explanatory text.
Highlight unique selling points without being negative about competitors.`,
    };

    const response = await ai.generateText(prompts[contentType] || prompts.description, { maxTokens: 1000 });
    return { data: response.content, error: null };
  } catch (error) {
    console.error("Error generating product content:", error);
    return { data: null, error: "Failed to generate product content" };
  }
}
