import { getAIProvider } from "./provider";

export type ArticleTemplate = 
  | "how-to-guide"
  | "listicle"
  | "comparison"
  | "product-review"
  | "ultimate-guide"
  | "case-study"
  | "problem-solution"
  | "faq-article"
  | "news-article"
  | "opinion-piece";

export interface TemplateInfo {
  id: ArticleTemplate;
  name: string;
  description: string;
  bestFor: string[];
  structure: string[];
  avgWordCount: { min: number; max: number };
  icon: string;
}

export const ARTICLE_TEMPLATES: TemplateInfo[] = [
  {
    id: "how-to-guide",
    name: "How-To Guide",
    description: "Step-by-step instructions for accomplishing a task",
    bestFor: ["tutorials", "DIY content", "educational content", "product usage"],
    structure: [
      "Introduction (what you'll learn)",
      "Prerequisites/What you need",
      "Step 1: [First action]",
      "Step 2: [Second action]",
      "Step 3: [Third action]",
      "Tips for success",
      "Common mistakes to avoid",
      "Conclusion",
      "FAQs",
    ],
    avgWordCount: { min: 1500, max: 2500 },
    icon: "📝",
  },
  {
    id: "listicle",
    name: "Listicle",
    description: "List-based article with numbered or bulleted items",
    bestFor: ["roundups", "tips articles", "resource lists", "recommendations"],
    structure: [
      "Introduction (why this list matters)",
      "Quick overview",
      "Item 1: [Title] - Description",
      "Item 2: [Title] - Description",
      "Item 3: [Title] - Description",
      "[Continue for all items]",
      "How to choose the right one",
      "Conclusion",
      "FAQs",
    ],
    avgWordCount: { min: 2000, max: 3500 },
    icon: "📋",
  },
  {
    id: "comparison",
    name: "Comparison/Versus",
    description: "Side-by-side comparison of products, services, or options",
    bestFor: ["product comparisons", "service comparisons", "decision guides"],
    structure: [
      "Introduction (why compare)",
      "Quick comparison table",
      "Option A: Overview",
      "Option A: Pros & Cons",
      "Option B: Overview",
      "Option B: Pros & Cons",
      "Head-to-head comparison",
      "Which one is right for you?",
      "Verdict",
      "FAQs",
    ],
    avgWordCount: { min: 2000, max: 3000 },
    icon: "⚖️",
  },
  {
    id: "product-review",
    name: "Product Review",
    description: "In-depth review of a product with pros, cons, and verdict",
    bestFor: ["product reviews", "service reviews", "tool reviews"],
    structure: [
      "Introduction & Quick verdict",
      "Product overview",
      "Key features",
      "Pros",
      "Cons",
      "User experience",
      "Pricing & Value",
      "Alternatives to consider",
      "Final verdict",
      "FAQs",
    ],
    avgWordCount: { min: 1500, max: 2500 },
    icon: "⭐",
  },
  {
    id: "ultimate-guide",
    name: "Ultimate Guide",
    description: "Comprehensive, authoritative resource on a topic",
    bestFor: ["pillar content", "comprehensive guides", "educational resources"],
    structure: [
      "Introduction (what you'll learn)",
      "Table of contents",
      "Chapter 1: Fundamentals",
      "Chapter 2: Getting started",
      "Chapter 3: Intermediate concepts",
      "Chapter 4: Advanced strategies",
      "Chapter 5: Best practices",
      "Chapter 6: Tools & resources",
      "Conclusion & Next steps",
      "FAQs",
    ],
    avgWordCount: { min: 3000, max: 5000 },
    icon: "📚",
  },
  {
    id: "case-study",
    name: "Case Study",
    description: "Real-world example showing results and process",
    bestFor: ["success stories", "customer stories", "before/after content"],
    structure: [
      "Executive summary",
      "Background & Challenge",
      "Goals & Objectives",
      "Solution & Approach",
      "Implementation",
      "Results & Metrics",
      "Key takeaways",
      "Conclusion",
    ],
    avgWordCount: { min: 1200, max: 2000 },
    icon: "📊",
  },
  {
    id: "problem-solution",
    name: "Problem-Solution",
    description: "Identifies a problem and presents solutions",
    bestFor: ["troubleshooting", "fixing issues", "addressing pain points"],
    structure: [
      "Introduction (the problem)",
      "Why this problem matters",
      "Common causes",
      "Solution 1: [Quick fix]",
      "Solution 2: [Intermediate fix]",
      "Solution 3: [Advanced fix]",
      "Prevention tips",
      "When to seek professional help",
      "Conclusion",
      "FAQs",
    ],
    avgWordCount: { min: 1500, max: 2500 },
    icon: "🔧",
  },
  {
    id: "faq-article",
    name: "FAQ Article",
    description: "Question-and-answer format covering common queries",
    bestFor: ["FAQ pages", "common questions content", "support content"],
    structure: [
      "Introduction",
      "Q1: [Most common question]",
      "Q2: [Second most common]",
      "Q3: [Third most common]",
      "[Continue with all questions]",
      "Summary",
      "Related resources",
    ],
    avgWordCount: { min: 1000, max: 2000 },
    icon: "❓",
  },
  {
    id: "news-article",
    name: "News/Announcement",
    description: "Timely content about news, updates, or announcements",
    bestFor: ["news coverage", "product launches", "company announcements"],
    structure: [
      "Headline summary",
      "The news (who, what, when, where)",
      "Background/Context",
      "Key details",
      "Quotes/Reactions",
      "Impact & Implications",
      "What's next",
    ],
    avgWordCount: { min: 600, max: 1200 },
    icon: "📰",
  },
  {
    id: "opinion-piece",
    name: "Opinion/Editorial",
    description: "Thought leadership piece sharing perspective and insights",
    bestFor: ["thought leadership", "industry commentary", "expert opinions"],
    structure: [
      "Hook/Opening statement",
      "The issue/topic",
      "Your position",
      "Supporting argument 1",
      "Supporting argument 2",
      "Counterarguments addressed",
      "Call to action/Conclusion",
    ],
    avgWordCount: { min: 800, max: 1500 },
    icon: "💭",
  },
];

