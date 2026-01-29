"use server";

/**
 * Enhanced SEO Blog Actions
 * Integrates all SEO features for comprehensive blog optimization
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  generateBlogPostSchema,
  generateSchemaScript,
  validateSchema,
  type BlogPostSchemaInput,
} from "@/lib/seo/blog-schema";
import {
  generateTableOfContents,
  analyzeKeywords,
  analyzeReadability,
  analyzeEEATSignals,
  analyzeContentStructure,
  calculateBlogSEOScore,
  generateOpenGraphMeta,
  generateTwitterCardMeta,
  generateSocialMetaTags,
  type BlogSEOScore,
  type TableOfContents,
  type KeywordAnalysis,
  type ReadabilityAnalysis,
  type EEATSignals,
} from "@/lib/seo/blog-seo-analyzer";
import {
  suggestInternalLinks,
  autoInsertInternalLinks,
  getAIEnhancedLinkSuggestions,
  type LinkSuggestion,
} from "@/lib/seo/blog-internal-linking";
import { getSerpClientForStore } from "@/lib/serp/client";
import { getAIProvider } from "@/lib/ai/provider";

export interface EnhancedBlogData {
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  author?: {
    name: string;
    url?: string;
    image?: string;
    bio?: string;
    credentials?: string;
    socialProfiles?: string[];
  };
  featuredImage?: string;
  categories?: string[];
  tags?: string[];
  faqItems?: Array<{ question: string; answer: string }>;
}

export interface EnhancedBlogOutput {
  // Original content with enhancements
  content: string;
  contentWithTOC: string;
  contentWithInternalLinks: string;
  
  // Meta data
  metaTitle: string;
  metaDescription: string;
  
  // Table of Contents
  tableOfContents: TableOfContents;
  
  // Schema markup
  schemas: {
    article: object;
    faq?: object;
    breadcrumb?: object;
    webPage: object;
    organization: object;
  };
  schemaScript: string;
  schemaValidation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  
  // Social meta
  openGraph: ReturnType<typeof generateOpenGraphMeta>;
  twitterCard: ReturnType<typeof generateTwitterCardMeta>;
  socialMetaTags: string;
  
  // SEO Analysis
  seoScore: BlogSEOScore;
  keywordAnalysis: KeywordAnalysis[];
  readabilityAnalysis: ReadabilityAnalysis;
  eeatSignals: EEATSignals;
  
  // Internal linking
  internalLinkSuggestions: LinkSuggestion[];
  insertedLinks: Array<{ url: string; anchorText: string }>;
  
  // Recommendations
  prioritizedRecommendations: string[];
}

/**
 * Generate comprehensive SEO-optimized blog output
 */
