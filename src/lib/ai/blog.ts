import { generateText, generateJSON, generateChat } from "./provider";
import type { AIGenerateOptions, AIProviderType } from "./types";

export interface BlogTopic {
  title: string;
  description: string;
  targetKeywords: string[];
  searchIntent: "informational" | "commercial" | "transactional" | "navigational";
  estimatedDifficulty: "easy" | "medium" | "hard";
  relevanceScore: number;
}

export interface BlogOutline {
  title: string;
  metaTitle: string;
  metaDescription: string;
  introduction: string;
  sections: Array<{
    heading: string;
    subheadings?: string[];
    keyPoints: string[];
    estimatedWordCount: number;
  }>;
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
  conclusion: string;
  suggestedInternalLinks: string[];
  estimatedReadTime: number;
}

export interface GeneratedBlogPost {
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  faqSection: string;
  faqSchema: object;
  articleSchema: object;
  wordCount: number;
  readTime: number;
}

// Generate blog topic ideas based on store context
export async function generateBlogTopics(
  storeName: string,
  storeNiche: string,
  productCategories: string[],
  existingTopics: string[],
  count: number = 5,
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<BlogTopic[]> {
  const prompt = `Generate ${count} unique blog post topic ideas for an e-commerce store.

Store Information:
- Store Name: ${storeName}
- Niche/Industry: ${storeNiche}
- Product Categories: ${productCategories.join(", ")}
${existingTopics.length > 0 ? `- Existing Blog Topics (avoid duplicates): ${existingTopics.join(", ")}` : ""}

Requirements:
1. Topics should be relevant to the store's products and target audience
2. Focus on topics that can drive organic traffic
3. Include a mix of:
   - How-to guides
   - Buying guides
   - Product comparisons
   - Industry tips and trends
   - Common questions/problems solved by the products
4. Each topic should have clear SEO potential

Return a JSON array with this structure:
[
  {
    "title": "Compelling blog post title",
    "description": "Brief 1-2 sentence description of what the post will cover",
    "targetKeywords": ["primary keyword", "secondary keyword", "long-tail keyword"],
    "searchIntent": "informational|commercial|transactional|navigational",
    "estimatedDifficulty": "easy|medium|hard",
    "relevanceScore": 0.0-1.0
  }
]

Generate diverse topics that would appeal to different stages of the customer journey.`;

  return generateJSON<BlogTopic[]>(prompt, {
    ...options,
    systemPrompt: "You are an SEO content strategist specializing in e-commerce. Generate data-driven blog topic ideas that drive traffic and conversions.",
    temperature: 0.8,
  });
}

// Generate a detailed blog outline
export async function generateBlogOutline(
  topic: string,
  targetKeywords: string[],
  storeContext: {
    storeName: string;
    productCategories: string[];
    relatedProducts?: string[];
  },
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<BlogOutline> {
  const prompt = `Create a comprehensive blog post outline for the following topic:

Topic: ${topic}
Target Keywords: ${targetKeywords.join(", ")}
Store Name: ${storeContext.storeName}
Product Categories: ${storeContext.productCategories.join(", ")}
${storeContext.relatedProducts?.length ? `Related Products to Mention: ${storeContext.relatedProducts.join(", ")}` : ""}

Create a detailed outline that:
1. Has a compelling, SEO-optimized title (max 60 chars for meta)
2. Includes 4-6 main sections with subheadings
3. Has an engaging introduction that hooks the reader
4. Includes 3-5 FAQ items based on common questions
5. Has a strong conclusion with call-to-action
6. Suggests internal linking opportunities

Return a JSON object with this structure:
{
  "title": "Full blog post title",
  "metaTitle": "SEO meta title (max 60 chars)",
  "metaDescription": "Compelling meta description (max 155 chars)",
  "introduction": "2-3 sentence introduction hook",
  "sections": [
    {
      "heading": "H2 heading",
      "subheadings": ["H3 subheading 1", "H3 subheading 2"],
      "keyPoints": ["point 1", "point 2", "point 3"],
      "estimatedWordCount": 300
    }
  ],
  "faqItems": [
    {
      "question": "Common question?",
      "answer": "Concise, helpful answer (2-3 sentences)"
    }
  ],
  "conclusion": "Strong conclusion with CTA",
  "suggestedInternalLinks": ["product page", "category page", "related blog post"],
  "estimatedReadTime": 8
}`;

  return generateJSON<BlogOutline>(prompt, {
    ...options,
    systemPrompt: "You are an expert content strategist. Create comprehensive, SEO-optimized blog outlines that drive engagement and conversions.",
    temperature: 0.7,
  });
}

// Generate a full blog post from an outline
export async function generateFullBlogPost(
  outline: BlogOutline,
  storeContext: {
    storeName: string;
    storeUrl?: string;
    brandVoice?: string;
  },
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<GeneratedBlogPost> {
  const prompt = `Write a complete, high-quality blog post based on this outline:

Title: ${outline.title}
Meta Description: ${outline.metaDescription}

Introduction Hook: ${outline.introduction}

Sections:
${outline.sections.map((s, i) => `
${i + 1}. ${s.heading}
   ${s.subheadings?.map(sh => `   - ${sh}`).join("\n") || ""}
   Key Points: ${s.keyPoints.join("; ")}
   Target Word Count: ~${s.estimatedWordCount} words
`).join("\n")}

Conclusion: ${outline.conclusion}

Store Name: ${storeContext.storeName}
${storeContext.brandVoice ? `Brand Voice: ${storeContext.brandVoice}` : ""}

Writing Guidelines:
1. Write in an engaging, informative tone
2. Use short paragraphs (2-3 sentences max)
3. Include bullet points and numbered lists where appropriate
4. Add transition sentences between sections
5. Naturally incorporate the store name where relevant
6. Make the content actionable and valuable
7. Use proper HTML formatting (h2, h3, p, ul, ol, strong, em)
8. Do NOT include the title in the content (it will be added separately)
9. Total word count should be approximately ${outline.sections.reduce((sum, s) => sum + s.estimatedWordCount, 0)} words

Return the content in clean HTML format, ready to be published.`;

  const contentResult = await generateText(prompt, {
    ...options,
    systemPrompt: "You are an expert blog writer specializing in e-commerce content. Write engaging, SEO-optimized content that provides real value to readers.",
    temperature: 0.7,
    maxTokens: 4000,
  });

  // Generate FAQ section separately for better quality
  const faqPrompt = `Write a FAQ section based on these questions and answers:

${outline.faqItems.map((faq, i) => `Q${i + 1}: ${faq.question}\nA${i + 1}: ${faq.answer}`).join("\n\n")}

Format as HTML with proper structure:
<div class="faq-section">
  <h2>Frequently Asked Questions</h2>
  <div class="faq-item">
    <h3>Question here?</h3>
    <p>Answer here.</p>
  </div>
</div>

Expand each answer to be more comprehensive (3-4 sentences) while keeping them concise and helpful.`;

  const faqResult = await generateText(faqPrompt, {
    ...options,
    systemPrompt: "You are a helpful content writer. Create clear, informative FAQ content.",
    temperature: 0.5,
  });

  // Generate FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": outline.faqItems.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  // Generate Article Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": outline.title,
    "description": outline.metaDescription,
    "author": {
      "@type": "Organization",
      "name": storeContext.storeName
    },
    "publisher": {
      "@type": "Organization",
      "name": storeContext.storeName,
    },
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString(),
  };

  // Calculate word count
  const textContent = contentResult.content.replace(/<[^>]*>/g, " ");
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
  const readTime = Math.ceil(wordCount / 200); // Average reading speed

  return {
    title: outline.title,
    metaTitle: outline.metaTitle,
    metaDescription: outline.metaDescription,
    content: contentResult.content,
    faqSection: faqResult.content,
    faqSchema,
    articleSchema,
    wordCount,
    readTime,
  };
}

// Generate content improvements/suggestions
export async function suggestContentImprovements(
  content: string,
  targetKeywords: string[],
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<{
  suggestions: string[];
  keywordUsage: Record<string, number>;
  readabilityScore: string;
  seoScore: number;
}> {
  const prompt = `Analyze this blog content and provide improvement suggestions:

Content:
${content.substring(0, 3000)}${content.length > 3000 ? "..." : ""}

Target Keywords: ${targetKeywords.join(", ")}

Analyze and return a JSON object with:
{
  "suggestions": [
    "Specific actionable improvement 1",
    "Specific actionable improvement 2",
    "Specific actionable improvement 3"
  ],
  "keywordUsage": {
    "keyword1": count,
    "keyword2": count
  },
  "readabilityScore": "easy|medium|difficult",
  "seoScore": 0-100
}

Focus on:
1. Keyword optimization (natural placement, density)
2. Readability (sentence length, paragraph structure)
3. Engagement (hooks, transitions, CTAs)
4. SEO best practices (headings, internal links, meta)`;

  return generateJSON(prompt, {
    ...options,
    systemPrompt: "You are an SEO content analyst. Provide specific, actionable feedback.",
    temperature: 0.3,
  });
}