// Get template by ID
export function getTemplate(templateId: ArticleTemplate): TemplateInfo | undefined {
  return ARTICLE_TEMPLATES.find((t) => t.id === templateId);
}

// Suggest best template based on keyword and intent
export async function suggestTemplate(
  keyword: string,
  searchIntent?: "informational" | "transactional" | "navigational" | "commercial"
): Promise<{ template: TemplateInfo; reason: string }> {
  const ai = getAIProvider();
  
  const prompt = `Based on the keyword "${keyword}" and search intent "${searchIntent || "unknown"}", which article template would be most effective?

Available templates:
${ARTICLE_TEMPLATES.map((t) => `- ${t.id}: ${t.name} - ${t.description} (Best for: ${t.bestFor.join(", ")})`).join("\n")}

Choose the single best template and explain why in one sentence.

Format as JSON:
{
  "templateId": "template-id-here",
  "reason": "Brief explanation why this template fits best"
}`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 200 });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const template = getTemplate(parsed.templateId);
      if (template) {
        return { template, reason: parsed.reason };
      }
    }
  } catch (error) {
    console.error("Error suggesting template:", error);
  }
  
  // Default fallback based on keyword patterns
  const keywordLower = keyword.toLowerCase();
  
  if (keywordLower.includes("how to") || keywordLower.includes("guide")) {
    return {
      template: ARTICLE_TEMPLATES.find((t) => t.id === "how-to-guide")!,
      reason: "Keyword indicates instructional content",
    };
  }
  
  if (keywordLower.includes("best") || keywordLower.includes("top")) {
    return {
      template: ARTICLE_TEMPLATES.find((t) => t.id === "listicle")!,
      reason: "Keyword indicates list-based content",
    };
  }
  
  if (keywordLower.includes("vs") || keywordLower.includes("versus") || keywordLower.includes("comparison")) {
    return {
      template: ARTICLE_TEMPLATES.find((t) => t.id === "comparison")!,
      reason: "Keyword indicates comparison content",
    };
  }
  
  if (keywordLower.includes("review")) {
    return {
      template: ARTICLE_TEMPLATES.find((t) => t.id === "product-review")!,
      reason: "Keyword indicates review content",
    };
  }
  
  // Default to ultimate guide
  return {
    template: ARTICLE_TEMPLATES.find((t) => t.id === "ultimate-guide")!,
    reason: "Comprehensive guide format works well for most topics",
  };
}