export async function generateEnhancedBlogOutput(
  storeId: string,
  blogData: EnhancedBlogData
): Promise<{ data: EnhancedBlogOutput | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Get store info
    const { data: store } = await supabase
      .from("stores")
      .select("name, url")
      .eq("id", storeId)
      .single();

    if (!store) {
      return { data: null, error: "Store not found" };
    }

    const storeUrl = store.url || "";
    const postUrl = `${storeUrl}/blog/${slugify(blogData.title)}`;

    // 1. Generate Table of Contents
    const tableOfContents = generateTableOfContents(blogData.content);

    // 2. Add heading IDs to content for TOC links
    let contentWithIDs = addHeadingIds(blogData.content);

    // 3. Create content with TOC
    const contentWithTOC = `${tableOfContents.htmlOutput}\n\n${contentWithIDs}`;

    // 4. Get internal link suggestions
    const { suggestions: internalLinkSuggestions } = await suggestInternalLinks(
      storeId,
      blogData.content,
      {
        maxSuggestions: 10,
        minRelevanceScore: 30,
      }
    );

    // 5. Auto-insert internal links
    const { content: contentWithInternalLinks, insertedLinks } =
      await autoInsertInternalLinks(storeId, contentWithIDs, {
        maxLinks: 5,
        minRelevanceScore: 40,
      });

    // 6. Analyze content
    const keywordAnalysis = analyzeKeywords(
      blogData.content,
      blogData.keywords,
      blogData.title,
      blogData.metaDescription
    );

    const readabilityAnalysis = analyzeReadability(blogData.content);

    const eeatSignals = analyzeEEATSignals(blogData.content, {
      hasAuthor: !!blogData.author,
      authorBio: blogData.author?.bio,
      authorCredentials: blogData.author?.credentials,
      publishDate: new Date().toISOString(),
    });

    // 7. Calculate SEO score
    const seoScore = calculateBlogSEOScore(
      blogData.content,
      blogData.title,
      blogData.metaDescription,
      blogData.keywords,
      {
        siteUrl: storeUrl,
        hasAuthor: !!blogData.author,
        authorBio: blogData.author?.bio,
        publishDate: new Date().toISOString(),
        targetWordCount: { min: 1500, max: 3000 },
      }
    );

    // 8. Generate schema markup
    const schemaInput: BlogPostSchemaInput = {
      title: blogData.title,
      description: blogData.metaDescription,
      content: blogData.content,
      url: postUrl,
      imageUrl: blogData.featuredImage,
      datePublished: new Date().toISOString(),
      author: {
        name: blogData.author?.name || store.name,
        url: blogData.author?.url,
        image: blogData.author?.image,
        description: blogData.author?.bio,
        sameAs: blogData.author?.socialProfiles,
      },
      organization: {
        name: store.name,
        url: storeUrl,
      },
      breadcrumbs: [
        { name: "Home", url: storeUrl },
        { name: "Blog", url: `${storeUrl}/blog` },
        { name: blogData.title, url: postUrl },
      ],
      categories: blogData.categories,
      tags: blogData.tags,
      faqItems: blogData.faqItems,
    };

    const schemaOutput = generateBlogPostSchema(schemaInput);
    const schemaScript = generateSchemaScript(schemaOutput.combinedSchema);

    // Validate schemas
    const articleValidation = validateSchema(schemaOutput.articleSchema);
    const schemaValidation = {
      valid: articleValidation.valid,
      errors: articleValidation.errors,
      warnings: articleValidation.warnings,
    };

    // 9. Generate social meta tags
    const openGraph = generateOpenGraphMeta({
      title: blogData.metaTitle || blogData.title,
      description: blogData.metaDescription,
      url: postUrl,
      imageUrl: blogData.featuredImage,
      siteName: store.name,
      publishedTime: new Date().toISOString(),
      author: blogData.author?.name,
      section: blogData.categories?.[0],
      tags: blogData.tags,
    });

    const twitterCard = generateTwitterCardMeta({
      title: blogData.metaTitle || blogData.title,
      description: blogData.metaDescription,
      imageUrl: blogData.featuredImage,
      imageAlt: blogData.title,
    });

    const socialMetaTags = generateSocialMetaTags(openGraph, twitterCard);

    // 10. Compile recommendations
    const prioritizedRecommendations = [
      ...seoScore.prioritizedRecommendations,
      ...eeatSignals.recommendations.slice(0, 3),
      ...readabilityAnalysis.suggestions,
    ].slice(0, 10);

    return {
      data: {
        content: contentWithIDs,
        contentWithTOC,
        contentWithInternalLinks,
        metaTitle: blogData.metaTitle || blogData.title.substring(0, 60),
        metaDescription: blogData.metaDescription,
        tableOfContents,
        schemas: {
          article: schemaOutput.articleSchema,
          faq: schemaOutput.faqSchema,
          breadcrumb: schemaOutput.breadcrumbSchema,
          webPage: schemaOutput.webPageSchema,
          organization: schemaOutput.organizationSchema,
        },
        schemaScript,
        schemaValidation,
        openGraph,
        twitterCard,
        socialMetaTags,
        seoScore,
        keywordAnalysis,
        readabilityAnalysis,
        eeatSignals,
        internalLinkSuggestions,
        insertedLinks,
        prioritizedRecommendations,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error generating enhanced blog output:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Analyze and optimize existing blog post
 */
export async function analyzeExistingBlogPost(
  storeId: string,
  postId: string
): Promise<{
  data: {
    seoScore: BlogSEOScore;
    suggestions: string[];
    linkSuggestions: LinkSuggestion[];
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Get the blog post
    const { data: post, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (error || !post) {
      return { data: null, error: "Post not found" };
    }

    // Extract keywords from title and content
    const keywords = extractKeywordsFromContent(post.title, post.content);

    // Calculate SEO score
    const seoScore = calculateBlogSEOScore(
      post.content,
      post.title,
      post.meta_description || "",
      keywords
    );

    // Get internal link suggestions
    const { suggestions: linkSuggestions } = await suggestInternalLinks(
      storeId,
      post.content,
      { maxSuggestions: 10 }
    );

    return {
      data: {
        seoScore,
        suggestions: seoScore.prioritizedRecommendations,
        linkSuggestions,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error analyzing blog post:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate SEO-optimized title suggestions
 */
export async function generateTitleSuggestions(
  keyword: string,
  currentTitle?: string
): Promise<{ data: string[] | null; error: string | null }> {
  try {
    const ai = getAIProvider();

    const prompt = `Generate 5 SEO-optimized blog post titles for the keyword: "${keyword}"
${currentTitle ? `Current title: "${currentTitle}"` : ""}

Requirements:
1. Include the exact keyword or close variation
2. Keep between 50-60 characters
3. Use power words (Ultimate, Complete, Essential, etc.)
4. Include numbers where appropriate (10 Best, 5 Ways, etc.)
5. Create urgency or curiosity
6. Make them click-worthy but not clickbait

Return only the 5 titles, one per line, no numbering.`;

    const response = await ai.generateText(prompt, { maxTokens: 500 });
    const titles = response.content
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 70)
      .slice(0, 5);

    return { data: titles, error: null };
  } catch (error) {
    console.error("Error generating titles:", error);
    return { data: null, error: "Failed to generate titles" };
  }
}

/**
 * Generate SEO-optimized meta description
 */
export async function generateMetaDescriptionSuggestions(
  title: string,
  content: string,
  keyword: string
): Promise<{ data: string[] | null; error: string | null }> {
  try {
    const ai = getAIProvider();

    const contentPreview = content.substring(0, 500);

    const prompt = `Generate 3 SEO-optimized meta descriptions for this blog post:

Title: "${title}"
Keyword: "${keyword}"
Content preview: "${contentPreview}"

Requirements:
1. Between 150-160 characters
2. Include the keyword naturally
3. Include a call-to-action
4. Be compelling and click-worthy
5. Summarize the main value proposition

Return only the 3 descriptions, one per line.`;

    const response = await ai.generateText(prompt, { maxTokens: 500 });
    const descriptions = response.content
      .split("\n")
      .map((d) => d.trim())
      .filter((d) => d.length >= 100 && d.length <= 170)
      .slice(0, 3);

    return { data: descriptions, error: null };
  } catch (error) {
    console.error("Error generating meta descriptions:", error);
    return { data: null, error: "Failed to generate meta descriptions" };
  }
}

/**
 * Save enhanced blog post with all SEO data
 */
export async function saveEnhancedBlogPost(
  storeId: string,
  data: EnhancedBlogData & {
    seoOutput?: EnhancedBlogOutput;
    status?: "draft" | "pending" | "published";
  }
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Generate SEO output if not provided
    let seoOutput = data.seoOutput;
    if (!seoOutput) {
      const result = await generateEnhancedBlogOutput(storeId, data);
      if (result.error || !result.data) {
        return { data: null, error: result.error || "Failed to generate SEO output" };
      }
      seoOutput = result.data;
    }

    const { data: post, error } = await supabase
      .from("blog_posts")
      .insert({
        store_id: storeId,
        title: data.title,
        content: seoOutput.contentWithInternalLinks,
        meta_title: seoOutput.metaTitle,
        meta_description: seoOutput.metaDescription,
        schema_markup: {
          schemas: seoOutput.schemas,
          script: seoOutput.schemaScript,
        },
        seo_score: seoOutput.seoScore.overall,
        seo_data: {
          keywords: data.keywords,
          keywordAnalysis: seoOutput.keywordAnalysis,
          readability: seoOutput.readabilityAnalysis,
          eeat: seoOutput.eeatSignals,
          tableOfContents: seoOutput.tableOfContents.items,
          openGraph: seoOutput.openGraph,
          twitterCard: seoOutput.twitterCard,
        },
        author_name: data.author?.name,
        author_bio: data.author?.bio,
        featured_image: data.featuredImage,
        categories: data.categories,
        tags: data.tags,
        status: data.status || "draft",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error saving blog post:", error);
      return { data: null, error: error.message };
    }

    revalidatePath(`/dashboard/stores/${storeId}/blog`);
    return { data: { id: post.id }, error: null };
  } catch (error) {
    console.error("Error saving enhanced blog post:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get keyword research data for blog planning
 */
export async function getKeywordResearchForBlog(
  storeId: string,
  seedKeyword: string
): Promise<{
  data: {
    mainKeyword: {
      keyword: string;
      searchVolume?: number;
      difficulty?: number;
    };
    relatedKeywords: Array<{
      keyword: string;
      searchVolume?: number;
      relevance: number;
    }>;
    questions: string[];
    topicClusters: string[];
  } | null;
  error: string | null;
}> {
  try {
    // Get SERP client
    const serpClient = await getSerpClientForStore(storeId);

    // Get store URL for domain
    const supabase = await createClient();
    const { data: store } = await supabase
      .from("stores")
      .select("url")
      .eq("id", storeId)
      .single();

    const domain = store?.url ? new URL(store.url).hostname : "";

    // Get SERP data
    const serpData = await serpClient.checkRanking(seedKeyword, domain);

    // Use AI to expand keyword research
    const ai = getAIProvider();

    const prompt = `Generate comprehensive keyword research for the topic: "${seedKeyword}"

Provide:
1. 10 related long-tail keywords (variations and related terms)
2. 8 questions people ask about this topic
3. 5 topic cluster ideas for content planning

Format as JSON:
{
  "relatedKeywords": [{"keyword": "...", "relevance": 0-100}],
  "questions": ["question 1?", "question 2?"],
  "topicClusters": ["cluster 1", "cluster 2"]
}`;

    const response = await ai.generateText(prompt, { maxTokens: 1000 });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);

    let aiData = {
      relatedKeywords: [] as Array<{ keyword: string; relevance: number }>,
      questions: [] as string[],
      topicClusters: [] as string[],
    };

    if (jsonMatch) {
      aiData = JSON.parse(jsonMatch[0]);
    }

    // Combine SERP data with AI data
    return {
      data: {
        mainKeyword: {
          keyword: seedKeyword,
          searchVolume: serpData.searchVolume,
        },
        relatedKeywords: aiData.relatedKeywords.map((k) => ({
          ...k,
          searchVolume: undefined,
        })),
        questions:
          serpData.features.peopleAlsoAsk.length > 0
            ? serpData.features.peopleAlsoAsk
            : aiData.questions,
        topicClusters: aiData.topicClusters,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error getting keyword research:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Utility functions

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
}

function addHeadingIds(content: string): string {
  let counter = 0;
  return content.replace(
    /<h([2-6])([^>]*)>([^<]+)<\/h[2-6]>/gi,
    (match, level, attrs, text) => {
      if (attrs.includes("id=")) {
        return match;
      }
      const id = slugify(text) || `heading-${++counter}`;
      return `<h${level}${attrs} id="${id}">${text}</h${level}>`;
    }
  );
}

function extractKeywordsFromContent(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const words = text
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  // Simple frequency-based keyword extraction
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  return Object.entries(freq)
    .filter(([word, count]) => count >= 2 && word.length > 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}
