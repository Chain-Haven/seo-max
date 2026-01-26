import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import type { AIProvider, AIProviderType, AIGenerateOptions, AIGenerateResult, AIMessage } from "./types";

// Re-export types
export type { AIProvider, AIProviderType, AIGenerateOptions, AIGenerateResult, AIMessage };

// Default provider based on available API keys
function getDefaultProvider(): AIProviderType {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "openai"; // Default to OpenAI even if no key (will fail gracefully)
}

// Provider instances cache
const providers: Map<string, AIProvider> = new Map();

export function getAIProvider(type?: AIProviderType): AIProvider {
  const providerType = type || getDefaultProvider();
  
  // Check cache
  if (providers.has(providerType)) {
    return providers.get(providerType)!;
  }

  // Create new provider
  let provider: AIProvider;
  
  switch (providerType) {
    case "openai":
      provider = new OpenAIProvider();
      break;
    case "anthropic":
      provider = new AnthropicProvider();
      break;
    default:
      throw new Error(`Unknown AI provider type: ${providerType}`);
  }

  // Cache and return
  providers.set(providerType, provider);
  return provider;
}

// Convenience functions that use the default provider
export async function generateText(
  prompt: string,
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<AIGenerateResult> {
  const provider = getAIProvider(options?.provider);
  return provider.generateText(prompt, options);
}

export async function generateChat(
  messages: AIMessage[],
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<AIGenerateResult> {
  const provider = getAIProvider(options?.provider);
  return provider.generateChat(messages, options);
}

export async function generateJSON<T>(
  prompt: string,
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<T> {
  const provider = getAIProvider(options?.provider);
  return provider.generateJSON<T>(prompt, options);
}

// SEO-specific AI functions
export async function generateMetaTitle(
  productName: string,
  description: string,
  brandName?: string,
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<string> {
  const prompt = `Generate an SEO-optimized meta title for the following product:

Product Name: ${productName}
Description: ${description}
${brandName ? `Brand: ${brandName}` : ""}

Requirements:
- Maximum 60 characters
- Include the product name
- Make it compelling and click-worthy
- Include relevant keywords naturally
- If brand is provided, include it at the end with a separator

Return only the meta title, nothing else.`;

  const result = await generateText(prompt, {
    ...options,
    systemPrompt: "You are an SEO expert. Generate concise, effective meta titles.",
    temperature: 0.7,
  });

  return result.content.trim().replace(/^["']|["']$/g, "");
}

export async function generateMetaDescription(
  productName: string,
  description: string,
  features?: string[],
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<string> {
  const prompt = `Generate an SEO-optimized meta description for the following product:

Product Name: ${productName}
Description: ${description}
${features?.length ? `Key Features: ${features.join(", ")}` : ""}

Requirements:
- Maximum 155 characters
- Include a clear value proposition
- Include a subtle call-to-action
- Make it compelling and informative
- Include relevant keywords naturally

Return only the meta description, nothing else.`;

  const result = await generateText(prompt, {
    ...options,
    systemPrompt: "You are an SEO expert. Generate concise, effective meta descriptions.",
    temperature: 0.7,
  });

  return result.content.trim().replace(/^["']|["']$/g, "");
}

export async function generateImageAltText(
  productName: string,
  imageContext?: string,
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<string> {
  const prompt = `Generate SEO-friendly alt text for a product image:

Product Name: ${productName}
${imageContext ? `Image Context: ${imageContext}` : ""}

Requirements:
- Maximum 125 characters
- Be descriptive and specific
- Include the product name
- Describe what's visible in the image
- Avoid keyword stuffing

Return only the alt text, nothing else.`;

  const result = await generateText(prompt, {
    ...options,
    systemPrompt: "You are an accessibility and SEO expert. Generate descriptive, helpful alt text.",
    temperature: 0.5,
  });

  return result.content.trim().replace(/^["']|["']$/g, "");
}

export interface BlogPostOutline {
  title: string;
  metaDescription: string;
  sections: Array<{
    heading: string;
    points: string[];
  }>;
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
}

export async function generateBlogOutline(
  topic: string,
  targetKeywords: string[],
  context?: string,
  options?: AIGenerateOptions & { provider?: AIProviderType }
): Promise<BlogPostOutline> {
  const prompt = `Create a comprehensive blog post outline for the following topic:

Topic: ${topic}
Target Keywords: ${targetKeywords.join(", ")}
${context ? `Context: ${context}` : ""}

Generate a JSON object with this structure:
{
  "title": "SEO-optimized blog title (max 60 chars)",
  "metaDescription": "Compelling meta description (max 155 chars)",
  "sections": [
    {
      "heading": "H2 heading",
      "points": ["key point 1", "key point 2", "key point 3"]
    }
  ],
  "faqItems": [
    {
      "question": "Common question about the topic",
      "answer": "Concise, helpful answer"
    }
  ]
}

Include 4-6 sections and 3-5 FAQ items. Make the outline comprehensive and SEO-friendly.`;

  return generateJSON<BlogPostOutline>(prompt, {
    ...options,
    systemPrompt: "You are an SEO content strategist. Create comprehensive, well-structured content outlines.",
    temperature: 0.8,
  });
}