// Generate article outline based on template
export async function generateOutlineFromTemplate(
  keyword: string,
  template: TemplateInfo,
  productContext?: { name: string; category: string; description: string },
  paaQuestions?: string[]
): Promise<string[]> {
  const ai = getAIProvider();
  
  const prompt = `Create a detailed article outline for the keyword "${keyword}" using the ${template.name} template.

Template structure:
${template.structure.map((s, i) => `${i + 1}. ${s}`).join("\n")}

${productContext ? `Product context: ${productContext.name} (${productContext.category}) - ${productContext.description}` : ""}

${paaQuestions?.length ? `Include answers to these "People Also Ask" questions:\n${paaQuestions.map((q) => `- ${q}`).join("\n")}` : ""}

Target word count: ${template.avgWordCount.min}-${template.avgWordCount.max} words

Create a specific, detailed outline with actual section titles (not placeholders).
Each H2 should have 2-4 H3 subsections where appropriate.

Format each line as:
H2: Main section title
H3: Subsection title
H4: Sub-subsection (if needed)

Make titles specific, keyword-rich, and engaging.`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 1000 });
    
    const lines = response.content
      .split("\n")
      .filter((line) => line.trim())
      .filter((line) => line.match(/^(H[234]:|##|###|####|-)/i))
      .map((line) => {
        // Normalize format
        return line
          .replace(/^-\s*/, "")
          .replace(/^(#{2,4})\s*/, (match) => {
            const level = match.trim().length;
            return `H${level}: `;
          })
          .trim();
      });
    
    return lines.length > 0 ? lines : template.structure;
  } catch (error) {
    console.error("Error generating outline:", error);
    return template.structure;
  }
}

// Generate full article from template
export async function generateArticleFromTemplate(
  keyword: string,
  template: TemplateInfo,
  outline: string[],
  options: {
    productContext?: { name: string; category: string; description: string };
    paaQuestions?: Array<{ question: string; answer?: string }>;
    competitorTopics?: string[];
    targetWordCount?: number;
    tone?: "professional" | "casual" | "friendly" | "authoritative";
  } = {}
): Promise<string> {
  const ai = getAIProvider();
  const targetWords = options.targetWordCount || template.avgWordCount.max;
  
  const prompt = `Write a comprehensive ${template.name} article about "${keyword}".

Outline to follow:
${outline.join("\n")}

${options.productContext ? `Product to feature: ${options.productContext.name} (${options.productContext.category})\n${options.productContext.description}` : ""}

${options.paaQuestions?.length ? `Include answers to these questions:\n${options.paaQuestions.map((q) => `Q: ${q.question}`).join("\n")}` : ""}

${options.competitorTopics?.length ? `Make sure to cover these topics that competitors cover:\n${options.competitorTopics.join(", ")}` : ""}

Requirements:
- Target length: ${targetWords} words
- Tone: ${options.tone || "professional"}
- Include internal linking opportunities marked as [LINK: suggested anchor text]
- Include image placement suggestions marked as [IMAGE: description]
- Use proper heading hierarchy (H2, H3, H4)
- Include a compelling introduction and strong conclusion
- Optimize for the keyword "${keyword}" naturally (1-2% density)
- Write in an engaging, readable style
- Include relevant statistics or data points where appropriate
- Add a FAQ section if not already in outline

Format the content in Markdown.`;

  const response = await ai.generateText(prompt, { maxTokens: 4000 });
  return response.content;
}

// Generate meta description for template type
export function generateMetaDescription(
  title: string,
  keyword: string,
  template: ArticleTemplate
): string {
  const templates: Record<ArticleTemplate, (t: string, k: string) => string> = {
    "how-to-guide": (t, k) => `Learn ${k} with our step-by-step guide. Discover expert tips, best practices, and avoid common mistakes. Start mastering ${k} today!`,
    "listicle": (t, k) => `Discover the best ${k} in our comprehensive list. Compare options, read expert recommendations, and find the perfect choice for your needs.`,
    "comparison": (t, k) => `${t} - Compare features, pricing, and more. Find out which option is best for your needs with our detailed analysis.`,
    "product-review": (t, k) => `Honest ${k} review with pros, cons, and our verdict. See if it's worth your money and discover alternatives.`,
    "ultimate-guide": (t, k) => `The complete guide to ${k}. Everything you need to know from basics to advanced strategies. Start learning today!`,
    "case-study": (t, k) => `See how ${k} delivered real results. Discover the strategies, implementation, and measurable outcomes in this case study.`,
    "problem-solution": (t, k) => `Having issues with ${k}? Learn quick fixes, proven solutions, and prevention tips from experts.`,
    "faq-article": (t, k) => `Get answers to your ${k} questions. Expert responses to the most common queries about ${k}.`,
    "news-article": (t, k) => `Latest news about ${k}. Stay updated with the most recent developments and what they mean for you.`,
    "opinion-piece": (t, k) => `Expert perspective on ${k}. Discover insights, analysis, and informed opinions from industry professionals.`,
  };
  
  const generator = templates[template] || templates["ultimate-guide"];
  const description = generator(title, keyword);
  
  // Ensure it's within optimal length (120-160 chars)
  if (description.length > 160) {
    return description.substring(0, 157) + "...";
  }
  return description;
}
